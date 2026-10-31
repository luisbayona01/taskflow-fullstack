<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected readonly Task $task,
        protected readonly User $assigner
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Task Assigned: ' . $this->task->title)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('You have been assigned to a new task in the project: ' . $this->task->project->name)
            ->line('Task Title: ' . $this->task->title)
            ->line('Description: ' . ($this->task->description ?: 'No description provided.'))
            ->line('Priority: ' . $this->task->priority->value)
            ->line('Due Date: ' . ($this->task->due_date ? $this->task->due_date->format('Y-m-d') : 'Not specified'))
            ->line('Assigned by: ' . $this->assigner->name)
            ->action('View Task', url('/tasks/' . $this->task->id))
            ->line('Thank you for your hard work!');
    }
}
