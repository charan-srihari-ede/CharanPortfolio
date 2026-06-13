import { enforceAuthProtection, killSession } from "./auth.js";
import { fetchDocument, modifyDocument, fetchCollection, createDocument, removeDocument } from "./firestore.js";
import { processAssetUpload } from "./storage.js";
import { launchNotification, debounceEvent } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
    enforceAuthProtection((user) => {
        if (user) initializeAdminCMS();
    });
});

function initializeAdminCMS() {
    setupNavigationRouting();
    setupFormProcessors();
    loadDashboardMetrics();
    setupMessageEngine();

    document.getElementById("action-logout").onclick = () => killSession();

    const menuToggle = document.getElementById("sidebar-toggle");
    if (menuToggle) {
        menuToggle.onclick = () => document.getElementById("sidebar").classList.toggle("active");
    }
}

function setupNavigationRouting() {
    document.querySelectorAll(".menu-item:not(#action-logout)").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            const activePanel = document.getElementById(btn.dataset.target);
            activePanel.classList.add("active");
            document.getElementById("panel-title").innerText = btn.innerText.trim();

            document.getElementById("sidebar").classList.remove("active");
            evaluatePanelLifecycle(btn.dataset.target);
        });
    });
}

function evaluatePanelLifecycle(id) {
    if (id === "profile-panel") populateProfileForm();
    if (id === "exp-panel") refreshExperienceTable();
    if (id === "skills-panel") refreshSkillsTable();
    if (id === "edu-panel") refreshEducationTable();
    if (id === "projects-panel") refreshProjectsTable();
    if (id === "certs-panel") refreshCertificatesTable();
    if (id === "resume-panel") refreshResumeLinkStatus();
    if (id === "messages-panel") refreshMessagesTable();
}

async function loadDashboardMetrics() {
    const [m, p, c] = await Promise.all([
        fetchCollection("messages"), fetchCollection("projects"), fetchCollection("certificates")
    ]);
    document.getElementById("stat-messages").innerText = m.length;
    document.getElementById("stat-projects").innerText = p.length;
    document.getElementById("stat-certs").innerText = c.length;
}

// PROFILE
async function populateProfileForm() {
    const data = await fetchDocument("personalInfo", "profile");
    if (!data) return;
    document.getElementById("prof-name").value = data.name || "";
    document.getElementById("prof-title").value = data.title || "";
    document.getElementById("prof-company").value = data.company || "";
    document.getElementById("prof-summary").value = data.summary || "";
    document.getElementById("prof-email").value = data.email || "";
    document.getElementById("prof-phone").value = data.phone || "";
    document.getElementById("prof-linkedin").value = data.linkedin || "";
    document.getElementById("prof-github").value = data.github || "";
    document.getElementById("prof-portfolio").value = data.portfolio || "";
}

