<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Task\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Project;
use App\Models\Task;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizationException;

class CommentController extends Controller
{
    /**
     * Display a listing of the comments for the specific task.
     */
    public function index(Project $project, Task $task)
    {
        // Rule 1 & 6: Only project members can view, and task must belong to project
        $this->authorize('view', $project);
        
        if ($task->project_id !== $project->id) {
            abort(404, 'Task not found in this project.');
        }

        // Rule 7: Most recent first
        // Rule 8: Include author (Eager Load)
        // Rule 9: Pagination
        $comments = $task->comments()
            ->with('author')
            ->latest()
            ->paginate(15);

        return CommentResource::collection($comments);
    }

    /**
     * Store a new comment for the specific task.
     */
    public function store(StoreCommentRequest $request, Project $project, Task $task)
    {
        // Rule 2 & 6: Only project members can post, and task must belong to project
        $this->authorize('view', $project);

        if ($task->project_id !== $project->id) {
            abort(404, 'Task not found in this project.');
        }

        // Rule 3 & 4: Automatic user_id and task_id assignment
        $comment = Comment::create([
            'body' => $request->validated('body'),
            'task_id' => $task->id,
            'user_id' => Auth::id(),
        ]);

        return new CommentResource($comment);
    }
}
