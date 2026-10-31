<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Services\ProjectService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class ProjectController extends Controller
{
    public function __construct(private readonly ProjectService $projectService)
    {
        //
    }

    #[OA\Get(
        path: "/projects",
        summary: "List the projects of the authenticated user",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: "List of projects", content: new OA\JsonContent(ref: "#/components/schemas/ProjectsResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $projects = $request->user()
            ->projects()
            ->with('owner')
            ->get();

        return ApiResponse::success(
            'Projects retrieved successfully.',
            ['projects' => ProjectResource::collection($projects)]
        );
    }

    #[OA\Post(
        path: "/projects",
        summary: "Create a project",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["name"],
                properties: [
                    new OA\Property(property: "name", type: "string", maxLength: 255, example: "TaskFlow"),
                    new OA\Property(property: "description", type: "string", nullable: true, example: "Internal tooling project"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Project created", content: new OA\JsonContent(ref: "#/components/schemas/ProjectResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = $this->projectService->createProject(
            $request->user(),
            $request->validated()
        );

        $project->load('owner');

        return ApiResponse::success(
            'Project created successfully.',
            ['project' => new ProjectResource($project)],
            201
        );
    }

    #[OA\Get(
        path: "/projects/{project}",
        summary: "Get the details of a project",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: "Project details", content: new OA\JsonContent(ref: "#/components/schemas/ProjectResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "Project not found", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['owner', 'members']);

        return ApiResponse::success(
            'Project retrieved successfully.',
            ['project' => new ProjectResource($project)]
        );
    }

    #[OA\Put(
        path: "/projects/{project}",
        summary: "Update a project (only the owner)",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "name", type: "string", maxLength: 255, example: "Updated project name"),
                    new OA\Property(property: "description", type: "string", nullable: true, example: "Updated description"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Project updated", content: new OA\JsonContent(ref: "#/components/schemas/ProjectResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "Only the project owner can update it", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "Project not found", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    #[OA\Patch(
        path: "/projects/{project}",
        summary: "Partially update a project (only the owner)",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "name", type: "string", maxLength: 255, example: "Updated project name"),
                    new OA\Property(property: "description", type: "string", nullable: true, example: "Updated description"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Project updated", content: new OA\JsonContent(ref: "#/components/schemas/ProjectResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "Only the project owner can update it", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "Project not found", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 422, description: "Validation error", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function update(
        UpdateProjectRequest $request,
        Project $project
    ): JsonResponse {
        $this->authorize('update', $project);

        $project = $this->projectService->updateProject(
            $project,
            $request->validated()
        );

        $project->load('owner');

        return ApiResponse::success(
            'Project updated successfully.',
            ['project' => new ProjectResource($project)]
        );
    }

    #[OA\Delete(
        path: "/projects/{project}",
        summary: "Delete a project (only the owner)",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer", example: 1)),
        ],
        responses: [
            new OA\Response(response: 204, description: "Project deleted (no content)"),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "Only the project owner can delete it", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "Project not found", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $this->projectService->deleteProject($project);

        return response()->json(null, JsonResponse::HTTP_NO_CONTENT);
    }
}
