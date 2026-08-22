import axios from 'axios';

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE = `http://${hostname}:8000/api`;

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
  const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token');
  const response = await axios.post<SimulationResult>(`${API_BASE}/integrations/simulate`, payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data;
}

export interface JobPostRequestParams {
  position_name?: string;
  experience?: string;
  skills?: string;
  location?: string;
  profile_url?: string;
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
  const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token');
  const payload = {
    profile_url: params?.profile_url || 'https://www.linkedin.com/in/sudharsanajendran/',
    job_id: params?.job_id,
    position_name: params?.position_name,
    experience: params?.experience,
    skills: params?.skills,
    location: params?.location
  };
  const response = await axios.post<LinkedInPostResponse>(
    `${API_BASE}/integrations/linkedin/post-job`,
    payload,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
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
  const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token');
  const payload = {
    job_id: params?.job_id,
    position_name: params?.position_name,
    experience: params?.experience,
    skills: params?.skills,
    location: params?.location
  };
  const response = await axios.post<PlatformPostResponse>(
    `${API_BASE}/integrations/naukri/post-job`,
    payload,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return response.data;
}

export async function generateIndeedJobPost(params?: JobPostRequestParams): Promise<PlatformPostResponse> {
  const token = localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token');
  const payload = {
    job_id: params?.job_id,
    position_name: params?.position_name,
    experience: params?.experience,
    skills: params?.skills,
    location: params?.location
  };
  const response = await axios.post<PlatformPostResponse>(
    `${API_BASE}/integrations/indeed/post-job`,
    payload,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return response.data;
}
