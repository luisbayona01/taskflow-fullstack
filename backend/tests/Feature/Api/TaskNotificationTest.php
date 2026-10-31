<?php

namespace Tests\Feature\Api;

use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class TaskNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $assignee;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->assignee = User::factory()->create();
        $this->project = Project::factory()->create(['owner_id' => $this->owner->id]);
        
        ProjectUser::create(['project_id' => $this->project->id, 'user_id' => $this->owner->id]);
        ProjectUser::create(['project_id' => $this->project->id, 'user_id' => $this->assignee->id]);
    }

    public function test_notification_sent_on_task_creation_with_assignee()
    {
        Notification::fake();

        $this->actingAs($this->owner);

        $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'title' => 'Test Task',
            'assigned_to' => $this->assignee->id,
        ]);

        Notification::assertSentTo(
            $this->assignee,
            TaskAssignedNotification::class
        );
    }

    public function test_notification_sent_on_assignee_change()
    {
        Notification::fake();

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_to' => null,
        ]);

        $this->actingAs($this->owner);

        $this->putJson("/api/projects/{$this->project->id}/tasks/{$task->id}", [
            'assigned_to' => $this->assignee->id,
        ]);

        Notification::assertSentTo(
            $this->assignee,
            TaskAssignedNotification::class
        );
    }

    public function test_no_notification_if_assignee_remains_the_same()
    {
        Notification::fake();

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_to' => $this->assignee->id,
        ]);

        $this->actingAs($this->owner);

        $this->putJson("/api/projects/{$this->project->id}/tasks/{$task->id}", [
            'title' => 'Updated Title',
            'assigned_to' => $this->assignee->id,
        ]);

        Notification::assertNothingSent();
    }

    public function test_no_notification_when_assignee_is_null()
    {
        Notification::fake();

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_to' => $this->assignee->id,
        ]);

        $this->actingAs($this->owner);

        $this->putJson("/api/projects/{$this->project->id}/tasks/{$task->id}", [
            'assigned_to' => null,
        ]);

        Notification::assertNothingSent();
    }
}
