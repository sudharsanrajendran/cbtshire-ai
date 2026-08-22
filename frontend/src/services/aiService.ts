import { api } from './api';
export const generateJobDescription = async (payload: { title: string; experience: string; skills: string; department: string }) => (await api.post<{ content: string }>('/ai/job-description', payload, { timeout: 120000 })).data;
export const matchCandidate = async (payload: { candidate_id: number; job_id: number }) => (await api.post('/ai/match', payload, { timeout: 120000 })).data;
export const analyzeResume = async (payload: { resume_text: string }) => (await api.post<{ content: string }>('/ai/resume-analysis', payload, { timeout: 120000 })).data;
export const evaluateAtsMatch = async (payload: { resume_text: string; target_role?: string; target_experience?: string; target_skills?: string }) => (await api.post<{ result: any }>('/ai/ats-eval', payload, { timeout: 120000 })).data;
export const generateAssessment = async (payload: { job: string; skills: string; difficulty?: string; count?: number }) => (await api.post<{ content: string }>('/ai/assessment', payload, { timeout: 120000 })).data;
export const suggestSkills = async (payload: { title: string; department?: string; experience?: string }) => (await api.post<{ skills: string[]; skills_str: string; role: string }>('/ai/suggest-skills', payload, { timeout: 60000 })).data;

