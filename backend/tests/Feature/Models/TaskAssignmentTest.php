<?php

namespace Tests\Feature\Models;

use App\Enums\ProjectRole;
use App\Exceptions\InvalidTaskAssigneeException;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\ProjectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_can_be_assigned_to_a_project_member(): void
    {
        [$project, , $member] = $this->createProjectWithMembers();

        $task = Task::factory()->for($project)->create();
        $task->assignTo($member)->save();

        $task = $task->fresh('assignedUser');

        $this->assertNotNull($task->assignedUser);
        $this->assertTrue($task->assignedUser->is($member));
    }

    public function test_task_can_be_created_without_an_assignee(): void
    {
        [$project] = $this->createProjectWithMembers();

        $task = Task::factory()->for($project)->create();

        $task = $task->fresh();

        $this->assertNotNull($task);
        $this->assertNull($task->assigned_to);
        $this->assertNull($task->assignedUser);
    }

    public function test_task_can_be_unassigned_on_update(): void
    {
        [$project, , $member] = $this->createProjectWithMembers();

        $task = Task::factory()
            ->for($project)
            ->for($member, 'assignedUser')
            ->create();

        $task->assignTo(null)->save();

        $this->assertNull($task->fresh()->assigned_to);
    }

    public function test_assignment_to_a_project_member_is_allowed_on_update(): void
    {
        [$project, $owner, $member] = $this->createProjectWithMembers();

        $task = Task::factory()
            ->for($project)
            ->for($owner, 'assignedUser')
            ->create();

        $task->assignTo($member)->save();

        $task = $task->fresh('assignedUser');

        $this->assertNotNull($task->assignedUser);
        $this->assertTrue($task->assignedUser->is($member));
    }

    public function test_assignment_to_a_user_outside_the_project_is_rejected_on_create(): void
    {
        [$project] = $this->createProjectWithMembers();
        $outsider = User::factory()->create();

        $this->expectException(InvalidTaskAssigneeException::class);

        Task::factory()->for($project)->create([
            'assigned_to' => $outsider->id,
        ]);
    }

    public function test_assignment_to_a_user_outside_the_project_is_rejected_on_update(): void
    {
        [$project, , $member] = $this->createProjectWithMembers();
        $outsider = User::factory()->create();

        $task = Task::factory()
            ->for($project)
            ->for($member, 'assignedUser')
            ->create();

        $this->expectException(InvalidTaskAssigneeException::class);

        $task->assignTo($outsider)->save();
    }

    /**
     * @return array{Project, User, User}
     */
    private function createProjectWithMembers(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $project = app(ProjectService::class)->createProject($owner, [
            'name' => 'Task assignment project',
            'description' => null,
        ]);

        $project->members()->attach($member->id, [
            'role' => ProjectRole::Member->value,
        ]);

        return [$project, $owner, $member];
    }
}
