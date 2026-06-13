import { db } from "./firebase-config.js";
import {
    collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function fetchDocument(coll, documentId) {
    const docRef = doc(db, coll, documentId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data() : null;
}

export async function fetchCollection(coll, orderField = null) {
    const collRef = collection(db, coll);
    const q = orderField ? query(collRef, orderBy(orderField, "desc")) : collRef;
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createDocument(coll, data) {
    return await addDoc(collection(db, coll), data);
}

export async function modifyDocument(coll, documentId, data) {
    const docRef = doc(db, coll, documentId);
    return await setDoc(docRef, data, { merge: true });
}

export async function removeDocument(coll, documentId) {
    return await deleteDoc(doc(db, coll, documentId));
}