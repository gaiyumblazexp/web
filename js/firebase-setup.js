import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, remove, push, onChildAdded } 
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// আপনার দেওয়া Firebase Credentials
const firebaseConfig = {
  apiKey: "AIzaSyBI4GN_MeKm3fwVUeiouO0Opib-5w3-iio",
  authDomain: "gaivexofficial.firebaseapp.com",
  projectId: "gaivexofficial",
  storageBucket: "gaivexofficial.firebasestorage.app",
  messagingSenderId: "908554622906",
  appId: "1:908554622906:web:93df8fa45f7d29afbfef83",
  measurementId: "G-2766CQ56K9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// প্রতি প্লেয়ারের জন্য স্বয়ংক্রিয় ইউনিক সেশন আইডি
export const myPlayerId = 'sync_' + Math.random().toString(36).substring(2, 9);
export const myPlayerColor = Math.floor(Math.random() * 0xffffff);
