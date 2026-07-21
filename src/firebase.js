import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
 apiKey: "AIzaSyBfwLf6cRzvQ4IMl6uBgEkKv6OtK3hrBvg",
  authDomain: "smartqueueapp-bc900.firebaseapp.com",
  projectId: "smartqueueapp-bc900",
  storageBucket: "smartqueueapp-bc900.firebasestorage.app",
  messagingSenderId: "1057738027042",
  appId: "1:1057738027042:web:1c37d75e46118f56b05a7b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();