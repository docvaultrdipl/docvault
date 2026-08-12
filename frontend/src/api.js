// --- Backend connection settings ---
// Reads VITE_SERVER_ORIGIN from a .env file at build time (see .env.example).
// Falls back to localhost:5000 so local development keeps working with no setup.
export const SERVER_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || 'http://localhost:5000';
export const API_BASE_URL = `${SERVER_ORIGIN}/api`;
export const TOKEN_STORAGE_KEY = 'license_tracker_token';

export const STATUS_COLORS = {
  'Active': 'green',
  'Expiring Soon': 'orange',
  'Expired': 'red',
  'No Expiry': 'default',
};

export const STATUS_ROW_CLASS = {
  'Expiring Soon': 'row-expiring-soon',
  'Expired': 'row-expired',
};

export const VEHICLE_CATEGORIES = [
  { value: 'rc', label: 'RC' },
  { value: 'tax', label: 'Tax' },
  { value: 'od', label: 'OD (Own Damage)' },
  { value: 'tp', label: 'TP (Third Party)' },
  { value: 'pollution', label: 'Pollution' },
];

// Small fetch wrapper: adds the auth header, JSON-encodes plain objects,
// passes FormData straight through (needed for file uploads), and throws
// a normal Error with the backend's message on non-2xx responses.
export async function apiRequest(path, { method = 'GET', token, body, isFormData = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = response.status === 204 ? null : await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}
