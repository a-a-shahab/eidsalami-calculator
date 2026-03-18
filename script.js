
// ==================== FIREBASE CONFIG (REPLACE WITH YOURS) ====================
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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==================== GLOBAL VARIABLES ====================
let userName = '';
let userIP = '';
let correctNameFlag = false;
let salamiAmount = 0;
let quizQuestions = [];
let currentQIndex = 0;
let userAnswers = [];

// Question Bank (ALL 15 Bangla questions exactly as required)
const questionBank = [
    "বল তো আমার নাম কি?",                     // FIXED #1
    "ঈদের দিন তুমি সকালে কী করো?",
    "তোমার প্রিয় ঈদের খাবার কোনটি?",
    "ঈদে তুমি কাদের সাথে সময় কাটাও?",
    "বাংলাদেশে ঈদ উদযাপনের সবচেয়ে বড় আয়োজন কোথায়?",
    "ঈদুল আজহায় কুরবানি দাও কি?",
    "তোমার ঈদের সালামি কিভাবে খরচ করো?",
    "ঈদের চাঁদ দেখতে কেমন লাগে?",
    "তোমার পরিবারে ঈদের রীতি কী?",
    "ঈদের নামাজ পড়ো কোথায়?",
    "ঈদ মোবারক বলে কতজনকে সালামি দাও?",
    "তোমার প্রিয় ঈদের পোশাকের রঙ কী?",
    "ঈদের ছুটিতে ভ্রমণ করো কি?",
    "সেহরি খেয়ে কেমন অনুভব করো?",
    "ঈদের পর কী মিষ্টি খাও?"
];

// ==================== UTILITIES ====================
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        // Fallback unique ID
        let uid = localStorage.getItem('eid_uid');
        if (!uid) {
            uid = 'uid_' + Date.now() + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('eid_uid', uid);
        }
        return uid;
    }
}

// ==================== FIREBASE FUNCTIONS ====================
async function saveToLeaderboard(name, salami, ip) {
    if (!ip) return;
    const q = db.collection("leaderboard").where("ip", "==", ip);
    const snapshot = await q.get();
    
    if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        const existing = snapshot.docs[0].data();
        if (salami > existing.salami) {
            await docRef.update({
                name: name,
                salami: salami,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } else {
        await db.collection("leaderboard").add({
            name: name,
            salami: salami,
            ip: ip,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

async function loadLeaderboard(isFloating = false) {
    const q = db.collection("leaderboard")
        .orderBy("salami", "desc")
        .limit(10);
    
    const snap = await q.get();
    const list = snap.docs.map(doc => {
        const d = doc.data();
        return { name: d.name, salami: d.salami };
    });
    
    const container = isFloating 
        ? document.getElementById('floating-lb-list')
        : document.getElementById('leaderboard-list');
    
    container.innerHTML = '';
    
    list.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'lb-item';
        div.innerHTML = `
            <span>${i+1}. ${item.name}</span>
            <span style="color:#f4d03f;font-weight:bold;">${item.salami} টাকা</span>
        `;
        container.appendChild(div);
    });
}

// ==================== APP FLOW ====================
async function initApp() {
    userIP = await getIP();
    loadLeaderboard();
    loadLeaderboard(true); // floating
    
    // Check URL params for direct result
    const params = new URLSearchParams(window.location.search);
    if (params.has('name') && params.has('salami')) {
        userName = decodeURIComponent(params.get('name'));
        salamiAmount = parseInt(params.get('salami'));
        showResultScreen(true);
    }
}

function startApp() {
    document.getElementById('landing-screen').classList.remove('active');
    document.getElementById('name-screen').classList.add('active');
}

function saveName() {
    const input = document.getElementById('name-input');
    userName = input.value.trim() || "অতিথি";
    localStorage.setItem('eid_user_name', userName);
    
    document.getElementById('name-screen').classList.remove('active');
    startQuiz();
}

function startQuiz() {
    // Select questions: 1 fixed + 4 random from remaining 14
    const others = shuffle(questionBank.slice(1)).slice(0, 4);
    quizQuestions = [questionBank[0], ...others];
    currentQIndex = 0;
    userAnswers = [];
    correctNameFlag = false;
    
    document.getElementById('quiz-screen').classList.add('active');
    loadQuestion();
}

function loadQuestion() {
    document.getElementById('q-number').textContent = currentQIndex + 1;
    document.getElementById('question-text').textContent = quizQuestions[currentQIndex];
    document.getElementById('answer-input').value = '';
}

function nextQuestion() {
    const answer = document.getElementById('answer-input').value.trim();
    userAnswers.push(answer);
    
    // Check only first question (fixed)
    if (currentQIndex === 0) {
        const lower = answer.toLowerCase();
        if (lower.includes('shahab') || lower.includes('sahab') || answer.includes('সাহাব')) {
            correctNameFlag = true;
        }
    }
    
    currentQIndex++;
    
    if (currentQIndex < 5) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    document.getElementById('quiz-screen').classList.remove('active');
    
    // Calculate salami
    if (correctNameFlag) {
        salamiAmount = Math.floor(Math.random() * 26) + 1;
    } else {
        salamiAmount = Math.floor(Math.random() * 99) + 2;
    }
    
    // Save to DB
    saveToLeaderboard(userName, salamiAmount, userIP);
    
    // Show result
    showResultScreen();
}

function showResultScreen(isShared = false) {
    document.getElementById('result-screen').classList.add('active');
    document.getElementById('floating-lb').style.display = 'none';
    
    document.getElementById('result-name').textContent = userName;
    document.getElementById('result-salami').textContent = salamiAmount;
    
    // Confetti
    confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 }
    });
    setTimeout(() => {
        confetti({
            particleCount: 150,
            angle: 60,
            spread: 70,
            origin: { x: 0.1, y: 0.7 }
        });
    }, 300);
    
    // Refresh leaderboard
    loadLeaderboard();
    loadLeaderboard(true);
    
    if (!isShared) {
        // Also save from shared link
        saveToLeaderboard(userName, salamiAmount, userIP);
    }
}

function takeScreenshot() {
    const card = document.getElementById('result-card');
    html2canvas(card, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${userName}_eid_salami.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function shareResult() {
    const base = window.location.origin + window.location.pathname;
    const link = `${base}?name=${encodeURIComponent(userName)}&salami=${salamiAmount}`;
    
    navigator.clipboard.writeText(link).then(() => {
        const btn = event.target;
        const original = btn.textContent;
        btn.textContent = '✅ লিংক কপি হয়েছে!';
        setTimeout(() => btn.textContent = original, 2000);
    });
}

function restartApp() {
    window.location.reload();
}

// ==================== KEYBOARD SUPPORT ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen && activeScreen.id === 'quiz-screen') {
            nextQuestion();
        } else if (activeScreen && activeScreen.id === 'name-screen') {
            saveName();
        }
    }
});

// ==================== START ====================
window.onload = initApp;
