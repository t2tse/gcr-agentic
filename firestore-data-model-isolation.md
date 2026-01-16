# Firestore Data Model and Isolation Strategy

To ensure strict data isolation between authenticated users for **Checkmate** (Todos) and **Stash** (Links), we will implement a strategy based on **Document-Level Ownership** combined with **Firestore Security Rules**.

## 1. Data Model

We will use **Root Collections** for scalability, stamping every document with a `userId` field. This allows for flexible querying (e.g., Collection Group queries if needed later) while easier to flatten than strict sub-collections for every user.

### Collections Structure

#### `checkmate_lists` (Collection)
Each document represents a Todo List (e.g., "Groceries", "Work").
```json
{
  "id": "auto-generated-id",
  "userId": "firebase-auth-uid",
  "title": "Groceries",
  "icon": "shopping_cart",            // system pre-defined icons
  "createdAt": "serverTimestamp"
}
```

#### `checkmate_tasks` (Collection)
Each document represents a Todo item.
```json
{
  "id": "auto-generated-id",
  "userId": "firebase-auth-uid",      // CRITICAL: The owner of this data
  "listId": "parent-list-id",         // Reference to checkmate_lists
  "title": "Buy milk",
  "description": "Get organic milk from the local store", // optional
  "status": "todo",                   // allowed values: todo, done 
  "priority": "high",                 // allowed values: low, medium, high
  "dueDate": "2024-12-25T00:00:00Z",  // optional
  "createdAt": "serverTimestamp"
}
```

#### `stash_links` (Collection)
Each document represents a saved link.
```json
{
  "id": "auto-generated-id",
  "userId": "firebase-auth-uid",        // CRITICAL: The owner of this data
  "url": "https://example.com/article",
  "image": "https://example.com/image.jpg", // optional
  "summary": "AI generated summary...", // optional
  "tags": ["tech", "ai"],               // optional
  "createdAt": "serverTimestamp"
}
```

---

## 2. Security Rules (Enforcement)

This is where the actual "Isolation" happens. Even if a user tries to guess another user's document ID, Firestore will reject the read/write.

**File: `firestore.rules`**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check ownership
    function isOwner(resourceData) {
      return request.auth != null && request.auth.uid == resourceData.userId;
    }

    // Helper for creating new documents: Owner must match the Auth Token
    function isCreatingOwner() {
      return request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Checkmate Service Rules
    match /checkmate_lists/{listId} {
      allow read, update, delete: if isOwner(resource.data);
      allow create: if isCreatingOwner();
    }

    match /checkmate_tasks/{taskId} {
      // READ: Allow if the existing document's userId matches the requester's UID
      allow read: if isOwner(resource.data);
      
      // CREATE: Allow if the NEW document's userId matches the requester's UID
      allow create: if isCreatingOwner();
      
      // UPDATE/DELETE: Allow if the existing document is owned by the requester
      allow update, delete: if isOwner(resource.data);
    }

    // Stash Service Rules
    match /stash_links/{linkId} {
      allow read: if isOwner(resource.data);
      allow create: if isCreatingOwner();
      allow update, delete: if isOwner(resource.data);
    }
  }
}
```

---

## 3. Application Logic (NestJS)

The application (the "Authorized User") must act on behalf of the user.

1.  **Authentication**: 
    *   **Frontend (Portal)**: Sends a **Firebase ID Token**.
    *   **MCP Client (Agent)**: Sends a **Google Access Token**.
2.  **Guard**: Middleware/Guard validates the token:
    *   **Firebase ID Token**: Verified using `admin.auth().verifyIdToken()`.
    *   **Google Access Token**: Verified using `GoogleAuth` library.
        *   **Audience Check**: Validates `aud` or `azp` matches `GOOGLE_CLIENT_ID`.
        *   **User Mapping**: Maps Google `sub` to Firebase UID via `admin.auth().getUserByProviderUid()`.
        *   **Fallback**: If strict mapping fails, attempts to map via Email (`admin.auth().getUserByEmail()`).
        *   **Strictness**: If no Firebase user is found, the request is **rejected** (401 Unauthorized). Shadow users are **not** created.
    *   **Result**: The Guard resolves a consistent `userId` (Firebase UID) corresponding to the authenticated identity.
3.  **Repository/Service**:
    *   **Writes**: Automatically inject `userId` into the DTO before saving.
    *   **Reads**: Always append `.where('userId', '==', uid)` to every query. 
        *   *Note*: While security rules block unauthorized access, the app should filtered queries to avoid "Missing or insufficient permissions" errors on list operations.

### Example Code Logic (Conceptual)

```typescript
// Create Task
async createTask(user: User, taskDto: CreateTaskDto) {
  const newTask = {
    ...taskDto,
    userId: user.uid, // Forced by backend
  };
  return this.firestore.collection('checkmate_tasks').add(newTask);
}

// Get Tasks
async getTasks(user: User) {
  // MUST filter by userId, otherwise Rule rejects the query for trying to read all
  return this.firestore.collection('checkmate_tasks')
    .where('userId', '==', user.uid)
    .get();
}
```
## IMPORTANT
**Admin SDK vs Security Rules**: 
The Node.js backend uses the **Firebase Admin SDK**, which operates with **Privileged Administrative Access**, bypassing Firestore Security Rules. 
Therefore, the **Application Logic (Service Layer)** is strictly responsible for enforcing data isolation by always including the `userId` in queries and writes. The ID token is **NOT** forwarded to Firestore.

## Summary
*   **Isolation**: Guaranteed by Firestore Rules (for direct access) and Application Logic (for API access).
*   **Performance**: Root collections allow efficient indexing.
*   **Scalability**: No single "User" document bottleneck.


