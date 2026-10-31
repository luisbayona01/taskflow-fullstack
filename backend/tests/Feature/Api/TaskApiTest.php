<?php

namespace Tests\Feature\Api;

use App\Enums\ProjectRole;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_create_task(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);

        $response = $this->actingAs($member, 'sanctum')
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Test Task',
                'description' => 'Test Description',
                'status' => TaskStatus::Pending->value,
                'priority' => TaskPriority::Medium->value,
                'due_date' => now()->addDays(7)->toDateString(),
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.task.title', 'Test Task');

        $this->assertDatabaseHas('tasks', [
            'project_id' => $project->id,
            'title' => 'Test Task',
        ]);
    }

    public function test_member_can_view_task(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);
        $task = Task::factory()->for($project)->create();

        $response = $this->actingAs($member, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks/{$task->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.task.id', $task->id);
    }

    public function test_member_can_update_task(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);
        $task = Task::factory()->for($project)->create();

        $response = $this->actingAs($member, 'sanctum')
            ->patchJson("/api/projects/{$project->id}/tasks/{$task->id}", [
                'title' => 'Updated Title',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.task.title', 'Updated Title');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_member_can_delete_task(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);
        $task = Task::factory()->for($project)->create();

        $response = $this->actingAs($member, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}/tasks/{$task->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_outsider_cannot_access_tasks(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $project = $this->createProject($owner);
        $task = Task::factory()->for($project)->create();

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks/{$task->id}")
            ->assertForbidden();

        $this->actingAs($outsider, 'sanctum')
            ->postJson("/api/projects/{$project->id}/tasks", ['title' => 'Hack'])
            ->assertForbidden();
    }

    public function test_cannot_assign_task_to_outsider(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);
        $outsider = User::factory()->create();

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Task for Outsider',
                'assigned_to' => $outsider->id,
            ]);

        $response->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'The assignee must belong to the task project.');
    }

    public function test_can_assign_task_to_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Task for Member',
                'assigned_to' => $member->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('tasks', [
            'project_id' => $project->id,
            'assigned_to' => $member->id,
        ]);
    }

    public function test_can_create_task_without_assignee(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Unassigned Task',
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);
    }

    public function test_invalid_status_or_priority_returns_422(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/tasks", [
                'title' => 'Invalid Task',
                'status' => 'invalid_status',
                'priority' => 'invalid_priority',
            ]);

        $response->assertUnprocessable();
    }

    public function test_task_must_belong_to_project_in_url(): void
    {
        $owner = User::factory()->create();
        $project1 = $this->createProject($owner);
        $project2 = $this->createProject($owner);
        $task = Task::factory()->for($project1)->create();

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project2->id}/tasks/{$task->id}");

        $response->assertNotFound()
            ->assertJsonPath('message', 'Task does not belong to the specified project.');
    }

    /**
     * @return Project
     */
    private function createProject(User $owner, ?User $member = null): Project
    {
        $project = app(ProjectService::class)->createProject($owner, [
            'name' => fake()->sentence(3),
            'description' => fake()->optional()->paragraph(),
        ]);

        if ($member !== null) {
            $project->members()->attach($member->id, [
                'role' => ProjectRole::Member->value,
            ]);
        }

        return $project->fresh();
    }
}
