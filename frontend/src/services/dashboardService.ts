import { api } from './api';
import type { Activity, Candidate, DashboardStats, Job } from '../types';
export const getDashboard = async () => (await api.get<{ stats: DashboardStats; jobs: Job[]; candidates: Candidate[]; activity: Activity[] }>('/dashboard')).data;
