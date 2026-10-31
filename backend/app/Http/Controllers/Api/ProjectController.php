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

class ProjectController extends Controller
{
    public function __construct(private readonly ProjectService $projectService)
    {
        //
    }

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

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $project->load(['owner', 'members']);

        return ApiResponse::success(
            'Project retrieved successfully.',
            ['project' => new ProjectResource($project)]
        );
    }

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

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $this->projectService->deleteProject($project);

        return ApiResponse::success('Project deleted successfully.');
    }
}
