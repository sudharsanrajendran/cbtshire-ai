import { api } from './api';
import type { Interview } from '../types';
export interface CreateInterviewPayload {
  candidate_id?: number | null;
  candidate_name?: string;
  candidate_email?: string;
  interviewer_name: string;
  interview_type: string;
  scheduled_at: string;
  meeting_link?: string;
}

export const getInterviews = async () => (await api.get<Interview[]>('/interviews')).data;

export const createInterview = async (payload: CreateInterviewPayload) =>
  (await api.post<Interview>('/interviews', payload)).data;

export const updateInterviewStatus = async (interviewId: number, status: string) =>
  (await api.patch<Interview>(`/interviews/${interviewId}/status?status=${encodeURIComponent(status)}`)).data;
