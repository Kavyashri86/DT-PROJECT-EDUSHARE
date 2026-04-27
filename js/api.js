const BASE_URL = 'http://127.0.0.1:8000';

function getToken() { return localStorage.getItem('token'); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Token expired — force logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.reload();
  }
  if (!res.ok) throw new Error(data.detail || 'Something went wrong');
  return data;
}

async function apiFormData(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Something went wrong');
  return data;
}

const Auth = {
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
};

const Resources = {
  list:            ()       => apiFetch('/resources'),
  create:          (body)   => apiFetch('/resources', { method: 'POST', body: JSON.stringify(body) }),
  createWithImage: (fd)     => apiFormData('/resources/with-image', fd),
  update:          (id, b)  => apiFetch(`/resources/${id}`, { method: 'PUT',    body: JSON.stringify(b) }),
  delete:          (id)     => apiFetch(`/resources/${id}`, { method: 'DELETE' }),
};

const Requests = {
  create:       (resource_id) => apiFetch('/requests', { method: 'POST', body: JSON.stringify({ resource_id }) }),
  list:         ()            => apiFetch('/requests'),
  incoming:     ()            => apiFetch('/requests/incoming'),
  updateStatus: (id, status)  => apiFetch(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

const Cart = {
  add:    (resource_id) => apiFetch('/cart', { method: 'POST', body: JSON.stringify({ resource_id }) }),
  list:   ()            => apiFetch('/cart'),
  remove: (id)          => apiFetch(`/cart/${id}`, { method: 'DELETE' }),
};

const Messages = {
  send: (request_id, message) => apiFetch('/messages', { method: 'POST', body: JSON.stringify({ request_id, message }) }),
  list: (request_id)          => apiFetch(`/messages/${request_id}`),
};
