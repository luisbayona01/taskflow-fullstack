<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ProjectStatsService;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

class ProjectStatsController extends Controller
{
    #[OA\Get(
        path: "/projects/{project}/stats",
        summary: "Get project statistics",
        tags: ["Projects"],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: "project", in: "path", required: true, schema: new OA\Schema(type: "integer"))
        ],
        responses: [
            new OA\Response(response: 200, description: "Project statistics", content: new OA\JsonContent(ref: "#/components/schemas/StatsResponse")),
            new OA\Response(response: 401, description: "Unauthenticated", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 403, description: "The user is not a member of the project", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
            new OA\Response(response: 404, description: "Project not found", content: new OA\JsonContent(ref: "#/components/schemas/ErrorResponse")),
        ]
    )]
    public function __invoke(Project $project, ProjectStatsService $statsService): JsonResponse
    {
        $this->authorize('view', $project);

        $stats = $statsService->getStats($project);

        return response()->json([
            'data' => $stats,
        ]);
    }
}
