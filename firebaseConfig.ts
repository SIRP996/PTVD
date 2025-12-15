import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- QUAN TRỌNG: FIREBASE SECURITY RULES ---
// Nếu bạn gặp lỗi "Missing or insufficient permissions" khi lưu DB:
// 1. Vào Firebase Console -> Firestore Database -> Tab Rules
// 2. Dán đoạn này vào và Publish:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if request.auth != null;
//     }
//   }
// }

// --- CẤU HÌNH FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC24OGaST3WdFCsZYizIy76W1UjP6GGGOU", 
  authDomain: "tiktok-script-architect.firebaseapp.com",
  projectId: "tiktok-script-architect",
  storageBucket: "tiktok-script-architect.firebasestorage.app",
  messagingSenderId: "284293128834",
  appId: "1:284293128834:web:29a680badea3fea8460a9b"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();