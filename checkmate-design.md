# Checkmate Application Design

This document outlines the detailed application design for **Checkmate**, the task management microservice of the Personal Assistant application.

## 1. Overview
Checkmate provides users with a comprehensive interface to manage tasks, organized by lists (e.g., Personal, Work). It supports task creation, filtering, sorting, and status tracking. The backend is built with NestJS and uses Firestore for persistence.

## 2. User Interface Design Scope
Based on the high-level requirements, the Checkmate UI supports:
*   **Sidebar**: Navigation for "Lists" with task counts.
*   **Task List View**: Main area showing tasks with:
    *   Checkbox (Status toggle)
    *   Title & Description
    *   Priority (High, Medium, Low)
    *   Due Date
*   **Controls**:
    *   Filtering: All, Incomplete, Completed.
    *   Sorting: By Date, Priority.
    *   Bulk Actions: Delete.
*   **Quick Add**: Input field for rapid task creation.

## 3. Architecture & Components
*   **Frontend**: Next.js Page (`/checkmate`) calling Backend APIs.
*   **Backend**: NestJS Service (`CheckmateService`).
*   **Database**: Google Cloud Firestore.
    *   Collection: `checkmate_lists`
    *   Collection: `checkmate_tasks`
*   **Security**: Firebase Auth Token validation; Data isolation via `userId`.

## 4. API Endpoints
The frontend interacts with the backend via the following RESTful endpoints:

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/checkmate/lists` | Fetch all lists for sidebar | - |
| `GET` | `/api/checkmate/tasks` | Fetch tasks | `listId`, `status`, `sort` |
| `POST` | `/api/checkmate/tasks` | Create a new task | - |
| `PATCH` | `/api/checkmate/tasks/:id` | Update task (status, etc.) | - |
| `DELETE` | `/api/checkmate/tasks/:id` | Delete a task | - |
| `GET` | `/api/checkmate/stats` | Fetch summary stats | - |

## 5. User Journeys & Sequence Diagrams

### Journey 1: Loading the Checkmate Dashboard
**Goal**: User opens the Checkmate page. The system must load user-defined lists for the sidebar and the default view of tasks (e.g., "All Tasks" or "Inbox").

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Checkmate Service (NestJS)
    participant DB as Firestore
    
    User->>Frontend: Navigates to /checkmate
    
    par Load Lists
        Frontend->>API: GET /lists
        API->>DB: Query checkmate_lists (where userId == uid)
        DB-->>API: Return Lists
        API-->>Frontend: Return List JSON [ {id, title, count...} ]
    and Load Default Tasks
        Frontend->>API: GET /tasks?limit=50&sort=date
        API->>DB: Query checkmate_tasks (where userId == uid)
        DB-->>API: Return Tasks
        API-->>Frontend: Return Task JSON
    and Load Stats
        Frontend->>API: GET /stats
        API->>DB: Count tasks (total, completed, overdue)
        DB-->>API: Return Stats
        API-->>Frontend: Return Stats JSON
    end
    
    Frontend->>User: Renders Sidebar, Task List, and Stats
```

### Journey 2: Creating a New Task
**Goal**: User adds a new task "Buy Milk" to the "Personal" list with "High" priority.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Checkmate Service (NestJS)
    participant DB as Firestore

    User->>Frontend: Enters "Buy Milk", selects "Personal", "High"
    User->>Frontend: Clicks "Add Task"
    
    Frontend->>API: POST /tasks
    Note right of Frontend: Body: { title: "Buy Milk", listId: "...", priority: "high" }
    
    API->>API: Validate DTO & Extract UID from Token
    
    API->>DB: Add document to 'checkmate_tasks'
    Note right of DB: { userId: "uid", title: "Buy Milk", status: "todo", ... }
    DB-->>API: Return New Document ID
    
    API-->>Frontend: Return Created Task Object (201 Created)
    
    Frontend->>User: Updates UI (Appends task to list)
```

### Journey 3: Completing a Task
**Goal**: User clicks the checkbox to mark a task as "Done".

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Checkmate Service (NestJS)
    participant DB as Firestore

    User->>Frontend: Clicks Checkbox on Task A
    Frontend->>User: Optimistically updates UI (shows strikethrough)
    
    Frontend->>API: PATCH /tasks/{taskId}
    Note right of Frontend: Body: { status: "done" }
    
    API->>API: Validate Ownership (userId matches)
    API->>DB: Update 'checkmate_tasks/{taskId}'
    DB-->>API: Success
    
    API-->>Frontend: Return Updated Task (200 OK)
```

### Journey 4: Deleting a Task
**Goal**: User deletes a task.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Checkmate Service (NestJS)
    participant DB as Firestore
    
    User->>Frontend: Clicks Delete Icon
    Frontend->>User: Removes item from UI
    
    Frontend->>API: DELETE /tasks/{taskId}
    
    API->>DB: Delete document 'checkmate_tasks/{taskId}'
    Note right of DB: Ensure userId matches before delete
    DB-->>API: Success
    
    API-->>Frontend: Return Success (204 No Content)
```
