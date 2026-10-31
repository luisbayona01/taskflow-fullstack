<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\InvalidTaskAssigneeException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Task;
use App\Services\TaskService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class TaskController extends Controller
{
    public function __construct(private readonly TaskService $taskService)
    {
        //
    }

    #[OA\Get(
        path: "/projects/{project}/tasks",
        summary: "List, filter, sort and paginate the tasks of a project",
        tags: ["Tasks"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "status", in: "query", required: false, description: "Filter by task status.", schema: new OA\Schema(type: "string", enum: ["pending", "in_progress", "done"], default: "pending")),
            new OA\Parameter(name: "priority", in: "query", required: false, description: "Filter by task priority.", schema: new OA\Schema(type: "string", enum: ["low", "medium", "high"], default: "medium")),
            new OA\Parameter(name: "assigned_to", in: "query", required: false, description: "Filter by the identifier of the assignee.", schema: new OA\Schema(type: "integer", example: 2)),
            new OA\Parameter(name: "due_date_from", in: "query", required: false, description: "Only tasks due on or after this date.", schema: new OA\Schema(type: "string", format: "date", example: "2026-11-01")),
            new OA\Parameter(name: "due_date_to", in: "query", required: false, description: "Only tasks due on or before this date.", schema: new OA\Schema(type: "string", format: "date", example: "2026-12-31")),
            new OA\Parameter(name: "search", in: "query", required: false, description: "Partial match against the task title.", schema: new OA\Schema(type: "string", example: "documentation")),
            new OA\Parameter(name: "sort_by", in: "query", required: false, description: "Field used to order the results.", schema: new OA\Schema(type: "string", enum: ["created_at", "updated_at", "due_date", "title", "status", "priority"], default: "created_at")),
            new OA\Parameter(name: "sort_direction", in: "query", required: false, description: "Sorting direction.", schema: new OA\Schema(type: "string", enum: ["asc", "desc"], default: "desc")),
            new OA\Parameter(name: "per_page", in: "query", required: false, description: "Amount of tasks per page (15 by default, 100 maximum).", schema: new OA\Schema(type: "integer", default: 15, minimum: 1, maximum: 100)),
            new OA\Parameter(name: "page", in: "query", required: false, description: "Page number of the paginated collection.", schema: new OA\Schema(type: "integer", default: 1, minimum: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: "Paginated list of tasks", content: new OA\JsonContent(ref: "#/components/schemas/TasksResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $tasks = $this->taskService->getFilteredTasks(
            $project,
            $request->all()
        );

        return ApiResponse::success(
            'Tasks retrieved successfully.',
            [
                'tasks' => TaskResource::collection($tasks->items()),
                'pagination' => [
                    'total' => $tasks->total(),
                    'per_page' => $tasks->perPage(),
                    'current_page' => $tasks->currentPage(),
                    'last_page' => $tasks->lastPage(),
                    'from' => $tasks->firstItem(),
                    'to' => $tasks->lastItem(),
                ],
            ]
        );
    }

    #[OA\Post(
        path: "/projects/{project}/tasks",
        summary: "Create a task inside a project",
        tags: ["Tasks"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["title"],
                properties: [
                    new OA\Property(property: "title", type: "string", maxLength: 255, description: "Title of the task.", example: "Implement comments endpoint"),
                    new OA\Property(property: "description", type: "string", nullable: true, description: "Optional description of the task.", example: "Add validation and policies"),
                    new OA\Property(property: "status", type: "string", nullable: true, enum: ["pending", "in_progress", "done"], description: "Initial status of the task.", example: "pending"),
                    new OA\Property(property: "priority", type: "string", nullable: true, enum: ["low", "medium", "high"], description: "Priority of the task.", example: "high"),
                    new OA\Property(property: "due_date", type: "string", format: "date", nullable: true, description: "Due date of the task.", example: "2026-12-31"),
                    new OA\Property(property: "assigned_to", type: "integer", nullable: true, description: "Identifier of a member of the project that receives the task.", example: 2),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Task created", content: new OA\JsonContent(ref: "#/components/schemas/TaskResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error or the assignee does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function store(StoreTaskRequest $request, Project $project): JsonResponse
    {
        $this->authorize('create', $project);

        try {
            $task = $this->taskService->createTask(
                $project,
                $request->user(),
                $request->validated()
            );

            return ApiResponse::success(
                'Task created successfully.',
                ['task' => new TaskResource($task)],
                201
            );
        } catch (InvalidTaskAssigneeException $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }
    }

    #[OA\Get(
        path: "/projects/{project}/tasks/{task}",
        summary: "Get the details of a task",
        tags: ["Tasks"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "task", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: "Task details", content: new OA\JsonContent(ref: "#/components/schemas/TaskResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "The task does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function show(Request $request, Project $project, Task $task): JsonResponse
    {
        if ($task->project_id !== $project->id) {
            return ApiResponse::error('Task does not belong to the specified project.', null, 404);
        }

        $this->authorize('view', $task);

        $task->load('assignedUser');

        return ApiResponse::success(
            'Task retrieved successfully.',
            ['task' => new TaskResource($task)]
        );
    }

    #[OA\Put(
        path: "/projects/{project}/tasks/{task}",
        summary: "Update a task",
        tags: ["Tasks"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "task", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "title", type: "string", maxLength: 255, example: "Updated title"),
                    new OA\Property(property: "description", type: "string", nullable: true, example: "Updated description"),
                    new OA\Property(property: "status", type: "string", nullable: true, enum: ["pending", "in_progress", "done"], example: "in_progress"),
                    new OA\Property(property: "priority", type: "string", nullable: true, enum: ["low", "medium", "high"], example: "medium"),
                    new OA\Property(property: "due_date", type: "string", format: "date", nullable: true, example: "2026-12-31"),
                    new OA\Property(property: "assigned_to", type: "integer", nullable: true, description: "New assignee. Send null to unassign the task.", example: 3),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Task updated", content: new OA\JsonContent(ref: "#/components/schemas/TaskResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "The task does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error or the assignee does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    #[OA\Patch(
        path: "/projects/{project}/tasks/{task}",
        summary: "Partially update a task",
        tags: ["Tasks"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "task", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "title", type: "string", maxLength: 255, example: "Updated title"),
                    new OA\Property(property: "description", type: "string", nullable: true, example: "Updated description"),
                    new OA\Property(property: "status", type: "string", nullable: true, enum: ["pending", "in_progress", "done"], example: "done"),
                    new OA\Property(property: "priority", type: "string", nullable: true, enum: ["low", "medium", "high"], example: "medium"),
                    new OA\Property(property: "due_date", type: "string", format: "date", nullable: true, example: "2026-12-31"),
                    new OA\Property(property: "assigned_to", type: "integer", nullable: true, description: "New assignee. Send null to unassign the task.", example: 3),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Task updated", content: new OA\JsonContent(ref: "#/components/schemas/TaskResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "The task does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error or the assignee does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function update(UpdateTaskRequest $request, Project $project, Task $task): JsonResponse
    {
        if ($task->project_id !== $project->id) {
            return ApiResponse::error('Task does not belong to the specified project.', null, 404);
        }

        $this->authorize('update', $task);

        try {
            $updatedTask = $this->taskService->updateTask(
                $task,
                $request->validated(),
                $request->user()
            );
            $updatedTask->load('assignedUser');

            return ApiResponse::success(
                'Task updated successfully.',
                ['task' => new TaskResource($updatedTask)]
            );
        } catch (InvalidTaskAssigneeException $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }
    }

    #[OA\Delete(
        path: "/projects/{project}/tasks/{task}",
        summary: "Delete a task",
        tags: ["Tasks"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "task", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        responses: [
            new OA\Response(response: 204, description: "Task deleted (no content)"),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "The task does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function destroy(Request $request, Project $project, Task $task): JsonResponse
    {
        if ($task->project_id !== $project->id) {
            return ApiResponse::error('Task does not belong to the specified project.', null, 404);
        }

        $this->authorize('delete', $task);

        $this->taskService->deleteTask($task);

        return response()->json(null, JsonResponse::HTTP_NO_CONTENT);
    }
}
