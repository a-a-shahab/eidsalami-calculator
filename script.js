// ============== FIREBASE CONFIG ==============
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHPrM_o2Inb_E0Ix-Lg-88CnvDXdJgGZY",
  authDomain: "eid-salami-calculator.firebaseapp.com",
  projectId: "eid-salami-calculator",
  storageBucket: "eid-salami-calculator.firebasestorage.app",
  messagingSenderId: "1004762862713",
  appId: "1:1004762862713:web:9b541cd2bfa3da1ee1f0a8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global variables
let userName = '';
let targetName = '';
let salamiAmount = 0;
let userIP = '';
let userId = '';

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initFirebaseListeners();
    checkForSharedLink();
});

// Get IP
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        return null;
    }
}

// Get or create local user ID
function getLocalUserId() {
    let id = localStorage.getItem('eidSalamiUserId');
    if (!id) {
        id = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('eidSalamiUserId', id);
    }
    return id;
}

// Save to Firestore (one per IP)
async function saveToLeaderboard() {
    if (!salamiAmount || !userName) return;
    
    const ip = await getIP();
    userIP = ip || 'unknown';
    userId = ip || getLocalUserId();

    const docRef = db.collection('leaderboard').doc(userId);
    
    try {
        const docSnap = await docRef.get();
        
        if (docSnap.exists()) {
            const existing = docSnap.data();
            if (salamiAmount > existing.salami) {
                await docRef.update({
                    username: userName,
                    targetName: targetName,
                    salami: salamiAmount,
                    ip: userIP,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } else {
            await docRef.set({
                username: userName,
                targetName: targetName,
                salami: salamiAmount,
                ip: userIP,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        refreshLeaderboard();
    } catch (e) {
        console.error("Firestore error:", e);
    }
}

// Check URL params for shared result
function checkForSharedLink() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('name') && params.has('target') && params.has('salami')) {
        userName = decodeURIComponent(params.get('name'));
        targetName = decodeURIComponent(params.get('target'));
        salamiAmount = parseInt(params.get('salami'));
        
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('name-screen').classList.remove('active');
        document.getElementById('scratch-screen').classList.remove('active');
        document.getElementById('result-screen').classList.add('active');
        
        showResult();
        saveToLeaderboard();
    }
}

// Start game
function startGame() {
    document.getElementById('start-screen').classList.remove('active');
    document.getElementById('name-screen').classList.add('active');
}

// Submit names
function submitNames() {
    const userInput = document.getElementById('user-name').value.trim();
    const targetInput = document.getElementById('target-name').value.trim();
    const errorEl = document.getElementById('name-error');

    if (!userInput || !targetInput) {
        errorEl.textContent = 'দয়া করে সব ঘর পূরণ করো ❗';
        return;
    }

    userName = userInput;
    targetName = targetInput;
    errorEl.textContent = '';

    // Generate salami
    const isBetter = targetName.toLowerCase().includes('shahab') || 
                     targetName.toLowerCase().includes('sahab') || 
                     targetName.includes('সাহাব');
    
    salamiAmount = isBetter 
        ? Math.floor(Math.random() * 91) + 10 
        : Math.floor(Math.random() * 49) + 2;

    // Switch to scratch
    document.getElementById('name-screen').classList.remove('active');
    document.getElementById('scratch-screen').classList.add('active');
    
    // Prepare scratch
    document.getElementById('scratch-salami').textContent = salamiAmount;
    initScratchCard();
}

// Scratch card logic
let canvas, ctx, isDrawing = false, lastX = 0, lastY = 0;
let revealed = false;

function initScratchCard() {
    canvas = document.getElementById('scratch-canvas');
    ctx = canvas.getContext('2d');
    
    // Fill scratch layer
    ctx.fillStyle = '#e8b923';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add "Scratch Here" text
    ctx.font = 'bold 22px Noto Sans Bengali';
    ctx.fillStyle = '#006400';
    ctx.textAlign = 'center';
    ctx.fillText('স্ক্র্যাচ করো!', canvas.width/2, canvas.height/2 + 10);
    
    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events
    canvas.addEventListener('touchstart', startDrawingTouch);
    canvas.addEventListener('touchmove', drawTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
}

function draw(e) {
    if (!isDrawing || revealed) return;
    const coords = getCoordinates(e);
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 28;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastX = coords.x;
    lastY = coords.y;
    
    // Check percentage every 8 strokes
    if (Math.random() < 0.12) checkScratchProgress();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        checkScratchProgress();
    }
}

function startDrawingTouch(e) {
    e.preventDefault();
    startDrawing(e);
}

function drawTouch(e) {
    e.preventDefault();
    draw(e);
}

function checkScratchProgress() {
    if (revealed) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparentPixels = 0;
    const total = imageData.data.length / 4;
    
    for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] < 50) transparentPixels++;
    }
    
    const percent = (transparentPixels / total) * 100;
    
    if (percent >= 40) {
        revealScratch();
    }
}

function revealScratch() {
    revealed = true;
    canvas.style.transition = 'opacity 1.2s ease';
    canvas.style.opacity = '0.08';
    
    // Confetti celebration
    confettiBurst();
    
    // Show continue button
    document.getElementById('continue-btn').classList.remove('hidden');
}

// Confetti
function confettiBurst() {
    const count = 180;
    const defaults = { origin: { y: 0.6 } };
    
    function fire(particleRatio, opts) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
        });
    }
    
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92 });
    fire(0.1, { spread: 120, startVelocity: 45 });
}

// Go to result
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

// Download screenshot
async function downloadScreenshot() {
    const resultCard = document.getElementById('result-card');
    const canvas = await html2canvas(resultCard, {
        scale: 2,
        backgroundColor: '#006400'
    });
    
    const link = document.createElement('a');
    link.download = `eid-salami-${userName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Share
function shareResult() {
    const params = new URLSearchParams({
        name: userName,
        target: targetName,
        salami: salamiAmount
    });
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('✅ শেয়ার লিংক কপি হয়েছে!\n\nবন্ধুদের পাঠিয়ে দিন 🎉');
    });
}

// Restart
function restartGame() {
    location.reload();
}

// Leaderboard
let leaderboardSnapshot = null;

function initFirebaseListeners() {
    const q = db.collection('leaderboard')
        .orderBy('salami', 'desc')
        .limit(10);
    
    q.onSnapshot(snapshot => {
        leaderboardSnapshot = snapshot;
        renderLeaderboard();
    });
}

function refreshLeaderboard() {
    // Already real-time via onSnapshot
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    container.innerHTML = '';
    
    if (!leaderboardSnapshot) return;
    
    let rank = 1;
    leaderboardSnapshot.forEach(doc => {
        const data = doc.data();
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <span class="emoji-rank">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👑'} ${data.username}</span>
            <span><strong>${data.salami}</strong> টাকা</span>
        `;
        container.appendChild(div);
        rank++;
    });
}