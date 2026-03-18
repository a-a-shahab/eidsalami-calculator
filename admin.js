
// ==================== FIREBASE CONFIG (SAME AS MAIN) ====================
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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let allData = [];
let currentSort = 'salami';

// ==================== RENDER TABLE ====================
function renderTable(filteredData) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    filteredData.forEach(item => {
        const tr = document.createElement('tr');
        const timeStr = item.timestamp 
            ? item.timestamp.toDate().toLocaleString('bn-BD', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              }) 
            : '—';
        
        tr.innerHTML = `
            <td>${item.name}</td>
            <td style="color:#f4d03f;font-weight:bold;">${item.salami} টাকা</td>
            <td style="font-family:monospace;font-size:0.9rem;">${item.ip}</td>
            <td>${timeStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== LOAD & REAL-TIME ====================
function loadAdminData() {
    db.collection("leaderboard").onSnapshot(snapshot => {
        allData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        filterTable();
    });
}

// ==================== FILTER & SORT ====================
function filterTable() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    let filtered = allData;
    
    if (searchTerm) {
        filtered = allData.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply current sort
    if (currentSort === 'salami') {
        filtered.sort((a, b) => b.salami - a.salami);
    } else if (currentSort === 'latest') {
        filtered.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return b.timestamp.toDate() - a.timestamp.toDate();
        });
    }
    
    renderTable(filtered);
}

function sortBySalami() {
    currentSort = 'salami';
    filterTable();
}

function sortByLatest() {
    currentSort = 'latest';
    filterTable();
}

// ==================== DELETE ALL ====================
async function deleteAllData() {
    if (!confirm('⚠️ সব ডেটা মুছে ফেলতে চাও? এটি অপরিবর্তনীয়!')) return;
    
    const batch = db.batch();
    const snap = await db.collection("leaderboard").get();
    
    snap.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();
    alert('✅ সব ডেটা মুছে ফেলা হয়েছে!');
}

// ==================== INIT ====================
window.onload = () => {
    loadAdminData();
};
