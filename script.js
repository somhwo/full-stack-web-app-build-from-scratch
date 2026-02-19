// ─────────────────────────────────────────────
//  Storage Key
// ─────────────────────────────────────────────

const STORAGE_KEY = "ipt_demo_v1";

// ─────────────────────────────────────────────
//  Seed Data
//  Used only when localStorage has nothing yet
//  (first visit) or the stored data is corrupt.
// ─────────────────────────────────────────────

function getSeedData() {
  return {
    accounts: [
      {
        firstName: "Admin",
        lastName:  "User",
        email:     "admin@example.com",
        password:  "Password123!",
        role:      "Admin",
        verified:  true,
      },
    ],
    departments: [
      { id: 1, name: "Engineering", description: "Software team" },
      { id: 2, name: "HR",          description: "Human Resources" },
    ],
    employees: [],
    requests:  [],
  };
}

// ─────────────────────────────────────────────
//  loadFromStorage()
//  Reads STORAGE_KEY from localStorage.
//  Falls back to seed data if missing or corrupt.
// ─────────────────────────────────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw);
    // Basic shape validation — must have accounts array
    if (!Array.isArray(parsed.accounts)) throw new Error("corrupt");
    window.db = parsed;
  } catch {
    window.db = getSeedData();
    saveToStorage(); // persist the seed immediately
  }
}

// ─────────────────────────────────────────────
//  saveToStorage()
//  Stringifies window.db and writes to localStorage.
//  Call this after every create / update / delete.
// ─────────────────────────────────────────────

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// ─────────────────────────────────────────────
//  Global Auth State
// ─────────────────────────────────────────────

let currentUser = null;

// ─────────────────────────────────────────────
//  Route Map
// ─────────────────────────────────────────────

const ROUTES = {
  "#/"           : "home-page",
  "#/register"   : "register-page",
  "#/verify"     : "verify-page",
  "#/login"      : "login-page",
  "#/profile"    : "profile-page",
  "#/requests"   : "requests-page",
  "#/employees"  : "employees-page",
  "#/accounts"   : "accounts-page",
  "#/departments": "departments-page",
};

const PROTECTED_ROUTES = new Set(["#/profile", "#/requests"]);
const ADMIN_ROUTES     = new Set(["#/employees", "#/accounts", "#/departments"]);

// ─────────────────────────────────────────────
//  Navigation Helper
// ─────────────────────────────────────────────

function navigateTo(hash) {
  window.location.hash = hash;
}

// ─────────────────────────────────────────────
//  Core Router
// ─────────────────────────────────────────────

function handleRouting() {
  let hash = window.location.hash || "#/";
  if (hash === "#") hash = "#/";

  // Access-control guards
  if (PROTECTED_ROUTES.has(hash) || ADMIN_ROUTES.has(hash)) {
    if (!currentUser) {
      window.location.hash = "#/login";
      return;
    }
    if (ADMIN_ROUTES.has(hash) && currentUser.role !== "Admin") {
      window.location.hash = "#/";
      return;
    }
  }

  // Hide all pages
  document.querySelectorAll(".page").forEach((el) => el.classList.remove("active"));

  // Show matched page
  const pageId = ROUTES[hash];
  if (pageId) {
    const target = document.getElementById(pageId);
    if (target) {
      target.classList.add("active");
    } else {
      console.warn(`[Router] No element with id="${pageId}" for hash "${hash}"`);
      document.getElementById("home-page")?.classList.add("active");
    }
  } else {
    document.getElementById("home-page")?.classList.add("active");
  }

  syncAuthClasses();

  // ── Render dynamic pages after showing them ──
  if (hash === "#/profile")     renderProfile();
  if (hash === "#/accounts")    renderAccountsList();
  if (hash === "#/departments") renderDepartmentsList();
  if (hash === "#/employees")   renderEmployeesTable();
  if (hash === "#/requests")    renderRequestsTable();
}

window.addEventListener("hashchange", handleRouting);

// ─────────────────────────────────────────────
//  D. Auth State Management
// ─────────────────────────────────────────────

