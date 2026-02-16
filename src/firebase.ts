// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "ma-todo-list-guy.firebaseapp.com",
  projectId: "ma-todo-list-guy",
  storageBucket: "ma-todo-list-guy.firebasestorage.app",
  messagingSenderId: "973449982019",
  appId: "1:973449982019:web:283a28cef2a2cb803d64f6"
};

// Initialise Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);