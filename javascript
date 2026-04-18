// ============================================================
//  CB@Techno — Module de Synchronisation Firebase Corrigé
// ============================================================

// 1. TA CONFIGURATION (À REMPLIR DEPUIS FIREBASE)
const FIREBASE_CONFIG = {
  apiKey: "TA_CLE_API", // Remplace ici
  authDomain: "TON_PROJET.firebaseapp.com", // Remplace ici
  projectId: "TON_PROJET_ID", // Remplace ici
  storageBucket: "TON_PROJET.appspot.com", // Remplace ici
  messagingSenderId: "TON_SENDER_ID", // Remplace ici
  appId: "TON_APP_ID" // Remplace ici
};

let db, storage;
window.isAdmin = false; // Par défaut, on n'est pas admin

// 2. INITIALISATION
async function initFirebase() {
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");

        const app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);
        storage = getStorage(app);

        // Export global pour les autres fonctions
        window._fb = { db, storage, collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, query, orderBy, ref, uploadBytesResumable, getDownloadURL, deleteObject };

        console.log("✅ Firebase connecté !");
        startRealtimeListeners();
    } catch (err) {
        console.error("❌ Erreur de connexion :", err);
    }
}

// 3. ÉCOUTE DES GALERIES
const CATEGORIES = ["tech", "studio", "import", "events", "divers"];
function startRealtimeListeners() {
    const { db, collection, onSnapshot, query, orderBy } = window._fb;
    CATEGORIES.forEach(cat => {
        const q = query(collection(db, `gallery_${cat}`), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const items = [];
            snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));
            renderGallery(cat, items);
        });
    });
}

// 4. FONCTION DE PUBLICATION (Celle qui te manquait)
window.publishMedia = async function() {
    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('mediaTitle');
    const category = document.querySelector('.section-option.selected').dataset.cat;

    if (!fileInput.files[0]) return alert("Choisis une photo !");
    
    const file = fileInput.files[0];
    const meta = {
        title: titleInput.value || "Sans titre",
        category: category,
        type: file.type.includes('video') ? 'video' : 'image'
    };

    try {
        document.getElementById('uploadStatus').style.display = 'block';
        await uploadAndSave(file, meta, (pct) => {
            document.getElementById('uploadBar').style.width = pct + "%";
        });
        closeModal('addModal');
        alert("Publié avec succès !");
    } catch (error) {
        alert("Erreur : " + error.message);
    }
};

// 5. UPLOAD VERS STORAGE + FIRESTORE
async function uploadAndSave(file, meta, onProgress) {
    const { storage, db, ref, uploadBytesResumable, getDownloadURL, collection, addDoc, serverTimestamp } = window._fb;
    
    const filename = `gallery/${meta.category}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filename);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on("state_changed", 
            (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            (err) => reject(err),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                await addDoc(collection(db, `gallery_${meta.category}`), {
                    ...meta, url, storagePath: filename, createdAt: serverTimestamp()
                });
                resolve();
            }
        );
    });
}

// 6. GESTION DE L'INTERFACE (MODALS / ADMIN)
window.showAdminLogin = () => document.getElementById('passwordModal').classList.add('active');
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

window.checkAdminPassword = function() {
    const pass = document.getElementById('adminPasswordInput').value;
    if (pass === "1234") { // REMPLACE PAR TON MOT DE PASSE
        window.isAdmin = true;
        document.body.classList.add('admin-mode');
        document.getElementById('adminBadge').style.display = 'block';
        document.getElementById('addContentBtn').style.display = 'flex';
        closeModal('passwordModal');
    } else {
        alert("Mot de passe incorrect");
    }
};

window.openAddModal = () => document.getElementById('addModal').classList.add('active');

window.selectSection = function(cat) {
    document.querySelectorAll('.section-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-cat="${cat}"]`).classList.add('selected');
};

function renderGallery(category, items) {
    const grid = document.getElementById(`grid-${category}`);
    if (!grid) return;
    grid.innerHTML = items.map(item => `
        <div class="gallery-item">
            <img src="${item.url}">
            <div class="gallery-overlay"><h3>${item.title}</h3></div>
            ${window.isAdmin ? `<button onclick="deleteGalleryItem('${category}','${item.id}','${item.storagePath}')" class="delete-btn">🗑️</button>` : ''}
        </div>
    `).join('');
}

window.deleteGalleryItem = async (cat, id, path) => {
    if(confirm("Supprimer ?")) {
        const { db, storage, doc, deleteDoc, ref, deleteObject } = window._fb;
        await deleteDoc(doc(db, `gallery_${cat}`, id));
        if(path) await deleteObject(ref(storage, path));
    }
};

document.addEventListener("DOMContentLoaded", initFirebase);
