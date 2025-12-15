import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Export các service để dùng trong app
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
