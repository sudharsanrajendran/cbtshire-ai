import { api } from './api';
export const uploadResume = async (file: File) => { const body = new FormData(); body.append('file', file); return (await api.post('/candidates/resume', body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })).data; };
export const getAnalytics = async () => (await api.get('/analytics')).data;
export const searchAll = async (query: string) => (await api.get('/search', { params: { q: query } })).data;
export const getNotifications = async () => (await api.get('/notifications')).data;
export const getHiringEvents = async () => (await api.get('/hiring-events')).data;
export const createHiringEvent = async (payload: { name: string; event_type: string; location: string; starts_at: string; openings: number }) => (await api.post('/hiring-events', payload)).data;
