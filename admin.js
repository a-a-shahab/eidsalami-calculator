const firebaseConfig = {
    apiKey: "AIzaSyAHPrM_o2Inb_E0Ix-Lg-88CnvDXdJgGZY",
    authDomain: "eid-salami-calculator.firebaseapp.com",
    projectId: "eid-salami-calculator",
    storageBucket: "eid-salami-calculator.firebasestorage.app",
    messagingSenderId: "1004762862713",
    appId: "1:1004762862713:web:9b541cd2bfa3da1ee1f0a8"
};

let db;
let allData = [];
let currentSort = 'salami';

document.addEventListener('DOMContentLoaded', () => {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    initAdmin();
});

function initAdmin() {
    // Removed orderBy - requires a Firestore composite index, silently fails without one.
    // Sorting handled client-side in renderAdminTable.
    db.collection('leaderboard').onSnapshot(
        function(snapshot) {
            allData = [];
            snapshot.forEach(function(doc) {
                var data = doc.data();
                allData.push(Object.assign({ id: doc.id }, data, {
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
                }));
            });
            renderAdminTable();
        },
        function(err) { console.error('Admin snapshot error:', err); }
    );
}
