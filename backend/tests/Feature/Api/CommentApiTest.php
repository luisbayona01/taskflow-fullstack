<?php

namespace Tests\Feature\Api;

use App\Models\Comment;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $member;
    protected User $externalUser;
    protected Project $project;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->member = User::factory()->create();
        $this->externalUser = User::factory()->create();

        $this->project = Project::factory()->create(['owner_id' => $this->owner->id]);
        
        // Add owner and member to project
        ProjectUser::create(['project_id' => $this->project->id, 'user_id' => $this->owner->id]);
        ProjectUser::create(['project_id' => $this->project->id, 'user_id' => $this->member->id]);

        $this->task = Task::factory()->create([
            'project_id' => $this->project->id,
        ]);
    }

    public function test_member_can_post_comment()
    {
        $this->actingAs($this->member);

        $response = $this->postJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments", [
            'body' => 'This is a test comment',
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('body', 'This is a test comment')
                 ->assertJsonPath('author.id', $this->member->id);

        $this->assertDatabaseHas('comments', [
            'task_id' => $this->task->id,
            'user_id' => $this->member->id,
            'body' => 'This is a test comment',
        ]);
    }

    public function test_member_can_list_comments()
    {
        Comment::factory()->count(3)->create([
            'task_id' => $this->task->id,
        ]);

        $this->actingAs($this->member);

        $response = $this->getJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments");

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'data' => [
                         '*' => ['id', 'body', 'created_at', 'author']
                     ],
                     'links',
                     'meta'
                 ]);
    }

    public function test_cannot_post_comment_without_body()
    {
        $this->actingAs($this->member);

        $response = $this->postJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments", [
            'body' => '',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors('body');
    }

    public function test_external_user_cannot_access_comments()
    {
        $this->actingAs($this->externalUser);

        $response = $this->getJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments");

        $response->assertStatus(403);
    }

    public function test_cannot_comment_on_task_from_different_project()
    {
        $otherProject = Project::factory()->create();
        $otherTask = Task::factory()->create(['project_id' => $otherProject->id]);

        $this->actingAs($this->member);

        $response = $this->postJson("/api/projects/{$this->project->id}/tasks/{$otherTask->id}/comments", [
            'body' => 'Sneaky comment',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseMissing('comments', ['body' => 'Sneaky comment']);
    }

    public function test_comments_are_ordered_by_latest()
    {
        $c1 = Comment::factory()->create(['task_id' => $this->task->id, 'created_at' => now()->subDays(2)]);
        $c2 = Comment::factory()->create(['task_id' => $this->task->id, 'created_at' => now()->subDay()]);
        $c3 = Comment::factory()->create(['task_id' => $this->task->id, 'created_at' => now()]);

        $this->actingAs($this->member);

        $response = $this->getJson("/api/projects/{$this->project->id}/tasks/{$this->task->id}/comments");

        $data = $response->json('data');
        $this->assertEquals($c3->id, $data[0]['id']);
        $this->assertEquals($c2->id, $data[1]['id']);
        $this->assertEquals($c1->id, $data[2]['id']);
    }
}
