// Sample data initialization
if (!localStorage.getItem('users')) {
  localStorage.setItem('users', JSON.stringify([{ id: 1, email: 'admin@example.com', password: 'admin', role: 'admin' }]));
}
if (!localStorage.getItem('employees')) {
  localStorage.setItem('employees', JSON.stringify([{ id: 1, name: 'John Doe', email: 'john@example.com', deptId: 1 }]));
}
if (!localStorage.getItem('departments')) {
  localStorage.setItem('departments', JSON.stringify([{ id: 1, name: 'HR', desc: 'Human Resources' }]));
}
if (!localStorage.getItem('requests')) {
  localStorage.setItem('requests', JSON.stringify([{ id: 1, type: 'Leave', desc: 'Vacation request', status: 'Pending', userId: 1 }]));
}

// Utility functions
function getData(key) { return JSON.parse(localStorage.getItem(key)) || []; }
function setData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function generateId(arr) { return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1; }

// Auth functions
function register(email, password, role) {
  const users = getData('users');
  if (users.find(u => u.email === email)) return alert('User already exists');
  users.push({ id: generateId(users), email, password, role });
  setData('users', users);
  alert('Registered! Check your email for verification (simulated).');
  // Fake verification: auto-verify
  setTimeout(() => alert('Email verified! You can now login.'), 1000);
}

function login(email, password) {
  const users = getData('users');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return alert('Invalid credentials');
  const token = `jwt-${user.id}-${Date.now()}`; // Fake JWT
  localStorage.setItem('token', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
  updateUI();
  alert('Logged in successfully!');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  updateUI();
}

function getCurrentUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return JSON.parse(localStorage.getItem('currentUser'));
}

// UI update
function updateUI() {
  const user = getCurrentUser();
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const logoutLink = document.getElementById('logout-link');
  const dashboard = document.getElementById('dashboard');
  const adminControls = document.getElementById('admin-controls');
  const mainContent = document.getElementById('main-content');

  if (user) {
    loginLink.classList.add('d-none');
    registerLink.classList.add('d-none');
    logoutLink.classList.remove('d-none');
    dashboard.classList.remove('d-none');
    mainContent.querySelector('h1').textContent = `Welcome, ${user.email}`;
    mainContent.querySelector('p').classList.add('d-none');
    if (user.role === 'admin') adminControls.classList.remove('d-none');
    renderTables();
  } else {
    loginLink.classList.remove('d-none');
    registerLink.classList.remove('d-none');
    logoutLink.classList.add('d-none');
    dashboard.classList.add('d-none');
    mainContent.querySelector('h1').textContent = 'Welcome to the Full-Stack App Prototype';
    mainContent.querySelector('p').classList.remove('d-none');
  }
}

// Render tables
function renderTables() {
  const user = getCurrentUser();
  renderEmployees();
  renderDepartments();
  renderRequests();
}

function renderEmployees() {
  const employees = getData('employees');
  const departments = getData('departments');
  const tbody = document.querySelector('#employees-table tbody');
  tbody.innerHTML = '';
  employees.forEach(emp => {
    const dept = departments.find(d => d.id === emp.deptId)?.name || 'N/A';
    tbody.innerHTML += `<tr><td>${emp.id}</td><td>${emp.name}</td><td>${emp.email}</td><td>${dept}</td><td>${getCurrentUser().role === 'admin' ? `<button class="btn btn-sm btn-warning" onclick="editEmployee(${emp.id})">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">Delete</button>` : ''}</td></tr>`;
  });
}

function renderDepartments() {
  const departments = getData('departments');
  const tbody = document.querySelector('#departments-table tbody');
  tbody.innerHTML = '';
  departments.forEach(dept => {
    tbody.innerHTML += `<tr><td>${dept.id}</td><td>${dept.name}</td><td>${dept.desc}</td><td>${getCurrentUser().role === 'admin' ? `<button class="btn btn-sm btn-warning" onclick="editDepartment(${dept.id})">Edit</button> <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})">Delete</button>` : ''}</td></tr>`;
  });
}

function renderRequests() {
  const requests = getData('requests');
  const users = getData('users');
  const tbody = document.querySelector('#requests-table tbody');
  tbody.innerHTML = '';
  requests.forEach(req => {
    const userEmail = users.find(u => u.id === req.userId)?.email || 'N/A';
    tbody.innerHTML += `<tr><td>${req.id}</td><td>${req.type}</td><td>${req.desc}</td><td>${req.status}</td><td>${userEmail}</td><td>${getCurrentUser().role === 'admin' ? `<button class="btn btn-sm btn-success" onclick="approveRequest(${req.id})">Approve</button> <button class="btn btn-sm btn-danger" onclick="rejectRequest(${req.id})">Reject</button>` : ''}</td></tr>`;
  });
}