function setAuthState(isAuth, user = null) {
  currentUser = isAuth ? user : null;
  syncAuthClasses();
}

function syncAuthClasses() {
  document.body.classList.toggle("not-authenticated", !currentUser);
  document.body.classList.toggle("authenticated",      !!currentUser);
  document.body.classList.toggle("is-admin", !!(currentUser && currentUser.role === "Admin"));
}

// ─────────────────────────────────────────────
//  UI Helpers
// ─────────────────────────────────────────────

function showError(containerId, message) {
  removeAlert(containerId);
  const alert = document.createElement("div");
  alert.className = "alert alert-danger mt-3";
  alert.setAttribute("role", "alert");
  alert.textContent = message;
  document.getElementById(containerId)?.prepend(alert);
}

function showSuccess(containerId, message) {
  removeAlert(containerId);
  const alert = document.createElement("div");
  alert.className = "alert alert-success mt-3";
  alert.setAttribute("role", "alert");
  alert.textContent = message;
  document.getElementById(containerId)?.prepend(alert);
}

function removeAlert(containerId) {
  document.getElementById(containerId)?.querySelector(".alert.alert-danger, .alert.alert-success")?.remove();
}

// ─────────────────────────────────────────────
//  A. Registration
// ─────────────────────────────────────────────

function handleRegister() {
  const firstName = document.getElementById("reg-firstname").value.trim();
  const lastName  = document.getElementById("reg-lastname").value.trim();
  const email     = document.getElementById("reg-email").value.trim().toLowerCase();
  const password  = document.getElementById("reg-password").value;

  if (!firstName || !lastName || !email || !password) {
    showError("register-page", "All fields are required.");
    return;
  }
  if (password.length < 6) {
    showError("register-page", "Password must be at least 6 characters.");
    return;
  }

  const exists = window.db.accounts.find((a) => a.email === email);
  if (exists) {
    showError("register-page", "An account with that email already exists.");
    return;
  }

  const newAccount = { firstName, lastName, email, password, role: "User", verified: false };
  window.db.accounts.push(newAccount);
  saveToStorage();

  localStorage.setItem("unverified_email", email);

  // Update verify page message before navigating
  const verifyMsg = document.querySelector("#verify-page .alert-success");
  if (verifyMsg) verifyMsg.textContent = `✅ A verification link has been sent to ${email}.`;

  navigateTo("#/verify");
}

// ─────────────────────────────────────────────
//  B. Email Verification (Simulated)
// ─────────────────────────────────────────────

function handleVerify() {
  const email = localStorage.getItem("unverified_email");
  if (!email) {
    showError("verify-page", "No pending verification. Please register first.");
    return;
  }

  const account = window.db.accounts.find((a) => a.email === email);
  if (!account) {
    showError("verify-page", "Account not found. Please register again.");
    return;
  }

  account.verified = true;
  saveToStorage();
  localStorage.removeItem("unverified_email");

  showSuccess("verify-page", "Email verified! Redirecting to login…");
  setTimeout(() => navigateTo("#/login"), 1200);
}

// ─────────────────────────────────────────────
//  C. Login
// ─────────────────────────────────────────────

function handleLogin() {
  const email    = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showError("login-page", "Please enter your email and password.");
    return;
  }

  const account = window.db.accounts.find(
    (a) => a.email === email && a.password === password
  );

  if (!account) {
    showError("login-page", "Invalid email or password.");
    return;
  }

  if (!account.verified) {
    showError("login-page", "Please verify your email before logging in.");
    return;
  }

  localStorage.setItem("auth_token", account.email);
  setAuthState(true, account);
  navigateTo("#/profile");
}

// ─────────────────────────────────────────────
//  E. Logout
// ─────────────────────────────────────────────

function handleLogout() {
  localStorage.removeItem("auth_token");
  setAuthState(false);
  if (window.location.hash === "#/" || window.location.hash === "#") {
    handleRouting();
  } else {
    navigateTo("#/");
  }
}

// ─────────────────────────────────────────────
//  Session Restore
//  Re-hydrates currentUser from localStorage
//  so refreshing the page keeps you logged in.
// ─────────────────────────────────────────────

