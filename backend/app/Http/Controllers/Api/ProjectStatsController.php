<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ProjectStatsService;
use Illuminate\Http\JsonResponse;

class ProjectStatsController extends Controller
{
    /**
     * Get statistics for the specified project.
     */
    public function __invoke(Project $project, ProjectStatsService $statsService): JsonResponse
    {
        // Rule: Only project members can consult their statistics.
        // Reusing ProjectPolicy 'view' method which checks project membership.
        $this->authorize('view', $project);

        $stats = $statsService->getStats($project);

        return response()->json([
            'data' => $stats,
        ]);
    }
}
