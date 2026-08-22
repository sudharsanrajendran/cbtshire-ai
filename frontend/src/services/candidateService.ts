import { api } from './api';
import type { Candidate } from '../types';
export interface CreateCandidatePayload extends Pick<Candidate, 'name' | 'email' | 'role'> {
  experience_level?: string;
  skills?: string[];
  job_id?: number | null;
  auto_send_assessment?: boolean;
  file?: File | null;
}

export interface CandidateCreationResult extends Candidate {
  assessment_info?: {
    assessment_id?: number;
    token: string;
    assessment_link: string;
    email_sent: boolean;
    job_title: string;
    ai_analysis: string;
    status?: string;
    questions?: Array<{ id?: number; prompt: string; options: string[]; correct: string; exp?: string }>;
  };
}

export interface ResendAssessmentResult {
  success: boolean;
  candidate_id: number;
  candidate_name: string;
  email: string;
  assessment_link: string;
  email_sent: boolean;
  message: string;
}

export const getCandidates = async () => (await api.get<Candidate[]>('/candidates')).data;

export const createCandidate = async (payload: CreateCandidatePayload) => {
  if (payload.file) {
    const body = new FormData();
    body.append('name', payload.name);
    body.append('email', payload.email);
    if (payload.role) body.append('role', payload.role);
    if (payload.experience_level) body.append('experience_level', payload.experience_level);
    if (payload.skills) body.append('skills', payload.skills.join(', '));
    if (payload.job_id) body.append('job_id', String(payload.job_id));
    body.append('auto_send_assessment', String(payload.auto_send_assessment ?? true));
    body.append('file', payload.file);

    return (await api.post<CandidateCreationResult>('/candidates/with-resume', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    })).data;
  }
  return (await api.post<CandidateCreationResult>('/candidates', payload, { timeout: 120000 })).data;
};
export interface ParsedResumeResult {
  success: boolean;
  filename: string;
  details: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    experience_level: string;
    skills: string[];
  };
}

export const parseCandidateResume = async (file: File) => {
  const body = new FormData();
  body.append('file', file);
  return (await api.post<ParsedResumeResult>('/candidates/parse-resume', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  })).data;
};

export const updateCandidateStatus = async (id: number, status: string) => (await api.patch<Candidate>(`/candidates/${id}/status`, null, { params: { status } })).data;
export const resendAssessmentLink = async (candidateId: number) => (await api.post<ResendAssessmentResult>(`/candidates/${candidateId}/resend-assessment`)).data;