function restoreSession() {
  const token = localStorage.getItem("auth_token");
  if (!token) return;
  const account = window.db.accounts.find((a) => a.email === token);
  if (account && account.verified) {
    setAuthState(true, account);
  } else {
    localStorage.removeItem("auth_token");
  }
}

// ─────────────────────────────────────────────
//  PHASE 5 — Profile Page
// ─────────────────────────────────────────────

function renderProfile() {
  if (!currentUser) return;

  document.querySelector("#profile-page .card-title").textContent =
    `${currentUser.firstName} ${currentUser.lastName}`;

  document.querySelector("#profile-page .card-text").innerHTML =
    `<strong>Email: </strong>${currentUser.email}`;

  document.querySelector("#profile-page p:nth-of-type(2)").innerHTML =
    `<strong>Role: </strong>${currentUser.role}`;

  // Wire Edit button (once — guard against duplicate listeners)
  const editBtn = document.querySelector("#profile-page .btn-outline-primary");
  editBtn.replaceWith(editBtn.cloneNode(true)); // clone strips old listeners
  document.querySelector("#profile-page .btn-outline-primary")
    .addEventListener("click", () => alert("Edit Profile – coming soon!"));
}

// ─────────────────────────────────────────────
//  PHASE 6-A — Accounts CRUD
// ─────────────────────────────────────────────

// Tracks which email is being edited (null = adding new)
let editingAccountEmail = null;

