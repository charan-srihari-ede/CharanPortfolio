import { fetchDocument, fetchCollection, createDocument } from "./firestore.js";
import { launchNotification, debounceEvent } from "./ui.js";

let certsCached = [];
let lightboxIdx = 0;

document.addEventListener("DOMContentLoaded", async () => {
    setupThemeEngine();
    setupMobileNav();
    await loadPortfolioRuntime();
    document.getElementById("loading-screen").style.opacity = "0";
    setTimeout(() => document.getElementById("loading-screen").style.display = "none", 400);
});

function setupThemeEngine() {
    const toggle = document.getElementById("theme-toggle");
    const activeTheme = localStorage.getItem("portfolio-theme") ||
        (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

    document.documentElement.setAttribute("data-theme", activeTheme);
    updateThemeIcon(activeTheme);

    toggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("portfolio-theme", next);
        updateThemeIcon(next);
    });
}


function updateThemeIcon(theme) {
    const icon = document.querySelector("#theme-toggle i");
    if (icon) icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
}

function setupMobileNav() {
    const btn = document.getElementById("mobile-menu-btn");
    const links = document.getElementById("nav-links");
    btn.addEventListener("click", () => links.classList.toggle("active"));

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            links.classList.remove("active");
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
}

async function loadPortfolioRuntime() {
    const logo = document.getElementById("nav-brand");
let tapCount = 0;

logo.addEventListener("click", () => {
    tapCount++;

    if (tapCount === 5) {
        window.location.href = "/admin.html";
        tapCount = 0;
    }

    setTimeout(() => {
        tapCount = 0;
    }, 1000);
});

    await Promise.all([
        renderProfile(),
        renderExperience(),
        renderSkills(),
        renderEducation(),
        renderProjects(),
        renderCertificates(),
        renderResumeContext()
    ]);
    setupContactForm();
    setupTabRouting();
}

