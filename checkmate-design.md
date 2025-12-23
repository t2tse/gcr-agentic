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
    *   Filtering: All Tasks, Incomplete Only, Completed Only.
    *   Sorting: By Date, Priority.
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

**Acceptance Criteria**:
1.  **Sidebar Loading**:
    *   [ ] The sidebar MUST display all lists associated with the authenticated user.
    *   [ ] Each list item MUST show a count of incomplete tasks.
    *   [ ] If no lists exist, a default "Inbox" list (or system default) should be shown.
2.  **Task Loading**:
    *   [ ] The main view MUST display a list of tasks for the default selected list (or "All Tasks").
    *   [ ] Tasks MUST be sorted by `dueDate` asc and then `createdAt` desc by default.
    *   [ ] Loading skeletons or spinners MUST be shown while data is fetching.
3.  **Stats**:
    *   [ ] "Total Tasks", "Completed", and "Overdue" counters MUST accurately reflect the user's data.
4.  **Error Handling**:
    *   [ ] If the API fails, a user-friendly error message ("Failed to load tasks") MUST be displayed.

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
**Goal**: User adds a new task, for example, "Buy Milk" to the "Personal" list with "High" priority.

**Acceptance Criteria**:
1.  **Input Validation**:
    *   [ ] Task title MUST NOT be empty.
    *   [ ] If no list is selected, it MUST default to "Inbox" (or system default).
2.  **Creation Flow**:
    *   [ ] Clicking "Add Task" (or pressing Enter) MUST send a POST request to the API.
    *   [ ] The UI MUST be updated immediately (either optimistically or after API response) to show the new task at the top or correct sort position.
    *   [ ] The input field MUST be cleared after successful submission.
3.  **Data Integrity**:
    *   [ ] The new task MUST be saved with the correct `listId` and `priority`.
    *   [ ] The `userId` MUST be securely attached by the backend (not just trust the frontend).
4.  **Side Effects**:
    *   [ ] The sidebar list count MUST increase by 1.
    *   [ ] The "Total Tasks" stat MUST increase by 1.
    *   [ ] The "Completed" stat MUST be unchanged.
    *   [ ] The "Overdue" stat MUST be unchanged unless the new task is overdue.

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

**Acceptance Criteria**:
1.  **Interaction**:
    *   [ ] Clicking the checkbox MUST visually toggle the state immediately (Optimistic UI).
    *   [ ] Completed tasks MUST have a visual distinction (e.g., strikethrough text, dimmed color).
2.  **Persistence**:
    *   [ ] The change MUST be persisted to the backend via an API call.
    *   [ ] If filters are set to "Incomplete Only", the task MUST disappear from the view after a short delay or immediately.
3.  **Reversal**:
    *   [ ] Clicking a completed checkbox MUST mark the task as incomplete again.
4.  **Side Effects**:
    *   [ ] The sidebar list count MUST decrease by 1.
    *   [ ] The "Total Tasks" stat MUST be unchanged.
    *   [ ] The "Completed" stat MUST increase by 1.
    *   [ ] The "Overdue" stat MUST decrease by 1 if the task was overdue.

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

**Acceptance Criteria**:
1.  **Interaction**:
    *   [ ] Clicking the delete icon on the task MUST remove the task from the UI immediately.
    *   [ ] A confirmation dialog or "Undo" toast MUST be displayed to prevent accidental deletion.
2.  **Persistence**:
    *   [ ] The task document MUST be permanently deleted in the backend.
3.  **Side Effects**:
    *   [ ] The sidebar list count MUST decrease by 1.
    *   [ ] The "Total Tasks" stat MUST decrease by 1.
    *   [ ] The "Completed" stat MUST decrease by 1 if the task was completed.
    *   [ ] The "Overdue" stat MUST decrease by 1 if the task was overdue.

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