function renderAccountsList() {
  const tbody = document.querySelector("#accounts-page table tbody");
  if (!tbody) return;

  if (window.db.accounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 bg-light">No accounts.</td></tr>`;
    return;
  }

  tbody.innerHTML = window.db.accounts.map((acc) => `
    <tr>
      <td>${acc.firstName} ${acc.lastName}</td>
      <td>${acc.email}</td>
      <td>${acc.role}</td>
      <td>${acc.verified ? "✅" : "—"}</td>
      <td>
        <button class="btn btn-outline-primary btn-sm me-1"
          onclick="openAccountForm('${acc.email}')">Edit</button>
        <button class="btn btn-outline-warning btn-sm me-1"
          onclick="resetAccountPassword('${acc.email}')">Reset PW</button>
        <button class="btn btn-outline-danger btn-sm"
          onclick="deleteAccount('${acc.email}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openAccountForm(emailToEdit = null) {
  editingAccountEmail = emailToEdit;
  removeAlert("accounts-page");

  const form = document.querySelector("#accounts-page .card");

  if (emailToEdit) {
    const acc = window.db.accounts.find((a) => a.email === emailToEdit);
    if (!acc) return;
    document.getElementById("acc-firstname").value = acc.firstName;
    document.getElementById("acc-lastname").value  = acc.lastName;
    document.getElementById("acc-email").value     = acc.email;
    document.getElementById("acc-password").value  = "";          // never pre-fill password
    document.getElementById("acc-role").value      = acc.role;
    document.getElementById("acc-verified").checked = acc.verified;
    form.querySelector(".card-header").textContent  = "Edit Account";
  } else {
    document.getElementById("acc-firstname").value  = "";
    document.getElementById("acc-lastname").value   = "";
    document.getElementById("acc-email").value      = "";
    document.getElementById("acc-password").value   = "";
    document.getElementById("acc-role").value       = "User";
    document.getElementById("acc-verified").checked = false;
    form.querySelector(".card-header").textContent  = "Add Account";
  }

  form.scrollIntoView({ behavior: "smooth" });
}

function saveAccount() {
  const firstName = document.getElementById("acc-firstname").value.trim();
  const lastName  = document.getElementById("acc-lastname").value.trim();
  const email     = document.getElementById("acc-email").value.trim().toLowerCase();
  const password  = document.getElementById("acc-password").value;
  const role      = document.getElementById("acc-role").value.trim() || "User";
  const verified  = document.getElementById("acc-verified").checked;

  if (!firstName || !lastName || !email) {
    showError("accounts-page", "First name, last name, and email are required.");
    return;
  }

  if (editingAccountEmail) {
    // ── UPDATE ──
    const acc = window.db.accounts.find((a) => a.email === editingAccountEmail);
    if (!acc) return;
    acc.firstName = firstName;
    acc.lastName  = lastName;
    acc.email     = email;
    acc.role      = role;
    acc.verified  = verified;
    if (password.length >= 6) acc.password = password;
    // If editing the currently logged-in user, refresh currentUser reference
    if (currentUser && currentUser.email === editingAccountEmail) {
      currentUser = acc;
    }
  } else {
    // ── CREATE ──
    if (!password || password.length < 6) {
      showError("accounts-page", "Password must be at least 6 characters.");
      return;
    }
    const exists = window.db.accounts.find((a) => a.email === email);
    if (exists) {
      showError("accounts-page", "An account with that email already exists.");
      return;
    }
    window.db.accounts.push({ firstName, lastName, email, password, role, verified });
  }

  saveToStorage();
  editingAccountEmail = null;
  document.querySelector("#accounts-page .card .card-header").textContent = "Add/Edit Account";
  renderAccountsList();
  showSuccess("accounts-page", "Account saved successfully.");
}

function resetAccountPassword(email) {
  const newPw = prompt("Enter new password (min 6 characters):");
  if (newPw === null) return; // cancelled
  if (!newPw || newPw.length < 6) {
    alert("Password must be at least 6 characters. No changes made.");
    return;
  }
  const acc = window.db.accounts.find((a) => a.email === email);
  if (!acc) return;
  acc.password = newPw;
  saveToStorage();
  showSuccess("accounts-page", `Password reset for ${email}.`);
}

function deleteAccount(email) {
  if (currentUser && currentUser.email === email) {
    alert("You cannot delete your own account.");
    return;
  }
  if (!confirm(`Delete account for ${email}? This cannot be undone.`)) return;
  window.db.accounts = window.db.accounts.filter((a) => a.email !== email);
  saveToStorage();
  renderAccountsList();
  showSuccess("accounts-page", `Account ${email} deleted.`);
}

// ─────────────────────────────────────────────
//  PHASE 6-B — Departments CRUD
// ─────────────────────────────────────────────

function renderDepartmentsList() {
  const tbody = document.querySelector("#departments-page table tbody");
  if (!tbody) return;

  if (window.db.departments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 bg-light">No departments.</td></tr>`;
    return;
  }

  tbody.innerHTML = window.db.departments.map((dept) => `
    <tr>
      <td class="ps-3">${dept.name}</td>
      <td>${dept.description}</td>
      <td>
        <button class="btn btn-outline-primary btn-sm me-1"
          onclick="editDepartment(${dept.id})">Edit</button>
        <button class="btn btn-outline-danger btn-sm"
          onclick="deleteDepartment(${dept.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

function editDepartment(id) {
  const dept = window.db.departments.find((d) => d.id === id);
  if (!dept) return;
  const newName = prompt("Department name:", dept.name);
  if (newName === null) return;
  const newDesc = prompt("Description:", dept.description);
  if (newDesc === null) return;
  if (!newName.trim()) { alert("Name cannot be empty."); return; }
  dept.name        = newName.trim();
  dept.description = newDesc.trim();
  saveToStorage();
  renderDepartmentsList();
}

function deleteDepartment(id) {
  const dept = window.db.departments.find((d) => d.id === id);
  if (!dept) return;
  // Warn if employees reference this dept
  const inUse = window.db.employees.some((e) => e.deptId === id);
  if (inUse) {
    alert(`Cannot delete "${dept.name}" — it has employees assigned to it.`);
    return;
  }
  if (!confirm(`Delete department "${dept.name}"?`)) return;
  window.db.departments = window.db.departments.filter((d) => d.id !== id);
  saveToStorage();
  renderDepartmentsList();
}

function addDepartment() {
  const name = prompt("Department name:");
  if (name === null) return;
  if (!name.trim()) { alert("Name cannot be empty."); return; }
  const description = prompt("Description (optional):") ?? "";
  const newId = window.db.departments.length
    ? Math.max(...window.db.departments.map((d) => d.id)) + 1
    : 1;
  window.db.departments.push({ id: newId, name: name.trim(), description: description.trim() });
  saveToStorage();
  renderDepartmentsList();
}

// ─────────────────────────────────────────────
//  PHASE 6-C — Employees CRUD
// ─────────────────────────────────────────────

let editingEmployeeId = null;

function renderEmployeesTable() {
  const tbody = document.querySelector("#employees-page table tbody");
  if (!tbody) return;

  if (window.db.employees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="bg-light py-3 text-center">No employees.</td></tr>`;
  } else {
    tbody.innerHTML = window.db.employees.map((emp) => {
      const dept = window.db.departments.find((d) => d.id === emp.deptId);
      return `
        <tr>
          <td>${emp.employeeId}</td>
          <td>${emp.userEmail}</td>
          <td>${emp.position}</td>
          <td>${dept ? dept.name : "—"}</td>
          <td>
            <button class="btn btn-outline-primary btn-sm me-1"
              onclick="openEmployeeForm('${emp.employeeId}')">Edit</button>
            <button class="btn btn-outline-danger btn-sm"
              onclick="deleteEmployee('${emp.employeeId}')">Delete</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Populate department dropdown in the form
  populateDeptDropdown();
}

function populateDeptDropdown() {
  const select = document.getElementById("emp-department");
  if (!select) return;
  select.innerHTML = window.db.departments.length
    ? window.db.departments.map((d) =>
        `<option value="${d.id}">${d.name}</option>`
      ).join("")
    : `<option value="">No departments available</option>`;
}

function openEmployeeForm(employeeIdToEdit = null) {
  editingEmployeeId = employeeIdToEdit;
  removeAlert("employees-page");

  if (employeeIdToEdit) {
    const emp = window.db.employees.find((e) => e.employeeId === employeeIdToEdit);
    if (!emp) return;
    document.getElementById("emp-id").value         = emp.employeeId;
    document.getElementById("emp-email").value      = emp.userEmail;
    document.getElementById("emp-position").value   = emp.position;
    document.getElementById("emp-department").value = emp.deptId;
    document.getElementById("emp-hiredate").value   = emp.hireDate;
    document.querySelector("#employees-page .card .card-header").textContent = "Edit Employee";
  } else {
    document.getElementById("emp-id").value         = "";
    document.getElementById("emp-email").value      = "";
    document.getElementById("emp-position").value   = "";
    document.getElementById("emp-hiredate").value   = "";
    document.querySelector("#employees-page .card .card-header").textContent = "Add Employee";
  }

  document.querySelector("#employees-page .card").scrollIntoView({ behavior: "smooth" });
}

function saveEmployee() {
  const employeeId = document.getElementById("emp-id").value.trim();
  const userEmail  = document.getElementById("emp-email").value.trim().toLowerCase();
  const position   = document.getElementById("emp-position").value.trim();
  const deptId     = parseInt(document.getElementById("emp-department").value, 10);
  const hireDate   = document.getElementById("emp-hiredate").value;

  if (!employeeId || !userEmail || !position || !deptId) {
    showError("employees-page", "Employee ID, email, position, and department are required.");
    return;
  }

  // Email must match an existing account
  const linkedAccount = window.db.accounts.find((a) => a.email === userEmail);
  if (!linkedAccount) {
    showError("employees-page", `No account found for email "${userEmail}". Create the account first.`);
    return;
  }

  if (editingEmployeeId) {
    // ── UPDATE ──
    const emp = window.db.employees.find((e) => e.employeeId === editingEmployeeId);
    if (!emp) return;
    emp.employeeId = employeeId;
    emp.userEmail  = userEmail;
    emp.position   = position;
    emp.deptId     = deptId;
    emp.hireDate   = hireDate;
  } else {
    // ── CREATE — check duplicate ID ──
    const dupId = window.db.employees.find((e) => e.employeeId === employeeId);
    if (dupId) {
      showError("employees-page", `Employee ID "${employeeId}" already exists.`);
      return;
    }
    window.db.employees.push({ employeeId, userEmail, position, deptId, hireDate });
  }

  saveToStorage();
  editingEmployeeId = null;
  document.querySelector("#employees-page .card .card-header").textContent = "Add/Edit Employees";
  renderEmployeesTable();
  showSuccess("employees-page", "Employee saved successfully.");
}

function deleteEmployee(employeeId) {
  if (!confirm(`Delete employee "${employeeId}"?`)) return;
  window.db.employees = window.db.employees.filter((e) => e.employeeId !== employeeId);
  saveToStorage();
  renderEmployeesTable();
}

// ─────────────────────────────────────────────
//  PHASE 7 — My Requests
// ─────────────────────────────────────────────

const STATUS_BADGE = {
  Pending:  "warning",
  Approved: "success",
  Rejected: "danger",
};

function renderRequestsTable() {
  if (!currentUser) return;

  const myRequests = (window.db.requests || []).filter(
    (r) => r.employeeEmail === currentUser.email
  );

  const emptyMsg  = document.getElementById("requests-empty");
  const tableWrap = document.getElementById("requests-table-wrap");
  const tbody     = document.querySelector("#requests-page table tbody");

  if (myRequests.length === 0) {
    if (emptyMsg)  emptyMsg.classList.remove("d-none");
    if (tableWrap) tableWrap.classList.add("d-none");
    return;
  }

  if (emptyMsg)  emptyMsg.classList.add("d-none");
  if (tableWrap) tableWrap.classList.remove("d-none");

  tbody.innerHTML = myRequests.map((req) => {
    const badge   = STATUS_BADGE[req.status] || "secondary";
    const itemStr = req.items.map((i) => `${i.name} ×${i.qty}`).join(", ");
    return `
      <tr>
        <td>${req.id}</td>
        <td>${req.type}</td>
        <td class="text-start">${itemStr}</td>
        <td>${req.date}</td>
        <td><span class="badge bg-${badge}">${req.status}</span></td>
      </tr>
    `;
  }).join("");
}

// ── Modal: add / remove item rows ────────────

function addItemRow() {
  const container = document.getElementById("item-container");
  const row = document.createElement("div");
  row.className = "input-group mb-2 item-row";
  row.innerHTML = `
    <input type="text"   class="form-control item-name" placeholder="Item name" />
    <input type="number" class="form-control item-qty"  value="1" min="1" style="max-width:80px" />
    <button class="btn btn-outline-danger" type="button" onclick="removeItemRow(this)">×</button>
  `;
  container.appendChild(row);
}

function removeItemRow(btn) {
  const container = document.getElementById("item-container");
  // Always keep at least one row
  if (container.querySelectorAll(".item-row").length > 1) {
    btn.closest(".item-row").remove();
  }
}

function resetRequestModal() {
  document.getElementById("req-type").value = "Equipment";
  const container = document.getElementById("item-container");
  // Reset to exactly one blank row
  container.innerHTML = `
    <div class="input-group mb-2 item-row">
      <input type="text"   class="form-control item-name" placeholder="Item name" />
      <input type="number" class="form-control item-qty"  value="1" min="1" style="max-width:80px" />
      <button class="btn btn-outline-secondary" type="button" onclick="addItemRow()">+</button>
    </div>
  `;
  removeAlert("request-modal-body");
}

function submitRequest() {
  const type  = document.getElementById("req-type").value;
  const rows  = document.querySelectorAll("#item-container .item-row");

  // Collect items
  const items = [];
  rows.forEach((row) => {
    const name = row.querySelector(".item-name")?.value.trim();
    const qty  = parseInt(row.querySelector(".item-qty")?.value, 10) || 1;
    if (name) items.push({ name, qty });
  });

  if (items.length === 0) {
    showError("request-modal-body", "Please add at least one item.");
    return;
  }

  const newRequest = {
    id:            Date.now(),
    employeeEmail: currentUser.email,
    type,
    items,
    status: "Pending",
    date:   new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD
  };

  if (!window.db.requests) window.db.requests = [];
  window.db.requests.push(newRequest);
  saveToStorage();

  // Close modal and refresh table
  const modalEl  = document.getElementById("requestModal");
  const bsModal  = bootstrap.Modal.getInstance(modalEl);
  bsModal?.hide();

  resetRequestModal();
  renderRequestsTable();
  showSuccess("requests-page", "Request submitted successfully.");
}

// ─────────────────────────────────────────────
//  PHASE 8 — Polish helpers
// ─────────────────────────────────────────────

function clearForm(pageId) {
  document.querySelectorAll(`#${pageId} input`).forEach((el) => {
    if (el.type !== "checkbox") el.value = "";
    else el.checked = false;
  });
  removeAlert(pageId);
}

// ─────────────────────────────────────────────
//  DOMContentLoaded — Wire Everything Up
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  // 1. Load (or seed) data from localStorage
  loadFromStorage();

  // 2. Restore session before routing so guards work correctly
  restoreSession();

  // Set default hash silently (avoids spurious hashchange)
  if (!window.location.hash || window.location.hash === "#") {
    history.replaceState(null, "", "#/");
  }

  // ── Registration ──────────────────────────
  document.querySelector("#register-page .btn-success")
    ?.addEventListener("click", handleRegister);

  document.querySelector("#register-page .btn-outline-secondary")
    ?.addEventListener("click", () => navigateTo("#/"));

  // ── Verify Email ──────────────────────────
  document.querySelector("#verify-page .btn-success")
    ?.addEventListener("click", handleVerify);

  document.querySelector("#verify-page .btn-outline-secondary")
    ?.addEventListener("click", () => navigateTo("#/"));

  // ── Login ─────────────────────────────────
  document.querySelector("#login-page .btn-primary")
    ?.addEventListener("click", handleLogin);

  document.querySelector("#login-page .btn-outline-secondary")
    ?.addEventListener("click", () => navigateTo("#/"));

  // ── Logout ────────────────────────────────
  document.querySelector(".dropdown-item.text-danger")
    ?.addEventListener("click", (e) => { e.preventDefault(); handleLogout(); });

  // ── Dropdown nav items ────────────────────
  // Native <a href="#/..."> links already trigger hashchange — no JS override needed.
  // We only need to close the Bootstrap dropdown manually (it closes itself on click anyway).

  // ── Get Started button ────────────────────
  document.querySelector("#home-page .btn-primary")
    ?.addEventListener("click", () => navigateTo(currentUser ? "#/profile" : "#/login"));

  // ── Accounts page ─────────────────────────
  document.querySelector("#accounts-page > .d-flex .btn-success")
    ?.addEventListener("click", () => openAccountForm(null));

  document.querySelector("#accounts-page .card .btn-primary")
    ?.addEventListener("click", saveAccount);

  document.querySelector("#accounts-page .card .btn-secondary")
    ?.addEventListener("click", () => {
      editingAccountEmail = null;
      document.querySelector("#accounts-page .card .card-header").textContent = "Add/Edit Account";
      removeAlert("accounts-page");
    });

  // ── Departments page ──────────────────────
  document.querySelector("#departments-page .btn-success")
    ?.addEventListener("click", addDepartment);

  // ── Employees page ────────────────────────
  document.querySelector("#employees-page > .container > .d-flex .btn-success")
    ?.addEventListener("click", () => openEmployeeForm(null));

  document.querySelector("#employees-page .card .btn-primary")
    ?.addEventListener("click", saveEmployee);

  document.querySelector("#employees-page .card .btn-outline-secondary")
    ?.addEventListener("click", () => {
      editingEmployeeId = null;
      document.querySelector("#employees-page .card .card-header").textContent = "Add/Edit Employees";
      removeAlert("employees-page");
    });

  // ── Requests page ─────────────────────────
  document.getElementById("addRow")
    ?.addEventListener("click", addItemRow);

  document.getElementById("submitRequest")
    ?.addEventListener("click", submitRequest);

  document.getElementById("requestModal")
    ?.addEventListener("show.bs.modal", resetRequestModal);

  // ── Phase 8: clear forms on navigation ───
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash;
    if (hash !== "#/register") clearForm("register-page");
    if (hash !== "#/login")    clearForm("login-page");
  });

  // ── Run router ────────────────────────────
  handleRouting();
});