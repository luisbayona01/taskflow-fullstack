<?php

namespace App\Services;

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ProjectService
{
    /**
     * Create a project and register its owner as an owner member.
     *
     * @param  array<string, mixed>  $data
     */
    public function createProject(User $owner, array $data): Project
    {
        return DB::transaction(function () use ($owner, $data): Project {
            $project = $owner->ownedProjects()->create($data);

            $project->members()->syncWithoutDetaching([
                $owner->id => ['role' => ProjectRole::Owner->value],
            ]);

            return $project;
        });
    }

    /**
     * Update a project.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateProject(Project $project, array $data): Project
    {
        $project->fill($data)->save();

        return $project->refresh();
    }

    /**
     * Soft delete a project and keep its related records.
     */
    public function deleteProject(Project $project): void
    {
        $project->delete();
    }
}
