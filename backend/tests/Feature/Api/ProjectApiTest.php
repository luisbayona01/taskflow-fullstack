<?php

namespace Tests\Feature\Api;

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\User;
use App\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_their_own_and_shared_projects(): void
    {
        $user = User::factory()->create();
        $otherOwner = User::factory()->create();

        $ownProject = $this->createProject($user);
        $sharedProject = $this->createProject($otherOwner, $user);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/projects');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.projects');

        $projectIds = collect($response->json('data.projects'))
            ->pluck('id')
            ->values();

        $this->assertContains($ownProject->id, $projectIds);
        $this->assertContains($sharedProject->id, $projectIds);
    }

    public function test_user_does_not_see_projects_where_they_are_not_a_member(): void
    {
        $user = User::factory()->create();
        $otherOwner = User::factory()->create();

        $project = $this->createProject($otherOwner);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/projects');

        $response->assertOk();

        $projectIds = collect($response->json('data.projects'))
            ->pluck('id')
            ->values();

        $this->assertNotContains($project->id, $projectIds);
    }

    public function test_user_cannot_view_a_project_where_they_are_not_a_member(): void
    {
        $user = User::factory()->create();
        $otherOwner = User::factory()->create();

        $project = $this->createProject($otherOwner);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/projects/{$project->id}")
            ->assertForbidden();
    }

    public function test_member_can_view_the_project_detail(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $project = $this->createProject($owner, $member);

        $response = $this->actingAs($member, 'sanctum')
            ->getJson("/api/projects/{$project->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.project.id', $project->id)
            ->assertJsonPath('data.project.owner_id', $owner->id);

        $memberIds = collect($response->json('data.project.members'))
            ->pluck('id')
            ->values();

        $this->assertContains($owner->id, $memberIds);
        $this->assertContains($member->id, $memberIds);
    }

    public function test_project_creation_registers_the_owner_in_the_pivot(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/projects', [
                'name' => 'Website Redesign',
                'description' => 'Corporate website redesign.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.project.name', 'Website Redesign')
            ->assertJsonPath('data.project.owner_id', $user->id);

        $projectId = $response->json('data.project.id');

        $this->assertDatabaseHas('project_user', [
            'project_id' => $projectId,
            'user_id' => $user->id,
            'role' => ProjectRole::Owner->value,
        ]);
    }

    public function test_member_cannot_update_a_project(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $project = $this->createProject($owner, $member);

        $this->actingAs($member, 'sanctum')
            ->patchJson("/api/projects/{$project->id}", [
                'name' => 'Updated by member',
            ])
            ->assertForbidden();
    }

    public function test_member_cannot_delete_a_project(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $project = $this->createProject($owner, $member);

        $this->actingAs($member, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}")
            ->assertForbidden();
    }

    public function test_owner_can_update_a_project(): void
    {
        $owner = User::factory()->create();

        $project = $this->createProject($owner);

        $response = $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/projects/{$project->id}", [
                'name' => 'Updated by owner',
                'description' => 'Updated description.',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.project.name', 'Updated by owner')
            ->assertJsonPath('data.project.description', 'Updated description.');

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Updated by owner',
        ]);
    }

    public function test_owner_can_delete_a_project_and_it_is_soft_deleted(): void
    {
        $owner = User::factory()->create();

        $project = $this->createProject($owner);

        $response = $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Project deleted successfully.');

        $this->assertSoftDeleted('projects', ['id' => $project->id]);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}")
            ->assertNotFound();
    }

    public function test_unauthenticated_user_receives_401(): void
    {
        $this->getJson('/api/projects')->assertUnauthorized();
        $this->postJson('/api/projects', ['name' => 'New project'])
            ->assertUnauthorized();
    }

    public function test_invalid_project_data_returns_422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/projects', [])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonStructure([
                'errors' => ['name'],
            ]);
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
