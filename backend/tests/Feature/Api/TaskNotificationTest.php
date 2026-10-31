<?php

namespace Tests\Feature\Api;

use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
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

    public function test_notification_sent_on_task_creation_with_assignee(): void
    {
        Notification::fake();

        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/projects/{$this->project->id}/tasks", [
                'title' => 'Test Task',
                'assigned_to' => $this->assignee->id,
            ])
            ->assertCreated();

        Notification::assertSentTo(
            $this->assignee,
            TaskAssignedNotification::class
        );
    }

    public function test_notification_sent_on_assignee_change(): void
    {
        Notification::fake();

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_to' => null,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/projects/{$this->project->id}/tasks/{$task->id}", [
                'assigned_to' => $this->assignee->id,
            ])
            ->assertOk();

        Notification::assertSentTo(
            $this->assignee,
            TaskAssignedNotification::class
        );
    }

    public function test_no_notification_if_assignee_remains_the_same(): void
    {
        Notification::fake();

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_to' => $this->assignee->id,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/projects/{$this->project->id}/tasks/{$task->id}", [
                'title' => 'Updated Title',
                'assigned_to' => $this->assignee->id,
            ])
            ->assertOk();

        Notification::assertNothingSent();
    }

    public function test_no_notification_when_assignee_is_null(): void
    {
        Notification::fake();

        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'assigned_to' => $this->assignee->id,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/projects/{$this->project->id}/tasks/{$task->id}", [
                'assigned_to' => null,
            ])
            ->assertOk();

        Notification::assertNothingSent();
    }

    public function test_no_notification_when_task_is_created_without_assignee(): void
    {
        Notification::fake();

        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/projects/{$this->project->id}/tasks", [
                'title' => 'Unassigned Task',
            ])
            ->assertCreated();

        Notification::assertNothingSent();
    }

    public function test_notification_is_queued_and_dispatched_after_commit(): void
    {
        $notification = new TaskAssignedNotification(
            Task::factory()->create(['project_id' => $this->project->id]),
            $this->owner
        );

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertInstanceOf(ShouldQueueAfterCommit::class, $notification);
    }

    public function test_notification_contains_the_project_and_task_details(): void
    {
        $task = Task::factory()->create([
            'project_id' => $this->project->id,
            'title' => 'Documented task',
            'description' => 'With all the details',
            'priority' => \App\Enums\TaskPriority::High->value,
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        $notification = new TaskAssignedNotification($task, $this->owner);

        $mail = $notification->toMail($this->assignee);
        $body = implode(' ', $mail->introLines);

        $this->assertStringContainsString('Documented task', $mail->subject);
        $this->assertStringContainsString($this->project->name, $body);
        $this->assertStringContainsString('Documented task', $body);
        $this->assertStringContainsString('With all the details', $body);
        $this->assertStringContainsString('high', $body);
        $this->assertStringContainsString($this->owner->name, $body);
    }
}
