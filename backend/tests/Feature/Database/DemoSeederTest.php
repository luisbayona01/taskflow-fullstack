<?php

namespace Tests\Feature\Database;

use App\Enums\ProjectRole;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_creates_consistent_data(): void
    {
        $this->seed(DemoSeeder::class);

        $this->assertDatabaseCount('users', 3);
        $this->assertDatabaseCount('projects', 2);
        $this->assertDatabaseCount('project_user', 6);
        $this->assertDatabaseCount('tasks', 10);
        $this->assertDatabaseCount('comments', 10);

        $projects = Project::with(['members', 'tasks.assignedUser'])->get();

        $this->assertCount(2, $projects);

        foreach ($projects as $project) {
            $this->assertGreaterThanOrEqual(5, $project->tasks->count());

            $ownerMembership = $project->members->firstWhere(
                'id',
                $project->owner_id
            );

            $this->assertNotNull($ownerMembership);
            $this->assertSame(
                ProjectRole::Owner,
                $ownerMembership->pivot->role
            );

            $memberIds = $project->members->modelKeys();

            foreach ($project->tasks as $task) {
                $this->assertNotNull($task->assignedUser);
                $this->assertContains($task->assignedUser->id, $memberIds);
            }
        }

        $this->assertGreaterThan(1, Task::distinct()->count('status'));
        $this->assertGreaterThan(1, Task::distinct()->count('priority'));
        $this->assertGreaterThan(0, Comment::count());
    }
}
