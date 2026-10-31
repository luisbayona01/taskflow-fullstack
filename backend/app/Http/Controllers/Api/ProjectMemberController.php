<?php

namespace App\Http\Controllers\Api;

use App\Enums\ProjectRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Project\AddProjectMemberRequest;
use App\Http\Resources\UserResource;
use App\Models\Project;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectMemberController extends Controller
{
    /**
     * List all members of the project.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $members = $project->members()->withPivot('role')->get();

        return ApiResponse::success(
            'Project members retrieved successfully.',
            ['members' => UserResource::collection($members)]
        );
    }

    /**
     * Add a new member to the project.
     */
    public function store(AddProjectMemberRequest $request, Project $project): JsonResponse
    {
        $this->authorize('manageMembers', $project);

        $userId = $request->validated('user_id');

        if ($project->members()->whereKey($userId)->exists()) {
            return ApiResponse::error('The user is already a member of this project.', null, 422);
        }

        $project->members()->attach($userId, [
            'role' => ProjectRole::Member->value,
        ]);

        return ApiResponse::success(
            'User added to project successfully.',
            null,
            201
        );
    }

    /**
     * Remove a member from the project.
     */
    public function destroy(Request $request, Project $project, User $user): JsonResponse
    {
        $this->authorize('manageMembers', $project);

        if (!$project->members()->whereKey($user->id)->exists()) {
            return ApiResponse::error('The user is not a member of this project.', 404);
        }

        if ($project->owner_id === $user->id) {
            return ApiResponse::error('The project owner cannot be removed from the project.', 422);
        }

        $project->members()->detach($user->id);

        return ApiResponse::success('User removed from project successfully.');
    }
}
