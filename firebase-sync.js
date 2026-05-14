// ============================================================
//  CB@Techno — Firebase Real-Time Sync Module
//  firebase-sync.js
//  À inclure AVANT votre script principal
// ============================================================

// ─── 1. CONFIGURATION FIREBASE ───────────────────────────────
// ⚠️  Remplacez ces valeurs par celles de VOTRE projet Firebase
//     Console Firebase → Paramètres → Vos applications → SDK
// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Déclarations globales pour éviter "is not defined" dans les fonctions appelées globalement
let collection, addDoc, serverTimestamp;
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAtTog9eMM3acErQeTf6K2gGrMcY3HBSnE",
  authDomain: "cbtech-database.firebaseapp.com",
  projectId: "cbtech-database",
  storageBucket: "cbtech-database.firebasestorage.app",
  messagingSenderId: "433087349101",
  appId: "1:433087349101:web:ee238334fd40ba2ab71a64",
  measurementId: "G-ZCTZZTNYED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Google Analytics est omis pour cet exemple

// ─── 3. INITIALISATION ───────────────────────────────────────
let db, storage;

async function initFirebase() {
  try {
    // Pas besoin d'importer ici car ils sont déjà importés globalement
    // const { getFirestore, collection, addDoc,
    //         onSnapshot, deleteDoc, doc,
    //         serverTimestamp, query, orderBy }      = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    // const { getStorage, ref, uploadBytesResumable,
    //         getDownloadURL, deleteObject }         = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

    db      = getFirestore(app);
    storage = getStorage(app);

    // Assignation directe pour éviter l'erreur "is not defined" dans les fonctions appelées globalement
    // Ces variables sont maintenant globales grâce aux importations en haut du fichier.
    // Il n'est plus nécessaire de les exposer via window._fb ou de les réassigner ici.
    collection      = window.collection = collection;
    addDoc          = window.addDoc = addDoc;
    serverTimestamp = window.serverTimestamp = serverTimestamp;

    // Expose les fonctions Firestore & Storage globalement
    window._fb = {
      db, storage,
      collection, addDoc, onSnapshot, deleteDoc,
      doc, serverTimestamp, query, orderBy,
      ref, uploadBytesResumable, getDownloadURL, deleteObject
    };

    // Les assignations individuelles pour window.* sont redondantes si elles sont déjà dans window._fb
    // et que les fonctions sont utilisées via window._fb.*
    window.onSnapshot = onSnapshot;
    window.deleteDoc = deleteDoc;
    window.doc = doc;
    window.query = query;
    window.orderBy = orderBy;
    window.ref = ref;
    window.uploadBytesResumable = uploadBytesResumable;
    window.getDownloadURL = getDownloadURL;
    window.deleteObject = deleteObject;

    setSyncStatus("synced", "Connecté");
    console.log("✅ Firebase initialisé");

    // Démarre l'écoute en temps réel de toutes les galeries
    startRealtimeListeners();

  } catch (err) {
    console.error("❌ Erreur Firebase :", err);
    setSyncStatus("offline", "Hors ligne");
    loadLocalFallback(); // Charge les données locales si Firebase échoue
  }
}

// ─── 4. ÉCOUTE EN TEMPS RÉEL ────────────────────────────────
const CATEGORIES = ["tech", "studio", "import", "events", "divers"];

function startRealtimeListeners() {
  const { db, collection, onSnapshot, query, orderBy } = window._fb;

  CATEGORIES.forEach(cat => {
    const q = query(collection(db, `gallery_${cat}`), orderBy("createdAt", "desc"));

    onSnapshot(q,
      (snapshot) => {
        const items = [];
        snapshot.forEach(docSnap => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Met à jour la galerie côté client immédiatement
        renderGallery(cat, items);
        updateGalleryCount(cat, items.length);
        setSyncStatus("synced", "Synchronisé");
      },
      (error) => {
        console.error(`Erreur écoute galerie ${cat}:`, error);
        setSyncStatus("offline", "Erreur sync");
      }
    );
  });
}

// ─── 5. UPLOAD D'UN FICHIER + SAUVEGARDE EN BASE ─────────────
/**
 * @param {File}   file      - Fichier image ou vidéo sélectionné
 * @param {Object} meta      - { title, description, category, type }
 * @param {Function} onProgress - callback(percent)
 */
async function uploadAndSave(file, meta, onProgress) {
  if (!window._fb) throw new Error("Firebase non initialisé");
  const { storage, db, ref, uploadBytesResumable, getDownloadURL } = window._fb;
  setSyncStatus("syncing", "Upload en cours…");

  // 5a. Upload du fichier vers Firebase Storage
  const ext      = file.name.split(".").pop();
  const filename = `gallery/${meta.category}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, filename);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on("state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(pct);
      },
      (error) => {
        setSyncStatus("offline", "Échec upload");
        reject(error);
      },
      async () => {
        // 5b. Récupère l'URL publique
        const url = await getDownloadURL(uploadTask.snapshot.ref);

        // 5c. Sauvegarde les métadonnées dans Firestore
        const docRef = await addDoc(collection(db, `gallery_${meta.category}`), {
          title:       meta.title       || "Sans titre",
          description: meta.description || "",
          category:    meta.category,
          type:        meta.type,        // "image" | "video"
          url,
          storagePath: filename,
          createdAt:   serverTimestamp()
        });

        setSyncStatus("synced", "Publié !");
        setTimeout(() => setSyncStatus("synced", "Synchronisé"), 2000);
        resolve({ id: docRef.id, url });
      }
    );
  });
}

// ─── 6. SUPPRESSION D'UN ÉLÉMENT ────────────────────────────
async function deleteGalleryItem(category, docId, storagePath) {
  if (!window._fb) return;
  const { db, storage, doc, deleteDoc, ref, deleteObject } = window._fb;

  try {
    setSyncStatus("syncing", "Suppression…");
    await deleteDoc(doc(db, `gallery_${category}`, docId));
    if (storagePath) {
      await deleteObject(ref(storage, storagePath));
    }
    setSyncStatus("synced", "Supprimé");
    setTimeout(() => setSyncStatus("synced", "Synchronisé"), 1500);
  } catch (err) {
    console.error("Erreur suppression :", err);
    setSyncStatus("offline", "Erreur suppression");
  }
}

// ─── 7. RENDU DE LA GALERIE ─────────────────────────────────
function renderGallery(category, items) {
  const grid = document.getElementById(`grid-${category}`);
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="
        grid-column: 1/-1; text-align: center;
        padding: 4rem; opacity: 0.5;
        border: 2px dashed rgba(100,255,218,0.2);
        border-radius: 20px;
      ">
        <i class="fas fa-images" style="font-size:3rem; color:var(--secondary); margin-bottom:1rem; display:block;"></i>
        <p>Aucun contenu dans cette galerie pour le moment.</p>
        ${window.isAdmin ? '<p style="margin-top:0.5rem; color:var(--accent);">Cliquez sur <b>+</b> pour ajouter du contenu.</p>' : ''}
      </div>`;
    return;
  }

  grid.innerHTML = items.map(item => buildGalleryCard(item, category)).join("");
}

