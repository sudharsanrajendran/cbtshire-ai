import { api } from './api';
import type { Job } from '../types';
export const getJobs = async () => (await api.get<Job[]>('/jobs')).data;
export const createJob = async (payload: Omit<Job, 'id' | 'status' | 'applicants' | 'updated_at'>) => (await api.post<Job>('/jobs', payload)).data;
export const updateJob = async (id: number, payload: Omit<Job, 'id' | 'status' | 'applicants' | 'updated_at'>) => (await api.put<Job>(`/jobs/${id}`, payload)).data;
export const updateJobStatus = async (id: number, status: string) => (await api.patch<Job>(`/jobs/${id}/status`, null, { params: { status } })).data;
export const deleteJob = async (id: number) => api.delete(`/jobs/${id}`);
