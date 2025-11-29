// ==================== FIREBASE INITIALIZATION ====================

// 1. Your actual firebaseConfig object
const firebaseConfig = {
    apiKey: "AIzaSyADWeItdkynb8F-wkyOE5vRRtiS3CADAQ8",
    authDomain: "inchrist-9a495.firebaseapp.com",
    projectId: "inchrist-9a495",
    storageBucket: "inchrist-9a495.appspot.com", 
    messagingSenderId: "374704743098",
    appId: "1:374704743098:web:ab101bd1511737927fd883",
    measurementId: "G-NG7190WF2V"
};

// 2. Initialize Firebase App (V8 Namespaced Syntax)
firebase.initializeApp(firebaseConfig);

// 3. Get a reference to the Firestore database
const db = firebase.firestore(); 

// ==================== END FIREBASE INITIALIZATION ====================

// 🔴 The email linked to your Firebase Authentication user.
const ADMIN_EMAIL = "sk7102006saravana@gmail.com"; 
const STORAGE_KEYS = {}; 

// ==================== AUTHENTICATION (NEW FIREBASE AUTH LOGIC) ====================

function checkAuth() {
    const user = firebase.auth().currentUser;
    return user !== null;
}

async function login(password) {
    try {
        await firebase.auth().signInWithEmailAndPassword(ADMIN_EMAIL, password);
        return true;
    } catch (error) {
        console.error("Login failed:", error.message);
        alert("Login Failed. Check your password.");
        return false;
    }
}

function logout() {
    firebase.auth().signOut().catch((error) => {
        console.error("Logout error:", error);
    });
}

function requireAuth() {
    firebase.auth().onAuthStateChanged(user => {
        const path = window.location.pathname;
        const isProtectedPage = path.includes("attendance.html") || 
                                path.includes("members.html") || 
                                path.includes("history.html");

        if (user) {
            if (!isProtectedPage) {
                window.location.href = "attendance.html";
            }
        } else {
            if (isProtectedPage) {
                window.location.href = "index.html";
            }
        }
    });
}


// ==================== MEMBERS MANAGEMENT (FIREBASE LOGIC) ====================

async function loadMembers() {
    try {
        const snapshot = await db.collection("members").orderBy("name").get();
        return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
    } catch (error) {
        console.error("Error loading members from Firestore:", error);
        return [];
    }
}

async function addMember(name) {
    if (!name || name.trim() === "") {
        return false;
    }
    
    try {
        await db.collection("members").add({
            name: name.trim()
        });
        return true;
    } catch (error) {
        console.error("Error adding member:", error);
        return false;
    }
}

async function editMember(id, newName) {
    if (!newName || newName.trim() === "") {
        return false;
    }
    try {
        await db.collection("members").doc(id).update({
            name: newName.trim()
        });
        return true;
    } catch (error) {
        console.error("Error editing member:", error);
        return false;
    }
}

async function deleteMember(id) {
    try {
        await db.collection("members").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Error deleting member:", error);
        return false;
    }
}

