import axios from 'axios';

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

let resolvedBaseURL = import.meta.env.VITE_API_URL;
if (!resolvedBaseURL || typeof resolvedBaseURL !== 'string' || resolvedBaseURL.trim() === '') {
  resolvedBaseURL = isLocal ? `http://${hostname}:8000/api` : 'https://cbtshire-ai.onrender.com/api';
}

resolvedBaseURL = resolvedBaseURL.trim().replace(/\/+$/, '');
if (!resolvedBaseURL.endsWith('/api')) {
  resolvedBaseURL = `${resolvedBaseURL}/api`;
}

export const api = axios.create({ baseURL: resolvedBaseURL, timeout: 60000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => { const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
