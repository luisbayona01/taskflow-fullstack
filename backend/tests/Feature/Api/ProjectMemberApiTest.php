<?php

namespace Tests\Feature\Api;

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\User;
use App\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectMemberApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_list_project_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);

        $response = $this->actingAs($member, 'sanctum')
            ->getJson("/api/projects/{$project->id}/members");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.members');
    }

    public function test_non_member_cannot_list_project_members(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $project = $this->createProject($owner);

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/projects/{$project->id}/members")
            ->assertForbidden();
    }

    public function test_owner_can_add_member(): void
    {
        $owner = User::factory()->create();
        $newUser = User::factory()->create();
        $project = $this->createProject($owner);

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/members", [
                'user_id' => $newUser->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('project_user', [
            'project_id' => $project->id,
            'user_id' => $newUser->id,
            'role' => ProjectRole::Member->value,
        ]);
    }

    public function test_non_owner_cannot_add_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $newUser = User::factory()->create();
        $project = $this->createProject($owner, $member);

        $this->actingAs($member, 'sanctum')
            ->postJson("/api/projects/{$project->id}/members", [
                'user_id' => $newUser->id,
            ])
            ->assertForbidden();
    }

    public function test_cannot_add_non_existent_user(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/members", [
                'user_id' => 999,
            ])
            ->assertUnprocessable();
    }

    public function test_cannot_add_duplicate_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/members", [
                'user_id' => $member->id,
            ])
            ->assertUnprocessable();
    }

    public function test_owner_can_remove_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = $this->createProject($owner, $member);

        $response = $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}/members/{$member->id}");

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('project_user', [
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);
    }

    public function test_non_owner_cannot_remove_member(): void
    {
        $owner = User::factory()->create();
        $member1 = User::factory()->create();
        $member2 = User::factory()->create();
        $project = $this->createProject($owner, $member1);
        $project->members()->attach($member2->id, ['role' => ProjectRole::Member->value]);

        $this->actingAs($member1, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}/members/{$member2->id}")
            ->assertForbidden();
    }

    public function test_cannot_remove_owner(): void
    {
        $owner = User::factory()->create();
        $project = $this->createProject($owner);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}/members/{$owner->id}")
            ->assertUnprocessable();

        $this->assertDatabaseHas('project_user', [
            'project_id' => $project->id,
            'user_id' => $owner->id,
        ]);
    }

    public function test_cannot_remove_non_member(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $project = $this->createProject($owner);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/projects/{$project->id}/members/{$outsider->id}")
            ->assertNotFound();
    }

    public function test_cannot_manage_members_of_other_project(): void
    {
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();
        $project1 = $this->createProject($owner1);
        $project2 = $this->createProject($owner2);

        $this->actingAs($owner1, 'sanctum')
            ->postJson("/api/projects/{$project2->id}/members", [
                'user_id' => $owner1->id,
            ])
            ->assertForbidden();
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