// FORM INTERCEPTORS & COMMITS
function setupFormProcessors() {
    // Profile Submit
    document.getElementById("form-profile").onsubmit = async (e) => {
        e.preventDefault();
        const avatarFile = document.getElementById("prof-avatar").files[0];
        let photoUrl = (await fetchDocument("personalInfo", "profile"))?.photoUrl || "";

        if (avatarFile) photoUrl = await processAssetUpload("profile-images", avatarFile);

        await modifyDocument("personalInfo", "profile", {
            name: document.getElementById("prof-name").value,
            title: document.getElementById("prof-title").value,
            company: document.getElementById("prof-company").value,
            summary: document.getElementById("prof-summary").value,
            email: document.getElementById("prof-email").value,
            phone: document.getElementById("prof-phone").value,
            linkedin: document.getElementById("prof-linkedin").value,
            github: document.getElementById("prof-github").value,
            portfolio: document.getElementById("prof-portfolio").value,
            photoUrl
        });
        launchNotification("Profile context synchronized successfully.");
    };

    // Experience Submit
    document.getElementById("form-experience").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("exp-id").value;
        const logoFile = document.getElementById("exp-logo").files[0];
        let logoUrl = "";
        if (logoFile) logoUrl = await processAssetUpload("company-logos", logoFile);

        const payload = {
            company: document.getElementById("exp-company").value,
            type: document.getElementById("exp-type").value,
            location: document.getElementById("exp-loc").value,
            title: document.getElementById("exp-title").value,
            startDate: document.getElementById("exp-start").value,
            endDate: document.getElementById("exp-end").value,
            responsibilities: document.getElementById("exp-desc").value
        };
        if (logoUrl) payload.logoUrl = logoUrl;

        if (id) await modifyDocument("experience", id, payload);
        else await createDocument("experience", payload);

        document.getElementById("form-experience").reset();
        document.getElementById("exp-id").value = "";
        refreshExperienceTable();
    };

    // Skills Submit
    document.getElementById("form-skills").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("skill-id").value;
        const payload = {
            category: document.getElementById("skill-cat").value,
            skill: document.getElementById("skill-name").value,
            percentage: parseInt(document.getElementById("skill-perc").value)
        };
        if (id) await modifyDocument("skills", id, payload);
        else await createDocument("skills", payload);
        document.getElementById("form-skills").reset();
        document.getElementById("skill-id").value = "";
        refreshSkillsTable();
    };

    // Education Submit
    document.getElementById("form-education").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("edu-id").value;
        const payload = {
            degree: document.getElementById("edu-degree").value,
            institution: document.getElementById("edu-inst").value,
            duration: document.getElementById("edu-duration").value,
            gpa: document.getElementById("edu-gpa").value,
            location: document.getElementById("edu-loc").value
        };
        if (id) await modifyDocument("education", id, payload);
        else await createDocument("education", payload);
        document.getElementById("form-education").reset();
        document.getElementById("edu-id").value = "";
        refreshEducationTable();
    };

    // Projects Submit
    document.getElementById("form-projects").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("proj-id").value;
        const imgFile = document.getElementById("proj-img").files[0];
        let imageUrl = "";
        if (imgFile) imageUrl = await processAssetUpload("project-images", imgFile);

        const payload = {
            name: document.getElementById("proj-title").value,
            projectUrl: document.getElementById("proj-url").value,
            technologies: document.getElementById("proj-tech").value,
            description: document.getElementById("proj-desc").value,
            features: document.getElementById("proj-feats").value,
            createdAt: new Date().toISOString()
        };
        if (imageUrl) payload.imageUrl = imageUrl;

        if (id) await modifyDocument("projects", id, payload);
        else await createDocument("projects", payload);
        document.getElementById("form-projects").reset();
        document.getElementById("proj-id").value = "";
        refreshProjectsTable();
    };

    // Certificates Submit
    document.getElementById("form-certs").onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById("cert-id").value;
        const file = document.getElementById("cert-file").files[0];
        let imageUrl = "";
        if (file) imageUrl = await processAssetUpload("certificate-images", file);

        const payload = {
            name: document.getElementById("cert-name").value,
            issuer: document.getElementById("cert-issuer").value,
            date: document.getElementById("cert-date").value
        };
        if (imageUrl) payload.imageUrl = imageUrl;

        if (id) await modifyDocument("certificates", id, payload);
        else await createDocument("certificates", payload);
        document.getElementById("form-certs").reset();
        document.getElementById("cert-id").value = "";
        refreshCertificatesTable();
    };

    // Resume Document Execution Pipeline
    document.getElementById("form-resume").onsubmit = async (e) => {
        e.preventDefault();
        const file = document.getElementById("res-file").files[0];
        if (!file) return;
        const fileUrl = await processAssetUpload("resume", file);
        await modifyDocument("resume", "currentResume", { fileUrl, uploadedAt: new Date().toISOString() });
        launchNotification("Master PDF execution link systematically synced.");
        refreshResumeLinkStatus();
    };
}

// DATA TABLES REFRESH RENDER ENGINE
async function refreshExperienceTable() {
    const list = await fetchCollection("experience");
    const container = document.getElementById("table-experience");
    container.innerHTML = list.map(item => `
        <tr>
            <td>${item.company}</td>
            <td>${item.title}</td>
            <td class="table-actions">
                <button class="action-btn btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    bindTableActions(container, "experience", (data) => {
        document.getElementById("exp-id").value = data.id;
        document.getElementById("exp-company").value = data.company;
        document.getElementById("exp-type").value = data.type || "";
        document.getElementById("exp-loc").value = data.location || "";
        document.getElementById("exp-title").value = data.title;
        document.getElementById("exp-start").value = data.startDate;
        document.getElementById("exp-end").value = data.endDate || "";
        document.getElementById("exp-desc").value = data.responsibilities;
    }, refreshExperienceTable);
}

async function refreshSkillsTable() {
    const list = await fetchCollection("skills");
    const container = document.getElementById("table-skills");
    container.innerHTML = list.map(item => `
        <tr>
            <td>${item.category}</td>
            <td>${item.skill}</td>
            <td>${item.percentage}%</td>
            <td class="table-actions">
                <button class="action-btn btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    bindTableActions(container, "skills", (data) => {
        document.getElementById("skill-id").value = data.id;
        document.getElementById("skill-cat").value = data.category;
        document.getElementById("skill-name").value = data.skill;
        document.getElementById("skill-perc").value = data.percentage;
    }, refreshSkillsTable);
}

