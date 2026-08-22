import { api } from './api';
import type { Assessment } from '../types';

export interface CandidateAssessmentAttempt {
  id: number;
  assessment_id: number;
  assessment_title: string;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  role: string;
  score: number;
  percentage: number;
  time_taken: number;
  passed: boolean;
  status: string;
}

export interface CreateAssessmentFromResumePayload {
  candidate_name: string;
  candidate_email: string;
  role?: string;
  experience_level?: string;
  skills?: string;
  job_id?: number | null;
  file?: File | null;
}

export const getAssessments = async () => (await api.get<Assessment[]>('/assessments')).data;
export const getAssessmentAttempts = async () => (await api.get<CandidateAssessmentAttempt[]>('/assessments/attempts')).data;
export const createAssessment = async (payload: Omit<Assessment, 'id' | 'status'>) => (await api.post<Assessment>('/assessments', payload)).data;

export const createAssessmentFromResume = async (payload: CreateAssessmentFromResumePayload) => {
  const body = new FormData();
  body.append('candidate_name', payload.candidate_name);
  body.append('candidate_email', payload.candidate_email);
  if (payload.role) body.append('role', payload.role);
  if (payload.experience_level) body.append('experience_level', payload.experience_level);
  if (payload.skills) body.append('skills', payload.skills);
  if (payload.job_id) body.append('job_id', String(payload.job_id));
  if (payload.file) body.append('file', payload.file);

  return (await api.post<any>('/assessments/create-from-resume', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })).data;
};

export const getAssessmentQuestions = async (assessmentId: number) =>
  (await api.get<{
    assessment_id: number;
    title: string;
    status: string;
    candidate_name?: string;
    candidate_email?: string;
    assessment_link?: string;
    token?: string;
    invited_at?: string;
    questions: Array<{ id: number; prompt: string; options: string[]; correct_answer: string; explanation: string }>;
  }>(`/assessments/${assessmentId}/questions`)).data;

export const updateAssessmentQuestions = async (assessmentId: number, questions: any[]) =>
  (await api.put<{ success: boolean; question_count: number }>(`/assessments/${assessmentId}/questions`, { questions })).data;

export const sendAssessmentToCandidate = async (assessmentId: number) =>
  (await api.post<{
    success: boolean;
    assessment_id: number;
    candidate_id: number;
    candidate_name: string;
    email: string;
    assessment_link: string;
    email_sent: boolean;
    message: string;
  }>(`/assessments/${assessmentId}/send`)).data;

export const parseAssessmentDocument = async (file: File) => {
  const body = new FormData();
  body.append('file', file);
  return (await api.post<{
    success: boolean;
    filename: string;
    question_count: number;
    questions: Array<{ prompt: string; options: string[]; correct_answer: string; explanation: string }>;
  }>('/assessments/parse-doc', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })).data;
};

export const createAssessmentFromDoc = async (payload: {
  file: File;
  title?: string;
  candidate_id?: number | null;
  job_id?: number | null;
}) => {
  const body = new FormData();
  body.append('file', payload.file);
  if (payload.title) body.append('title', payload.title);
  if (payload.candidate_id) body.append('candidate_id', String(payload.candidate_id));
  if (payload.job_id) body.append('job_id', String(payload.job_id));

  return (await api.post<any>('/assessments/create-from-doc', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })).data;
};

