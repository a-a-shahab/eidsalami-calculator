// ============== EidSalamiCalculator - FIXED SCRATCH (Mobile + Desktop) ==============

const firebaseConfig = {
    apiKey: "AIzaSyAHPrM_o2Inb_E0Ix-Lg-88CnvDXdJgGZY",
    authDomain: "eid-salami-calculator.firebaseapp.com",
    projectId: "eid-salami-calculator",
    storageBucket: "eid-salami-calculator.firebasestorage.app",
    messagingSenderId: "1004762862713",
    appId: "1:1004762862713:web:9b541cd2bfa3da1ee1f0a8"
};

let db;
let userName = '', targetName = '', salamiAmount = 0;
let canvas, ctx, revealed = false;

document.addEventListener('DOMContentLoaded', () => {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    initFirebaseListeners();
    checkForSharedLink();
});

async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return 'unknown'; }
}

function getLocalUserId() {
    let id = localStorage.getItem('eidSalamiUserId');
    if (!id) {
        id = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('eidSalamiUserId', id);
    }
    return id;
}

async function saveToLeaderboard() {
    if (!salamiAmount || !userName || !db) return;
    const ip = await getIP();
    const userId = ip || getLocalUserId();
    const docRef = db.collection('leaderboard').doc(userId);
    try {
        const docSnap = await docRef.get();
        if (docSnap.exists()) {
            const existing = docSnap.data();
            if (salamiAmount > existing.salami) {
                await docRef.update({ username: userName, targetName, salami: salamiAmount, ip, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            }
        } else {
            await docRef.set({ username: userName, targetName, salami: salamiAmount, ip, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        }
    } catch (e) {}
}

function checkForSharedLink() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('name') && params.has('target') && params.has('salami')) {
        userName = decodeURIComponent(params.get('name'));
        targetName = decodeURIComponent(params.get('target'));
        salamiAmount = parseInt(params.get('salami'));
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('result-screen').classList.add('active');
        showResult();
        saveToLeaderboard();
    }
}

function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('name-screen').classList.add('active');
}

function submitNames() {
    const userInput = document.getElementById('user-name').value.trim();
    const targetInput = document.getElementById('target-name').value.trim();
    const errorEl = document.getElementById('name-error');

    if (!userInput || !targetInput) {
        errorEl.textContent = 'Enter all boxes ❗';
        return;
    }

    userName = userInput;
    targetName = targetInput;
    errorEl.textContent = '';

    const isBetter = targetName.toLowerCase().includes('shahab') || targetName.toLowerCase().includes('sahab') || targetName.includes('সাহাব');
    salamiAmount = isBetter ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 7) + 2;

    document.getElementById('name-screen').classList.remove('active');
    document.getElementById('scratch-screen').classList.add('active');
    document.getElementById('scratch-salami').textContent = salamiAmount;

    // IMPORTANT: Wait for DOM to render before initializing canvas
    setTimeout(initScratchCard, 200);
}

// ================== SCRATCH LOGIC (Fully Fixed) ==================
function initScratchCard() {
    canvas = document.getElementById('scratch-canvas');
    const container = canvas.parentElement;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width || 380;
    canvas.height = rect.height || 220;

    ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e8b923';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 24px Noto Sans Bengali';
    ctx.fillStyle = '#003300';
    ctx.textAlign = 'center';
    ctx.fillText('স্ক্র্যাচ করো!', canvas.width/2, canvas.height/2 + 12);

    // Mouse
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch (Mobile)
    canvas.addEventListener('touchstart', startDrawingTouch, { passive: false });
    canvas.addEventListener('touchmove', drawTouch, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    }
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

let isDrawing = false, lastX = 0, lastY = 0;

function startDrawing(e) { isDrawing = true; const c = getCoordinates(e); lastX = c.x; lastY = c.y; }
function draw(e) {
    if (!isDrawing || revealed) return;
    const c = getCoordinates(e);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 28;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    lastX = c.x; lastY = c.y;
    if (Math.random() < 0.15) checkScratchProgress();
}
function stopDrawing() { if (isDrawing) { isDrawing = false; checkScratchProgress(); } }
function startDrawingTouch(e) { e.preventDefault(); startDrawing(e); }
function drawTouch(e) { e.preventDefault(); draw(e); }

function checkScratchProgress() {
    if (revealed) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    const total = imageData.data.length / 4;
    for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] < 50) transparent++;
    }
    if ((transparent / total) * 100 >= 40) revealScratch();
}

function revealScratch() {
    revealed = true;
    canvas.style.transition = 'opacity 1s';
    canvas.style.opacity = '0.05';
    
    const overlay = document.getElementById('celebration-overlay');
    overlay.classList.remove('hidden');
    confettiBurst();

    setTimeout(() => {
        overlay.classList.add('hidden');
        goToResult();
    }, 2800);
}

function confettiBurst() {
    const count = 220;
    const defaults = { origin: { y: 0.6 } };
    function fire(ratio, opts) {
        confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });
    }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91 });
    fire(0.1, { spread: 120, startVelocity: 25 });
    fire(0.1, { spread: 120, startVelocity: 45 });
}

function goToResult() {
    document.getElementById('scratch-screen').classList.remove('active');
    document.getElementById('result-screen').classList.add('active');
    showResult();
    saveToLeaderboard();
}

function showResult() {
    document.getElementById('congrats-name').textContent = `${userName} Congratulations!! 🎉`;
    document.getElementById('target-text').innerHTML = `${targetName} এর থেকে সালামি বুঝে নাও 💰`;
    document.getElementById('final-salami').textContent = salamiAmount;
}

async function downloadScreenshot() {
    const card = document.getElementById('result-card');
    const canvasImg = await html2canvas(card, { scale: 2, backgroundColor: '#003300' });
    const link = document.createElement('a');
    link.download = `eid-salami-${userName}.png`;
    link.href = canvasImg.toDataURL();
    link.click();
}

function shareResult() {
    const params = new URLSearchParams({ name: userName, target: targetName, salami: salamiAmount });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    navigator.clipboard.writeText(url).then(() => alert('✅ শেয়ার লিংক কপি হয়েছে!'));
}

function restartGame() {
    location.reload();
}

// ================== LEADERBOARD ==================
let leaderboardSnapshot = null;

function initFirebaseListeners() {
    if (!db) return;
    const q = db.collection('leaderboard').orderBy('salami', 'desc').limit(10);
    q.onSnapshot(snap => {
        leaderboardSnapshot = snap;
        renderLeaderboard();
    });
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    container.innerHTML = '';
    if (!leaderboardSnapshot) return;
    
    let rank = 1;
    leaderboardSnapshot.forEach(doc => {
        const d = doc.data();
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <span>${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👑'} ${d.username || 'Anonymous'}</span>
            <span><strong>${d.salami}</strong> টাকা</span>
        `;
        container.appendChild(div);
        rank++;
    });
}