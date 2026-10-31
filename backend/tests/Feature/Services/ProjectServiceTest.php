<?php

namespace Tests\Feature\Services;

use App\Enums\ProjectRole;
use App\Models\User;
use App\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_creation_registers_the_owner_as_an_owner_member(): void
    {
        $owner = User::factory()->create();

        $project = app(ProjectService::class)->createProject($owner, [
            'name' => 'Website Redesign',
            'description' => 'Corporate website redesign.',
        ]);

        $project = $project->fresh(['members']);

        $this->assertTrue($project->owner->is($owner));
        $this->assertDatabaseCount('project_user', 1);

        $membership = $project->members->first();

        $this->assertNotNull($membership);
        $this->assertTrue($membership->is($owner));
        $this->assertSame(ProjectRole::Owner, $membership->pivot->role);
        $this->assertNotNull($membership->pivot->created_at);
        $this->assertNotNull($membership->pivot->updated_at);
    }

    public function test_owner_id_cannot_be_overridden_by_the_payload(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $project = app(ProjectService::class)->createProject($owner, [
            'name' => 'Owner protected',
            'description' => null,
            'owner_id' => $otherUser->id,
        ]);

        $project = $project->fresh();

        $this->assertNotNull($project);
        $this->assertSame($owner->id, $project->owner_id);
    }
}
