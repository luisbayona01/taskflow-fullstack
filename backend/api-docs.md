# TaskFlow API Documentation (OpenAPI 3.0)

```yaml
openapi: 3.0.0
info:
  title: TaskFlow API
  description: API for project and task management.
  version: 1.0.0
servers:
  - url: http://localhost:8000/api
    description: Local Development Server

components:
  securitySchemes:
    sanctum:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - sanctum: []

paths:
  /projects:
    get:
      summary: List all projects
      responses:
        '200':
          description: List of projects
    post:
      summary: Create a new project
      responses:
        '201':
          description: Project created

  /projects/{project}:
    parameters:
      - name: project
        in: path
        required: true
        schema:
          type: string
    get:
      summary: Get project details
      responses:
        '200':
          description: Project details
    put:
      summary: Update project
      responses:
        '200':
          description: Project updated
    delete:
      summary: Delete project
      responses:
        '204':
          description: Project deleted

  /projects/{project}/members:
    parameters:
      - name: project
        in: path
        required: true
        schema:
          type: string
    get:
      summary: List project members
      responses:
        '200':
          description: List of members
    post:
      summary: Add member to project
      responses:
        '201':
          description: Member added

  /projects/{project}/stats:
    parameters:
      - name: project
        in: path
        required: true
        schema:
          type: string
    get:
      summary: Get project statistics
      responses:
        '200':
          description: Project stats (total, pending, in_progress, done, overdue, progress_percentage)
        '403':
          description: Not a member of the project

  /projects/{project}/tasks:
    parameters:
      - name: project
        in: path
        required: true
        schema:
          type: string
    get:
      summary: List filtered tasks
      responses:
        '200':
          description: Paginated list of tasks
    post:
      summary: Create a task
      responses:
        '201':
          description: Task created

  /projects/{project}/tasks/{task}:
    parameters:
      - name: project
        in: path
        required: true
        schema:
          type: string
      - name: task
        in: path
        required: true
        schema:
          type: string
    get:
      summary: Get task details
      responses:
        '200':
          description: Task details
    put:
      summary: Update task
      responses:
        '200':
          description: Task updated
    delete:
      summary: Delete task
      responses:
        '204':
          description: Task deleted

  /projects/{project}/tasks/{task}/comments:
    parameters:
      - name: project
        in: path
        required: true
        schema:
          type: string
      - name: task
        in: path
        required: true
        schema:
          type: string
    get:
      summary: List task comments
      responses:
        '200':
          description: Paginated list of comments
    post:
      summary: Add a comment to a task
      responses:
        '201':
          description: Comment created
```
