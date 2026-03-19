// ================================================
//   EID SALAMI CALCULATOR — Admin Panel Logic
//   admin.js
// ================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =====================================================
// 🔥 FIREBASE CONFIG — Same as script.js
// =====================================================
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const COL = "leaderboard";

// =====================================================
// State
// =====================================================
let allData    = [];
let sortMode   = "salami";  // "salami" | "latest"
let searchTerm = "";

// =====================================================
// Helpers
// =====================================================
function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("bn-BD", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return iso; }
}

// =====================================================
// Render Table
// =====================================================
function renderTable() {
  const tbody = document.getElementById("admin-tbody");

  // Filter by search
  let filtered = allData.filter(d =>
    !searchTerm ||
    (d.username   || "").toLowerCase().includes(searchTerm) ||
    (d.targetName || "").toLowerCase().includes(searchTerm)
  );

  // Sort
  if (sortMode === "salami") {
    filtered.sort((a, b) => (b.salami || 0) - (a.salami || 0));
  } else {
    filtered.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-status">কোনো ডেটা পাওয়া যায়নি</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((d, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHTML(d.username   || "—")}</td>
      <td>${escapeHTML(d.targetName || "—")}</td>
      <td style="color:var(--gold);font-weight:700;">৳ ${d.salami || 0}</td>
      <td style="font-size:0.78rem;color:var(--text-muted);">${escapeHTML(d.ip || d.uid || "—")}</td>
      <td style="font-size:0.78rem;white-space:nowrap;">${formatDate(d.timestamp)}</td>
    </tr>
  `).join("");
}

// =====================================================
// Update Stats
// =====================================================
function updateStats() {
  const total   = allData.length;
  const highest = allData.reduce((m, d) => Math.max(m, d.salami || 0), 0);
  const avg     = total
    ? Math.round(allData.reduce((s, d) => s + (d.salami || 0), 0) / total)
    : 0;

  document.getElementById("stat-total").textContent   = total;
  document.getElementById("stat-highest").textContent = `৳ ${highest}`;
  document.getElementById("stat-avg").textContent     = `৳ ${avg}`;
  document.getElementById("entry-count").textContent  = total;
}

// =====================================================
// Real-time Listener
// =====================================================
function setupRealtimeListener() {
  const q = query(collection(db, COL), orderBy("salami", "desc"));
  onSnapshot(q, (snap) => {
    allData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    renderTable();
  }, (err) => {
    console.error("Snapshot error:", err);
    document.getElementById("admin-tbody").innerHTML =
      `<tr><td colspan="6" class="admin-status">Firebase এ সংযোগ হচ্ছে না। Config চেক করুন।</td></tr>`;
  });
}

// =====================================================
// Delete All
// =====================================================
async function deleteAll() {
  const confirmed = window.confirm(
    "⚠️ সত্যিই কি সব ডেটা মুছতে চাও?\n\nএই কাজ ফেরানো যাবে না!"
  );
  if (!confirmed) return;

  try {
    const snap = await getDocs(collection(db, COL));
    const deletes = snap.docs.map(d => deleteDoc(doc(db, COL, d.id)));
    await Promise.all(deletes);
    allData = [];
    updateStats();
    renderTable();
    alert("✅ সব ডেটা মুছে ফেলা হয়েছে।");
  } catch (e) {
    console.error("Delete error:", e);
    alert("❌ মুছতে সমস্যা হয়েছে: " + e.message);
  }
}

// =====================================================
// Event Listeners
// =====================================================
document.getElementById("search-input").addEventListener("input", (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderTable();
});

document.getElementById("sort-salami").addEventListener("click", () => {
  sortMode = "salami";
  document.getElementById("sort-salami").classList.add("active");
  document.getElementById("sort-latest").classList.remove("active");
  renderTable();
});

document.getElementById("sort-latest").addEventListener("click", () => {
  sortMode = "latest";
  document.getElementById("sort-latest").classList.add("active");
  document.getElementById("sort-salami").classList.remove("active");
  renderTable();
});

document.getElementById("btn-delete-all").addEventListener("click", deleteAll);

// =====================================================
// Init
// =====================================================
setupRealtimeListener();
