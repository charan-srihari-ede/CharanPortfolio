import { storage } from "./firebase-config.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export async function processAssetUpload(path, file) {
    // Process compression inline inside client constraints
    const compressed = await optimizeImage(file);
    const targetRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    const metadata = await uploadBytes(targetRef, compressed);
    return await getDownloadURL(metadata.ref);
}

async function optimizeImage(file) {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.82);
            };
        };
    });
}