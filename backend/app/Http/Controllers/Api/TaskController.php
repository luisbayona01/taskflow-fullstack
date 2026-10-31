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

class TaskController extends Controller
{
    public function __construct(private readonly TaskService $taskService)
    {
    }

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

    public function update(UpdateTaskRequest $request, Project $project, Task $task): JsonResponse
    {
        if ($task->project_id !== $project->id) {
            return ApiResponse::error('Task does not belong to the specified project.', null, 404);
        }

        $this->authorize('update', $task);

        try {
            $updatedTask = $this->taskService->updateTask($task, $request->validated());
            $updatedTask->load('assignedUser');

            return ApiResponse::success(
                'Task updated successfully.',
                ['task' => new TaskResource($updatedTask)]
            );
        } catch (InvalidTaskAssigneeException $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }
    }

    public function destroy(Request $request, Project $project, Task $task): JsonResponse
    {
        if ($task->project_id !== $project->id) {
            return ApiResponse::error('Task does not belong to the specified project.', null, 404);
        }

        $this->authorize('delete', $task);

        $this->taskService->deleteTask($task);

        return ApiResponse::success('Task deleted successfully.');
    }
}
