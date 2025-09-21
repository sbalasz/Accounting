# Firebase Setup Guide for Business Tracker

This guide will help you set up Firebase for your Business Tracker application to enable secure cloud storage and cross-device synchronization.

## 🔥 Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `business-tracker-app`
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### Step 3: Create Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Done"

### Step 4: Get Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (`</>`)
4. Register app with name: `business-tracker-web`
5. Copy the configuration object

### Step 5: Update Configuration

Replace the placeholder values in `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-actual-app-id"
};
```

## 🔒 Security Rules

### Firestore Security Rules

Go to Firestore Database → Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User's transactions
      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's receipts
      match /receipts/{receiptId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Data sharing
    match /shares/{shareId} {
      allow read, write: if request.auth != null && 
        (resource.data.fromUserId == request.auth.uid || 
         resource.data.toEmail == request.auth.token.email);
    }
  }
}
```

## 🚀 Deployment Steps

### Step 1: Update Firebase Config

1. Open `firebase-config.js`
2. Replace placeholder values with your actual Firebase config
3. Save the file

### Step 2: Test the Setup

1. Deploy your app to GitHub Pages
2. Visit the app URL
3. Try registering a new account
4. Verify data syncs across devices

### Step 3: Enable Production Mode

1. In Firestore Database → Rules
2. Change from "test mode" to production rules
3. Update security rules as shown above

## 🔧 Features Enabled

With Firebase setup, your app will have:

- ✅ **Secure Authentication**: Email/password with Firebase Auth
- ✅ **End-to-End Encryption**: Client-side encryption before storage
- ✅ **Cross-Device Sync**: Access data from any browser/device
- ✅ **Real-Time Updates**: Changes sync instantly across devices
- ✅ **Offline Support**: Works offline, syncs when online
- ✅ **Automatic Backup**: Cloud backup and recovery
- ✅ **Data Sharing**: Secure sharing between users

## 🛠️ Troubleshooting

### Common Issues

1. **"Firebase not initialized"**
   - Check if firebase-config.js has correct values
   - Ensure Firebase project is active

2. **"Permission denied"**
   - Check Firestore security rules
   - Ensure user is authenticated

3. **"Encryption failed"**
   - Check if user is logged in
   - Verify password is correct

### Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] Data saves to cloud
- [ ] Data syncs across devices
- [ ] Offline mode works
- [ ] Data sharing works
- [ ] Migration from localStorage works

## 📱 Mobile Support

The Firebase setup also enables:
- Progressive Web App (PWA) capabilities
- Mobile browser support
- Offline functionality
- Push notifications (if enabled)

## 🔐 Security Notes

- All data is encrypted client-side before storage
- Firebase provides server-side security rules
- User passwords are never stored in plain text
- Each user's data is completely isolated
- Data sharing is secure and encrypted

## 📊 Monitoring

Firebase provides built-in monitoring:
- User authentication analytics
- Database usage metrics
- Performance monitoring
- Error tracking

Access these in Firebase Console → Analytics/Performance tabs.

---

**Need Help?** Check Firebase documentation or contact support.
