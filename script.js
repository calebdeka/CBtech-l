// ============================================================
//  CB@Techno — Script Principal Corrigé
//  script.js
//  ⚠️  firebase-sync.js doit être chargé AVANT ce fichier
// ============================================================

// ─── ÉTAT GLOBAL ─────────────────────────────────────────────
window.isAdmin         = false;
window.currentGallery  = "tech";
window.lightboxItems   = [];
window.lightboxIndex   = 0;

const ADMIN_PASSWORD   = "Boss1234@"; // ← Changez ce mot de passe !
const WHATSAPP_NUMBER  = "22890000000";   // ← Votre numéro WhatsApp (sans +)

// ─── 1. NAVIGATION ───────────────────────────────────────────
function toggleMenu() {
  const nav = document.getElementById("navLinks");
  nav?.classList.toggle("active");
}

// Ferme le menu mobile si on clique ailleurs
document.addEventListener("click", (e) => {
  const nav  = document.getElementById("navLinks");
  const menu = document.querySelector(".mobile-menu");
  if (nav?.classList.contains("active") && !nav.contains(e.target) && !menu?.contains(e.target)) {
    nav.classList.remove("active");
  }
});

// Lien actif selon le scroll
window.addEventListener("scroll", () => {
  const sections = document.querySelectorAll("section[id]");
  const scrollY  = window.scrollY + 120;

  sections.forEach(section => {
    const top    = section.offsetTop;
    const height = section.offsetHeight;
    const id     = section.getAttribute("id");
    const link   = document.querySelector(`.nav-links a[href="#${id}"]`);

    if (scrollY >= top && scrollY < top + height) {
      document.querySelectorAll(".nav-links a").forEach(a => a.classList.remove("active"));
      if (link) link.classList.add("active");
    }
  });
});

// ─── 2. ANIMATIONS AU SCROLL ─────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.1 });

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));
});

