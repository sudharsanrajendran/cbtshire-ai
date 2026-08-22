import { api } from './api';

export interface SimulatePayload {
  platform: 'linkedin' | 'naukri' | 'indeed' | 'website';
  candidate_name: string;
  candidate_email: string;
  role?: string;
  job_id?: number;
  skills?: string[];
}

export interface SimulationResult {
  status: string;
  platform: string;
  candidate: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    match_score: number;
  };
  ai_evaluation: {
    match_score: number;
    qualifies_for_interview: boolean;
    summary: string;
  };
  auto_scheduled_interview?: {
    interview_id: number;
    scheduled_at: string;
    meeting_link: string;
    interviewer: string;
  };
}

export async function simulateCandidateIngestion(payload: SimulatePayload): Promise<SimulationResult> {
  const response = await api.post<SimulationResult>('/integrations/simulate', payload);
  return response.data;
}

export interface JobPostRequestParams {
  position_name?: string;
  experience?: string;
  skills?: string;
  location?: string;
  profile_url?: string;
  description?: string;
  job_id?: number;
}

export interface LinkedInPostResponse {
  status: string;
  profile_url: string;
  job: {
    id: number;
    title: string;
    location: string;
    skills: string;
    experience?: string;
    apply_url: string;
  };
  post_text: string;
  hashtags?: string;
  share_url: string;
  feed_share_url?: string;
}

export async function generateLinkedInJobPost(params?: JobPostRequestParams): Promise<LinkedInPostResponse> {
  const payload = {
    profile_url: params?.profile_url || '',
    job_id: params?.job_id,
    position_name: params?.position_name,
    experience: params?.experience,
    skills: params?.skills,
    location: params?.location,
    description: params?.description
  };
  const response = await api.post<LinkedInPostResponse>('/integrations/linkedin/post-job', payload);
  return response.data;
}

export interface PlatformPostResponse {
  status: string;
  platform: string;
  job: {
    id: number;
    title: string;
    location: string;
    skills: string;
    experience?: string;
    apply_url: string;
  };
  post_text: string;
  hashtags?: string;
  naukri_portal_url?: string;
  indeed_portal_url?: string;
  xml_feed_url?: string;
}

export async function generateNaukriJobPost(params?: JobPostRequestParams): Promise<PlatformPostResponse> {
  const payload = {
    job_id: params?.job_id,
    position_name: params?.position_name,
    experience: params?.experience,
    skills: params?.skills,
    location: params?.location,
    description: params?.description
  };
  const response = await api.post<PlatformPostResponse>('/integrations/naukri/post-job', payload);
  return response.data;
}

export async function generateIndeedJobPost(params?: JobPostRequestParams): Promise<PlatformPostResponse> {
  const payload = {
    job_id: params?.job_id,
    position_name: params?.position_name,
    experience: params?.experience,
    skills: params?.skills,
    location: params?.location,
    description: params?.description
  };
  const response = await api.post<PlatformPostResponse>('/integrations/indeed/post-job', payload);
  return response.data;
}