async function refreshEducationTable() {
    const list = await fetchCollection("education");
    const container = document.getElementById("table-education");
    container.innerHTML = list.map(item => `
        <tr>
            <td>${item.degree}</td>
            <td>${item.institution}</td>
            <td class="table-actions">
                <button class="action-btn btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    bindTableActions(container, "education", (data) => {
        document.getElementById("edu-id").value = data.id;
        document.getElementById("edu-degree").value = data.degree;
        document.getElementById("edu-inst").value = data.institution;
        document.getElementById("edu-duration").value = data.duration;
        document.getElementById("edu-gpa").value = data.gpa || "";
        document.getElementById("edu-loc").value = data.location || "";
    }, refreshEducationTable);
}

async function refreshProjectsTable() {
    const list = await fetchCollection("projects");
    const container = document.getElementById("table-projects");
    container.innerHTML = list.map(item => `
        <tr>
            <td>${item.name}</td>
            <td><a href="${item.projectUrl}" target="_blank">Link</a></td>
            <td class="table-actions">
                <button class="action-btn btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    bindTableActions(container, "projects", (data) => {
        document.getElementById("proj-id").value = data.id;
        document.getElementById("proj-title").value = data.name;
        document.getElementById("proj-url").value = data.projectUrl || "";
        document.getElementById("proj-tech").value = data.technologies;
        document.getElementById("proj-desc").value = data.description;
        document.getElementById("proj-feats").value = data.features || "";
    }, refreshProjectsTable);
}

async function refreshCertificatesTable() {
    const list = await fetchCollection("certificates");
    const container = document.getElementById("table-certs");
    container.innerHTML = list.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.issuer}</td>
            <td class="table-actions">
                <button class="action-btn btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    bindTableActions(container, "certificates", (data) => {
        document.getElementById("cert-id").value = data.id;
        document.getElementById("cert-name").value = data.name;
        document.getElementById("cert-issuer").value = data.issuer;
        document.getElementById("cert-date").value = data.date;
    }, refreshCertificatesTable);
}

async function refreshResumeLinkStatus() {
    const data = await fetchDocument("resume", "currentResume");
    const anchor = document.getElementById("res-status-link");
    if (data) { anchor.href = data.fileUrl; anchor.innerText = "Asset Available (View File)"; }
    else { anchor.removeAttribute("href"); anchor.innerText = "No File Uploaded"; }
}

function bindTableActions(tbody, collectionName, onEdit, onRefresh) {
    tbody.querySelectorAll(".btn-edit").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const item = (await fetchCollection(collectionName)).find(i => i.id === id);
            if (item) onEdit(item);
        };
    });
    tbody.querySelectorAll(".btn-delete").forEach(btn => {
        btn.onclick = async () => {
            if (confirm("Confirm destructive erasure of this element?")) {
                await removeDocument(collectionName, btn.dataset.id);
                launchNotification("Element wiped from dataset.");
                onRefresh();
            }
        };
    });
}

// MESSAGES MODULE MANAGEMENT
let localMsgCache = [];
async function refreshMessagesTable() {
    localMsgCache = await fetchCollection("messages", "createdAt");
    renderFilteredMessages(localMsgCache);
}

function renderFilteredMessages(array) {
    const container = document.getElementById("table-messages");
    container.innerHTML = array.map(m => `
        <tr>
            <td>${m.name} (${m.email})</td>
            <td>${m.subject}</td>
            <td class="table-actions">
                <button class="action-btn btn-edit view-msg" data-id="${m.id}"><i class="fas fa-eye"></i></button>
                <button class="action-btn btn-delete delete-msg" data-id="${m.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    container.querySelectorAll(".view-msg").forEach(btn => {
        btn.onclick = () => {
            const obj = localMsgCache.find(x => x.id === btn.dataset.id);
            if (!obj) return;
            document.getElementById("view-msg-name").innerText = obj.name;
            document.getElementById("view-msg-email").innerText = obj.email;
            document.getElementById("view-msg-subject").innerText = obj.subject;
            document.getElementById("view-msg-body").innerText = obj.message;
            document.getElementById("msg-modal").setAttribute("aria-hidden", "false");
        };
    });

    container.querySelectorAll(".delete-msg").forEach(btn => {
        btn.onclick = async () => {
            if (confirm("Permanently erase this inquiry contact sheet?")) {
                await removeDocument("messages", btn.dataset.id);
                refreshMessagesTable();
            }
        };
    });
}

function setupMessageEngine() {
    document.getElementById("msg-modal-close").onclick = () => {
        document.getElementById("msg-modal").setAttribute("aria-hidden", "true");
    };

    document.getElementById("msg-search-box").addEventListener("input", debounceEvent((e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = localMsgCache.filter(m =>
            m.name.toLowerCase().includes(keyword) ||
            m.subject.toLowerCase().includes(keyword) ||
            m.message.toLowerCase().includes(keyword)
        );
        renderFilteredMessages(filtered);
    }, 200));
}