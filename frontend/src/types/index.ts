export type UserRole = 'admin' | 'recruiter' | 'interviewer';
export type JobStatus = 'draft' | 'published' | 'closed';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  linkedin_profile_url?: string;
  naukri_recruiter_id?: string;
  indeed_employer_id?: string;
  careers_page_url?: string;
}
export interface Job { id: number; title: string; department: string; location: string; employment_type: string; experience_level: string; status: JobStatus; applicants: number; openings: number; updated_at: string; skills: string[]; description?: string; }
export interface Candidate {
  id: number;
  name: string;
  email: string;
  role: string;
  experience_level?: string;
  location?: string;
  match_score: number;
  match_explanation?: string;
  status: string;
  source?: string;
  applied_at: string;
  skills: string[];
  resume_info?: {
    filename?: string;
    content_type?: string;
    extracted_text?: string;
    parsed_summary?: string;
    storage_url?: string;
  };
  assessment_info?: {
    assessment_id?: number;
    token: string;
    assessment_link: string;
    invited_at?: string;
    email_sent?: boolean;
    job_title?: string;
    ai_analysis?: string;
    status?: string;
    questions?: Array<{ id?: number; prompt: string; options: string[]; correct: string; exp?: string }>;
  };
}
export interface DashboardStats { total_jobs: number; active_jobs: number; total_candidates: number; shortlisted: number; interviews: number; offers: number; hired: number; }
export interface Activity { id: number; type: string; title: string; detail: string; timestamp: string; color: string; }
export interface Assessment { id: number; title: string; job_id: number | null; question_count: number; duration_minutes: number; status: string; }
export interface Interview { id: number; candidate_id: number; candidate_name: string; candidate_email?: string; candidate_role?: string; interviewer_name: string; interview_type: string; scheduled_at: string; status: string; meeting_link: string; }
export interface Offer { id: number; candidate_id: number; candidate_name: string; job_id: number | null; salary: string; joining_date: string | null; status: string; }
