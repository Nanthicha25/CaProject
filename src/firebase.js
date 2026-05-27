// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
console.log("Project ID is:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
/*const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};*/

//caproject3
const firebaseConfig = {
  apiKey: "AIzaSyAlINF7d_MY1spMzdqI4OVu12tcCZTF48k",
  authDomain: "caproject3-bd0fa.firebaseapp.com",
  projectId: "caproject3-bd0fa",
  storageBucket: "caproject3-bd0fa.firebasestorage.app",
  messagingSenderId: "530235181973",
  appId: "1:530235181973:web:63a4e4ea061fea62f1049c",
  measurementId: "G-15RYETYF3Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

import { getFirestore } from "firebase/firestore"; // 1. นำเข้า Firestore
import { getStorage } from "firebase/storage";   // 2. นำเข้า Storage (เผื่อใช้อัปโหลดรูป)

export const db = getFirestore(app);              // 3. Export ตัวแปร db ไปใช้
export const storage = getStorage(app);           // 4. Export ตัวแปร storage ไปใช้