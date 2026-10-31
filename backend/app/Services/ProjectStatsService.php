<?php

namespace App\Services;

use App\Models\Project;
use App\Enums\TaskStatus;
use Illuminate\Support\Carbon;

class ProjectStatsService
{
    /**
     * Calculate statistics for a specific project.
     *
     * @param Project $project
     * @return array<string, mixed>
     */
    public function getStats(Project $project): array
    {
        $totalTasks = $project->tasks()->count();

        if ($totalTasks === 0) {
            return [
                'total_tasks' => 0,
                'pending' => 0,
                'in_progress' => 0,
                'done' => 0,
                'overdue' => 0,
                'progress_percentage' => 0.00,
            ];
        }

        // Efficiency: Perform counts in a single query if possible or targeted queries
        // We can use a conditional aggregation or multiple targeted counts.
        // Given the simplicity, targeted counts are clean and efficient enough.
        
        $doneCount = $project->tasks()
            ->where('status', TaskStatus::DONE)
            ->count();

        $pendingCount = $project->tasks()
            ->where('status', TaskStatus::PENDING)
            ->count();

        $inProgressCount = $project->tasks()
            ->where('status', TaskStatus::IN_PROGRESS)
            ->count();

        $overdueCount = $project->tasks()
            ->where('due_date', '<', Carbon::now())
            ->where('status', '!=', TaskStatus::DONE)
            ->count();

        $progressPercentage = round(($doneCount / $totalTasks) * 100, 2);

        return [
            'total_tasks' => $totalTasks,
            'pending' => $pendingCount,
            'in_progress' => $inProgressCount,
            'done' => $doneCount,
            'overdue' => $overdueCount,
            'progress_percentage' => $progressPercentage,
        ];
    }
}