// ─── 3. GALERIE ──────────────────────────────────────────────
function switchGallery(category) {
  window.currentGallery = category;

  // Onglets
  document.querySelectorAll(".gallery-tab").forEach(tab => tab.classList.remove("active"));
  const activeTab = document.querySelector(`[onclick="switchGallery('${category}')"]`);
  if (activeTab) activeTab.classList.add("active");

  // Sections
  document.querySelectorAll(".gallery-section").forEach(s => s.classList.remove("active"));
  const section = document.getElementById(`gallery-${category}`);
  if (section) section.classList.add("active");

  // Scroll vers la galerie
  document.getElementById("galerie")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── 4. LIGHTBOX ─────────────────────────────────────────────
function openLightbox(url, type, title, description) {
  // Collecte tous les items visibles dans la galerie active
  const grid   = document.getElementById(`grid-${window.currentGallery}`);
  const cards  = grid ? [...grid.querySelectorAll(".gallery-item")] : [];

  window.lightboxItems = cards.map(card => {
    const img   = card.querySelector("img");
    const video = card.querySelector("video");
    const h3    = card.querySelector(".gallery-overlay h3");
    const p     = card.querySelector(".gallery-overlay p");
    return {
      url:         img?.src || video?.src || url,
      type:        video ? "video" : "image",
      title:       h3?.textContent || "",
      description: p?.textContent  || ""
    };
  });

  // Trouve l'index de l'élément cliqué
  window.lightboxIndex = window.lightboxItems.findIndex(i => i.url === url);
  if (window.lightboxIndex === -1) window.lightboxIndex = 0;

  renderLightboxItem();
  document.getElementById("lightbox")?.classList.add("active");
  document.body.style.overflow = "hidden";
}

function renderLightboxItem() {
  const item    = window.lightboxItems[window.lightboxIndex];
  const content = document.getElementById("lightboxContent");
  const counter = document.getElementById("lightboxCounter");
  if (!item || !content) return;

  content.innerHTML = item.type === "video"
    ? `<video src="${item.url}" controls autoplay style="max-width:100%;max-height:85vh;border-radius:10px;"></video>`
    : `<img src="${item.url}" alt="${item.title}" style="max-width:100%;max-height:85vh;border-radius:10px;">`;

  if (counter) {
    counter.textContent = `${window.lightboxIndex + 1} / ${window.lightboxItems.length}`;
  }
}

function closeLightbox() {
  document.getElementById("lightbox")?.classList.remove("active");
  document.body.style.overflow = "";
  // Stop la vidéo si en cours
  document.querySelector("#lightboxContent video")?.pause();
}

function lightboxPrev() {
  if (!window.lightboxItems.length) return;
  window.lightboxIndex = (window.lightboxIndex - 1 + window.lightboxItems.length) % window.lightboxItems.length;
  renderLightboxItem();
}

function lightboxNext() {
  if (!window.lightboxItems.length) return;
  window.lightboxIndex = (window.lightboxIndex + 1) % window.lightboxItems.length;
  renderLightboxItem();
}

// Navigation clavier lightbox
document.addEventListener("keydown", (e) => {
  const lb = document.getElementById("lightbox");
  if (!lb?.classList.contains("active")) return;
  if (e.key === "ArrowLeft")  lightboxPrev();
  if (e.key === "ArrowRight") lightboxNext();
  if (e.key === "Escape")     closeLightbox();
});

// ─── 5. ADMIN ────────────────────────────────────────────────
function showAdminLogin() {
  document.getElementById("passwordModal")?.classList.add("active");
  setTimeout(() => document.getElementById("adminPasswordInput")?.focus(), 100);
}

function checkAdminPassword() {
  const input = document.getElementById("adminPasswordInput");
  if (!input) return;

  if (input.value === ADMIN_PASSWORD) {
    window.isAdmin = true;
    document.getElementById("passwordModal")?.classList.remove("active");
    document.getElementById("adminBadge")?.classList.add("active");
    document.getElementById("adminPlus")?.classList.add("active");
    document.getElementById("addContentBtn")?.style.setProperty("display", "flex");
    input.value = "";
    showToast("✅ Mode Admin activé !", "success");

    // Re-rendu de toutes les galeries avec les boutons de suppression
    if (window._fb) {
      // Les listeners onSnapshot vont re-rendre automatiquement
    }
  } else {
    input.style.borderColor = "var(--accent)";
    input.style.animation   = "shake 0.4s ease";
    setTimeout(() => {
      input.style.borderColor = "";
      input.style.animation   = "";
      input.value = "";
    }, 600);
    showToast("❌ Mot de passe incorrect", "error");
  }
}

function logoutAdmin() {
  window.isAdmin = false;
  document.getElementById("adminBadge")?.classList.remove("active");
  document.getElementById("adminPlus")?.classList.remove("active");
  if (document.getElementById("addContentBtn")) {
    document.getElementById("addContentBtn").style.display = "none";
  }
  showToast("Déconnecté du mode Admin", "info");
}

// ─── 6. MODAL AJOUT DE CONTENU ───────────────────────────────
let selectedFile  = null;
let selectedSection = "tech";

function openAddModal() {
  if (!window.isAdmin) {
    showAdminLogin();
    return;
  }
  document.getElementById("addModal")?.classList.add("active");
  selectSection("tech");
}

function selectSection(cat) {
  selectedSection = cat;
  document.querySelectorAll(".section-option").forEach(opt => {
    opt.classList.toggle("selected", opt.dataset.cat === cat);
  });
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validation taille : max 50 Mo
  if (file.size > 50 * 1024 * 1024) {
    showToast("❌ Fichier trop volumineux (max 50 Mo)", "error");
    return;
  }

  selectedFile = file;
  const isVideo = file.type.startsWith("video/");

  const uploadArea = document.getElementById("uploadArea");
  const preview    = document.getElementById("filePreview");

  if (uploadArea) {
    uploadArea.classList.add("has-file");
    uploadArea.querySelector("p").textContent = file.name;
    uploadArea.querySelector("small").textContent =
      `${(file.size / 1024 / 1024).toFixed(1)} Mo · ${isVideo ? "Vidéo" : "Image"}`;
  }

  if (preview) {
    preview.className = "file-preview active";
    if (isVideo) {
      preview.outerHTML = `<video id="filePreview" class="file-preview active" src="${URL.createObjectURL(file)}" controls style="max-width:100%;max-height:200px;border-radius:10px;margin-top:1rem;"></video>`;
    } else {
      preview.src     = URL.createObjectURL(file);
      preview.style.display = "block";
    }
  }
}

async function submitContent() {
  if (!selectedFile) { showToast("⚠️ Sélectionnez un fichier", "error"); return; }

  const title = document.getElementById("contentTitle")?.value?.trim();
  const desc  = document.getElementById("contentDesc")?.value?.trim();

  if (!title) { showToast("⚠️ Ajoutez un titre", "error"); return; }

  const progressBar  = document.querySelector(".upload-progress");
  const progressFill = document.querySelector(".upload-progress-bar");
  const submitBtn    = document.getElementById("submitBtn");

  if (progressBar)  progressBar.classList.add("active");
  if (submitBtn)    submitBtn.disabled = true;

  try {
    await uploadAndSave(
      selectedFile,
      {
        title,
        description: desc || "",
        category:    selectedSection,
        type:        selectedFile.type.startsWith("video/") ? "video" : "image"
      },
      (pct) => {
        if (progressFill) progressFill.style.width = `${pct}%`;
      }
    );

    showToast("✅ Contenu publié pour tous les utilisateurs !", "success");
    closeModal("addModal");
    resetUploadForm();
    switchGallery(selectedSection);

  } catch (err) {
    console.error(err);
    showToast("❌ Erreur lors de l'upload. Vérifiez votre connexion.", "error");
  } finally {
    if (progressBar)  progressBar.classList.remove("active");
    if (progressFill) progressFill.style.width = "0%";
    if (submitBtn)    submitBtn.disabled = false;
  }
}

function resetUploadForm() {
  selectedFile = null;
  const uploadArea = document.getElementById("uploadArea");
  if (uploadArea) {
    uploadArea.classList.remove("has-file");
    uploadArea.querySelector("p").textContent  = "Glissez une image ou vidéo ici";
    uploadArea.querySelector("small").textContent = "JPG, PNG, MP4, MOV — Max 50 Mo";
  }
  const preview = document.getElementById("filePreview");
  if (preview) { preview.src = ""; preview.style.display = "none"; }
  if (document.getElementById("contentTitle")) document.getElementById("contentTitle").value = "";
  if (document.getElementById("contentDesc"))  document.getElementById("contentDesc").value  = "";
  if (document.getElementById("fileInput"))    document.getElementById("fileInput").value    = "";
}

// ─── 7. MODALS GÉNÉRIQUES ────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}

// Ferme modal en cliquant sur le fond
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("active");
  }
});

