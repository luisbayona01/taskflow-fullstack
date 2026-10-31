<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

/**
 * Central registry of the OpenAPI component schemas.
 *
 * The schemas mirror the real payloads returned by the API Resources and the
 * ApiResponse support class, so the documentation stays in sync with the code.
 */
#[OA\Components(schemas: [
    new OA\Schema(
        schema: "User",
        type: "object",
        description: "Authenticated user representation (App\\Http\\Resources\\UserResource).",
        properties: [
            new OA\Property(property: "id", type: "integer", example: 1),
            new OA\Property(property: "name", type: "string", example: "John Doe"),
            new OA\Property(property: "email", type: "string", format: "email", example: "john@example.com"),
            new OA\Property(property: "email_verified_at", type: "string", format: "date-time", nullable: true, example: null),
            new OA\Property(property: "created_at", type: "string", format: "date-time", example: "2026-10-30T18:07:18.000000Z"),
            new OA\Property(property: "updated_at", type: "string", format: "date-time", example: "2026-10-30T18:07:18.000000Z"),
        ]
    ),
    new OA\Schema(
        schema: "Project",
        type: "object",
        description: "Project representation (App\\Http\\Resources\\ProjectResource).",
        properties: [
            new OA\Property(property: "id", type: "integer", example: 1),
            new OA\Property(property: "name", type: "string", example: "TaskFlow"),
            new OA\Property(property: "description", type: "string", nullable: true, example: "Internal tooling project"),
            new OA\Property(property: "owner_id", type: "integer", example: 1),
            new OA\Property(property: "owner", ref: "#/components/schemas/User", nullable: true),
            new OA\Property(
                property: "members",
                type: "array",
                nullable: true,
                items: new OA\Items(ref: "#/components/schemas/User")
            ),
            new OA\Property(property: "created_at", type: "string", format: "date-time", example: "2026-10-30T18:07:18.000000Z"),
            new OA\Property(property: "updated_at", type: "string", format: "date-time", example: "2026-10-30T18:07:18.000000Z"),
        ]
    ),
    new OA\Schema(
        schema: "Task",
        type: "object",
        description: "Task representation (App\\Http\\Resources\\TaskResource).",
        properties: [
            new OA\Property(property: "id", type: "integer", example: 1),
            new OA\Property(property: "title", type: "string", example: "Implement comments endpoint"),
            new OA\Property(property: "description", type: "string", nullable: true, example: "Add validation and policies"),
            new OA\Property(property: "status", type: "string", nullable: true, enum: ["pending", "in_progress", "done"], example: "pending"),
            new OA\Property(property: "priority", type: "string", nullable: true, enum: ["low", "medium", "high"], example: "high"),
            new OA\Property(property: "due_date", type: "string", format: "date", nullable: true, example: "2026-12-31"),
            new OA\Property(property: "project_id", type: "integer", example: 1),
            new OA\Property(property: "assigned_to", type: "integer", nullable: true, example: 2),
            new OA\Property(property: "assigned_user", ref: "#/components/schemas/User", nullable: true),
            new OA\Property(property: "created_at", type: "string", format: "date-time", example: "2026-10-30T18:07:18.000000Z"),
            new OA\Property(property: "updated_at", type: "string", format: "date-time", example: "2026-10-30T18:07:18.000000Z"),
        ]
    ),
    new OA\Schema(
        schema: "Comment",
        type: "object",
        description: "Comment representation (App\\Http\\Resources\\CommentResource).",
        properties: [
            new OA\Property(property: "id", type: "integer", example: 1),
            new OA\Property(property: "body", type: "string", example: "I started working on this task."),
            new OA\Property(property: "created_at", type: "string", example: "2026-10-31 07:23:45"),
            new OA\Property(
                property: "author",
                type: "object",
                properties: [
                    new OA\Property(property: "id", type: "integer", example: 2),
                    new OA\Property(property: "name", type: "string", example: "Jane Doe"),
                    new OA\Property(property: "email", type: "string", format: "email", example: "jane@example.com"),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "Pagination",
        type: "object",
        description: "Pagination metadata returned by the task listing endpoint.",
        properties: [
            new OA\Property(property: "total", type: "integer", example: 42),
            new OA\Property(property: "per_page", type: "integer", example: 15),
            new OA\Property(property: "current_page", type: "integer", example: 1),
            new OA\Property(property: "last_page", type: "integer", example: 3),
            new OA\Property(property: "from", type: "integer", nullable: true, example: 1),
            new OA\Property(property: "to", type: "integer", nullable: true, example: 15),
        ]
    ),
    new OA\Schema(
        schema: "ErrorResponse",
        type: "object",
        description: "Standard error payload (App\\Support\\ApiResponse::error).",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: false),
            new OA\Property(property: "message", type: "string", example: "The given data was invalid."),
            new OA\Property(
                property: "errors",
                type: "object",
                nullable: true,
                additionalProperties: true,
                example: ["email" => ["The email has already been taken."]]
            ),
        ]
    ),
    new OA\Schema(
        schema: "MessageResponse",
        type: "object",
        description: "Successful response without a payload.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "Project deleted successfully."),
            new OA\Property(property: "data", nullable: true, example: null),
        ]
    ),
    new OA\Schema(
        schema: "AuthResponse",
        type: "object",
        description: "Authentication payload containing the Sanctum token.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "User logged in successfully."),
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(property: "user", ref: "#/components/schemas/User"),
                    new OA\Property(property: "token", type: "string", example: "1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
                    new OA\Property(property: "token_type", type: "string", example: "Bearer"),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "UserResponse",
        type: "object",
        description: "Response containing a single user.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "Authenticated user."),
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(property: "user", ref: "#/components/schemas/User"),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "ProjectsResponse",
        type: "object",
        description: "Response containing the list of projects of the authenticated user.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "Projects retrieved successfully."),
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(
                        property: "projects",
                        type: "array",
                        items: new OA\Items(ref: "#/components/schemas/Project")
                    ),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "ProjectResponse",
        type: "object",
        description: "Response containing a single project.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "Project retrieved successfully."),
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(property: "project", ref: "#/components/schemas/Project"),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "MembersResponse",
        type: "object",
        description: "Response containing the members of a project.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "Project members retrieved successfully."),
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(
                        property: "members",
                        type: "array",
                        items: new OA\Items(ref: "#/components/schemas/User")
                    ),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "TasksResponse",
        type: "object",
        description: "Response containing a filtered and paginated list of tasks.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "Tasks retrieved successfully."),
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(
                        property: "tasks",
                        type: "array",
                        items: new OA\Items(ref: "#/components/schemas/Task")
                    ),
                    new OA\Property(property: "pagination", ref: "#/components/schemas/Pagination"),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "TaskResponse",
        type: "object",
        description: "Response containing a single task.",
        properties: [
            new OA\Property(property: "success", type: "boolean", example: true),
            new OA\Property(property: "message", type: "string", example: "Task retrieved successfully."),
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(property: "task", ref: "#/components/schemas/Task"),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "CommentResponse",
        type: "object",
        description: "Response containing a single comment (API Resource envelope).",
        properties: [
            new OA\Property(property: "data", ref: "#/components/schemas/Comment"),
        ]
    ),
    new OA\Schema(
        schema: "CommentCollectionResponse",
        type: "object",
        description: "Paginated collection of comments (API Resource collection envelope).",
        properties: [
            new OA\Property(
                property: "data",
                type: "array",
                items: new OA\Items(ref: "#/components/schemas/Comment")
            ),
            new OA\Property(
                property: "links",
                type: "object",
                properties: [
                    new OA\Property(property: "first", type: "string", nullable: true, example: "http://localhost:8000/api/projects/1/tasks/1/comments?page=1"),
                    new OA\Property(property: "last", type: "string", nullable: true, example: "http://localhost:8000/api/projects/1/tasks/1/comments?page=3"),
                    new OA\Property(property: "prev", type: "string", nullable: true, example: null),
                    new OA\Property(property: "next", type: "string", nullable: true, example: "http://localhost:8000/api/projects/1/tasks/1/comments?page=2"),
                ]
            ),
            new OA\Property(
                property: "meta",
                type: "object",
                properties: [
                    new OA\Property(property: "current_page", type: "integer", example: 1),
                    new OA\Property(property: "from", type: "integer", nullable: true, example: 1),
                    new OA\Property(property: "last_page", type: "integer", example: 3),
                    new OA\Property(property: "per_page", type: "integer", example: 15),
                    new OA\Property(property: "to", type: "integer", nullable: true, example: 15),
                    new OA\Property(property: "total", type: "integer", example: 42),
                ]
            ),
        ]
    ),
    new OA\Schema(
        schema: "StatsResponse",
        type: "object",
        description: "Project statistics payload.",
        properties: [
            new OA\Property(
                property: "data",
                type: "object",
                properties: [
                    new OA\Property(property: "total_tasks", type: "integer", example: 10),
                    new OA\Property(property: "pending", type: "integer", example: 3),
                    new OA\Property(property: "in_progress", type: "integer", example: 2),
                    new OA\Property(property: "done", type: "integer", example: 5),
                    new OA\Property(property: "overdue", type: "integer", example: 1),
                    new OA\Property(property: "progress_percentage", type: "number", format: "float", example: 50.0),
                ]
            ),
        ]
    ),
])]
final class ApiSchemas
{
}
