<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained('projects')
                ->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'done'])
                ->default('pending');
            $table->enum('priority', ['low', 'medium', 'high'])
                ->default('medium');
            $table->date('due_date')->nullable();
            $table->foreignId('assigned_to')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(
                ['project_id', 'status', 'due_date'],
                'tasks_project_status_due_date_index'
            );
            $table->index(
                ['project_id', 'priority'],
                'tasks_project_priority_index'
            );
            $table->index(
                ['project_id', 'assigned_to'],
                'tasks_project_assigned_to_index'
            );
            $table->index('due_date', 'tasks_due_date_index');
            $table->index('assigned_to', 'tasks_assigned_to_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