// Helper to populate department select
function populateDeptSelect(selectedId = null) {
  const select = document.getElementById('employee-dept');
  select.innerHTML = '';
  const departments = getData('departments');
  departments.forEach(dept => {
    const option = document.createElement('option');
    option.value = dept.id;
    option.textContent = dept.name;
    if (dept.id === selectedId) option.selected = true;
    select.appendChild(option);
  });
}

// CRUD functions for Employees
function editEmployee(id) {
  const employees = getData('employees');
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  document.getElementById('employee-id').value = emp.id;
  document.getElementById('employee-name').value = emp.name;
  document.getElementById('employee-email').value = emp.email;
  populateDeptSelect(emp.deptId);
  new bootstrap.Modal(document.getElementById('employeeModal')).show();
}

function saveEmployee(event) {
  event.preventDefault();
  const id = document.getElementById('employee-id').value;
  const name = document.getElementById('employee-name').value;
  const email = document.getElementById('employee-email').value;
  const deptId = parseInt(document.getElementById('employee-dept').value);
  const employees = getData('employees');
  if (id) {
    // Update
    const index = employees.findIndex(e => e.id == id);
    employees[index] = { id: parseInt(id), name, email, deptId };
  } else {
    // Create
    employees.push({ id: generateId(employees), name, email, deptId });
  }
  setData('employees', employees);
  renderEmployees();
  bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
  document.getElementById('employee-form').reset();
}

function deleteEmployee(id) {
  if (!confirm('Delete this employee?')) return;
  const employees = getData('employees').filter(e => e.id !== id);
  setData('employees', employees);
  renderEmployees();
}

// CRUD functions for Departments
function editDepartment(id) {
  const departments = getData('departments');
  const dept = departments.find(d => d.id === id);
  if (!dept) return;
  document.getElementById('department-id').value = dept.id;
  document.getElementById('department-name').value = dept.name;
  document.getElementById('department-desc').value = dept.desc;
  new bootstrap.Modal(document.getElementById('departmentModal')).show();
}

function saveDepartment(event) {
  event.preventDefault();
  const id = document.getElementById('department-id').value;
  const name = document.getElementById('department-name').value;
  const desc = document.getElementById('department-desc').value;
  const departments = getData('departments');
  if (id) {
    // Update
    const index = departments.findIndex(d => d.id == id);
    departments[index] = { id: parseInt(id), name, desc };
  } else {
    // Create
    departments.push({ id: generateId(departments), name, desc });
  }
  setData('departments', departments);
  renderDepartments();
  populateDeptSelect(); // Update employee form select
  bootstrap.Modal.getInstance(document.getElementById('departmentModal')).hide();
  document.getElementById('department-form').reset();
}

function deleteDepartment(id) {
  if (!confirm('Delete this department?')) return;
  const departments = getData('departments').filter(d => d.id !== id);
  setData('departments', departments);
  renderDepartments();
  populateDeptSelect();
}

// CRUD functions for Requests
function saveRequest(event) {
  event.preventDefault();
  const type = document.getElementById('request-type').value;
  const desc = document.getElementById('request-desc').value;
  const user = getCurrentUser();
  const requests = getData('requests');
  requests.push({ id: generateId(requests), type, desc, status: 'Pending', userId: user.id });
  setData('requests', requests);
  renderRequests();
  bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
  document.getElementById('request-form').reset();
}

function approveRequest(id) {
  const requests = getData('requests');
  const req = requests.find(r => r.id === id);
  if (req) req.status = 'Approved';
  setData('requests', requests);
  renderRequests();
}

function rejectRequest(id) {
  const requests = getData('requests');
  const req = requests.find(r => r.id === id);
  if (req) req.status = 'Rejected';
  setData('requests', requests);
  renderRequests();
}

// Event listeners
document.getElementById('register-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  register(email, password, role);
  bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
  e.target.reset();
});

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  login(email, password);
  bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
  e.target.reset();
});

document.getElementById('employee-form').addEventListener('submit', saveEmployee);
document.getElementById('department-form').addEventListener('submit', saveDepartment);
document.getElementById('request-form').addEventListener('submit', saveRequest);

// Initialize on load
window.addEventListener('load', () => {
  populateDeptSelect();
  updateUI();
});