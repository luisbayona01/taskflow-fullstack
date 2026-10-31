<?php

namespace Tests\Feature\Api;

use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Task;
use App\Models\User;
use App\Enums\TaskStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Carbon;

class ProjectStatsApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $member;
    protected User $externalUser;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->member = User::factory()->create();
        $this->externalUser = User::factory()->create();
        $this->project = Project::factory()->create();

        ProjectUser::create([
            'project_id' => $this->project->id,
            'user_id' => $this->member->id,
        ]);
    }

    public function test_project_without_tasks_returns_zero_stats()
    {
        $this->actingAs($this->member);

        $response = $this->getJson("/api/projects/{$this->project->id}/stats");

        $response->assertStatus(200)
                 ->assertJson([
                     'data' => [
                         'total_tasks' => 0,
                         'pending' => 0,
                         'in_progress' => 0,
                         'done' => 0,
                         'overdue' => 0,
                         'progress_percentage' => 0.00,
                     ]
                 ]);
    }

    public function test_project_with_various_tasks_calculates_correctly()
    {
        // 1 Done, 1 Pending, 1 In Progress, 1 Overdue
        Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => TaskStatus::Done->value,
            'due_date' => Carbon::now()->subDays(5)->toDateString(), // Completed, so not overdue
        ]);

        Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => TaskStatus::Pending->value,
            'due_date' => Carbon::now()->addDays(5)->toDateString(),
        ]);

        Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => TaskStatus::InProgress->value,
            'due_date' => Carbon::now()->addDays(1)->toDateString(),
        ]);

        Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => TaskStatus::Pending->value,
            'due_date' => Carbon::now()->subDays(1)->toDateString(), // Overdue
        ]);

        $this->actingAs($this->member);

        $response = $this->getJson("/api/projects/{$this->project->id}/stats");

        $response->assertStatus(200)
                 ->assertJson([
                     'data' => [
                         'total_tasks' => 4,
                         'pending' => 2,
                         'in_progress' => 1,
                         'done' => 1,
                         'overdue' => 1,
                         'progress_percentage' => 25.00,
                     ]
                 ]);
    }

    public function test_percentage_is_rounded_to_two_decimals()
    {
        // 1 done out of 3 tasks = 33.33%
        Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => TaskStatus::Done->value,
        ]);
        Task::factory()->count(2)->create([
            'project_id' => $this->project->id,
            'status' => TaskStatus::Pending->value,
        ]);

        $this->actingAs($this->member);

        $response = $this->getJson("/api/projects/{$this->project->id}/stats");

        $response->assertStatus(200)
                 ->assertJsonPath('data.progress_percentage', 33.33);
    }

    public function test_completed_tasks_are_not_counted_as_overdue()
    {
        Task::factory()->create([
            'project_id' => $this->project->id,
            'status' => TaskStatus::Done->value,
            'due_date' => Carbon::now()->subDays(10)->toDateString(),
        ]);

        $this->actingAs($this->member);

        $response = $this->getJson("/api/projects/{$this->project->id}/stats");

        $response->assertStatus(200)
                 ->assertJsonPath('data.overdue', 0)
                 ->assertJsonPath('data.done', 1);
    }

    public function test_non_member_cannot_access_stats()
    {
        $this->actingAs($this->externalUser);

        $response = $this->getJson("/api/projects/{$this->project->id}/stats");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_stats()
    {
        $response = $this->getJson("/api/projects/{$this->project->id}/stats");

        $response->assertStatus(401);
    }
}