async function renderProfile() {
    const data = await fetchDocument("personalInfo", "profile");
    if (!data) return;
    const target = document.getElementById("hero-container");
    target.classList.remove("skeleton");
    target.innerHTML = `
        <img class="hero-avatar" src="${data.photoUrl || 'assets/placeholders/avatar.png'}" alt="${data.name}">
        <h1 class="animate-text">${data.name}</h1>
        <p class="subtitle">${data.title} @ <span class="highlight">${data.company}</span></p>
        <p class="summary-text">${data.summary.split("Hi")[0]}</p>
        <div class="hero-socials">
            ${data.linkedin ? `<a href="${data.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
            ${data.github ? `<a href="${data.github}" target="_blank"><i class="fab fa-github"></i></a>` : ''}
            ${data.portfolio ? `<a href="${data.portfolio}" target="_blank"><i class="fas fa-globe"></i></a>` : ''}
            ${data.email ? `<a href="mailto:${data.email}"><i class="fas fa-envelope"></i></a>` : ''}
        </div>
    `;

    document.getElementById("nav-brand").innerText = data.name;
    document.getElementById("bio-text").classList.remove("skeleton-text");
    document.getElementById("bio-text").innerText = data.summary.split("<br>")[2];
}

async function renderExperience() {
    const items = await fetchCollection("experience", "startDate");
    const timeline = document.getElementById("experience-timeline");

    // Group multiple roles at the same company
    const grouped = items.reduce((acc, current) => {
        if (!acc[current.company]) {
            acc[current.company] = {
                meta: current,
                roles: []
            };
        }
        acc[current.company].roles.push(current);
        return acc;
    }, {});

    timeline.innerHTML = Object.values(grouped).map(group => `
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-card glass-card">
                <h3><img style="width:25px;height:25px;margin:2px 10px -5px 0px;border-radius:10px" src="${group.meta.logoUrl || 'assets/placeholders/avatar.png'}" alt="">${group.meta.company}</h3>
                <div class="timeline-sub">${group.meta.location || ''} • ${group.meta.type || ''}</div>
                <div class="nested-roles">
    ${group.roles.map(role => `
        <div class="role-block">
            <strong>
                ${role.title}
                <span class="timeline-sub">
                    (${getDuration(role.startDate, role.endDate)})
                </span>
            </strong>

            <div class="timeline-sub">
                ${new Date(role.startDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
    })}
                -
                ${role.endDate
            ? new Date(role.endDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric"
            })
            : "Present"}
            </div>

            <ul>
                ${(role.responsibilities || '')
            .split('\n')
            .map(line => line ? `<li>${line}</li>` : '')
            .join('')}
            </ul>
        </div>
    `).join('')}
</div>
            </div>
        </div>
    `).join('');
}

function getDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    // Inclusive month count
    const totalMonths =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1;

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (years > 0 && months > 0) {
        return `${years} yr${years > 1 ? 's' : ''} ${months} mo`;
    } else if (years > 0) {
        return `${years} yr${years > 1 ? 's' : ''}`;
    } else {
        return `${months} mo`;
    }
}
async function renderSkills(filterKeyword = "") {
    const raw = await fetchCollection("skills", "category");
    const container = document.getElementById("skills-display");

    const filtered = raw.filter(item =>
        item.skill.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.category.toLowerCase().includes(filterKeyword.toLowerCase())
    );

    container.innerHTML = filtered.map(s => `
        <div class="skill-card">
            <div class="skill-info"><span>${s.skill}</span><span>${s.percentage}%</span></div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${s.percentage}%"></div>
            </div>
        </div>
    `).join('');

    const searchInput = document.getElementById("skill-search");
    if (searchInput && !searchInput.dataset.wired) {
        searchInput.dataset.wired = "true";
        searchInput.addEventListener("input", debounceEvent((e) => renderSkills(e.target.value), 200));
    }
}

async function renderEducation() {
    const list = await fetchCollection("education");
    document.getElementById("education-timeline").innerHTML = list.map(e => `
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-card glass-card">
                <h3>${e.degree}</h3>
                <div class="timeline-sub">${e.institution} • ${e.duration}</div>
                <p>${e.location || ''} ${e.gpa ? `• GPA: ${e.gpa}` : ''}</p>
            </div>
        </div>
    `).join('');
}

async function renderProjects(filterKeyword = "") {
    const raw = await fetchCollection("projects", "createdAt");
    const display = document.getElementById("projects-display");

    const filtered = raw.filter(p =>
        p.name.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        (p.technologies || "").toLowerCase().includes(filterKeyword.toLowerCase())
    );

    display.innerHTML = filtered.map(p => `
        <div class="project-card" onclick="window.open('${p.projectUrl || '#'}', '_blank')">
            <img class="project-img" src="${p.imageUrl || 'assets/placeholders/project.png'}" loading="lazy" alt="${p.name}">
            <div class="project-overlay">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
                <div class="tech-pills">
                    ${(p.technologies || "").split(',').map(t => `<span class="pill">${t.trim()}</span>`).join('')}
                </div>
                <span class="proj-btn">Launch Application</span>
            </div>
        </div>
    `).join('');

    const search = document.getElementById("project-search");
    if (search && !search.dataset.wired) {
        search.dataset.wired = "true";
        search.addEventListener("input", debounceEvent((e) => renderProjects(e.target.value), 200));
    }
}

async function renderCertificates() {
    certsCached = await fetchCollection("certificates", "date");
    const container = document.getElementById("certificates-display");

    container.innerHTML = certsCached.map((c, i) => `
        <div class="skill-card text-center" style="cursor: pointer;" data-index="${i}">
            <img src="${c.imageUrl || 'assets/placeholders/cert.png'}" style="width:100%; height:160px; object-fit:cover; border-radius:8px;" loading="lazy" alt="${c.name}">
            <h4 style="margin-top:0.75rem;">${c.name}</h4>
            <p class="timeline-sub">${c.issuer}</p>
        </div>
    `).join('');

    container.querySelectorAll("[data-index]").forEach(card => {
        card.addEventListener("click", () => showLightbox(parseInt(card.dataset.index)));
    });

    setupLightboxCoreListeners();
}

function showLightbox(idx) {
    if (idx < 0 || idx >= certsCached.length) return;
    lightboxIdx = idx;
    const item = certsCached[lightboxIdx];

    const view = document.getElementById("lightbox");
    const img = document.getElementById("lightbox-img");

    img.style.transform = "scale(1)";
    img.src = item.imageUrl;
    document.getElementById("lightbox-caption").innerText = `${item.name} - ${item.issuer}`;
    //document.getElementById("cert-download").href = item.imageUrl;

    view.setAttribute("aria-hidden", "false");
}

function setupLightboxCoreListeners() {
    const box = document.getElementById("lightbox");
    const img = document.getElementById("lightbox-img");
    let scale = 1;

    document.getElementById("lightbox-close").onclick = () => box.setAttribute("aria-hidden", "true");
    document.getElementById("lightbox-next").onclick = () => { lightboxIdx = (lightboxIdx + 1) % certsCached.length; showLightbox(lightboxIdx); };
    document.getElementById("lightbox-prev").onclick = () => { lightboxIdx = (lightboxIdx - 1 + certsCached.length) % certsCached.length; showLightbox(lightboxIdx); };

    document.getElementById("zoom-in").onclick = () => { scale += 0.15; img.style.transform = `scale(${scale})`; };
    document.getElementById("zoom-out").onclick = () => { if (scale > 0.5) scale -= 0.15; img.style.transform = `scale(${scale})`; };

    window.addEventListener("keydown", (e) => {
        if (box.getAttribute("aria-hidden") === "false") {
            if (e.key === "Escape") box.setAttribute("aria-hidden", "true");
            if (e.key === "ArrowRight") document.getElementById("lightbox-next").click();
            if (e.key === "ArrowLeft") document.getElementById("lightbox-prev").click();
        }
    });
}

async function renderResumeContext() {
    const active = await fetchDocument("resume", "currentResume");
    const details = document.getElementById("contact-details");
    const data = await fetchDocument("personalInfo", "profile");
    if (!data) return;

    details.innerHTML = `<h4 style="text-align: center;">Feel free to reach out for opportunities, or project discussions.</h4><hr style="margin:10px 0 20px 0">
        <div class="contact-item" style="justify-content:center;"><i class="fas fa-envelope"></i><span>${data.email}</span></div>
        ${data.phone ? `<div class="contact-item" style="justify-content:center;"><i class="fas fa-phone" ></i><span>+91 ${data.phone}</span></div>` : ''}
        <div class="contact-item" style="justify-content:center;"><i class="fas fa-map-marker-alt"></i><span>Hyderabad, Telangana, India</span></div>
        <div class="hero-socials" style="justify-content:center;">
            ${data.linkedin ? `<a href="${data.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
            ${data.github ? `<a href="${data.github}" target="_blank"><i class="fab fa-github"></i></a>` : ''}
            ${data.portfolio ? `<a href="${data.portfolio}" target="_blank"><i class="fas fa-globe"></i></a>` : ''}
            ${data.email ? `<a href="mailto:${data.email}"><i class="fas fa-envelope"></i></a>` : ''}
        </div>
        ${active ? `
            <div style="margin-top:2rem; display:flex; gap:1rem;justify-content: center; margin-bottom:25px">
                <a href="${active.fileUrl}" target="_blank" class="tab-btn active text-center style-none" style="text-decoration:none">View Resume</a>
            </div>
        ` : ''}
    `;
}

function setupContactForm() {
    const f = document.getElementById("contact-form");
    f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("msg-submit-btn");
        btn.disabled = true; btn.innerText = "Transmitting Payload...";

        try {
            await createDocument("messages", {
                name: document.getElementById("msg-name").value.trim(),
                email: document.getElementById("msg-email").value.trim(),
                subject: document.getElementById("msg-subject").value.trim(),
                message: document.getElementById("msg-message").value.trim(),
                createdAt: new Date().toISOString()
            });
            launchNotification("Message piped successfully into CRM datastore!");
            f.reset();
        } catch (err) {
            launchNotification("Transmission error occurred.", "error");
        } finally {
            btn.disabled = false; btn.innerText = "Send Message";
        }
    });
}

function setupTabRouting() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add("active");
        });
    });
}