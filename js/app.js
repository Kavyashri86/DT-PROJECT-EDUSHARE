// ===== STATE =====
let allResources = [];
let currentUser  = JSON.parse(localStorage.getItem('user') || 'null');
let pollInterval = null;
const ICON_MAP = { Book: 'fa-book', Device: 'fa-laptop', Calculator: 'fa-calculator', 'Lab Kit': 'fa-flask' };

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  showPage('home');
  loadHomeResources();
  if (currentUser) startPolling();
});

// ===== NAVIGATION =====
function showPage(page) {
  const protected_ = ['add-resource', 'my-requests', 'cart', 'my-resources'];
  if (protected_.includes(page) && !currentUser) {
    showToast('Please login first', 'error');
    page = 'login';
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  if (page === 'resources')    loadResources();
  if (page === 'my-requests')  { loadRequests(); loadIncoming(); }
  if (page === 'cart')         loadCart();
  if (page === 'my-resources') loadMyResources();
  if (page !== 'chat')         stopChatPolling();
  window.scrollTo(0, 0);
}

// ===== AUTH UI =====
function updateAuthUI() {
  const loggedIn = !!currentUser;
  document.querySelectorAll('.auth-only').forEach(el  => el.classList.toggle('hidden', !loggedIn));
  document.querySelectorAll('.guest-only').forEach(el => el.classList.toggle('hidden',  loggedIn));
  if (currentUser) document.getElementById('userGreeting').textContent = 'Hi, ' + currentUser.name.split(' ')[0] + ' 👋';
  if (loggedIn) updateCartBadge(); else document.getElementById('cartBadge').textContent = '0';
}

// ===== TOAST =====
function showToast(msg, type) {
  type = type || 'info';
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ===== REGISTER =====
async function register(e) {
  e.preventDefault();
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const btn   = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  try {
    await Auth.register({ name, email, student_id: document.getElementById('regStudentId').value.trim(), password: document.getElementById('regPassword').value });
    localStorage.setItem('registeredName_' + email, name);
    showToast('Account created! Please login.', 'success');
    e.target.reset();
    showPage('login');
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account'; }
}

// ===== LOGIN =====
async function login(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
  try {
    const data = await Auth.login({ email: document.getElementById('loginEmail').value.trim(), password: document.getElementById('loginPassword').value });
    localStorage.setItem('token', data.access_token);
    const payload  = JSON.parse(atob(data.access_token.split('.')[1]));
    const emailVal = document.getElementById('loginEmail').value.trim();
    const stored   = localStorage.getItem('registeredName_' + emailVal);
    currentUser = { id: payload.sub, name: stored || emailVal.split('@')[0], email: emailVal };
    localStorage.setItem('user', JSON.stringify(currentUser));
    updateAuthUI();
    showToast('Welcome back, ' + currentUser.name + '!', 'success');
    e.target.reset();
    startPolling();
    showPage('resources');
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem('token'); localStorage.removeItem('user');
  currentUser = null; allResources = [];
  stopPolling(); stopChatPolling(); updateAuthUI();
  showToast('Logged out', 'info'); showPage('home');
}

// ===== LOAD HOME =====
async function loadHomeResources() {
  try {
    const resources = await Resources.list();
    allResources = resources;
    document.getElementById('statResources').textContent = resources.length;
    renderResources(resources.slice(0, 4), 'homeResourcesGrid');
  } catch {
    document.getElementById('homeResourcesGrid').innerHTML =
      '<div class="empty-state"><i class="fas fa-wifi"></i><h3>Backend offline</h3></div>';
  }
}

// ===== LOAD RESOURCES =====
async function loadResources() {
  const grid = document.getElementById('resourcesGrid');
  grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    allResources = await Resources.list();
    renderResources(allResources, 'resourcesGrid');
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>' + err.message + '</h3></div>';
  }
}

function renderResources(list, containerId) {
  const grid = document.getElementById(containerId);
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><h3>No resources found</h3><p>Be the first to add one!</p></div>';
    return;
  }
  grid.innerHTML = list.map(r => resourceCard(r)).join('');
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function priceBadge(price) {
  if (!price || price === '0') return '<span class="tag tag-free"><i class="fas fa-gift"></i> Free</span>';
  return '<span class="tag tag-price"><i class="fas fa-rupee-sign"></i> ' + price + '</span>';
}

function resourceCard(r) {
  const icon = ICON_MAP[r.category] || 'fa-box';
  const isOwner = currentUser && r.user_id === currentUser.id;
  const img = r.image_url
    ? '<img class="resource-img" src="' + BASE_URL + r.image_url + '" alt="' + escHtml(r.name) + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"/><div class="resource-img-placeholder" style="display:none"><i class="fas ' + icon + '"></i></div>'
    : '<div class="resource-img-placeholder"><i class="fas ' + icon + '"></i></div>';
  const actions = isOwner
    ? '<button class="btn btn-danger btn-sm" onclick="deleteResource(\'' + r.id + '\')"><i class="fas fa-trash"></i> Delete</button>'
    : '<button class="btn btn-primary btn-sm" onclick="requestResource(\'' + r.id + '\')"><i class="fas fa-hand-holding"></i> Request</button>' +
      '<button class="btn btn-outline btn-sm" onclick="addToCart(\'' + r.id + '\')"><i class="fas fa-cart-plus"></i> Cart</button>';
  return '<div class="resource-card" onclick="openResourceModal(\'' + r.id + '\')">' +
    img +
    '<div class="resource-body">' +
      '<div class="resource-title">' + escHtml(r.name) + '</div>' +
      '<div class="resource-subject"><i class="fas fa-book-open"></i> ' + escHtml(r.subject) + '</div>' +
      '<div class="resource-tags">' +
        '<span class="tag tag-category">' + r.category + '</span>' +
        '<span class="tag tag-condition-' + r.condition + '">' + r.condition + '</span>' +
        '<span class="tag tag-type-' + r.type + '">' + r.type + '</span>' +
        priceBadge(r.price) +
      '</div>' +
      '<div class="resource-actions" onclick="event.stopPropagation()">' + actions + '</div>' +
    '</div></div>';
}

function filterResources() {
  const q    = document.getElementById('searchInput').value.toLowerCase();
  const cat  = document.getElementById('filterCategory').value;
  const type = document.getElementById('filterType').value;
  const cond = document.getElementById('filterCondition').value;
  const filtered = allResources.filter(r =>
    (!q    || r.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)) &&
    (!cat  || r.category  === cat)  &&
    (!type || r.type      === type) &&
    (!cond || r.condition === cond)
  );
  renderResources(filtered, 'resourcesGrid');
}

// ===== PRICE TOGGLE =====
function togglePrice() {
  const isFree = document.getElementById('resFree').checked;
  document.getElementById('priceGroup').style.display = isFree ? 'none' : 'flex';
  document.getElementById('priceLabel').textContent = isFree ? 'Free' : 'Paid';
}
function getPrice() {
  const isFree = document.getElementById('resFree').checked;
  if (isFree) return '0';
  return document.getElementById('resPrice').value || '0';
}

// ===== IMAGE PREVIEW =====
function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('imagePreview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  document.getElementById('imageUploadArea').style.display = 'none';
}

// ===== ADD RESOURCE =====
async function submitResource(e) {
  e.preventDefault();
  const btn = document.getElementById('submitResourceBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  try {
    const imageFile = document.getElementById('resImage').files[0];
    const price = getPrice();
    if (imageFile) {
      const fd = new FormData();
      fd.append('name',        document.getElementById('resName').value);
      fd.append('category',    document.getElementById('resCategory').value);
      fd.append('subject',     document.getElementById('resSubject').value);
      fd.append('condition',   document.getElementById('resCondition').value);
      fd.append('type',        document.getElementById('resType').value);
      fd.append('description', document.getElementById('resDescription').value);
      fd.append('price',       price);
      fd.append('image',       imageFile);
      await Resources.createWithImage(fd);
    } else {
      await Resources.create({
        name: document.getElementById('resName').value,
        category: document.getElementById('resCategory').value,
        subject: document.getElementById('resSubject').value,
        condition: document.getElementById('resCondition').value,
        type: document.getElementById('resType').value,
        description: document.getElementById('resDescription').value,
        price,
      });
    }
    showToast('Resource added!', 'success');
    e.target.reset();
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imageUploadArea').style.display = '';
    document.getElementById('resFree').checked = true;
    togglePrice();
    showPage('resources');
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Add Resource'; }
}

// ===== DELETE RESOURCE =====
async function deleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  try {
    await Resources.delete(id);
    showToast('Resource deleted', 'info');
    allResources = allResources.filter(r => r.id !== id);
    renderResources(allResources, 'resourcesGrid');
    closeModal();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== MY RESOURCES =====
async function loadMyResources() {
  const grid = document.getElementById('myResourcesGrid');
  grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const all  = await Resources.list();
    const mine = all.filter(r => r.user_id === currentUser.id);
    if (!mine.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><h3>No resources yet</h3></div>';
      return;
    }
    grid.innerHTML = mine.map(r => {
      const icon = ICON_MAP[r.category] || 'fa-box';
      const img  = r.image_url
        ? '<img class="resource-img" src="' + BASE_URL + r.image_url + '" alt="' + escHtml(r.name) + '">'
        : '<div class="resource-img-placeholder"><i class="fas ' + icon + '"></i></div>';
      return '<div class="resource-card" id="myres-' + r.id + '">' + img +
        '<div class="resource-body">' +
          '<div class="resource-title">' + escHtml(r.name) + '</div>' +
          '<div class="resource-subject"><i class="fas fa-book-open"></i> ' + escHtml(r.subject) + '</div>' +
          '<div class="resource-tags">' +
            '<span class="tag tag-category">' + r.category + '</span>' +
            '<span class="tag tag-condition-' + r.condition + '">' + r.condition + '</span>' +
            priceBadge(r.price) +
          '</div>' +
          '<div class="resource-actions">' +
            '<button class="btn btn-danger btn-sm" onclick="deleteMyResource(\'' + r.id + '\')"><i class="fas fa-trash"></i> Delete</button>' +
            '<span class="tag ' + (r.is_available ? 'tag-free' : 'tag-condition-Used') + '">' + (r.is_available ? 'Available' : 'Unavailable') + '</span>' +
          '</div>' +
        '</div></div>';
    }).join('');
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>' + err.message + '</h3></div>';
  }
}

async function deleteMyResource(id) {
  if (!confirm('Delete this resource?')) return;
  try {
    await Resources.delete(id);
    document.getElementById('myres-' + id)?.remove();
    showToast('Resource deleted', 'info');
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== REQUESTS =====
async function requestResource(resourceId) {
  if (!currentUser) { showToast('Please login first', 'error'); showPage('login'); return; }
  try {
    await Requests.create(resourceId);
    showToast('Request sent!', 'success');
    closeModal();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadRequests() {
  const list = document.getElementById('requestsList');
  list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const [requests, resources] = await Promise.all([Requests.list(), Resources.list()]);
    const resMap = Object.fromEntries(resources.map(r => [r.id, r]));
    if (!requests.length) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No requests yet</h3></div>';
      return;
    }
    list.innerHTML = requests.map(req => {
      const res  = resMap[req.resource_id];
      const icon = res ? (ICON_MAP[res.category] || 'fa-box') : 'fa-box';
      const imgHtml = res && res.image_url
        ? '<img src="' + BASE_URL + res.image_url + '" class="req-thumb" alt="' + escHtml(res.name) + '" onerror="this.style.display=\'none\'">'
        : '<div class="req-thumb-icon"><i class="fas ' + icon + '"></i></div>';
      const chatBtn = (req.status === 'approved' || req.status === 'delivered')
        ? '<button class="btn btn-outline btn-sm" onclick="openChat(\'' + req.id + '\',\'' + escHtml(res ? res.name : 'Resource') + '\')"><i class="fas fa-comments"></i> Chat</button>'
        : '';
      return '<div class="request-card">' + imgHtml +
        '<div class="request-info">' +
          '<h4>' + (res ? escHtml(res.name) : 'Resource (deleted)') + '</h4>' +
          '<p>' + (res ? res.category + ' · ' + res.subject : '') + '</p>' +
          '<p class="req-date"><i class="fas fa-clock"></i> ' + new Date(req.created_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) + '</p>' +
        '</div>' +
        '<div class="cart-actions"><span class="status-badge status-' + req.status + '">' + req.status + '</span>' + chatBtn + '</div>' +
        '</div>';
    }).join('');
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>' + err.message + '</h3></div>';
  }
}

// ===== INCOMING REQUESTS =====
async function loadIncoming() {
  const list = document.getElementById('incomingList');
  list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const [incoming, resources] = await Promise.all([Requests.incoming(), Resources.list()]);
    const resMap  = Object.fromEntries(resources.map(r => [r.id, r]));
    const pending = incoming.filter(r => r.status === 'pending').length;
    updateBellBadge(pending);
    const countEl = document.getElementById('incomingCount');
    if (pending > 0) { countEl.textContent = pending; countEl.classList.remove('hidden'); }
    else countEl.classList.add('hidden');

    if (!incoming.length) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><h3>No incoming requests</h3></div>';
      return;
    }
    list.innerHTML = incoming.map(req => {
      const res  = resMap[req.resource_id];
      const icon = res ? (ICON_MAP[res.category] || 'fa-box') : 'fa-box';
      const imgHtml = res && res.image_url
        ? '<img src="' + BASE_URL + res.image_url + '" class="req-thumb" onerror="this.style.display=\'none\'">'
        : '<div class="req-thumb-icon"><i class="fas ' + icon + '"></i></div>';
      let actionBtns;
      if (req.status === 'pending') {
        actionBtns = '<button class="btn btn-success btn-sm" onclick="updateRequestStatus(\'' + req.id + '\',\'approved\')"><i class="fas fa-check"></i> Approve</button>' +
                     '<button class="btn btn-danger btn-sm" onclick="updateRequestStatus(\'' + req.id + '\',\'rejected\')"><i class="fas fa-times"></i> Reject</button>';
      } else if (req.status === 'approved') {
        actionBtns = '<button class="btn btn-primary btn-sm" onclick="markDelivered(\'' + req.id + '\')"><i class="fas fa-truck"></i> Mark Delivered</button>' +
                     '<button class="btn btn-outline btn-sm" onclick="openChat(\'' + req.id + '\',\'' + escHtml(res ? res.name : 'Resource') + '\')"><i class="fas fa-comments"></i> Chat</button>';
      } else if (req.status === 'delivered') {
        actionBtns = '<span class="status-badge status-delivered"><i class="fas fa-check-double"></i> Delivered</span>' +
                     '<button class="btn btn-outline btn-sm" onclick="openChat(\'' + req.id + '\',\'' + escHtml(res ? res.name : 'Resource') + '\')"><i class="fas fa-comments"></i> Chat</button>';
      } else {
        actionBtns = '<span class="status-badge status-' + req.status + '">' + req.status + '</span>';
      }
      return '<div class="request-card" id="inc-' + req.id + '">' + imgHtml +
        '<div class="request-info">' +
          '<h4>' + (res ? escHtml(res.name) : 'Resource (deleted)') + '</h4>' +
          '<p>' + (res ? res.category + ' · ' + res.subject : '') + '</p>' +
          '<p class="req-date"><i class="fas fa-user"></i> ID: ' + req.requester_id.slice(0,8) + '...</p>' +
          '<p class="req-date"><i class="fas fa-clock"></i> ' + new Date(req.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) + '</p>' +
        '</div>' +
        '<div class="cart-actions" id="inc-actions-' + req.id + '">' + actionBtns + '</div>' +
        '</div>';
    }).join('');
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>' + err.message + '</h3></div>';
  }
}

async function updateRequestStatus(requestId, status) {
  try {
    await Requests.updateStatus(requestId, status);
    showToast('Request ' + status + '!', status === 'approved' ? 'success' : 'info');
    const el = document.getElementById('inc-actions-' + requestId);
    if (el) el.innerHTML = '<span class="status-badge status-' + status + '">' + status + '</span>';
    await refreshBellBadge();
  } catch (err) { showToast(err.message, 'error'); }
}

async function markDelivered(requestId) {
  if (!confirm('Mark as delivered?')) return;
  try {
    await Requests.updateStatus(requestId, 'delivered');
    showToast('Marked as delivered!', 'success');
    loadIncoming();
  } catch (err) { showToast(err.message, 'error'); }
}

// ===== CART =====
async function addToCart(resourceId) {
  if (!currentUser) { showToast('Please login first', 'error'); showPage('login'); return; }
  try {
    await Cart.add(resourceId);
    showToast('Saved to cart!', 'success');
    updateCartBadge();
    closeModal();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadCart() {
  const list = document.getElementById('cartList');
  list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    const [cartItems, resources] = await Promise.all([Cart.list(), Resources.list()]);
    const resMap = Object.fromEntries(resources.map(r => [r.id, r]));
    updateCartBadge(cartItems.length);
    if (!cartItems.length) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>Cart is empty</h3></div>';
      return;
    }
    list.innerHTML = cartItems.map(item => {
      const res  = resMap[item.resource_id];
      const icon = res ? (ICON_MAP[res.category] || 'fa-box') : 'fa-box';
      const imgHtml = res && res.image_url
        ? '<img src="' + BASE_URL + res.image_url + '" class="req-thumb" onerror="this.style.display=\'none\'">'
        : '<div class="req-thumb-icon"><i class="fas ' + icon + '"></i></div>';
      return '<div class="cart-card" id="cart-' + item.id + '">' + imgHtml +
        '<div class="request-info">' +
          '<h4>' + (res ? escHtml(res.name) : 'Resource (deleted)') + '</h4>' +
          '<p>' + (res ? res.category + ' · ' + res.subject + ' · ' + res.condition : '') + '</p>' +
          (res ? priceBadge(res.price) : '') +
          '<p class="req-date"><i class="fas fa-clock"></i> Saved ' + new Date(item.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) + '</p>' +
        '</div>' +
        '<div class="cart-actions">' +
          (res ? '<button class="btn btn-primary btn-sm" onclick="requestResource(\'' + res.id + '\')"><i class="fas fa-hand-holding"></i> Request</button>' : '') +
          '<button class="btn btn-danger btn-sm" onclick="removeFromCart(\'' + item.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</div></div>';
    }).join('');
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>' + err.message + '</h3></div>';
  }
}

async function removeFromCart(cartId) {
  try {
    await Cart.remove(cartId);
    document.getElementById('cart-' + cartId)?.remove();
    showToast('Removed from cart', 'info');
    updateCartBadge();
  } catch (err) { showToast(err.message, 'error'); }
}

async function updateCartBadge(count) {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  if (!currentUser) { badge.textContent = '0'; return; }
  if (count !== undefined && count !== null) { badge.textContent = count; return; }
  try { badge.textContent = (await Cart.list()).length; } catch { badge.textContent = '0'; }
}

// ===== MODAL =====
function openResourceModal(resourceId) {
  const r = allResources.find(x => x.id === resourceId);
  if (!r) return;
  const icon    = ICON_MAP[r.category] || 'fa-box';
  const isOwner = currentUser && r.user_id === currentUser.id;
  const imgHtml = r.image_url
    ? '<img class="modal-img" src="' + BASE_URL + r.image_url + '" alt="' + escHtml(r.name) + '">'
    : '<div class="modal-img-placeholder"><i class="fas ' + icon + '"></i></div>';
  const actions = isOwner
    ? '<span class="owner-note"><i class="fas fa-user-check"></i> Your resource</span>' +
      '<button class="btn btn-danger" onclick="deleteResource(\'' + r.id + '\')"><i class="fas fa-trash"></i> Delete</button>'
    : '<button class="btn btn-primary" onclick="requestResource(\'' + r.id + '\')"><i class="fas fa-hand-holding"></i> Request</button>' +
      '<button class="btn btn-outline" onclick="addToCart(\'' + r.id + '\')"><i class="fas fa-cart-plus"></i> Save to Cart</button>';
  document.getElementById('modalContent').innerHTML =
    imgHtml +
    '<div class="modal-body">' +
      '<h2>' + escHtml(r.name) + '</h2>' +
      '<p class="modal-subject"><i class="fas fa-book-open"></i> ' + escHtml(r.subject) + '</p>' +
      '<div class="modal-tags">' +
        '<span class="tag tag-category">' + r.category + '</span>' +
        '<span class="tag tag-condition-' + r.condition + '">' + r.condition + '</span>' +
        '<span class="tag tag-type-' + r.type + '">' + r.type + '</span>' +
        priceBadge(r.price) +
      '</div>' +
      (r.description ? '<p class="modal-desc">' + escHtml(r.description) + '</p>' : '') +
      '<div class="modal-actions">' + actions + '</div>' +
    '</div>';
  document.getElementById('resourceModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('resourceModal').classList.add('hidden');
}

document.getElementById('resourceModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ===== TABS =====
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('tab-panel-' + tab).classList.remove('hidden');
}

// ===== BELL =====
function updateBellBadge(count) {
  const badge = document.getElementById('bellBadge');
  const btn   = document.getElementById('bellBtn');
  if (!badge || !btn) return;
  if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); btn.classList.add('bell-active'); }
  else { badge.classList.add('hidden'); btn.classList.remove('bell-active'); }
}

async function refreshBellBadge() {
  if (!currentUser) return;
  try {
    const incoming = await Requests.incoming();
    updateBellBadge(incoming.filter(r => r.status === 'pending').length);
  } catch { updateBellBadge(0); }
}

function startPolling()  { stopPolling(); refreshBellBadge(); pollInterval = setInterval(refreshBellBadge, 30000); }
function stopPolling()   { if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } }

// ===== CHAT =====
let activeChatRequestId = null;
let chatPollInterval    = null;

function openChat(requestId, resourceName) {
  activeChatRequestId = requestId;
  document.getElementById('chatSubtitle').textContent = 'About: ' + resourceName;
  showPage('chat');
  loadMessages();
  stopChatPolling();
  chatPollInterval = setInterval(loadMessages, 5000);
}

async function loadMessages() {
  const box = document.getElementById('chatMessages');
  if (!activeChatRequestId || !box) return;
  try {
    const msgs = await Messages.list(activeChatRequestId);
    if (!msgs.length) {
      box.innerHTML = '<div class="chat-empty"><i class="fas fa-comment-dots"></i><p>No messages yet. Say hello!</p></div>';
      return;
    }
    const atBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 60;
    box.innerHTML = msgs.map(m => {
      const isMine = m.sender_id === currentUser?.id;
      const time   = new Date(m.created_at).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
      return '<div class="chat-bubble-wrap ' + (isMine ? 'mine' : 'theirs') + '">' +
        (!isMine ? '<div class="chat-sender">' + escHtml(m.sender_name) + '</div>' : '') +
        '<div class="chat-bubble">' + escHtml(m.message) + '</div>' +
        '<div class="chat-time">' + time + '</div>' +
        '</div>';
    }).join('');
    if (atBottom) box.scrollTop = box.scrollHeight;
  } catch (err) {
    box.innerHTML = '<div class="chat-empty"><p>' + err.message + '</p></div>';
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || !activeChatRequestId) return;
  input.value = '';
  try {
    await Messages.send(activeChatRequestId, text);
    await loadMessages();
    const box = document.getElementById('chatMessages');
    if (box) box.scrollTop = box.scrollHeight;
  } catch (err) { showToast(err.message, 'error'); input.value = text; }
}

function stopChatPolling() {
  if (chatPollInterval) { clearInterval(chatPollInterval); chatPollInterval = null; }
}
