<?php

namespace Database\Seeders;

use App\Enums\ProjectRole;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    /**
     * Seed demo users, projects, memberships, tasks and comments.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $ana = User::factory()->create([
                'name' => 'Ana Torres',
                'email' => 'ana@taskflow.test',
            ]);

            $luis = User::factory()->create([
                'name' => 'Luis Ramirez',
                'email' => 'luis@taskflow.test',
            ]);

            $sofia = User::factory()->create([
                'name' => 'Sofia Herrera',
                'email' => 'sofia@taskflow.test',
            ]);

            $website = $this->createProject(
                $ana,
                [$ana, $luis, $sofia],
                'Website Redesign',
                'Rediseno del sitio corporativo y de la experiencia de usuario.'
            );

            $mobile = $this->createProject(
                $luis,
                [$luis, $ana, $sofia],
                'Mobile App Launch',
                'Lanzamiento de la aplicacion movil para clientes.'
            );

            $this->createTasks($website, [$ana, $luis, $sofia], 'Website');
            $this->createTasks($mobile, [$luis, $ana, $sofia], 'Mobile');
        });
    }

    /**
     * Create a project and register all its members with their role.
     *
     * @param  array<int, User>  $members
     */
    private function createProject(
        User $owner,
        array $members,
        string $name,
        string $description
    ): Project {
        $project = $owner->ownedProjects()->create([
            'name' => $name,
            'description' => $description,
        ]);

        foreach ($members as $member) {
            $project->members()->attach($member->id, [
                'role' => ($member->is($owner)
                    ? ProjectRole::Owner
                    : ProjectRole::Member)->value,
            ]);
        }

        return $project;
    }

    /**
     * Create demo tasks and comments for a project.
     *
     * @param  array<int, User>  $members
     */
    private function createTasks(Project $project, array $members, string $prefix): void
    {
        $statuses = TaskStatus::cases();
        $priorities = TaskPriority::cases();
        $titles = [
            'Define requirements',
            'Design the user flow',
            'Implement the main screen',
            'Review accessibility',
            'Prepare the release',
        ];

        foreach ($titles as $index => $title) {
            $assignee = $members[$index % count($members)];

            $task = $project->tasks()->create([
                'title' => "{$prefix}: {$title}",
                'description' => fake()->optional()->paragraph(),
                'status' => $statuses[$index % count($statuses)],
                'priority' => $priorities[$index % count($priorities)],
                'due_date' => $index === 4
                    ? null
                    : now()->addDays($index + 1)->toDateString(),
            ]);

            $task->assignTo($assignee);
            $task->save();

            $commentAuthor = $members[($index + 1) % count($members)];
            $comment = $task->comments()->make([
                'body' => fake()->sentence(12),
            ]);
            $comment->author()->associate($commentAuthor);
            $comment->save();
        }
    }
}
