export function launchNotification(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const element = document.createElement("div");
    element.className = `toast ${type}`;
    element.innerText = message;
    container.appendChild(element);
    setTimeout(() => { element.style.opacity = "0"; setTimeout(() => element.remove(), 400); }, 4000);
}

export function debounceEvent(callback, delay = 350) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback.apply(null, args), delay);
    };
}