async function renderMembersList() {
    const members = await loadMembers(); 
    const container = document.getElementById("membersList");
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = "<p class='no-data'>No members added yet.</p>";
        return;
    }

    let html = "<table><thead><tr><th>Name</th><th>Actions</th></tr></thead><tbody>";
    members.forEach(member => {
        html += `
            <tr>
                <td><span class="member-name" data-id="${member.id}">${escapeHtml(member.name)}</span></td>
                <td>
                    <button class="btn-edit" onclick="editMemberPrompt('${member.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteMemberConfirm('${member.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
}

async function editMemberPrompt(id) {
    const members = await loadMembers(); 
    const member = members.find(m => m.id === id);
    if (!member) return;

    const newName = prompt("Enter new name:", member.name);
    if (newName !== null) {
        if (await editMember(id, newName)) { 
            await renderMembersList(); 
        } else {
            alert("Failed to edit member. Name cannot be empty.");
        }
    }
}

async function deleteMemberConfirm(id) {
    const members = await loadMembers(); 
    const member = members.find(m => m.id === id);
    if (!member) return;

    if (confirm(`Are you sure you want to delete "${member.name}"?`)) {
        await deleteMember(id); 
        await renderMembersList(); 
    }
}

// ==================== ATTENDANCE SYSTEM (FIREBASE LOGIC) ====================

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

async function loadAttendance(date) {
    try {
        const doc = await db.collection("attendance").doc(date).get();
        if (doc.exists) {
            return doc.data().records || {};
        }
        return {};
    } catch (error) {
        console.error("Error loading attendance:", error);
        return {};
    }
}

async function saveAttendance(date, attendanceData) {
    try {
        await db.collection("attendance").doc(date).set({
            records: attendanceData
        });
    } catch (error) {
        console.error("Error saving attendance:", error);
    }
}

async function renderAttendancePage() {
    const today = getTodayDate();
    const dateDisplay = document.getElementById("todayDate");
    if (dateDisplay) {
        dateDisplay.textContent = today;
    }

    const members = await loadMembers(); 
    const container = document.getElementById("attendanceContainer");
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = "<p class='no-data'>No members added yet. Please add members first.</p>";
        return;
    }

    const existingAttendance = await loadAttendance(today); 
    let html = "<table><thead><tr><th>Member</th><th>Present</th></tr></thead><tbody>";
    members.forEach(member => {
        const isPresent = existingAttendance[member.id] === true;
        html += `
            <tr>
                <td>${escapeHtml(member.name)}</td>
                <td>
                    <input type="checkbox" 
                           id="attendance_${member.id}" 
                           data-member-id="${member.id}"
                           ${isPresent ? "checked" : ""}>
                </td>
            </tr>
        `;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
}

async function saveAttendanceForToday() {
    const today = getTodayDate();
    const members = await loadMembers(); 
    const attendanceData = {};

    members.forEach(member => {
        const checkbox = document.getElementById(`attendance_${member.id}`);
        attendanceData[member.id] = checkbox ? checkbox.checked : false; 
    });

    await saveAttendance(today, attendanceData); 
    alert("Attendance saved successfully!");
}

// ==================== HISTORY PAGE (FIREBASE LOGIC) ====================

async function loadAttendanceForDate(date) {
    if (!date) return;

    const members = await loadMembers(); 
    const attendanceData = await loadAttendance(date); 
    const container = document.getElementById("historyContainer");
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = "<p class='no-data'>No members added yet.</p>";
        return;
    }

    const hasData = Object.keys(attendanceData).length > 0;
    if (!hasData) {
        container.innerHTML = "<p class='no-data'>Attendance not recorded for this date.</p>";
        const exportBtn = document.getElementById("exportBtn");
        if (exportBtn) exportBtn.style.display = "none";
        return;
    }

    let html = "<table><thead><tr><th>Member</th><th>Status</th></tr></thead><tbody>";
    members.forEach(member => {
        const isPresent = attendanceData[member.id] === true;
        const statusClass = isPresent ? "present" : "absent";
        const statusText = isPresent ? "Present" : "Absent";
        html += `
            <tr>
                <td>${escapeHtml(member.name)}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
    html += "</tbody></table>";
    container.innerHTML = html;

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.style.display = "inline-block";
        exportBtn.onclick = () => exportToCSV(date, members, attendanceData); 
    }
}

function exportToCSV(date, members, attendanceData) {
    let csv = "Member,Status\n";
    members.forEach(member => {
        const isPresent = attendanceData[member.id] === true;
        const status = isPresent ? "Present" : "Absent";
        csv += `"${member.name}",${status}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ==================== PAGE INITIALIZATION ====================

// Initialize login page
if (document.getElementById("loginForm")) {
    requireAuth(); 

    document.getElementById("loginForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const password = document.getElementById("password").value;
        
        if (await login(password)) { 
            // Redirect handled by requireAuth listener
        } else {
            document.getElementById("password").value = "";
        }
    });
}

// Initialize attendance page
if (document.getElementById("attendanceContainer")) {
    requireAuth();
    (async () => {
        await renderAttendancePage(); 
    })();
    
    const saveBtn = document.getElementById("saveAttendanceBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveAttendanceForToday); 
    }
}

// Initialize members page
if (document.getElementById("membersList")) {
    requireAuth();
    (async () => {
        await renderMembersList(); 
    })();
    
    const addForm = document.getElementById("addMemberForm");
    if (addForm) {
        addForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            const nameInput = document.getElementById("memberName");
            const name = nameInput.value;
            if (await addMember(name)) { 
                nameInput.value = "";
                await renderMembersList(); 
            } else {
                alert("Please enter a valid member name.");
            }
        });
    }
}

// Initialize history page
if (document.getElementById("historyContainer")) {
    requireAuth();
    
    const datePicker = document.getElementById("historyDate");
    if (datePicker) {
        (async () => {
            const today = getTodayDate();
            datePicker.value = today;
            await loadAttendanceForDate(today); 
        })();
        
        datePicker.addEventListener("change", async function() {
            await loadAttendanceForDate(this.value); 
        });
    }
}

// Start auth listener on all pages to ensure proper redirection
if (window.location.pathname.includes("index.html") || 
    window.location.pathname.includes("attendance.html") || 
    window.location.pathname.includes("members.html") || 
    window.location.pathname.includes("history.html")) {
    requireAuth();
}
