<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldQueueAfterCommit;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification implements ShouldQueue, ShouldQueueAfterCommit
{
    use Queueable;

    /**
     * @param  Task  $task  The task that has just been assigned.
     * @param  User  $assigner  The user that performed the assignment.
     */
    public function __construct(
        protected readonly Task $task,
        protected readonly User $assigner
    ) {
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $task = $this->task;
        $task->loadMissing('project');

        $mail = (new MailMessage)
            ->subject('New task assigned: '.$task->title)
            ->greeting('Hello '.$notifiable->name.'!')
            ->line('A task has been assigned to you in the project '.$task->project->name.'.')
            ->line('Task: '.$task->title);

        if (filled($task->description)) {
            $mail->line('Description: '.$task->description);
        }

        $mail->line('Priority: '.($task->priority?->value ?? 'not set'));

        if ($task->due_date) {
            $mail->line('Due date: '.$task->due_date->format('Y-m-d'));
        }

        return $mail
            ->line('Assigned by: '.$this->assigner->name);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'project_id' => $this->task->project_id,
            'title' => $this->task->title,
            'assigned_by' => $this->assigner->name,
        ];
    }
}
