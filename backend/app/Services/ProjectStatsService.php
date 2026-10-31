<?php

namespace App\Services;

use App\Enums\TaskStatus;
use App\Models\Project;
use Illuminate\Support\Carbon;

class ProjectStatsService
{
    /**
     * Calculate the statistics of a project without loading the tasks in memory.
     *
     * A single aggregation query is used so the number of round trips to the
     * database stays constant regardless of the amount of tasks.
     *
     * @return array<string, int|float>
     */
    public function getStats(Project $project): array
    {
        $now = Carbon::now();

        $row = $project->tasks()
            ->selectRaw('COUNT(*) as total_tasks')
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending',
                [TaskStatus::Pending->value]
            )
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as in_progress',
                [TaskStatus::InProgress->value]
            )
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as done',
                [TaskStatus::Done->value]
            )
            ->selectRaw(
                'SUM(CASE WHEN due_date IS NOT NULL AND due_date < ? AND status <> ? THEN 1 ELSE 0 END) as overdue',
                [$now->toDateString(), TaskStatus::Done->value]
            )
            ->first();

        $totalTasks = (int) ($row?->total_tasks ?? 0);
        $done = (int) ($row?->done ?? 0);

        return [
            'total_tasks' => $totalTasks,
            'pending' => (int) ($row?->pending ?? 0),
            'in_progress' => (int) ($row?->in_progress ?? 0),
            'done' => $done,
            'overdue' => (int) ($row?->overdue ?? 0),
            'progress_percentage' => $totalTasks > 0
                ? round(($done / $totalTasks) * 100, 2)
                : 0.00,
        ];
    }
}
