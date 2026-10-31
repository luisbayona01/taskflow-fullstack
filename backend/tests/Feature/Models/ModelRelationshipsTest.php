<?php

namespace Tests\Feature\Models;

use App\Enums\ProjectRole;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ModelRelationshipsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_relationships(): void
    {
        [$project, $owner, $member] = $this->createProjectWithMembers();

        $task = Task::factory()
            ->for($project)
            ->for($member, 'assignedUser')
            ->create();

        $comment = Comment::factory()
            ->for($task)
            ->for($member, 'author')
            ->create();

        $this->assertTrue(
            $owner->ownedProjects()->whereKey($project->id)->exists()
        );

        $this->assertTrue(
            $member->projects()->whereKey($project->id)->exists()
        );

        $membership = $member->projects()
            ->whereKey($project->id)
            ->firstOrFail();

        $this->assertSame(ProjectRole::Member, $membership->pivot->role);
        $this->assertNotNull($membership->pivot->created_at);
        $this->assertNotNull($membership->pivot->updated_at);

        $this->assertTrue(
            $member->assignedTasks()->whereKey($task->id)->exists()
        );

        $this->assertTrue(
            $member->comments()->whereKey($comment->id)->exists()
        );
    }

    public function test_project_relationships(): void
    {
        [$project, $owner] = $this->createProjectWithMembers();

        $task = Task::factory()->for($project)->create();

        $this->assertTrue($project->owner->is($owner));
        $this->assertCount(2, $project->members()->get());
        $this->assertTrue($project->members->contains($owner));
        $this->assertTrue($project->tasks->contains($task));

        $ownerMembership = $project->members->firstWhere('id', $owner->id);

        $this->assertNotNull($ownerMembership);
        $this->assertSame(ProjectRole::Owner, $ownerMembership->pivot->role);
    }

    public function test_task_and_comment_relationships(): void
    {
        [$project, , $member] = $this->createProjectWithMembers();

        $task = Task::factory()
            ->for($project)
            ->for($member, 'assignedUser')
            ->create();

        $comment = Comment::factory()
            ->for($task)
            ->for($member, 'author')
            ->create();

        $this->assertTrue($task->project->is($project));
        $this->assertTrue($task->assignedUser->is($member));
        $this->assertTrue($task->comments->contains($comment));
        $this->assertTrue($comment->task->is($task));
        $this->assertTrue($comment->author->is($member));
    }

    public function test_task_enums_and_due_date_are_cast(): void
    {
        $task = Task::factory()->create([
            'status' => TaskStatus::InProgress,
            'priority' => TaskPriority::High,
            'due_date' => '2026-12-15',
        ]);

        $task->refresh();

        $this->assertSame(TaskStatus::InProgress, $task->status);
        $this->assertSame(TaskPriority::High, $task->priority);
        $this->assertInstanceOf(Carbon::class, $task->due_date);
        $this->assertSame('2026-12-15', $task->due_date->toDateString());
    }

    public function test_project_soft_delete_keeps_related_records(): void
    {
        [$project, $owner, $member] = $this->createProjectWithMembers();

        $task = Task::factory()->for($project)->create();
        $comment = Comment::factory()->for($task)->create();

        $project->delete();

        $this->assertSoftDeleted('projects', ['id' => $project->id]);
        $this->assertNull(Project::find($project->id));
        $this->assertNotNull(Project::withTrashed()->find($project->id));

        $this->assertDatabaseHas('project_user', [
            'project_id' => $project->id,
            'user_id' => $owner->id,
        ]);

        $this->assertDatabaseHas('project_user', [
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $this->assertDatabaseHas('tasks', ['id' => $task->id]);
        $this->assertDatabaseHas('comments', ['id' => $comment->id]);

        $project->restore();

        $this->assertNotSoftDeleted('projects', ['id' => $project->id]);
        $this->assertNotNull(Project::find($project->id));
    }

    public function test_relationships_can_be_eager_loaded(): void
    {
        [$project, , $member] = $this->createProjectWithMembers();

        $task = Task::factory()
            ->for($project)
            ->for($member, 'assignedUser')
            ->create();

        Comment::factory()
            ->for($task)
            ->for($member, 'author')
            ->create();

        $project = Project::with([
            'owner',
            'members',
            'tasks.assignedUser',
            'tasks.comments.author',
        ])->findOrFail($project->id);

        $this->assertTrue($project->relationLoaded('owner'));
        $this->assertTrue($project->relationLoaded('members'));
        $this->assertTrue($project->relationLoaded('tasks'));

        $task = $project->tasks->first();

        $this->assertNotNull($task);
        $this->assertTrue($task->relationLoaded('assignedUser'));
        $this->assertTrue(
            $task->comments->first()->relationLoaded('author')
        );
    }

    /**
     * @return array{Project, User, User}
     */
    private function createProjectWithMembers(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $project = Project::factory()
            ->for($owner, 'owner')
            ->create();

        $project->members()->attach($owner->id, [
            'role' => ProjectRole::Owner->value,
        ]);

        $project->members()->attach($member->id, [
            'role' => ProjectRole::Member->value,
        ]);

        return [$project, $owner, $member];
    }
}
