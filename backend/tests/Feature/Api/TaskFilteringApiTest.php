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

class TaskFilteringApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_filter_tasks_by_status(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        Task::factory()->for($project)->create(['status' => TaskStatus::Pending]);
        Task::factory()->for($project)->create(['status' => TaskStatus::Done]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?status=" . TaskStatus::Pending->value);

        $response->assertOk();
        $this->assertCount(1, $response->json('data.tasks'));
        $this->assertSame(TaskStatus::Pending->value, $response->json('data.tasks.0.status'));
    }

    public function test_can_filter_tasks_by_priority(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        Task::factory()->for($project)->create(['priority' => TaskPriority::High]);
        Task::factory()->for($project)->create(['priority' => TaskPriority::Low]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?priority=" . TaskPriority::High->value);

        $response->assertOk();
        $this->assertCount(1, $response->json('data.tasks'));
        $this->assertSame(TaskPriority::High->value, $response->json('data.tasks.0.priority'));
    }

    public function test_can_filter_tasks_by_assignee(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);

        Task::factory()->for($project)->create(['assigned_to' => $member->id]);
        Task::factory()->for($project)->create(['assigned_to' => null]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?assigned_to={$member->id}");

        $response->assertOk();
        $this->assertCount(1, $response->json('data.tasks'));
        $this->assertSame($member->id, $response->json('data.tasks.0.assigned_to'));
    }

    public function test_can_filter_tasks_by_date_range(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        $date1 = now()->subDays(10)->toDateString();
        $date2 = now()->subDays(5)->toDateString();
        $date3 = now()->addDays(5)->toDateString();

        Task::factory()->for($project)->create(['due_date' => $date1]);
        Task::factory()->for($project)->create(['due_date' => $date2]);
        Task::factory()->for($project)->create(['due_date' => $date3]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?due_date_from={$date1}&due_date_to={$date2}");

        $response->assertOk();
        $this->assertCount(2, $response->json('data.tasks'));
    }

    public function test_can_search_tasks_by_title(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        Task::factory()->for($project)->create(['title' => 'Fix critical bug']);
        Task::factory()->for($project)->create(['title' => 'Write documentation']);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?search=critical");

        $response->assertOk();
        $this->assertCount(1, $response->json('data.tasks'));
        $this->assertStringContainsString('Fix critical bug', $response->json('data.tasks.0.title'));
    }

    public function test_can_sort_tasks(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        Task::factory()->for($project)->create(['title' => 'A']);
        Task::factory()->for($project)->create(['title' => 'C']);
        Task::factory()->for($project)->create(['title' => 'B']);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?sort_by=title&sort_direction=asc");

        $response->assertOk();
        $this->assertSame('A', $response->json('data.tasks.0.title'));
        $this->assertSame('B', $response->json('data.tasks.1.title'));
        $this->assertSame('C', $response->json('data.tasks.2.title'));
    }

    public function test_pagination_works(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        Task::factory()->count(20)->for($project)->create();

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?per_page=5&page=1");

        $response->assertOk();
        $this->assertCount(5, $response->json('data.tasks'));
        $this->assertSame(20, $response->json('data.pagination.total'));
        $this->assertSame(4, $response->json('data.pagination.last_page'));
    }

    public function test_combined_filters(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);

        Task::factory()->for($project)->create([
            'status' => TaskStatus::Pending,
            'priority' => TaskPriority::High,
            'assigned_to' => $member->id,
            'title' => 'Urgent Task'
        ]);
        Task::factory()->for($project)->create([
            'status' => TaskStatus::Done,
            'priority' => TaskPriority::High,
            'assigned_to' => $member->id,
            'title' => 'Finished'
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/tasks?status=" . TaskStatus::Pending->value . "&priority=" . TaskPriority::High->value . "&assigned_to={$member->id}");

        $response->assertOk();
        $this->assertCount(1, $response->json('data.tasks'));
        $this->assertSame('Urgent Task', $response->json('data.tasks.0.title'));
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
