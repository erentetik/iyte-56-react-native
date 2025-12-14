# Firestore Indexes

This document lists all the composite indexes required for the IYTE56 app to function properly.

## How to Create Indexes

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Firestore Database → Indexes
4. Click "Create Index" for each index below

Alternatively, when a query fails due to a missing index, Firebase will show a link in the error message to create the index automatically.

---

## Required Composite Indexes

### 1. Posts - Latest Feed

**Collection:** `posts`

| Field | Order |
|-------|-------|
| `visibility` | Ascending |
| `isDeleted` | Ascending |
| `isHidden` | Ascending |
| `moderationChecked` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching the public feed with non-deleted, non-hidden, moderation-checked posts sorted by newest first.

---

### 1b. Posts - Featured Feed (by Popularity Score) ⚠️ REQUIRED

**Collection:** `posts`

| Field | Order |
|-------|-------|
| `visibility` | Ascending |
| `isDeleted` | Ascending |
| `isHidden` | Ascending |
| `moderationChecked` | Ascending |
| `popularityScore` | Descending |
| `createdAt` | Descending |

**Purpose:** Fetching the featured feed with posts sorted by `popularityScore` (calculated score) then by creation date. The `popularityScore` should be updated by a Cloud Function based on likes, comments, views, etc. Only shows moderation-checked posts.

---

### 2. Posts - User Posts (Profile)

**Collection:** `posts`

| Field | Order |
|-------|-------|
| `authorId` | Ascending |
| `isDeleted` | Ascending |
| `moderationChecked` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching a user's posts for their profile page. Only shows moderation-checked posts.

---

### 2b. Posts - Following Feed ⚠️ REQUIRED

**Collection:** `posts`

| Field | Order |
|-------|-------|
| `authorId` | Ascending |
| `isDeleted` | Ascending |
| `isHidden` | Ascending |
| `moderationChecked` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching posts from users that the current user follows. Only shows moderation-checked, non-hidden posts.

---

### 3. Comments - By Post (Simplified)

**Collection:** `comments`

| Field | Order |
|-------|-------|
| `postId` | Ascending |
| `createdAt` | Ascending |

**Purpose:** Fetching comments for a post. Top-level/replies and deleted/hidden filtering done in memory for simpler indexes.

---

### 4. Comments - Replies to Comment ⚠️ REQUIRED FOR NESTED REPLIES

**Collection:** `comments`

| Field | Order |
|-------|-------|
| `postId` | Ascending |
| `parentCommentId` | Ascending |
| `createdAt` | Ascending |

**Purpose:** Fetching replies to a specific comment.

---

### 5. Post Likes - By Post

**Collection:** `post_likes`

| Field | Order |
|-------|-------|
| `postId` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching users who liked a specific post.

---

### 6. Post Likes - By User

**Collection:** `post_likes`

| Field | Order |
|-------|-------|
| `userId` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching posts that a user has liked.

---

### 7. Post Likes - Batch Check

**Collection:** `post_likes`

| Field | Order |
|-------|-------|
| `postId` | Ascending |
| `userId` | Ascending |

**Purpose:** Batch checking if a user has liked multiple posts (for feed display).

---

### 8. Follows - User Followers

**Collection:** `follows`

| Field | Order |
|-------|-------|
| `followingId` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching a user's followers.

---

### 9. Follows - User Following

**Collection:** `follows`

| Field | Order |
|-------|-------|
| `followerId` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching users that someone is following.

---

### 10. Saved Posts - By User ⚠️ REQUIRED FOR PROFILE SAVED TAB

**Collection:** `saved_posts`

| Field | Order |
|-------|-------|
| `userId` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching posts that a user has saved (for profile saved tab).

---

### 11. Saved Posts - Batch Check ⚠️ REQUIRED FOR PROFILE SAVED TAB

**Collection:** `saved_posts`

| Field | Order |
|-------|-------|
| `postId` | Ascending |
| `userId` | Ascending |

**Purpose:** Batch checking if a user has saved multiple posts (for feed display and profile saved tab).

---

### 12. Notifications - By User ⚠️ REQUIRED FOR NOTIFICATIONS PAGE

**Collection:** `notifications`

| Field | Order |
|-------|-------|
| `userId` | Ascending |
| `createdAt` | Descending |

**Purpose:** Fetching user notifications sorted by newest first.

---

## Firebase CLI Deployment

You can also deploy indexes using Firebase CLI. Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "isHidden", "order": "ASCENDING" },
        { "fieldPath": "moderationChecked", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "visibility", "order": "ASCENDING" },
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "isHidden", "order": "ASCENDING" },
        { "fieldPath": "moderationChecked", "order": "ASCENDING" },
        { "fieldPath": "popularityScore", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "moderationChecked", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "isHidden", "order": "ASCENDING" },
        { "fieldPath": "moderationChecked", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "postId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "postId", "order": "ASCENDING" },
        { "fieldPath": "parentCommentId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "post_likes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "postId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "post_likes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "post_likes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "postId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "follows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "followingId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "follows",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "followerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "saved_posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "saved_posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "postId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Then run:
```bash
firebase deploy --only firestore:indexes
```

---

## Notes

- Indexes may take a few minutes to build after creation
- Some queries may fail until their indexes are fully built
- The Firebase Console will show index build progress
- You can check the "Indexes" tab in Firestore to see all existing indexes and their status

