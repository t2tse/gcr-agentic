# Stash Application Design

This document outlines the detailed application design for **Stash**, the personal link aggregator microservice.

## 1. Overview
Stash allows users to save, categorize, and summarize web links. It leverages AI (Gemini) to automatically generate summaries and tags for saved content.

## 2. User Interface Design Scope
Based on the high-level requirements, the Stash UI supports:
*   **Link Views**:
    *   **Grid View**: Cards with preview image, domain, title, AI summary, and tags.
    *   **List View**: Compact rows.
*   **Controls**:
    *   **Categorization**: Dropdown filter for tags (e.g., Tech, Food).
    *   **Add Link**: Input field accepting a URL with "Auto Tag" and "Generate Summary" toggles.
*   **Stats**: Cards for "Total Stashed" and "AI Summarized".

## 3. Architecture & Components
*   **Frontend**: Next.js Page (`/stash`).
*   **Backend**: NestJS Service (`StashService`).
*   **AI Service**: Google Gemini API (via direct integration in Backend).
*   **Database**: Google Cloud Firestore.
    *   Collection: `stash_links`
*   **External**: Target URLs (for content fetching).

## 4. API Endpoints

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/stash/links` | Fetch saved links | `tag`, `sort`, `search` |
| `POST` | `/api/stash/links` | Add a new link (triggers AI pipeline) | - |
| `DELETE` | `/api/stash/links/:id` | Delete a link | - |
| `GET` | `/api/stash/stats` | Fetch usage stats | - |

## 5. User Journeys & Sequence Diagrams

### Journey 1: Viewing Stashed Links
**Goal**: User views their collection of links, potentially filtered by a tag like "AI".

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Stash Service (NestJS)
    participant DB as Firestore
    
    User->>Frontend: Navigates to /stash (or selects "AI" filter)
    
    Frontend->>API: GET /links?tag=AI
    
    API->>DB: Query stash_links (where userId == uid AND tags contains "AI")
    DB-->>API: Return Links
    
    API-->>Frontend: Return Links JSON
    Frontend->>User: Renders Grid of Link Cards
```

### Journey 2: Adding a Link (The AI Pipeline)
**Goal**: User pastes a URL (e.g., specific tech article) and clicks "Add". The system fetches metadata, summarizes it, and tags it.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Stash Service (NestJS)
    participant External as External Website
    participant Gemini as Gemini API
    participant DB as Firestore

    User->>Frontend: Pastes URL, clicks "Add"
    Frontend->>API: POST /links
    Note right of Frontend: Body: { url: "https://example.com/..." }
    
    API->>API: Validate URL
    
    par Metadata Fetching
        API->>External: GET / (Fetch HTML)
        External-->>API: Return HTML Content
        API->>API: Extract Title, Description, OG Image
    end
    
    alt AI Processing Enabled
        API->>Gemini: Prompt: "Summarize and Generate Tags for this content..."
        Gemini-->>API: Return JSON { summary: "...", tags: ["Tech", "AI"] }
    end
    
    API->>DB: Create 'stash_links' Document
    Note right of DB: { userId: "uid", url, title, summary, tags... }
    DB-->>API: Return ID
    
    API-->>Frontend: Return Created Link Object
    Frontend->>User: Prepend new card to Grid
```

### Journey 3: Loading Stats
**Goal**: User sees summary statistics like "Total Stashed" and "AI Summarized" on the Stash dashboard.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Stash Service (NestJS)
    participant DB as Firestore
    
    User->>Frontend: Loads /stash Dashboard
    
    Frontend->>API: GET /stats
    
    API->>DB: Count stash_links (where userId == uid)
    Note right of DB: Aggregations: Total, With Summary
    DB-->>API: Return counts
    
    API-->>Frontend: Return Stats JSON { total: 120, summarized: 85 }
    Frontend->>User: Renders Summary Cards
```

### Journey 4: Deleting a Link
**Goal**: User removes a saved link from their collection.

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Stash Service (NestJS)
    participant DB as Firestore

    User->>Frontend: Clicks "Delete" icon on Link Card
    Frontend->>User: Removes card from UI (Optimistic/Loading state)
    
    Frontend->>API: DELETE /links/{id}
    
    API->>DB: Delete stash_links/{id} (where userId == uid)
    DB-->>API: Success
    
    API-->>Frontend: Return 204 No Content
    Frontend->>User: Confirm deletion
```
