<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Exceptions\InvalidTaskAssigneeException;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * project_id and assigned_to are assigned through relationships.
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'due_date',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => TaskStatus::class,
            'priority' => TaskPriority::class,
            'due_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Task $task): void {
            $task->validateAssignee();
        });

        static::updating(function (Task $task): void {
            if ($task->isDirty(['assigned_to', 'project_id'])) {
                $task->validateAssignee();
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    /**
     * Assign or unassign the user responsible for this task.
     */
    public function assignTo(?User $user): static
    {
        $this->assignedUser()->associate($user);

        return $this;
    }

    /**
     * A task can only be assigned to a member of its own project.
     *
     * @throws InvalidTaskAssigneeException
     */
    public function validateAssignee(): void
    {
        if ($this->assigned_to === null) {
            return;
        }

        $assigneeBelongsToProject = ProjectUser::query()
            ->where('project_id', $this->project_id)
            ->where('user_id', $this->assigned_to)
            ->exists();

        if (! $assigneeBelongsToProject) {
            throw new InvalidTaskAssigneeException(
                'The assignee must belong to the task project.'
            );
        }
    }
}
