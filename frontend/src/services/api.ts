import axios from 'axios';

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultBaseURL = `http://${hostname}:8000/api`;

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || defaultBaseURL, timeout: 60000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => { const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
