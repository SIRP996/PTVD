import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- CẤU HÌNH FIREBASE ---
// Anh hãy thay thế các giá trị bên dưới bằng thông tin từ Firebase Console của anh
const firebaseConfig = {
  apiKey: "AIzaSyC24OGaST3WdFCsZYizIy76W1UjP6GGGOU", // Thay bằng API Key thật
  authDomain: "tiktok-script-architect.firebaseapp.com", // Thay bằng Auth Domain thật
  projectId: "tiktok-script-architect",                  // Thay bằng Project ID thật
  storageBucket: "tiktok-script-architect.firebasestorage.app",
  messagingSenderId: "284293128834",
  appId: "1:284293128834:web:29a680badea3fea8460a9b"
};

// Khởi tạo Firebase (Check duplicates for hot-reload safety)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export các service để dùng trong app
export const db = firebase.firestore();
export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
