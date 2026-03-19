
// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyAHPrM_o2Inb_E0Ix-Lg-88CnvDXdJgGZY",
  authDomain: "eid-salami-calculator.firebaseapp.com",
  projectId: "eid-salami-calculator",
  storageBucket: "eid-salami-calculator.firebasestorage.app",
  messagingSenderId: "1004762862713",
  appId: "1:1004762862713:web:9b541cd2bfa3da1ee1f0a8"
};

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
let selectedMCQ = '';

// ==================== QUESTION LIST (1 Short + 5 MCQ) ====================
const questionList = [
    { text: "বল তো আমার নাম কি?", type: "short" },
    { 
        text: "তোমার সাথে আমার সম্পর্ক কি?", 
        type: "mcq", 
        options: ["জুনিয়র", "বন্ধু", "অনলাইন বন্ধু", "চিনি না"] 
    },
    { 
        text: "তোমার সাথে কি আমার ছবি আছে?", 
        type: "mcq", 
        options: ["আছে", "নাই"] 
    },
    { 
        text: "তোমার CG কত?", 
        type: "mcq", 
        options: ["৩ এর নিচে", "৩-৩.৫", "৩.৫-৩.৭৫", "৩.৭৫+"] 
    },
    { 
        text: "তুমি আমাকে কি মনে করো?", 
        type: "mcq", 
        options: ["বলদ সিনিয়র", "স্মার্ট", "ভাই আপনি সেরা"] 
    },
    { 
        text: "তোমার কি মনে হয় আমার GF/BF আছে?", 
        type: "mcq", 
        options: ["আছে", "নাই"] 
    }
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

async function loadLeaderboard(containerId) {
    const q = db.collection("leaderboard")
        .orderBy("salami", "desc")
        .limit(10);
    
    const snap = await q.get();
    const list = snap.docs.map(doc => {
        const d = doc.data();
        return { name: d.name, salami: d.salami };
    });
    
    const container = document.getElementById(containerId);
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

// ==================== MODAL FUNCTIONS ====================
function showLeaderboardModal() {
    loadLeaderboard('modal-leaderboard-list');
    document.getElementById('lb-modal').classList.add('active');
}

function hideLeaderboardModal() {
    document.getElementById('lb-modal').classList.remove('active');
}

// ==================== APP FLOW ====================
async function initApp() {
    userIP = await getIP();
    
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
    // Fixed short question + 4 random MCQ
    quizQuestions = [questionList[0]];
    const mcqs = shuffle(questionList.slice(1)).slice(0, 4);
    quizQuestions = quizQuestions.concat(mcqs);
    
    currentQIndex = 0;
    userAnswers = [];
    correctNameFlag = false;
    selectedMCQ = '';
    
    document.getElementById('quiz-screen').classList.add('active');
    loadQuestion();
}

function loadQuestion() {
    document.getElementById('q-number').textContent = currentQIndex + 1;
    const q = quizQuestions[currentQIndex];
    document.getElementById('question-text').textContent = q.text;
    
    const input = document.getElementById('answer-input');
    const optionsDiv = document.getElementById('options-container');
    
    if (q.type === "short") {
        input.style.display = 'block';
        optionsDiv.style.display = 'none';
        input.value = '';
        document.getElementById('next-btn').style.display = 'block';
    } else {
        input.style.display = 'none';
        optionsDiv.style.display = 'flex';
        optionsDiv.innerHTML = '';
        document.getElementById('next-btn').style.display = 'none';
        
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'mcq-btn';
            btn.textContent = opt;
            btn.onclick = () => selectMCQ(opt);
            optionsDiv.appendChild(btn);
        });
    }
}

function selectMCQ(answer) {
    selectedMCQ = answer;
    nextQuestion();
}

function nextQuestion() {
    const q = quizQuestions[currentQIndex];
    let answer = '';
    
    if (q.type === "short") {
        answer = document.getElementById('answer-input').value.trim();
    } else {
        answer = selectedMCQ;
    }
    
    userAnswers.push(answer);
    
    // Check only first question
    if (currentQIndex === 0) {
        const lower = answer.toLowerCase();
        if (lower.includes('shahab') || lower.includes('sahab') || answer.includes('সাহাব')) {
            correctNameFlag = true;
        }
    }
    
    currentQIndex++;
    selectedMCQ = '';
    
    if (currentQIndex < 5) {
        loadQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    document.getElementById('quiz-screen').classList.remove('active');
    
    if (correctNameFlag) {
        salamiAmount = Math.floor(Math.random() * 26) + 1;
    } else {
        salamiAmount = Math.floor(Math.random() * 120) + 2;
    }
    
    saveToLeaderboard(userName, salamiAmount, userIP);
    showResultScreen();
}

function showResultScreen(isShared = false) {
    document.getElementById('result-screen').classList.add('active');
    
    document.getElementById('result-name').textContent = userName;
    document.getElementById('result-salami').textContent = salamiAmount;
    
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

function shareResult(event) {
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
            const q = quizQuestions[currentQIndex];
            if (q.type === "short") nextQuestion();
        } else if (activeScreen && activeScreen.id === 'name-screen') {
            saveName();
        }
    }
});

// ==================== START ====================
window.onload = initApp;