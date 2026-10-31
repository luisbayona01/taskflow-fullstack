<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    /**
     * Determine whether the user can view the task.
     */
    public function view(User $user, Task $task): bool
    {
        return $task->project->members()->whereKey($user->id)->exists();
    }

    /**
     * Determine whether the user can create tasks for the project.
     */
    public function create(User $user, Project $project): bool
    {
        return $project->members()->whereKey($user->id)->exists();
    }

    /**
     * Determine whether the user can update the task.
     */
    public function update(User $user, Task $task): bool
    {
        return $task->project->members()->whereKey($user->id)->exists();
    }

    /**
     * Determine whether the user can delete the task.
     */
    public function delete(User $user, Task $task): bool
    {
        return $task->project->members()->whereKey($user->id)->exists();
    }
}