// ─── 8. CALCULATEUR D'IMPORT ─────────────────────────────────
function calculateImport() {
  const price    = parseFloat(document.getElementById("productPrice")?.value)  || 0;
  const weight   = parseFloat(document.getElementById("productWeight")?.value) || 0;
  const mode     = document.getElementById("transportMode")?.value || "sea";
  const USD_FCFA = 615; // Taux approximatif USD → FCFA

  const productFCFA  = price  * USD_FCFA;
  const frais        = mode === "air"
    ? weight * 4500 * USD_FCFA / 1000  // ~4.5 USD/kg aérien
    : weight * 1200 * USD_FCFA / 1000; // ~1.2 USD/kg maritime
  const commission   = productFCFA * 0.08; // 8% commission CB@Techno
  const total        = productFCFA + frais + commission;

  const resultEl = document.getElementById("calcResult");
  if (resultEl) {
    resultEl.innerHTML = `
      <div style="text-align:left; font-size:0.85rem; margin-bottom:0.5rem; opacity:0.8;">
        Produit : ${Math.round(productFCFA).toLocaleString("fr-FR")} FCFA<br>
        Transport : ${Math.round(frais).toLocaleString("fr-FR")} FCFA<br>
        Commission (8%) : ${Math.round(commission).toLocaleString("fr-FR")} FCFA
      </div>
      <div style="font-size:1.2rem; color:var(--gold);">
        Total estimé : <strong>${Math.round(total).toLocaleString("fr-FR")} FCFA</strong>
      </div>`;
  }
}

