<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;

class TaskService
{
    /**
     * Create a task within a project.
     */
    public function createTask(Project $project, User $user, array $data): Task
    {
        return DB::transaction(function () use ($project, $data, $user): Task {
            $task = new Task($data);
            $task->project()->associate($project);

            if (isset($data['assigned_to'])) {
                $assignee = User::findOrFail($data['assigned_to']);
                $task->assignTo($assignee);
            }

            $task->save();

            // The notification implements ShouldQueueAfterCommit, therefore the
            // queued job is only dispatched once the transaction is committed.
            if ($task->assigned_to !== null) {
                $assignee = User::find($task->assigned_to);

                if ($assignee !== null) {
                    Notification::send($assignee, new TaskAssignedNotification($task, $user));
                }
            }

            return $task;
        });
    }

    /**
     * Update an existing task.
     */
    public function updateTask(Task $task, array $data, ?User $assigner = null): Task
    {
        return DB::transaction(function () use ($task, $data, $assigner): Task {
            $oldAssigneeId = $task->assigned_to;
            $assigner ??= Auth::user();

            $task->fill($data);

            if (array_key_exists('assigned_to', $data)) {
                $userId = $data['assigned_to'];
                $assignee = $userId ? User::findOrFail($userId) : null;
                $task->assignTo($assignee);
            }

            $task->save();

            // Only notify the new assignee when the assignment really changes.
            if ($task->assigned_to !== null && $task->assigned_to !== $oldAssigneeId) {
                $newAssignee = User::find($task->assigned_to);

                if ($newAssignee !== null && $assigner !== null) {
                    Notification::send($newAssignee, new TaskAssignedNotification($task, $assigner));
                }
            }

            return $task->refresh();
        });
    }

    /**
     * Delete a task.
     */
    public function deleteTask(Task $task): void
    {
        $task->delete();
    }

    /**
     * Get paginated and filtered tasks for a project.
     */
    public function getFilteredTasks(Project $project, array $filters): LengthAwarePaginator
    {
        $query = $project->tasks()
            ->with('assignedUser');

        // Status filter
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Priority filter
        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // Assigned user filter
        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        // Due date range filters
        if (!empty($filters['due_date_from'])) {
            $query->whereDate('due_date', '>=', $filters['due_date_from']);
        }
        if (!empty($filters['due_date_to'])) {
            $query->whereDate('due_date', '<=', $filters['due_date_to']);
        }

        // Search by title
        if (!empty($filters['search'])) {
            $query->where('title', 'like', '%' . $filters['search'] . '%');
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDirection = $filters['sort_direction'] ?? 'desc';

        $allowedSortFields = ['created_at', 'updated_at', 'due_date', 'title', 'status', 'priority'];
        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }

        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortBy, $sortDirection);

        // Pagination
        $perPage = (int) ($filters['per_page'] ?? 15);
        $perPage = max(1, min($perPage, 100));

        return $query->paginate($perPage);
    }
}
