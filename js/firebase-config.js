import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Values read seamlessly globally across injection environments. Replace strings with production values.
 const firebaseConfig = {
    apiKey: "AIzaSyAfvnQHt1H_1vqA1jevSHimM-WEHjdVJtk",
    authDomain: "porfolio-233d9.firebaseapp.com",
    projectId: "porfolio-233d9",
    storageBucket: "porfolio-233d9.firebasestorage.app",
    messagingSenderId: "111169879283",
    appId: "1:111169879283:web:c156cdc48a9ef754bccb86",
    measurementId: "G-4TRSD33L60"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