// ─── 9. WHATSAPP ─────────────────────────────────────────────
function sendSourcingWhatsApp() {
  const name   = document.getElementById("sourcingName")?.value?.trim();
  const qty    = document.getElementById("sourcingQty")?.value?.trim();
  const budget = document.getElementById("sourcingBudget")?.value?.trim();

  if (!name) {
    showToast("⚠️ Décrivez l'article à rechercher", "error");
    document.getElementById("sourcingName")?.focus();
    return;
  }

  const msg = encodeURIComponent(
    `🔍 *Demande de Sourcing CB@Techno*\n\n` +
    `📦 Article : ${name}\n` +
    `📊 Quantité : ${qty || "Non précisé"}\n` +
    `💰 Budget : ${budget || "Non précisé"}\n\n` +
    `Merci de me trouver ce produit au meilleur prix depuis la Chine.`
  );

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
}

function sendContactWhatsApp() {
  const name    = document.getElementById("contactName")?.value?.trim();
  const service = document.getElementById("contactService")?.value;
  const message = document.getElementById("contactMessage")?.value?.trim();

  if (!name || !message) {
    showToast("⚠️ Remplissez au moins votre nom et votre message", "error");
    return;
  }

  const msg = encodeURIComponent(
    `👋 *Message via CB@Techno*\n\n` +
    `Nom : ${name}\n` +
    `Service : ${service || "Non précisé"}\n\n` +
    `${message}`
  );

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
}

// ─── 10. PWA — INSTALLATION ──────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  const alreadyDismissed = localStorage.getItem("pwa_install_dismissed");
  if (!alreadyDismissed) {
    setTimeout(() => {
      document.getElementById("installBanner")?.classList.add("active");
    }, 3000);
  }
});

async function installApp() {
  if (!deferredInstallPrompt) {
    showToast("💡 Ouvrez ce site dans Chrome pour l'installer", "info");
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") {
    showToast("✅ Application installée !", "success");
  }
  deferredInstallPrompt = null;
  closeInstallBanner();
}

function closeInstallBanner() {
  document.getElementById("installBanner")?.classList.remove("active");
  localStorage.setItem("pwa_install_dismissed", "1");
}

window.addEventListener("appinstalled", () => {
  closeInstallBanner();
  showToast("🎉 CB@Techno installé sur votre écran d'accueil !", "success");
});

// ─── 11. NOTIFICATIONS TOAST ─────────────────────────────────
function showToast(message, type = "info") {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();

  const colors = {
    success: "var(--secondary)",
    error:   "var(--accent)",
    info:    "var(--purple)",
    warning: "var(--gold)"
  };

  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    background: var(--glass); border: 2px solid ${colors[type] || colors.info};
    color: var(--light); padding: 1rem 2rem; border-radius: 30px;
    font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 0.95rem;
    z-index: 9999; backdrop-filter: blur(10px);
    animation: toastIn 0.3s ease;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;
  toast.textContent = message;

  // Ajoute l'animation si elle n'existe pas encore
  if (!document.getElementById("toastStyle")) {
    const style = document.createElement("style");
    style.id = "toastStyle";
    style.textContent = `
      @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes shake {
        0%,100% { transform: translateX(0); }
        25%      { transform: translateX(-8px); }
        75%      { transform: translateX(8px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ─── 12. EXPORTS GLOBAUX ─────────────────────────────────────
Object.assign(window, {
  toggleMenu,
  switchGallery,
  openLightbox,
  closeLightbox,
  lightboxPrev,
  lightboxNext,
  showAdminLogin,
  checkAdminPassword,
  logoutAdmin,
  openAddModal,
  selectSection,
  handleFileSelect,
  submitContent,
  closeModal,
  calculateImport,
  sendSourcingWhatsApp,
  sendContactWhatsApp,
  installApp,
  closeInstallBanner,
  showToast
});
