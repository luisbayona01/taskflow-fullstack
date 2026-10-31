<?php

namespace Tests\Feature\Api;

use App\Models\Comment;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Contract tests derived from the technical test requirements: status codes,
 * validation, authorization, pagination and absence of N+1 queries.
 */
class ApiContractTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $member;
    protected User $outsider;
    protected Project $project;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->member = User::factory()->create();
        $this->outsider = User::factory()->create();

        $this->project = Project::factory()->create(['owner_id' => $this->owner->id]);

        ProjectUser::create(['project_id' => $this->project->id, 'user_id' => $this->owner->id, 'role' => 'owner']);
        ProjectUser::create(['project_id' => $this->project->id, 'user_id' => $this->member->id, 'role' => 'member']);

        $this->task = Task::factory()->create(['project_id' => $this->project->id]);
    }

    /**
     * @return list<array{0: string, 1: array<string, mixed>, 2: string}>
     */
    public static function protectedEndpoints(): array
    {
        return [
            ['get', '/api/me', []],
            ['post', '/api/logout', []],
            ['get', '/api/projects', []],
            ['post', '/api/projects', ['name' => 'New project']],
            ['get', '/api/projects/1', []],
            ['put', '/api/projects/1', ['name' => 'Updated']],
            ['patch', '/api/projects/1', ['name' => 'Updated']],
            ['delete', '/api/projects/1', []],
            ['get', '/api/projects/1/members', []],
            ['post', '/api/projects/1/members', ['user_id' => 2]],
            ['delete', '/api/projects/1/members/2', []],
            ['get', '/api/projects/1/stats', []],
            ['get', '/api/projects/1/tasks', []],
            ['post', '/api/projects/1/tasks', ['title' => 'New task']],
            ['get', '/api/projects/1/tasks/1', []],
            ['put', '/api/projects/1/tasks/1', ['title' => 'Updated']],
            ['patch', '/api/projects/1/tasks/1', ['title' => 'Updated']],
            ['delete', '/api/projects/1/tasks/1', []],
            ['get', '/api/projects/1/tasks/1/comments', []],
            ['post', '/api/projects/1/tasks/1/comments', ['body' => 'Hello']],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('protectedEndpoints')]
    public function test_protected_endpoints_require_authentication(string $method, string $uri, array $payload): void
    {
        $response = $this->json($method, $uri, $payload);

        $response->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    /**
     * La API es JSON puro: aunque el cliente no envíe `Accept: application/json`
     * debe responder 401 y no un 500 por la redirección a una ruta `login`
     * inexistente.
     */
    public function test_protected_endpoint_without_json_header_still_returns_401(): void
    {
        $this->get('/api/projects')
            ->assertStatus(401)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_unknown_project_returns_404(): void
    {
        $this->actingAs($this->member, 'sanctum')
            ->getJson('/api/projects/999999')
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_unknown_task_returns_404(): void
    {
        $this->actingAs($this->member, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}/tasks/999999")
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_task_of_another_project_returns_404(): void
    {
        $otherProject = Project::factory()->create();
        $otherTask = Task::factory()->create(['project_id' => $otherProject->id]);

        $this->actingAs($this->member, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}/tasks/{$otherTask->id}")
            ->assertNotFound();
    }

    public function test_validation_errors_return_422_with_the_field_names(): void
    {
        $this->actingAs($this->member, 'sanctum')
            ->postJson("/api/projects/{$this->project->id}/tasks", [
                'title' => '',
                'status' => 'not-a-status',
                'priority' => 'not-a-priority',
                'due_date' => 'not-a-date',
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['title', 'status', 'priority', 'due_date']);
    }

    public function test_update_validation_errors_return_422(): void
    {
        $this->actingAs($this->member, 'sanctum')
            ->putJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}", [
                'title' => str_repeat('a', 256),
                'status' => 'archived',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'status']);
    }

    public function test_comments_are_paginated(): void
    {
        Comment::factory()->count(17)->create([
            'task_id' => $this->task->id,
            'user_id' => $this->member->id,
        ]);

        $response = $this->actingAs($this->member, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments");

        $response->assertStatus(200)
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.total', 17)
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_task_listing_does_not_execute_n_plus_one_queries(): void
    {
        Task::factory()->count(5)->create([
            'project_id' => $this->project->id,
            'assigned_to' => $this->member->id,
        ]);

        $queriesWithFewTasks = $this->countQueriesForTaskListing();

        Task::factory()->count(25)->create([
            'project_id' => $this->project->id,
            'assigned_to' => $this->member->id,
        ]);

        $queriesWithManyTasks = $this->countQueriesForTaskListing();

        // The amount of queries must not grow with the amount of tasks:
        // that proves the relation is eager loaded instead of lazy loaded.
        $this->assertSame(
            $queriesWithFewTasks,
            $queriesWithManyTasks,
            'The listing must use eager loading instead of triggering one query per task.'
        );

        $this->assertLessThanOrEqual(
            5,
            $queriesWithManyTasks,
            'The listing must only need the project, the policy check, the count, the tasks and the assignees.'
        );
    }

    public function test_project_detail_does_not_execute_n_plus_one_queries(): void
    {
        Task::factory()->count(10)->create([
            'project_id' => $this->project->id,
            'assigned_to' => $this->member->id,
        ]);

        DB::enableQueryLog();

        $this->actingAs($this->member, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}")
            ->assertStatus(200);

        $queries = DB::getQueryLog();

        DB::disableQueryLog();

        $this->assertLessThanOrEqual(
            6,
            count($queries),
            'The project detail must eager load the owner and the members.'
        );
    }

    /**
     * Amount of queries executed by the task listing endpoint.
     */
    private function countQueriesForTaskListing(): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->actingAs($this->member, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}/tasks")
            ->assertStatus(200);

        $queries = DB::getQueryLog();

        DB::disableQueryLog();

        return count($queries);
    }

    public function test_delete_endpoints_return_204_without_content(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}")
            ->assertNoContent()
            ->assertContent('');
    }

    public function test_outsider_receives_403_on_every_project_scoped_endpoint(): void
    {
        $this->actingAs($this->outsider, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}")
            ->assertForbidden();

        $this->actingAs($this->outsider, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}/tasks")
            ->assertForbidden();

        $this->actingAs($this->outsider, 'sanctum')
            ->postJson("/api/projects/{$this->project->id}/tasks", ['title' => 'Hack'])
            ->assertForbidden();

        $this->actingAs($this->outsider, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}/stats")
            ->assertForbidden();

        $this->actingAs($this->outsider, 'sanctum')
            ->getJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments")
            ->assertForbidden();

        $this->actingAs($this->outsider, 'sanctum')
            ->postJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments", ['body' => 'Hack'])
            ->assertForbidden();
    }
}
