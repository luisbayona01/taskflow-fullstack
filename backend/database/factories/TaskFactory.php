<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'status' => fake()->randomElement(TaskStatus::cases()),
            'priority' => fake()->randomElement(TaskPriority::cases()),
            'due_date' => fake()->optional(0.8)->dateTimeBetween('now', '+30 days')?->format('Y-m-d'),
            'assigned_to' => null,
        ];
    }

    /**
     * Set the user assigned to the task.
     */
    public function assignedTo(User $user): static
    {
        return $this->state(fn (): array => [
            'assigned_to' => $user->id,
        ]);
    }

    /**
     * Set the task status.
     */
    public function withStatus(TaskStatus $status): static
    {
        return $this->state(fn (): array => [
            'status' => $status,
        ]);
    }

    /**
     * Set the task priority.
     */
    public function withPriority(TaskPriority $priority): static
    {
        return $this->state(fn (): array => [
            'priority' => $priority,
        ]);
    }
}
