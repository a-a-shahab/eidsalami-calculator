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

let allData = [];
let currentSort = 'salami';

function initAdmin() {
    const q = db.collection('leaderboard');
    
    q.onSnapshot(snapshot => {
        allData = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allData.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
            });
        });
        renderAdminTable();
    });
}

function renderAdminTable(filteredData = null) {
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = '';
    
    let dataToShow = filteredData || [...allData];
    
    // Sort
    if (currentSort === 'salami') {
        dataToShow.sort((a, b) => b.salami - a.salami);
    } else if (currentSort === 'time') {
        dataToShow.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    dataToShow.forEach(item => {
        const row = document.createElement('tr');
        const timeStr = item.timestamp.toLocaleString('bn-BD', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        row.innerHTML = `
            <td>${item.username}</td>
            <td>${item.targetName}</td>
            <td><strong>${item.salami}</strong></td>
            <td>${item.ip}</td>
            <td>${timeStr}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterTable() {
    const term = document.getElementById('search-input').value.toLowerCase().trim();
    if (!term) {
        renderAdminTable();
        return;
    }
    
    const filtered = allData.filter(item => 
        item.username.toLowerCase().includes(term) ||
        item.targetName.toLowerCase().includes(term)
    );
    renderAdminTable(filtered);
}

function sortTable(mode) {
    currentSort = mode;
    renderAdminTable();
}

async function deleteAllData() {
    if (!confirm('⚠️ সব ডেটা পার্মানেন্টলি মুছে ফেলা হবে!\n\nআপনি নিশ্চিত?')) return;
    
    try {
        const batch = db.batch();
        const snapshot = await db.collection('leaderboard').get();
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        alert('✅ সব ডেটা মুছে ফেলা হয়েছে');
    } catch (e) {
        console.error(e);
        alert('Error deleting data');
    }
}

// Start admin
window.onload = initAdmin;