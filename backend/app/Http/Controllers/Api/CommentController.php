<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Task\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

class CommentController extends Controller
{
    #[OA\Get(
        path: "/projects/{project}/tasks/{task}/comments",
        summary: "List the comments of a task (newest first)",
        tags: ["Comments"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "task", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "page", in: "query", required: false, description: "Page number of the paginated collection.", schema: new OA\Schema(type: "integer", default: 1, minimum: 1)),
            new OA\Parameter(name: "per_page", in: "query", required: false, description: "Comments per page (15 by default).", schema: new OA\Schema(type: "integer", default: 15, minimum: 1, maximum: 100)),
        ],
        responses: [
            new OA\Response(response: 200, description: "Paginated list of comments", content: new OA\JsonContent(ref: "#/components/schemas/CommentCollectionResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "The task does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function index(Project $project, Task $task): JsonResponse
    {
        $this->authorize('view', $project);

        if ($task->project_id !== $project->id) {
            abort(404, 'Task not found in this project.');
        }

        $comments = $task->comments()
            ->with('author')
            ->latest()
            ->paginate(15);

        return CommentResource::collection($comments)->response();
    }

    #[OA\Post(
        path: "/projects/{project}/tasks/{task}/comments",
        summary: "Publish a comment on a task",
        tags: ["Comments"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "task", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["body"],
                properties: [
                    new OA\Property(property: "body", type: "string", maxLength: 2000, description: "Content of the comment. The author and the task are assigned automatically.", example: "I am working on this task now."),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Comment created", content: new OA\JsonContent(ref: "#/components/schemas/CommentResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "The task does not belong to the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function store(StoreCommentRequest $request, Project $project, Task $task): JsonResponse
    {
        $this->authorize('view', $project);

        if ($task->project_id !== $project->id) {
            abort(404, 'Task not found in this project.');
        }

        // The task and the author are always assigned from the URL and the
        // authenticated user, never from the request payload.
        $comment = new Comment(['body' => $request->validated('body')]);
        $comment->task()->associate($task);
        $comment->author()->associate($request->user());
        $comment->save();

        return (new CommentResource($comment))
            ->response()
            ->setStatusCode(201);
    }
}
