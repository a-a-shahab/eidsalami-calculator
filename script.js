// ================================================
//   EID SALAMI CALCULATOR — SCRATCH CARD EDITION
//   script.js — Main App Logic + Firebase
// ================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =====================================================
// 🔥 FIREBASE CONFIG — Replace with your own values!
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
// Helpers
// =====================================================

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getOrCreateUID() {
  let uid = localStorage.getItem("eid_uid");
  if (!uid) {
    uid = "uid_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("eid_uid", uid);
  }
  return uid;
}

async function getUserIP() {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    return d.ip || getOrCreateUID();
  } catch {
    return getOrCreateUID();
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
  });
  const s = document.getElementById(id);
  if (s) { s.classList.add("active"); }
}

// Generate stars
(function generateStars() {
  const container = document.getElementById("stars");
  if (!container) return;
  for (let i = 0; i < 60; i++) {
    const star = document.createElement("div");
    star.classList.add("star");
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText = `
      width:${size}px; height:${size}px;
      top:${Math.random()*100}%; left:${Math.random()*100}%;
      --dur:${(Math.random()*3+2).toFixed(1)}s;
      animation-delay:${(Math.random()*4).toFixed(1)}s;
    `;
    container.appendChild(star);
  }
})();

// =====================================================
// App State
// =====================================================
let state = {
  userName:   "",
  targetName: "",
  salami:     0,
  ip:         "",
  uid:        getOrCreateUID()
};

// =====================================================
// URL PARAM: Direct Result View
// =====================================================
function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const name   = params.get("name");
  const target = params.get("target");
  const sal    = parseInt(params.get("salami"));
  if (name && target && sal) {
    state.userName   = name;
    state.targetName = target;
    state.salami     = sal;
    showResult();
    return true;
  }
  return false;
}

// =====================================================
// LEADERBOARD
// =====================================================
async function loadLeaderboard(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  try {
    const q   = query(collection(db, COL), orderBy("salami", "desc"), limit(10));
    const snap = await getDocs(q);
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="3" class="lb-loading">এখনো কোনো এন্ট্রি নেই</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    let rank = 1;
    snap.forEach(d => {
      const data = d.data();
      const tr   = document.createElement("tr");
      if (rank <= 3) tr.classList.add(`rank-${rank}`);
      tr.innerHTML = `
        <td>${rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}</td>
        <td>${escapeHTML(data.username || "—")}</td>
        <td>৳ ${data.salami || 0}</td>`;
      tbody.appendChild(tr);
      rank++;
    });
  } catch (e) {
    console.error("Leaderboard error:", e);
    tbody.innerHTML = `<tr><td colspan="3" class="lb-loading">লোড করতে সমস্যা হচ্ছে</td></tr>`;
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// =====================================================
// FIRESTORE: Save or Update
// =====================================================
async function saveToFirestore() {
  try {
    const ip  = state.ip || state.uid;
    const q   = query(collection(db, COL), where("ip", "==", ip));
    const snap = await getDocs(q);

    if (!snap.empty) {
      // Entry exists — update only if new salami > old
      const existing = snap.docs[0];
      const oldSalami = existing.data().salami || 0;
      if (state.salami > oldSalami) {
        await updateDoc(doc(db, COL, existing.id), {
          username:   state.userName,
          targetName: state.targetName,
          salami:     state.salami,
          timestamp:  new Date().toISOString()
        });
      }
    } else {
      await addDoc(collection(db, COL), {
        username:   state.userName,
        targetName: state.targetName,
        salami:     state.salami,
        ip:         ip,
        uid:        state.uid,
        timestamp:  new Date().toISOString()
      });
    }
  } catch (e) {
    console.error("Firestore save error:", e);
  }
}

// =====================================================
// RESULT SCREEN
// =====================================================
function showResult() {
  document.getElementById("result-congrats").textContent =
    `${state.userName} Congratulations!! 🎉`;
  document.getElementById("result-target").textContent =
    `${state.targetName} এর থেকে সালামি বুঝে নাও 💰`;
  document.getElementById("result-amount").textContent = state.salami;
  showScreen("screen-result");
  loadLeaderboard("result-lb-body");

  // Trigger confetti celebration
  triggerConfetti();
}

function triggerConfetti() {
  const colors = ["#F5C842", "#FFE082", "#1da553", "#ffffff", "#C89B00"];
  confetti({ particleCount: 120, spread: 90, colors, origin: { y: 0.6 } });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, colors, origin: { x: 0 } }), 400);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, colors, origin: { x: 1 } }), 700);
}

