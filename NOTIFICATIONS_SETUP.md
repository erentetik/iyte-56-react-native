# Push Notifications Setup Guide

## Current Implementation Status

✅ **Completed:**
- Notification documents are created in Firestore when likes/comments happen
- FCM tokens are saved to user documents
- Notifications are displayed in the app UI
- Permission requests are handled

❌ **Missing:**
- Actual push notification delivery via FCM

## What's Needed

To complete the notification system, you need a **Firebase Cloud Function** that sends push notifications when notification documents are created.

## Setup Steps

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Initialize Firebase Functions
```bash
firebase init functions
```
- Select TypeScript
- Install dependencies when prompted

### 3. Copy Cloud Function Code
Copy the example from `functions/src/index.ts.example` to `functions/src/index.ts`

### 4. Install Dependencies
```bash
cd functions
npm install firebase-admin firebase-functions
```

### 5. Deploy Function
```bash
firebase deploy --only functions
```

## How It Works

1. **Client creates notification** → `createNotification()` creates a document in Firestore
2. **Cloud Function triggers** → `onNotificationCreated` function runs automatically
3. **Function fetches FCM token** → Gets token from user document
4. **Function sends push** → Uses FCM API to send notification to device
5. **Device receives notification** → User sees push notification

## Alternative: Backend Service

If you prefer not to use Cloud Functions, you can create a backend service (Node.js, Python, etc.) that:
- Listens to Firestore changes (via Firestore listeners or polling)
- Sends push notifications using FCM Admin SDK

## Testing

After deploying the Cloud Function:
1. Like/comment on a post
2. Check that notification document is created in Firestore
3. Verify push notification is received on device
4. Check Cloud Functions logs for any errors

## Notes

- The Cloud Function automatically handles invalid tokens (removes them)
- Push notifications work even when app is closed
- Notifications are queued if device is offline
- You can customize notification sound, badge, and data payload
