// Shared by index.html and admin.html. The web config is public by design;
// access is enforced by firestore.rules, not by hiding this key.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAAxCTT0bK-Ub4grAQ8i9kWMP2UlL4Tj0",
  authDomain: "zyvora-e880e.firebaseapp.com",
  projectId: "zyvora-e880e",
  storageBucket: "zyvora-e880e.firebasestorage.app",
  messagingSenderId: "986314347955",
  appId: "1:986314347955:web:1af8b9b4699a73f4dce7c6",
  measurementId: "G-GR804VQBKM"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Image uploads use Cloudinary's free tier (Firebase Storage now needs a paid plan).
// Fill both values after creating an UNSIGNED upload preset in Cloudinary. Leave empty to disable uploads.
export const CLOUDINARY = { cloud: "eulhhqi0", preset: "gaivex_upload" };