// =====================================================
// SCRATCH CARD ENGINE
// =====================================================
function initScratchCard() {
  const canvas   = document.getElementById("scratch-canvas");
  const card     = document.getElementById("scratch-card");
  const progress = document.getElementById("scratch-progress");

  const W = card.offsetWidth  || 340;
  const H = card.offsetHeight || 220;

  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");

  // Draw scratchable layer — dark gold texture
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0,   "#2a1a00");
  grad.addColorStop(0.4, "#4a3200");
  grad.addColorStop(1,   "#1a0e00");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Pattern overlay
  ctx.strokeStyle = "rgba(245,200,66,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 18) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  for (let j = 0; j < H; j += 18) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
  }

  // Label text
  ctx.fillStyle = "rgba(245,200,66,0.55)";
  ctx.font = "bold 18px 'Hind Siliguri', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("এখানে ঘষো 🪙", W / 2, H / 2 - 14);
  ctx.font = "14px 'Hind Siliguri', sans-serif";
  ctx.fillStyle = "rgba(245,200,66,0.35)";
  ctx.fillText("Scratch Here", W / 2, H / 2 + 10);

  // emoji decorations
  ctx.font = "22px serif";
  ctx.fillText("💰", 40, 45);
  ctx.fillText("🎊", W - 45, 45);
  ctx.fillText("✨", 40, H - 25);
  ctx.fillText("🎁", W - 45, H - 25);

  ctx.globalCompositeOperation = "destination-out";

  let isDrawing = false;
  let revealed  = false;

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function scratch(e) {
    e.preventDefault();
    if (!isDrawing || revealed) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
    updateProgress();
  }

  function updateProgress() {
    const imgData = ctx.getImageData(0, 0, W, H);
    let cleared = 0;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] === 0) cleared++;
    }
    const pct = (cleared / (W * H)) * 100;
    progress.style.width = Math.min(pct, 100) + "%";

    if (pct >= 40 && !revealed) {
      revealed = true;
      revealComplete();
    }
  }

  function revealComplete() {
    // Animate canvas fade out
    canvas.style.transition = "opacity 0.6s";
    canvas.style.opacity = "0";
    setTimeout(() => { canvas.style.display = "none"; }, 600);

    // Save to Firestore
    saveToFirestore();

    // Transition to result after short delay
    setTimeout(() => showResult(), 900);
  }

  canvas.addEventListener("mousedown",  () => isDrawing = true);
  canvas.addEventListener("mousemove",  scratch);
  canvas.addEventListener("mouseup",    () => isDrawing = false);
  canvas.addEventListener("mouseleave", () => isDrawing = false);
  canvas.addEventListener("touchstart", () => isDrawing = true, { passive: false });
  canvas.addEventListener("touchmove",  scratch, { passive: false });
  canvas.addEventListener("touchend",   () => isDrawing = false);
}

// =====================================================
// SHARE
// =====================================================
function buildShareURL() {
  const base = window.location.origin + window.location.pathname;
  return `${base}?name=${encodeURIComponent(state.userName)}&target=${encodeURIComponent(state.targetName)}&salami=${state.salami}`;
}

// =====================================================
// SCREENSHOT
// =====================================================
async function downloadResult() {
  const el = document.getElementById("result-card");
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: "#0D5C2E",
      scale: 2,
      useCORS: true
    });
    const link    = document.createElement("a");
    link.download = "EidSalami_Result.png";
    link.href     = canvas.toDataURL("image/png");
    link.click();
  } catch (e) {
    console.error("Screenshot error:", e);
    showToast("স্ক্রিনশট নিতে পারিনি 😢");
  }
}

// =====================================================
// MAIN INIT
// =====================================================
async function main() {
  // Fetch IP early
  getUserIP().then(ip => { state.ip = ip; });

  // Check for shared URL params first
  if (checkURLParams()) return;

  // Load leaderboard on start screen
  loadLeaderboard("lb-body");

  // ── Start Button ──
  document.getElementById("btn-start").addEventListener("click", () => {
    // Pre-fill from localStorage
    const savedName   = localStorage.getItem("eid_userName")   || "";
    const savedTarget = localStorage.getItem("eid_targetName") || "";
    document.getElementById("user-name").value   = savedName;
    document.getElementById("target-name").value = savedTarget;
    showScreen("screen-names");
  });

  // ── Back Button ──
  document.getElementById("btn-back-names").addEventListener("click", () => {
    showScreen("screen-start");
  });

  // ── Proceed Button ──
  document.getElementById("btn-proceed").addEventListener("click", () => {
    const uName  = document.getElementById("user-name").value.trim();
    const tName  = document.getElementById("target-name").value.trim();
    const errEl  = document.getElementById("name-error");

    if (!uName || !tName) {
      errEl.style.display = "block";
      return;
    }
    errEl.style.display = "none";

    state.userName   = uName;
    state.targetName = tName;
    localStorage.setItem("eid_userName",   uName);
    localStorage.setItem("eid_targetName", tName);

    // Determine salami range
    const betterRange = /shahab|sahab|সাহাব/i.test(tName);
    state.salami = betterRange ? rand(10, 100) : rand(2, 50);

    // Show scratch screen
    showScreen("screen-scratch");
    document.getElementById("scratch-prompt").textContent =
      `${tName} এর কাছ থেকে কত পাচ্ছো দেখো! 🤞`;

    // Init after DOM paint
    requestAnimationFrame(() => setTimeout(initScratchCard, 50));
  });

  // ── Replay ──
  document.getElementById("btn-replay").addEventListener("click", () => {
    // Reset scratch canvas state for re-use
    const canvas = document.getElementById("scratch-canvas");
    canvas.style.opacity = "1";
    canvas.style.display = "";
    document.getElementById("scratch-progress").style.width = "0%";

    showScreen("screen-start");
    loadLeaderboard("lb-body");
  });

  // ── Screenshot ──
  document.getElementById("btn-screenshot").addEventListener("click", downloadResult);

  // ── Share ──
  document.getElementById("btn-share").addEventListener("click", () => {
    const url = buildShareURL();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast("লিংক কপি হয়েছে! 📋"));
    } else {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("লিংক কপি হয়েছে! 📋");
    }
  });
}

main();
