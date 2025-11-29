// Constants
const ADMIN_PASSWORD = "admin12"; // Change this password as needed
const STORAGE_KEYS = {
    IS_LOGGED_IN: "isLoggedIn",
    MEMBERS: "members"
};

// ==================== AUTHENTICATION ====================

function checkAuth() {
    const isLoggedIn = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
    return isLoggedIn === "true";
}

function login(password) {
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, "true");
        window.location.href = "attendance.html";
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
    window.location.href = "index.html";
}

function requireAuth() {
    if (!checkAuth()) {
        window.location.href = "index.html";
    }
}

// ==================== MEMBERS MANAGEMENT ====================

function loadMembers() {
    const membersJson = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (membersJson) {
        try {
            return JSON.parse(membersJson);
        } catch (e) {
            return [];
        }
    }
    return [];
}

function saveMembers(members) {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
}

function addMember(name) {
    if (!name || name.trim() === "") {
        return false;
    }
    const members = loadMembers();
    const newMember = {
        id: Date.now().toString(),
        name: name.trim()
    };
    members.push(newMember);
    saveMembers(members);
    return true;
}

function editMember(id, newName) {
    if (!newName || newName.trim() === "") {
        return false;
    }
    const members = loadMembers();
    const memberIndex = members.findIndex(m => m.id === id);
    if (memberIndex !== -1) {
        members[memberIndex].name = newName.trim();
        saveMembers(members);
        return true;
    }
    return false;
}

function deleteMember(id) {
    const members = loadMembers();
    const filteredMembers = members.filter(m => m.id !== id);
    saveMembers(filteredMembers);
    return true;
}

function renderMembersList() {
    const members = loadMembers();
    const container = document.getElementById("membersList");
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = "<p>No members added yet.</p>";
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

function editMemberPrompt(id) {
    const members = loadMembers();
    const member = members.find(m => m.id === id);
    if (!member) return;

    const newName = prompt("Enter new name:", member.name);
    if (newName !== null) {
        if (editMember(id, newName)) {
            renderMembersList();
        } else {
            alert("Failed to edit member. Name cannot be empty.");
        }
    }
}

function deleteMemberConfirm(id) {
    const members = loadMembers();
    const member = members.find(m => m.id === id);
    if (!member) return;

    if (confirm(`Are you sure you want to delete "${member.name}"?`)) {
        deleteMember(id);
        renderMembersList();
    }
}

// ==================== ATTENDANCE SYSTEM ====================

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function loadAttendance(date) {
    const attendanceJson = localStorage.getItem(date);
    if (attendanceJson) {
        try {
            return JSON.parse(attendanceJson);
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveAttendance(date, attendanceData) {
    localStorage.setItem(date, JSON.stringify(attendanceData));
}

function renderAttendancePage() {
    const today = getTodayDate();
    const dateDisplay = document.getElementById("todayDate");
    if (dateDisplay) {
        dateDisplay.textContent = today;
    }

    const members = loadMembers();
    const container = document.getElementById("attendanceContainer");
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = "<p>No members added yet. Please add members first.</p>";
        return;
    }

    const existingAttendance = loadAttendance(today);
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

function saveAttendanceForToday() {
    const today = getTodayDate();
    const members = loadMembers();
    const attendanceData = {};

    members.forEach(member => {
        const checkbox = document.getElementById(`attendance_${member.id}`);
        attendanceData[member.id] = checkbox ? checkbox.checked : false;
    });

    saveAttendance(today, attendanceData);
    alert("Attendance saved successfully!");
}

// ==================== HISTORY PAGE ====================

function loadAttendanceForDate(date) {
    if (!date) return;

    const members = loadMembers();
    const attendanceData = loadAttendance(date);
    const container = document.getElementById("historyContainer");
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = "<p>No members added yet.</p>";
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
    document.getElementById("loginForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const password = document.getElementById("password").value;
        if (login(password)) {
            // Redirect handled in login function
        } else {
            alert("Incorrect password. Please try again.");
            document.getElementById("password").value = "";
        }
    });
}

// Initialize attendance page
if (document.getElementById("attendanceContainer")) {
    requireAuth();
    renderAttendancePage();
    
    const saveBtn = document.getElementById("saveAttendanceBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", saveAttendanceForToday);
    }
}

// Initialize members page
if (document.getElementById("membersList")) {
    requireAuth();
    renderMembersList();
    
    const addForm = document.getElementById("addMemberForm");
    if (addForm) {
        addForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const nameInput = document.getElementById("memberName");
            const name = nameInput.value;
            if (addMember(name)) {
                nameInput.value = "";
                renderMembersList();
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
        // Set default to today
        datePicker.value = getTodayDate();
        loadAttendanceForDate(datePicker.value);
        
        datePicker.addEventListener("change", function() {
            loadAttendanceForDate(this.value);
        });
    }
}

// Check auth on all protected pages
if (window.location.pathname.includes("attendance.html") || 
    window.location.pathname.includes("members.html") || 
    window.location.pathname.includes("history.html")) {
    requireAuth();
}


