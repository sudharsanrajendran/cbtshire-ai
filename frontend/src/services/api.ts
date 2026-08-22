import axios from 'axios';

// Live Production Backend API URL
const LIVE_API_URL = 'https://cbtshire-ai.onrender.com/api';

let resolvedBaseURL = import.meta.env.VITE_API_URL || LIVE_API_URL;
resolvedBaseURL = resolvedBaseURL.trim().replace(/\/+$/, '');
if (!resolvedBaseURL.endsWith('/api')) {
  resolvedBaseURL = `${resolvedBaseURL}/api`;
}

export const api = axios.create({ baseURL: resolvedBaseURL, timeout: 60000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => { const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
