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
use OpenApi\Attributes as OA;

class ProjectMemberController extends Controller
{
    /**
     * List all members of the project.
     */
    #[OA\Get(
        path: "/projects/{project}/members",
        summary: "List the members of a project",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: "List of members", content: new OA\JsonContent(ref: "#/components/schemas/MembersResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
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
    #[OA\Post(
        path: "/projects/{project}/members",
        summary: "Add a member to a project",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["user_id"],
                properties: [
                    new OA\Property(property: "user_id", type: "integer", description: "Identifier of the user to add to the project.", example: 2),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Member added to the project", content: new OA\JsonContent(ref: "#/components/schemas/MessageResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "Only the project owner can manage members", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error or the user is already a member", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
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
    #[OA\Delete(
        path: "/projects/{project}/members/{user}",
        summary: "Remove a member from a project",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
            new OA\Parameter(name: "user", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 2)),
        ],
        responses: [
            new OA\Response(response: 204, description: "Member removed from the project (no content)"),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "Only the project owner can manage members", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "The project owner cannot be removed", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function destroy(Request $request, Project $project, User $user): JsonResponse
    {
        $this->authorize('manageMembers', $project);

        if (!$project->members()->whereKey($user->id)->exists()) {
            return ApiResponse::error('The user is not a member of this project.', null, 404);
        }

        if ($project->owner_id === $user->id) {
            return ApiResponse::error('The project owner cannot be removed from the project.', null, 422);
        }

        $project->members()->detach($user->id);

        return response()->json(null, JsonResponse::HTTP_NO_CONTENT);
    }
}
