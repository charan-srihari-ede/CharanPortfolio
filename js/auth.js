import { auth } from "./firebase-config.js";
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const form = document.getElementById("login-form");
const errMsg = document.getElementById("error-message");

if (form) {
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const pass = document.getElementById("login-password").value;
        const btn = document.getElementById("login-btn");

        btn.disabled = true; btn.innerText = "Authorizing Access Token...";
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            window.location.replace("admin.html");
        } catch (err) {
            errMsg.innerText = `Access Denied: ${err.message}`;
            btn.disabled = false; btn.innerText = "Secure Login";
        }
    });
}

export function enforceAuthProtection(onValidSession) {
    onAuthStateChanged(auth, (user) => {
        if (!user && window.location.pathname.includes("admin.html")) {
            window.location.replace("login.html");
        } else if (onValidSession) {
            onValidSession(user);
        }
    });
}

export async function killSession() {
    await signOut(auth);
    window.location.replace("login.html");
}