function buildGalleryCard(item, category) {
  const isVideo = item.type === "video";
  const adminControls = window.isAdmin
    ? `<button onclick="confirmDelete('${category}','${item.id}','${item.storagePath || ''}')"
         style="position:absolute;top:1rem;left:1rem;z-index:20;background:rgba(255,50,50,0.85);
                color:white;border:none;border-radius:50%;width:36px;height:36px;
                cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;"
         title="Supprimer">
         <i class="fas fa-trash"></i>
       </button>`
    : "";

  const media = isVideo
    ? `<video src="${item.url}" muted loop preload="metadata"></video>
       <div class="play-icon"><i class="fas fa-play"></i></div>
       <span class="media-badge">Vidéo</span>`
    : `<img src="${item.url}" alt="${item.title}" loading="lazy">`;

  return `
    <div class="gallery-item" onclick="openLightbox('${item.url}','${item.type}','${item.title}','${item.description || ''}')">
      ${adminControls}
      ${media}
      <div class="gallery-overlay">
        <h3>${item.title}</h3>
        ${item.description ? `<p>${item.description}</p>` : ""}
      </div>
    </div>`;
}

// ─── 8. COMPTEUR D'ONGLETS ──────────────────────────────────
function updateGalleryCount(category, count) {
  // Met à jour les badges numériques sur les onglets si besoin
  const tab = document.querySelector(`[onclick="switchGallery('${category}')"]`);
  if (!tab) return;
  // Optionnel : on pourrait injecter le count dans le tab ici
}

// ─── 9. CONFIRMATION AVANT SUPPRESSION ──────────────────────
function confirmDelete(category, docId, storagePath) {
  if (!window.isAdmin) return;
  if (confirm("Supprimer ce contenu pour tous les utilisateurs ?")) {
    deleteGalleryItem(category, docId, storagePath);
  }
}

// ─── 10. INDICATEUR DE SYNCHRONISATION ──────────────────────
function setSyncStatus(state, label) {
  const el   = document.getElementById("syncStatus");
  const span = el?.querySelector("span");
  const icon = el?.querySelector("i");
  if (!el) return;

  el.className = `sync-status ${state}`;

  const icons = {
    syncing: "fa-spin fa-circle-notch",
    synced:  "fa-check-circle",
    offline: "fa-exclamation-triangle"
  };
  if (icon) icon.className = `fas ${icons[state] || "fa-circle"}`;
  if (span) span.textContent = label;
}

// ─── 11. FALLBACK LOCAL (si Firebase inaccessible) ───────────
function loadLocalFallback() {
  console.warn("⚠️ Mode hors ligne — données locales uniquement");
  CATEGORIES.forEach(cat => {
    const saved = JSON.parse(localStorage.getItem(`gallery_${cat}`) || "[]");
    if (saved.length) renderGallery(cat, saved);
  });
}

// ─── 12. DÉTECTION CONNEXION RÉSEAU ─────────────────────────
window.addEventListener("online",  () => {
  setSyncStatus("syncing", "Reconnexion…");
  initFirebase();
});
window.addEventListener("offline", () => {
  setSyncStatus("offline", "Hors ligne");
});

// ─── 13. DÉMARRAGE ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initFirebase);

// ─── 14. EXPORTS GLOBAUX ────────────────────────────────────
window.uploadAndSave    = uploadAndSave;
window.deleteGalleryItem = deleteGalleryItem;
window.confirmDelete    = confirmDelete;
window.setSyncStatus    = setSyncStatus;
window.renderGallery    = renderGallery;
