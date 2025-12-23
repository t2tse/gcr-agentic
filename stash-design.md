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

**Acceptance Criteria**:
1.  **Display**:
    *   [ ] Links MUST be displayed in a Grid View by default.
    *   [ ] Each card MUST show the Title, Domain, and Tags.
    *   [ ] If a summary exists, it MUST be displayed.
2.  **Filtering**:
    *   [ ] Selecting a tag from the dropdown MUST filter the list to show only links with that tag.
    *   [ ] The URL query parameter `?tag=...` SHOULD reflect the current filter state. It supports multiple tags separated by commas (e.g., `?tag=AI,Food`).
3.  **Pagination/Loading**:
    *   [ ] Infinite scroll or "Load More" SHOULD be implemented if there are many links.

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

**Acceptance Criteria**:
1.  **Input**:
    *   [ ] Input MUST accept valid URLs (validation: http/https).
    *   [ ] "Auto Tag" and "Generate Summary" toggles SHOULD be enabled by default.
2.  **Processing**:
    *   [ ] The system MUST fetch the page title and metadata (OG Image).
    *   [ ] If AI switches are ON, the system MUST call the Gemini API.
    *   [ ] Tags MUST be generated automatically based on content. System should not generate more than 3 tags.
3.  **Completion**:
    *   [ ] The new link card MUST appear in the grid once processing is complete.
    *   [ ] If AI processing fails, the link SHOULD still be saved with just the raw URL and title. The summary and tags should be empty. User should be notified of the failure.

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

**Acceptance Criteria**:
1.  **Accuracy**:
    *   [ ] "Total Stashed" MUST match the exact count of user's documents.
    *   [ ] "AI Summarized" MUST match the count of documents where `summary` is not null.
2.  **Performance**:
    *   [ ] Stats SHOULD load independently or in parallel with the link list to avoid blocking the UI.

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

**Acceptance Criteria**:
1.  **Interaction**:
    *   [ ] The Delete button appears after select one or more cards by clicking the checkbox on the card.
    *   [ ] Clicking "Delete" MUST remove the card(s) selected from the UI.
    *   [ ] A confirmation dialog or "Undo" toast MUST be displayed to prevent accidental deletion.
2.  **Persistence**:
    *   [ ] The document MUST be permanently removed from `stash_links`.
3.  **Safety**:
    *   [ ] Users SHOULD ONLY be able to delete their own links (enforced by Security Rules).

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Next.js Client
    participant API as Stash Service (NestJS)
    participant DB as Firestore

    User->>Frontend: Clicks "Delete" button after selecting one or more cards
    Frontend->>User: Removes selected cards from UI (Optimistic/Loading state)
    
    Frontend->>API: DELETE /links/{id}
    
    API->>DB: Delete stash_links/{id} (where userId == uid)
    DB-->>API: Success
    
    API-->>Frontend: Return 204 No Content
    Frontend->>User: Confirm deletion
```
