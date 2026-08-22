import { useEffect, useState, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import type { Assessment, Candidate, Job, Offer } from '../types';
import { useRecruitment } from '../hooks/useRecruitment';
import { createJob, updateJob, deleteJob, updateJobStatus, getJobs } from '../services/jobService';
import { createCandidate, resendAssessmentLink, parseCandidateResume, type ResendAssessmentResult } from '../services/candidateService';
import { createOffer } from '../services/offerService';
import { createInterview } from '../services/interviewService';
import { getMe } from '../services/authService';
import {
  createAssessment,
  createAssessmentFromResume,
  parseAssessmentDocument,
  createAssessmentFromDoc,
  getAssessmentAttempts,
  getAssessmentQuestions,
  updateAssessmentQuestions,
  sendAssessmentToCandidate,
  type CandidateAssessmentAttempt
} from '../services/assessmentService';
import { generateJobDescription, suggestSkills } from '../services/aiService';
import { generateLinkedInJobPost } from '../services/integrationsService';
import { InterviewPage } from './InterviewPage';
import { CandidateProfilePanel } from './CandidateProfilePanel';

export type ModuleKind = 'jobs' | 'candidates' | 'assessments' | 'interviews' | 'offers';
const labels = {
  jobs: ['Jobs', 'Build a thoughtful hiring pipeline.', 'Create job'],
  candidates: ['Candidates', 'Review talent with context, not just keywords.', 'Add candidate'],
  assessments: ['Assessments', 'Design fair, focused evaluation journeys.', 'Create assessment'],
  offers: ['Offers', 'Turn great conversations into clear next steps.', 'Create offer']
} as const;

type RecordItem = Job | Candidate | Assessment | Offer;

export const renderPlatformSourceBadge = (source?: string) => {
  const s = (source || 'Careers Portal').toLowerCase();
  if (s.includes('linkedin')) {
    return (
      <Chip
        icon={
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: 0.5,
              bgcolor: '#0a66c2',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 9,
              fontWeight: 900,
              ml: '4px !important'
            }}
          >
            in
          </Box>
        }
        label="LinkedIn"
        size="small"
        sx={{
          fontWeight: 800,
          fontSize: 11,
          bgcolor: '#e8f3fc',
          color: '#0a66c2',
          border: '1px solid #bfdbfe'
        }}
      />
    );
  }
  if (s.includes('naukri')) {
    return (
      <Chip
        icon={
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: 0.5,
              bgcolor: '#4a00e0',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 9,
              fontWeight: 900,
              ml: '4px !important'
            }}
          >
            N
          </Box>
        }
        label="Naukri"
        size="small"
        sx={{
          fontWeight: 800,
          fontSize: 11,
          bgcolor: '#f5f3ff',
          color: '#4a00e0',
          border: '1px solid #ddd6fe'
        }}
      />
    );
  }
  if (s.includes('indeed')) {
    return (
      <Chip
        icon={
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: 0.5,
              bgcolor: '#2557a7',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 9,
              fontWeight: 900,
              ml: '4px !important'
            }}
          >
            I
          </Box>
        }
        label="Indeed"
        size="small"
        sx={{
          fontWeight: 800,
          fontSize: 11,
          bgcolor: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe'
        }}
      />
    );
  }
  return (
    <Chip
      icon={<LanguageRoundedIcon sx={{ fontSize: '15px !important', color: '#087f8c !important', ml: '4px !important' }} />}
      label="Careers Page"
      size="small"
      sx={{
        fontWeight: 800,
        fontSize: 11,
        bgcolor: '#f0fdfa',
        color: '#0f766e',
        border: '1px solid #99f6e4'
      }}
    />
  );
};

export function ModulePage({ kind }: { kind: ModuleKind }) {
  if (kind === 'interviews') return <InterviewPage />;
  
  const [title, subtitle, action] = labels[kind];
  const { items, loading, error, reload } = useRecruitment<RecordItem>(kind);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [autoGenerateDesc, setAutoGenerateDesc] = useState(true);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsingResume, setParsingResume] = useState(false);
  const [parseSuccessMsg, setParseSuccessMsg] = useState<string | null>(null);
  const [suggestingSkills, setSuggestingSkills] = useState(false);
  const lastGeneratedKeyRef = useRef<string>('');

  // Handle automatic market skills suggestion for given Job Title / Role
  const handleSuggestSkills = async () => {
    const titleVal = (form.title || form.role || '').trim();
    if (!titleVal || titleVal.length < 2) {
      setDialogError('Please enter a Job Title first to suggest domain & market skills.');
      return;
    }
    setDialogError(null);
    setSuggestingSkills(true);
    try {
      const res = await suggestSkills({
        title: titleVal,
        department: form.department || '',
        experience: form.experience_level || 'Mid-level'
      });
      if (res.skills_str) {
        setForm((current) => {
          const next = { ...current, skills: res.skills_str };
          if (autoGenerateDesc && (!current.description || current.description.trim().length === 0)) {
            void generateDescription(next);
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Suggest skills error:", err);
    } finally {
      setSuggestingSkills(false);
    }
  };

  // Handle automatic resume file parsing & form auto-fill
  const handleResumeUploadAndParse = async (file: File | null) => {
    setResumeFile(file);
    setParseSuccessMsg(null);
    setDialogError(null);
    if (!file) return;

    setParsingResume(true);
    try {
      const res = await parseCandidateResume(file);
      if (res.success && res.details) {
        const details = res.details;
        setForm((prev) => ({
          ...prev,
          name: details.name || prev.name || '',
          email: details.email || prev.email || '',
          role: details.role || prev.role || '',
          experience_level: details.experience_level || prev.experience_level || 'Mid-level',
          skills: (details.skills && details.skills.length > 0) ? details.skills.join(', ') : prev.skills || ''
        }));
        setParseSuccessMsg(`✨ AI successfully parsed "${file.name}"! Candidate details have been auto-filled.`);
      }
    } catch (err: any) {
      console.error("Resume auto-parse error:", err);
      setDialogError(err?.response?.data?.detail || "Uploaded resume, but could not automatically extract fields. You can still enter details manually.");
    } finally {
      setParsingResume(false);
    }
  };


  // Assessment Document upload & parsing state
  const [assessmentDocFile, setAssessmentDocFile] = useState<File | null>(null);
  const [parsingAssessmentDoc, setParsingAssessmentDoc] = useState(false);

  const handleUploadAssessmentDoc = async (file: File | null) => {
    if (!file) return;
    setAssessmentDocFile(file);
    setParsingAssessmentDoc(true);
    setDialogError(null);
    try {
      const res = await parseAssessmentDocument(file);
      if (res.success && res.questions && res.questions.length > 0) {
        setReviewTitle(`Custom Assessment (${file.name})`);
        setReviewCandidateName(form.name || 'Candidate');
        setReviewCandidateEmail(form.email || '');
        setReviewQuestions(
          res.questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
            correct: q.correct_answer,
            exp: q.explanation
          }))
        );
        handleCloseDialog();
        setReviewModalOpen(true);
      } else {
        setDialogError("Could not extract multiple-choice questions from the uploaded document.");
      }
    } catch (err: any) {
      console.error("Parse assessment doc error:", err);
      setDialogError(err?.response?.data?.detail || "Failed to parse questions from document. Please ensure PDF/Doc has readable text.");
    } finally {
      setParsingAssessmentDoc(false);
    }
  };

  // Auto AI Assessment for candidate state
  const [autoSendAssessment, setAutoSendAssessment] = useState(false);
  const [candidateAssessmentResult, setCandidateAssessmentResult] = useState<any>(null);
  const [candidateAssessmentOpen, setCandidateAssessmentOpen] = useState(false);

  // Question Review & Approve Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAssessmentId, setReviewAssessmentId] = useState<number | null>(null);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewCandidateName, setReviewCandidateName] = useState('');
  const [reviewCandidateEmail, setReviewCandidateEmail] = useState('');
  const [reviewQuestions, setReviewQuestions] = useState<Array<{ id?: number; prompt: string; options: string[]; correct: string; exp?: string }>>([]);
  const [sendingAssessment, setSendingAssessment] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Schedule Interview for Assessment-Passed Candidate State
  const [scheduleInterviewOpen, setScheduleInterviewOpen] = useState(false);
  const [targetCandidateForInterview, setTargetCandidateForInterview] = useState<{
    id: number;
    name: string;
    email: string;
    role: string;
    score?: number;
    percentage?: number;
  } | null>(null);
  const [interviewForm, setInterviewForm] = useState({
    scheduled_at: '',
    interview_type: 'Video (Google Meet)',
    interviewer_name: 'Hiring Team Lead',
    meeting_link: ''
  });
  const [schedulingInterview, setSchedulingInterview] = useState(false);
  const [interviewSuccessOpen, setInterviewSuccessOpen] = useState(false);
  const [interviewSuccessResult, setInterviewSuccessResult] = useState<{
    candidate_name: string;
    email: string;
    scheduled_at: string;
    meeting_link: string;
    interview_type: string;
  } | null>(null);

  const handleOpenScheduleInterview = (candidate: {
    id: number;
    name: string;
    email: string;
    role: string;
    score?: number;
    percentage?: number;
  }) => {
    setTargetCandidateForInterview(candidate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    const cleanName = (candidate.name || 'Candidate')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '-');
    const instantMeetingRoom = `https://meet.jit.si/Cbtshire-Interview-${cleanName}-${Date.now().toString(36)}`;

    setInterviewForm({
      scheduled_at: localISOTime,
      interview_type: 'Video (1-Click Video Call)',
      interviewer_name: 'Hiring Team Lead',
      meeting_link: instantMeetingRoom
    });
    setScheduleInterviewOpen(true);
  };

  const handleConfirmScheduleInterview = async () => {
    if (!targetCandidateForInterview) return;
    setSchedulingInterview(true);
    try {
      await createInterview({
        candidate_id: targetCandidateForInterview.id,
        candidate_name: targetCandidateForInterview.name,
        candidate_email: targetCandidateForInterview.email,
        interviewer_name: interviewForm.interviewer_name || 'Hiring Team Lead',
        interview_type: interviewForm.interview_type || 'Video',
        scheduled_at: new Date(interviewForm.scheduled_at).toISOString(),
        meeting_link: interviewForm.meeting_link || ''
      });

      setScheduleInterviewOpen(false);
      setInterviewSuccessResult({
        candidate_name: targetCandidateForInterview.name,
        email: targetCandidateForInterview.email,
        scheduled_at: new Date(interviewForm.scheduled_at).toLocaleString(),
        meeting_link: interviewForm.meeting_link,
        interview_type: interviewForm.interview_type
      });
      setInterviewSuccessOpen(true);
      await reload();
      if (kind === 'assessments') {
        void getAssessmentAttempts().then(setAssessmentAttempts).catch(() => undefined);
      }
    } catch (err: any) {
      console.error("Schedule interview error:", err);
      alert(err?.response?.data?.detail || "Failed to schedule interview.");
    } finally {
      setSchedulingInterview(false);
    }
  };

  const handleOpenReviewQuestions = async (assessmentId: number) => {
    setReviewLoading(true);
    setReviewAssessmentId(assessmentId);
    try {
      const data = await getAssessmentQuestions(assessmentId);
      setReviewTitle(data.title);
      setReviewCandidateName(data.candidate_name || 'Candidate');
      setReviewCandidateEmail(data.candidate_email || '');
      setReviewQuestions(
        data.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          options: q.options,
          correct: q.correct_answer,
          exp: q.explanation
        }))
      );
      setReviewModalOpen(true);
    } catch (err) {
      console.error('Fetch questions error:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!reviewAssessmentId) return;
    setSendingAssessment(true);
    try {
      await updateAssessmentQuestions(
        reviewAssessmentId,
        reviewQuestions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correct_answer: q.correct,
          explanation: q.exp || ''
        }))
      );

      const sendRes = await sendAssessmentToCandidate(reviewAssessmentId);
      setReviewModalOpen(false);
      await reload();

      setCandidateAssessmentResult({
        token: sendRes.assessment_link.split('/').pop() || '',
        assessment_link: sendRes.assessment_link,
        email_sent: sendRes.email_sent,
        job_title: reviewTitle,
        ai_analysis: `Assessment approved and dispatched to ${reviewCandidateName} (${reviewCandidateEmail}) with ${reviewQuestions.length} tailored questions.`
      });
      setCandidateAssessmentOpen(true);
    } catch (err: any) {
      console.error('Send assessment error:', err);
      setDialogError('Could not send assessment. Please check SMTP email configuration or try again.');
    } finally {
      setSendingAssessment(false);
    }
  };

  const handleSaveQuestionsDraft = async () => {
    if (!reviewAssessmentId) return;
    setSendingAssessment(true);
    try {
      await updateAssessmentQuestions(
        reviewAssessmentId,
        reviewQuestions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correct_answer: q.correct,
          explanation: q.exp || ''
        }))
      );
      setReviewModalOpen(false);
      await reload();
    } catch (err) {
      console.error('Save questions draft error:', err);
    } finally {
      setSendingAssessment(false);
    }
  };

  // Resend candidate assessment state
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [resendResult, setResendResult] = useState<ResendAssessmentResult | null>(null);
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const formatLink = (link: string) => {
    if (!link) return link;
    try {
      const url = new URL(link);
      return `${window.location.origin}${url.pathname}`;
    } catch {
      return link;
    }
  };

  const handleResendAssessment = async (candidateId: number) => {
    setResendingId(candidateId);
    try {
      const res = await resendAssessmentLink(candidateId);
      setResendResult(res);
      setResendModalOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setResendingId(null);
    }
  };

  // Completed candidate assessment attempts state
  const [assessmentAttempts, setAssessmentAttempts] = useState<CandidateAssessmentAttempt[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

  // Distribution Modal state when publishing a Draft job
  const [targetJob, setTargetJob] = useState<Job | null>(null);
  const [distributionOpen, setDistributionOpen] = useState(false);
  const [linkedinEnabled, setLinkedinEnabled] = useState(true);
  const [naukriEnabled, setNaukriEnabled] = useState(true);
  const [indeedEnabled, setIndeedEnabled] = useState(true);
  const [websiteEnabled, setWebsiteEnabled] = useState(true);
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [distributing, setDistributing] = useState(false);
  const [distributionSuccess, setDistributionSuccess] = useState<string | null>(null);
  const [generatedLinkedInPost, setGeneratedLinkedInPost] = useState<{ post_text: string; targetUrl: string } | null>(null);
  const [copiedLinkedIn, setCopiedLinkedIn] = useState(false);

  useEffect(() => {
    if (kind === 'assessments') {
      void getAssessmentAttempts().then(setAssessmentAttempts).catch(() => undefined);
    }
    if (kind === 'candidates' || kind === 'assessments' || kind === 'offers') {
      void getJobs().then(setAvailableJobs).catch(() => undefined);
    }
  }, [kind, items]);

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  // Handle Edit Job button click
  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setDialogError(null);
    lastGeneratedKeyRef.current = `${(job.title || '').trim()}|${(job.experience_level || '').trim()}|${(Array.isArray(job.skills) ? job.skills.join(', ') : job.skills || '').trim()}|${(job.department || '').trim()}`;
    setForm({
      title: job.title || '',
      department: job.department || '',
      location: job.location || '',
      experience_level: job.experience_level || '',
      skills: Array.isArray(job.skills) ? job.skills.join(', ') : job.skills || '',
      description: job.description || '',
      openings: String(job.openings || 1)
    });
    setOpen(true);
  };

  // Close creation/edit dialog
  const handleCloseDialog = () => {
    setOpen(false);
    setEditingJob(null);
    setForm({});
    setResumeFile(null);
    setParseSuccessMsg(null);
    setParsingResume(false);
    setDialogError(null);
    lastGeneratedKeyRef.current = '';
  };

  // Save or Update Job / Record
  const save = async () => {
    setSaving(true);
    setDialogError(null);
    try {
      if (kind === 'jobs') {
        const titleVal = (form.title ?? '').trim();
        if (!titleVal || titleVal.length < 2) {
          setDialogError('Please provide a job title with at least 2 characters.');
          setSaving(false);
          return;
        }

        const payload = {
          title: titleVal,
          department: form.department ?? '',
          location: form.location ?? '',
          employment_type: 'Full-time',
          experience_level: form.experience_level ?? 'Mid-level',
          skills: (form.skills ?? '').split(',').map((skill) => skill.trim()).filter(Boolean),
          description: form.description ?? '',
          openings: Math.max(1, Number(form.openings ?? 1))
        };

        if (editingJob) {
          await updateJob(editingJob.id, payload);
        } else {
          await createJob(payload);
        }

        handleCloseDialog();
        await reload();
        return;
      }
      if (kind === 'candidates') {
        const res = await createCandidate({
          name: form.name ?? '',
          email: form.email ?? '',
          role: form.role ?? '',
          experience_level: form.experience_level ?? 'Mid-level',
          skills: (form.skills ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          job_id: form.job_id ? Number(form.job_id) : null,
          auto_send_assessment: autoSendAssessment,
          file: resumeFile
        });

        handleCloseDialog();
        await reload();

        if (res.assessment_info) {
          if (autoSendAssessment) {
            setCandidateAssessmentResult(res.assessment_info);
            setCandidateAssessmentOpen(true);
          } else {
            setReviewAssessmentId(res.assessment_info.assessment_id ?? null);
            setReviewTitle(res.assessment_info.job_title || 'Technical Assessment');
            setReviewCandidateName(res.name);
            setReviewCandidateEmail(res.email);
            setReviewQuestions(res.assessment_info.questions || []);
            setReviewModalOpen(true);
          }
        }
        return;
      }
      if (kind === 'assessments') {
        if (form.email || resumeFile) {
          const res = await createAssessmentFromResume({
            candidate_name: form.name || 'Candidate',
            candidate_email: form.email || 'candidate@example.com',
            role: form.role || form.title || '',
            experience_level: form.experience_level || 'Mid-level',
            skills: form.skills || '',
            file: resumeFile
          });

          handleCloseDialog();
          await reload();

          if (res.assessment_info) {
            setReviewAssessmentId(res.assessment_info.assessment_id ?? null);
            setReviewTitle(res.assessment_info.job_title || 'Technical Assessment');
            setReviewCandidateName(form.name || 'Candidate');
            setReviewCandidateEmail(form.email || '');
            setReviewQuestions(res.assessment_info.questions || []);
            setReviewModalOpen(true);
          }
          return;
        } else {
          await createAssessment({
            title: form.title ?? 'Technical Assessment',
            job_id: null,
            question_count: Number(form.question_count ?? 10),
            duration_minutes: Number(form.duration_minutes ?? 30)
          });
        }
      }
      if (kind === 'offers') await createOffer({ candidate_id: Number(form.candidate_id), job_id: null, salary: form.salary ?? '', joining_date: form.joining_date || null });

      handleCloseDialog();
      await reload();
    } catch (err: any) {
      console.error(err);
      setDialogError(err?.response?.data?.detail || err?.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Publish Modal or Unpublish
  const toggleJob = async (job: Job) => {
    if (job.status === 'published') {
      await updateJobStatus(job.id, 'draft');
      await reload();
    } else {
      setTargetJob(job);
      setDistributionSuccess(null);
      setGeneratedLinkedInPost(null);
      setCopiedLinkedIn(false);
      try {
        const u = await getMe();
        if (u?.linkedin_profile_url) {
          setLinkedinProfile(u.linkedin_profile_url);
        }
      } catch {}
      setDistributionOpen(true);
    }
  };

  // Confirm Distribution & Publish to selected platforms
  const handleDistributeJob = async () => {
    if (!targetJob) return;

    // Pre-open tab synchronously on user click to 100% bypass browser popup blockers!
    let newTab: Window | null = null;
    if (linkedinEnabled) {
      try {
        newTab = window.open('about:blank', '_blank');
      } catch {
        newTab = null;
      }
    }

    setDistributing(true);
    setDistributionSuccess(null);
    setGeneratedLinkedInPost(null);
    setCopiedLinkedIn(false);

    try {
      await updateJobStatus(targetJob.id, 'published');

      let successMsg = `Job "${targetJob.title}" status updated to Published! `;
      
      if (linkedinEnabled) {
        const linkedinRes = await generateLinkedInJobPost({
          profile_url: linkedinProfile || undefined,
          job_id: targetJob.id,
          description: targetJob.description || ''
        });
        const targetUrl = linkedinRes.feed_share_url || linkedinRes.share_url;
        setGeneratedLinkedInPost({ post_text: linkedinRes.post_text, targetUrl });

        try {
          await navigator.clipboard.writeText(linkedinRes.post_text);
          setCopiedLinkedIn(true);
        } catch {
          // ignore
        }

        // Direct navigate the pre-opened tab to LinkedIn without any blocking!
        if (newTab && !newTab.closed) {
          newTab.location.href = targetUrl;
        } else {
          try {
            window.open(targetUrl, '_blank');
          } catch {
            // fallback
          }
        }

        successMsg += `LinkedIn post copy generated & opened! `;
      } else if (newTab && !newTab.closed) {
        newTab.close();
      }

      if (naukriEnabled) {
        successMsg += `Naukri e-Apps synced. `;
      }
      if (indeedEnabled) {
        successMsg += `Indeed XML Feed updated. `;
      }
      if (websiteEnabled) {
        successMsg += `Live on Company Careers Website. `;
      }

      setDistributionSuccess(successMsg);
      await reload();
    } catch (err: any) {
      if (newTab && !newTab.closed) newTab.close();
      console.error(err);
      setDistributionSuccess(`Job status updated, but share encountered an issue: ${err?.response?.data?.detail || err?.message}`);
    } finally {
      setDistributing(false);
    }
  };

  const generateDescription = async (overrideForm?: Record<string, string>) => {
    const targetForm = overrideForm || form;
    const titleVal = (targetForm.title || '').trim();
    const skillsVal = (targetForm.skills || '').trim();
    const expVal = (targetForm.experience_level || '').trim();
    const deptVal = (targetForm.department || '').trim();

    if (!titleVal) {
      setDialogError('Please enter a Job Title first to generate a domain-tailored description.');
      return;
    }
    setDialogError(null);
    setAiLoading(true);
    try {
      let activeSkills = skillsVal;
      if (!activeSkills && titleVal.length >= 2) {
        try {
          const suggested = await suggestSkills({ title: titleVal, department: deptVal, experience: expVal });
          if (suggested.skills_str) {
            activeSkills = suggested.skills_str;
            setForm((cur) => ({ ...cur, skills: activeSkills }));
          }
        } catch {
          // ignore
        }
      }

      const result = await generateJobDescription({
        title: titleVal,
        experience: expVal || 'Mid-level',
        skills: activeSkills,
        department: deptVal || ''
      });
      setForm((current) => ({ ...current, description: result.content }));
    } catch (err: any) {
      console.error(err);
      setDialogError('Could not generate description automatically.');
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-generate job description immediately in real-time when Job Title, Experience or Skills change
  useEffect(() => {
    if (kind !== 'jobs' || !open || !autoGenerateDesc || editingJob) return;
    const titleVal = (form.title || '').trim();
    if (titleVal.length < 2) return;

    const currentKey = `${titleVal}|${(form.experience_level || '').trim()}|${(form.skills || '').trim()}|${(form.department || '').trim()}`;
    if (lastGeneratedKeyRef.current === currentKey) return;

    const timer = setTimeout(() => {
      lastGeneratedKeyRef.current = currentKey;
      void generateDescription(form);
    }, 600);

    return () => clearTimeout(timer);
  }, [form.title, form.skills, form.experience_level, form.department, open, kind, autoGenerateDesc, editingJob]);

  return (
    <Stack spacing={3}>
      {kind === 'candidates' && <CandidateProfilePanel />}
      
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
        <Box>
          <Typography variant="h3" sx={{ fontSize: 38 }}>{title}</Typography>
          <Typography color="text.secondary">{subtitle}</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setEditingJob(null); setForm({}); setDialogError(null); setOpen(true); }}>
          {action}
        </Button>
      </Stack>

      {error && <Alert severity="warning">{error}</Alert>}

      {loading ? (
        <Card>
          <CardContent sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h5">No {title.toLowerCase()} yet</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Create your first record to start building the hiring journey.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
                  {kind === 'jobs' && (
                    <Box>
                      <Typography fontWeight={800}>{(item as Job).title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(item as Job).department} · {(item as Job).location}
                      </Typography>
                    </Box>
                  )}
                  {kind === 'candidates' && (
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1.2} flexWrap="wrap">
                        <Typography fontWeight={800} sx={{ fontSize: 16 }}>{(item as Candidate).name}</Typography>
                        {renderPlatformSourceBadge((item as Candidate).source)}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                        {(item as Candidate).role} · {(item as Candidate).email}
                      </Typography>
                      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" sx={{ mt: 0.8, gap: 0.5 }}>
                        {(item as Candidate).experience_level && (
                          <Chip label={(item as Candidate).experience_level} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#f0fdf4', borderColor: '#86efac', color: '#166534' }} />
                        )}
                        {(item as Candidate).match_score > 0 && (
                          <Chip label={`${(item as Candidate).match_score}% ATS Match`} size="small" sx={{ fontWeight: 800, fontSize: 11, bgcolor: '#e0f2fe', color: '#0369a1' }} />
                        )}
                        {(item as Candidate).skills?.slice(0, 3).map((sk) => (
                          <Chip key={sk} label={sk} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {kind === 'assessments' && (
                    <Box>
                      <Typography fontWeight={800}>{(item as Assessment).title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(item as Assessment).question_count} questions · {(item as Assessment).duration_minutes} minutes
                      </Typography>
                    </Box>
                  )}
                  {kind === 'offers' && (
                    <Box>
                      <Typography fontWeight={800}>{(item as Offer).candidate_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{(item as Offer).salary}</Typography>
                    </Box>
                  )}

                  <Stack direction="row" alignItems="center" gap={1}>
                    <Chip
                      label={'status' in item ? item.status : 'Ready'}
                      size="small"
                      color={'status' in item && item.status === 'published' ? 'success' : 'default'}
                    />
                    {kind === 'jobs' && (
                      <>
                        <Button
                          size="small"
                          variant={(item as Job).status === 'draft' ? 'contained' : 'outlined'}
                          color={(item as Job).status === 'draft' ? 'primary' : 'inherit'}
                          startIcon={<PublicRoundedIcon />}
                          onClick={() => void toggleJob(item as Job)}
                        >
                          {(item as Job).status === 'published' ? 'Unpublish' : 'Publish & Post'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditRoundedIcon />}
                          onClick={() => handleEditJob(item as Job)}
                        >
                          Edit
                        </Button>
                        <Button size="small" color="error" onClick={() => void deleteJob((item as Job).id).then(() => reload())}>
                          <DeleteOutlineRoundedIcon />
                        </Button>
                      </>
                    )}
                    {kind === 'candidates' && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<EventRoundedIcon />}
                          onClick={() =>
                            handleOpenScheduleInterview({
                              id: (item as Candidate).id,
                              name: (item as Candidate).name,
                              email: (item as Candidate).email,
                              role: (item as Candidate).role || 'Candidate'
                            })
                          }
                          sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                        >
                          📅 Schedule Interview
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={resendingId === (item as Candidate).id ? <CircularProgress size={14} color="inherit" /> : <SendRoundedIcon />}
                          onClick={() => void handleResendAssessment((item as Candidate).id)}
                          disabled={resendingId === (item as Candidate).id}
                          sx={{ fontWeight: 700, borderRadius: 2 }}
                        >
                          {resendingId === (item as Candidate).id ? 'Resending...' : 'Resend Link'}
                        </Button>
                      </Stack>
                    )}
                    {kind === 'assessments' && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={reviewLoading && reviewAssessmentId === (item as Assessment).id ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeRoundedIcon />}
                          onClick={() => void handleOpenReviewQuestions((item as Assessment).id)}
                          sx={{ fontWeight: 700, borderRadius: 2 }}
                        >
                          Review / Edit Questions
                        </Button>
                        {(item as Assessment).status === 'draft' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<SendRoundedIcon />}
                            onClick={async () => {
                              try {
                                const sendRes = await sendAssessmentToCandidate((item as Assessment).id);
                                await reload();
                                setCandidateAssessmentResult({
                                  token: sendRes.assessment_link.split('/').pop() || '',
                                  assessment_link: sendRes.assessment_link,
                                  email_sent: sendRes.email_sent,
                                  job_title: (item as Assessment).title,
                                  ai_analysis: sendRes.message
                                });
                                setCandidateAssessmentOpen(true);
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
                          >
                            Send Link
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 📊 Completed Candidate Assessment Attempts & Scores Section */}
      {kind === 'assessments' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#0f4c5c' }}>
            📊 Completed Candidate Assessment Submissions & Scores
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            Live test scores, completion status, and evaluation for candidate technical assessments.
          </Typography>

          {assessmentAttempts.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3 }}>
              <Typography color="text.secondary" fontWeight={600}>
                No candidate assessment submissions recorded yet.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {assessmentAttempts.map((attempt) => (
                <Card key={attempt.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight={800} sx={{ fontSize: 16 }}>
                            {attempt.candidate_name}
                          </Typography>
                          <Chip
                            label={attempt.passed ? 'Passed 🎉' : 'Needs Review'}
                            color={attempt.passed ? 'success' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Role: {attempt.role} • Email: {attempt.candidate_email}
                        </Typography>
                        <Typography variant="caption" color="primary" fontWeight={700} sx={{ mt: 0.5, display: 'block' }}>
                          Assessment: {attempt.assessment_title}
                        </Typography>
                      </Box>

                      <Stack direction="row" alignItems="center" spacing={2.5}>
                        <Box textAlign={{ xs: 'left', sm: 'right' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                            TEST SCORE
                          </Typography>
                          <Typography variant="h5" fontWeight={900} color={attempt.passed ? '#087f8c' : '#e11d48'}>
                            {attempt.percentage}% ({attempt.score} Correct)
                          </Typography>
                        </Box>

                        <Button
                          variant={attempt.passed ? 'contained' : 'outlined'}
                          color={attempt.passed ? 'success' : 'primary'}
                          startIcon={<EventRoundedIcon />}
                          onClick={() =>
                            handleOpenScheduleInterview({
                              id: attempt.candidate_id,
                              name: attempt.candidate_name,
                              email: attempt.candidate_email,
                              role: attempt.role,
                              score: attempt.score,
                              percentage: attempt.percentage
                            })
                          }
                          sx={{
                            fontWeight: 800,
                            borderRadius: 2,
                            px: 2.2,
                            py: 1,
                            ...(attempt.passed
                              ? { bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }
                              : {})
                          }}
                        >
                          📅 Schedule Interview
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* 1. Job / Candidate / Record Creation & Edit Dialog */}
      <Dialog open={open} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingJob ? 'Edit Job' : action}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}

            {kind === 'jobs' && (
              <>
                <TextField label="Job title" required value={form.title ?? ''} onChange={set('title')} placeholder="e.g. Senior Flutter Developer or MRO Engineer Aviation" />
                <TextField label="Department" value={form.department ?? ''} onChange={set('department')} placeholder="e.g. Aerospace / Mobile Engineering / Operations" />
                <TextField label="Location" value={form.location ?? ''} onChange={set('location')} placeholder="e.g. Chennai, India (Hybrid)" />
                <TextField label="Experience level" value={form.experience_level ?? ''} onChange={set('experience_level')} placeholder="e.g. 3-5 years" />
                <Box>
                  <TextField fullWidth label="Skills, comma separated" value={form.skills ?? ''} onChange={set('skills')} placeholder="e.g. Aircraft Maintenance, FAA / EASA Regulations, Avionics" />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Enter specific domain skills or let AI suggest top market skills.
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={suggestingSkills ? <CircularProgress size={13} color="inherit" /> : <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
                      onClick={() => void handleSuggestSkills()}
                      disabled={suggestingSkills}
                      sx={{ fontWeight: 800, color: '#087f8c', textTransform: 'none', py: 0.2, fontSize: '0.78rem' }}
                    >
                      {suggestingSkills ? 'Deducing Market Skills...' : '⚡ AI Suggest Market Skills'}
                    </Button>
                  </Stack>
                </Box>

                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdfa', borderColor: '#99f6e4', borderRadius: 2 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoAwesomeRoundedIcon sx={{ color: '#087f8c' }} />
                        <Typography variant="subtitle2" fontWeight={800} color="#087f8c">
                          AI Job Description Generator
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={autoGenerateDesc}
                            onChange={(e) => setAutoGenerateDesc(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={<Typography variant="caption" fontWeight={600}>Auto-fill</Typography>}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Automatically generates a structured job description based on your entered <b>Job Title</b>, <b>Experience Level</b>, and <b>Skills</b>.
                    </Typography>

                    <Button
                      variant="contained"
                      size="small"
                      startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
                      onClick={() => void generateDescription()}
                      disabled={aiLoading}
                      sx={{ bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
                    >
                      {aiLoading ? 'Generating Description...' : '⚡ Generate / Refresh Description'}
                    </Button>
                  </Stack>
                </Paper>

                <TextField 
                  label="Job Description" 
                  multiline 
                  minRows={6} 
                  value={form.description ?? ''} 
                  onChange={set('description')} 
                  placeholder="Job description will automatically generate here based on title, experience, and skills..." 
                />
                <TextField label="Openings" type="number" value={form.openings ?? 1} onChange={set('openings')} />
              </>
            )}
            {kind === 'candidates' && (
              <>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderColor: '#cbd5e1', borderRadius: 2 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoAwesomeRoundedIcon sx={{ color: '#087f8c' }} />
                      <Typography variant="subtitle2" fontWeight={800} color="#087f8c">
                        AI Resume Auto-Fill
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Upload a resume (PDF/DOC) to automatically extract Full Name, Email, Role, Experience, and Skills using AI!
                    </Typography>

                    <Button
                      component="label"
                      variant="contained"
                      startIcon={parsingResume ? <CircularProgress size={18} color="inherit" /> : <CloudUploadRoundedIcon />}
                      disabled={parsingResume}
                      sx={{ py: 1.2, borderRadius: 2, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
                    >
                      {parsingResume
                        ? 'Parsing Resume with AI...'
                        : resumeFile
                        ? `Resume Attached: ${resumeFile.name}`
                        : '⚡ Upload Resume for AI Auto-Fill (PDF/DOC)'}
                      <input
                        hidden
                        type="file"
                        accept="application/pdf,.doc,.docx,.txt"
                        onChange={(e) => void handleResumeUploadAndParse(e.target.files?.[0] ?? null)}
                      />
                    </Button>
                  </Stack>
                </Paper>

                {parseSuccessMsg && <Alert severity="success">{parseSuccessMsg}</Alert>}

                <TextField label="Full name" required value={form.name ?? ''} onChange={set('name')} placeholder="e.g. Rahul Sharma" />
                <TextField label="Email" required type="email" value={form.email ?? ''} onChange={set('email')} placeholder="e.g. rahul@example.com" />
                <TextField
                  select
                  label="Target Job Post"
                  value={form.job_id ?? ''}
                  onChange={set('job_id')}
                  helperText="Select the job opening (AI customizes questions strictly to this job post & seniority)"
                >
                  <MenuItem value="">-- Auto-detect from Applied Role / Recent Job --</MenuItem>
                  {availableJobs.map((j) => (
                    <MenuItem key={j.id} value={String(j.id)}>
                      {j.title} ({j.experience_level}) {j.department ? `· ${j.department}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField label="Applied role" value={form.role ?? ''} onChange={set('role')} placeholder="e.g. Senior Frontend Developer" />
                <TextField
                  select
                  label="Experience level"
                  value={form.experience_level ?? 'Mid-level'}
                  onChange={set('experience_level')}
                >
                  {['Junior', 'Mid-level', 'Senior', 'Lead'].map((lvl) => (
                    <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
                  ))}
                </TextField>
                <Box>
                  <TextField fullWidth label="Skills (comma separated)" value={form.skills ?? ''} onChange={set('skills')} placeholder="e.g. Aircraft Maintenance, Avionics or React, Python" />
                  <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 0.5 }}>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={suggestingSkills ? <CircularProgress size={13} color="inherit" /> : <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />}
                      onClick={() => void handleSuggestSkills()}
                      disabled={suggestingSkills}
                      sx={{ fontWeight: 800, color: '#087f8c', textTransform: 'none', py: 0.2, fontSize: '0.78rem' }}
                    >
                      {suggestingSkills ? 'Deducing Market Skills...' : '⚡ AI Auto-Suggest Role Skills'}
                    </Button>
                  </Stack>
                </Box>

                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdfa', borderColor: '#99f6e4', borderRadius: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoSendAssessment}
                        onChange={(e) => setAutoSendAssessment(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          🤖 Auto-Analyze Resume, Experience & Send AI Assessment
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Compares candidate experience & skills with job requirements, computes ATS match score, and generates tailored AI technical questions.
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </>
            )}
            {kind === 'assessments' && (
              <>
                {/* 1. Upload Custom Assessment Question Paper PDF / DOC */}
                <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#f0fdfa', borderColor: '#087f8c', borderRadius: 2.5 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <DescriptionRoundedIcon sx={{ color: '#087f8c' }} />
                      <Typography variant="subtitle1" fontWeight={800} color="#0f4c5c">
                        📄 1. Upload Assessment Question Paper (PDF / Word)
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Upload your company's existing assessment document or test paper. AI will automatically extract all questions, multiple-choice options, and answers for review!
                    </Typography>

                    <Button
                      component="label"
                      variant="contained"
                      startIcon={parsingAssessmentDoc ? <CircularProgress size={18} color="inherit" /> : <CloudUploadRoundedIcon />}
                      disabled={parsingAssessmentDoc}
                      sx={{ py: 1.4, borderRadius: 2, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' }, fontWeight: 800 }}
                    >
                      {parsingAssessmentDoc
                        ? 'Extracting Questions with AI...'
                        : assessmentDocFile
                        ? `Question Paper: ${assessmentDocFile.name}`
                        : '📄 Upload Question Paper (PDF / DOC / TXT)'}
                      <input
                        hidden
                        type="file"
                        accept="application/pdf,.doc,.docx,.txt"
                        onChange={(e) => void handleUploadAssessmentDoc(e.target.files?.[0] ?? null)}
                      />
                    </Button>
                  </Stack>
                </Paper>

                <Divider sx={{ my: 1.5 }}>OR GENERATE DYNAMICALLY VIA RESUME</Divider>

                {/* 2. Generate via Candidate Resume & Role */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, borderColor: '#cbd5e1' }}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" fontWeight={800} color="#334155">
                      ⚡ 2. Generate AI Questions from Candidate Resume
                    </Typography>

                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={parsingResume ? <CircularProgress size={18} color="inherit" /> : <CloudUploadRoundedIcon />}
                      disabled={parsingResume}
                      sx={{ py: 1.2, borderRadius: 2, fontWeight: 700 }}
                    >
                      {parsingResume
                        ? 'Parsing Resume...'
                        : resumeFile
                        ? `Resume Attached: ${resumeFile.name}`
                        : 'Upload Candidate Resume (PDF/DOC)'}
                      <input
                        hidden
                        type="file"
                        accept="application/pdf,.doc,.docx,.txt"
                        onChange={(e) => void handleResumeUploadAndParse(e.target.files?.[0] ?? null)}
                      />
                    </Button>

                    {parseSuccessMsg && <Alert severity="success">{parseSuccessMsg}</Alert>}

                    <TextField label="Candidate name" value={form.name ?? ''} onChange={set('name')} placeholder="e.g. Maya Lin" />
                    <TextField label="Candidate email" type="email" value={form.email ?? ''} onChange={set('email')} placeholder="e.g. maya@example.com" />
                    <TextField label="Target role" value={form.role ?? ''} onChange={set('role')} placeholder="e.g. Senior Aviation MRO Engineer" />
                    <TextField
                      select
                      label="Target experience level"
                      value={form.experience_level ?? 'Mid-level'}
                      onChange={set('experience_level')}
                    >
                      {['Junior', 'Mid-level', 'Senior', 'Lead'].map((lvl) => (
                        <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
                      ))}
                    </TextField>
                    <TextField label="Skills" value={form.skills ?? ''} onChange={set('skills')} placeholder="e.g. Avionics, Airframe Inspection, FAA Part 145" />
                  </Stack>
                </Paper>

                <Divider sx={{ my: 1.5 }}>OR MANUAL STANDARD ASSESSMENT</Divider>

                {/* 3. Quick Standard Assessment */}
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                  3. Quick Standard Assessment
                </Typography>
                <TextField label="Assessment title" value={form.title ?? ''} onChange={set('title')} placeholder="e.g. Technical Screening" />
                <TextField label="Question count" type="number" value={form.question_count ?? 10} onChange={set('question_count')} />
                <TextField label="Duration in minutes" type="number" value={form.duration_minutes ?? 30} onChange={set('duration_minutes')} />
              </>
            )}
            {kind === 'offers' && (
              <>
                <TextField label="Candidate ID" required type="number" onChange={set('candidate_id')} />
                <TextField label="Salary" required onChange={set('salary')} />
                <TextField label="Joining date" type="date" InputLabelProps={{ shrink: true }} onChange={set('joining_date')} />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving...' : editingJob ? 'Update Job' : kind === 'jobs' ? 'Save as Draft' : 'Save & Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2. Candidate AI Assessment Sent Confirmation Popup */}
      <Dialog open={candidateAssessmentOpen} onClose={() => setCandidateAssessmentOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, color: '#087f8c' }}>
          🎉 Candidate Added & AI Assessment Sent!
        </DialogTitle>
        <DialogContent>
          {candidateAssessmentResult && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="success">
                <b>AI Assessment Invitation Sent!</b> An automated assessment invitation was dispatched to candidate's email for role <b>{candidateAssessmentResult.job_title}</b>.
              </Alert>

              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  AI Job Description & Experience Analysis:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: '#334155' }}>
                  {candidateAssessmentResult.ai_analysis}
                </Typography>
              </Paper>

              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Generated Assessment Invitation Link:
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={formatLink(candidateAssessmentResult.assessment_link)}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(formatLink(candidateAssessmentResult.assessment_link))}>
                      <ContentCopyRoundedIcon fontSize="small" />
                    </IconButton>
                  )
                }}
              />

              <Button
                variant="contained"
                fullWidth
                startIcon={<PublicRoundedIcon />}
                onClick={() => window.open(formatLink(candidateAssessmentResult.assessment_link), '_blank')}
                sx={{ bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
              >
                Open Candidate Assessment Link
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCandidateAssessmentOpen(false)}>Done / Close</Button>
        </DialogActions>
      </Dialog>

      {/* 3. Multi-Platform Auto-Post Distribution Modal */}
      <Dialog open={distributionOpen} onClose={() => setDistributionOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800, color: '#087f8c' }}>
          📢 Publish Job & Choose Distribution Platforms
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {targetJob && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdfa', borderColor: '#99f6e4' }}>
                <Typography variant="subtitle1" fontWeight={800} color="#0f4c5c">
                  {targetJob.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {targetJob.department || 'Engineering'} • {targetJob.location || 'Remote'}
                </Typography>
              </Paper>
            )}

            <Typography variant="subtitle2" fontWeight={700}>
              Select platforms where you want to post this job:
            </Typography>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                {/* Company Careers Website Toggle */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <LanguageRoundedIcon sx={{ color: '#087f8c', fontSize: 28 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Company Careers Website</Typography>
                      <Typography variant="caption" color="text.secondary">List live on company site & direct apply widget</Typography>
                    </Box>
                  </Stack>
                  <Switch checked={websiteEnabled} onChange={(e) => setWebsiteEnabled(e.target.checked)} color="primary" />
                </Stack>

                <Divider />

                {/* LinkedIn Toggle */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <LinkedInIcon sx={{ color: '#0a66c2', fontSize: 30 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>LinkedIn Profile & Feed</Typography>
                      <Typography variant="caption" color="text.secondary">Auto-copies post text & opens share window</Typography>
                    </Box>
                  </Stack>
                  <Switch checked={linkedinEnabled} onChange={(e) => setLinkedinEnabled(e.target.checked)} color="primary" />
                </Stack>

                {linkedinEnabled && (
                  <TextField
                    size="small"
                    fullWidth
                    label="Target LinkedIn Profile URL"
                    value={linkedinProfile}
                    onChange={(e) => setLinkedinProfile(e.target.value)}
                    sx={{ ml: 4, width: 'calc(100% - 32px)' }}
                  />
                )}

                <Divider />

                {/* Naukri Toggle */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <WorkOutlineRoundedIcon sx={{ color: '#4a00e0', fontSize: 28 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Naukri e-Apps Integration</Typography>
                      <Typography variant="caption" color="text.secondary">Sync with Naukri e-Apps webhook parser</Typography>
                    </Box>
                  </Stack>
                  <Switch checked={naukriEnabled} onChange={(e) => setNaukriEnabled(e.target.checked)} color="primary" />
                </Stack>

                <Divider />

                {/* Indeed Toggle */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <WorkOutlineRoundedIcon sx={{ color: '#2557a7', fontSize: 28 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Indeed Apply Syndication</Typography>
                      <Typography variant="caption" color="text.secondary">XML job feed & applicant webhook sync</Typography>
                    </Box>
                  </Stack>
                  <Switch checked={indeedEnabled} onChange={(e) => setIndeedEnabled(e.target.checked)} color="primary" />
                </Stack>
              </Stack>
            </Paper>

            {distributionSuccess && (
              <Stack spacing={2}>
                <Alert severity="success" sx={{ fontSize: 13, fontWeight: 600 }}>
                  {distributionSuccess}
                </Alert>

                {generatedLinkedInPost && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      borderColor: '#0a66c2',
                      borderWidth: 2
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LinkedInIcon sx={{ color: '#0a66c2', fontSize: 28 }} />
                          <Typography variant="subtitle2" fontWeight={800} color="#0a66c2">
                            LinkedIn Post Ready
                          </Typography>
                        </Stack>
                        <Chip
                          label={copiedLinkedIn ? "Copied to Clipboard!" : "Ready to Share"}
                          color={copiedLinkedIn ? "success" : "primary"}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>

                      {/* Prominent Action Buttons */}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<LaunchRoundedIcon />}
                          onClick={() => window.open(generatedLinkedInPost.targetUrl, '_blank')}
                          sx={{
                            bgcolor: '#0a66c2',
                            color: '#fff',
                            fontWeight: 700,
                            py: 1.2,
                            '&:hover': { bgcolor: '#004182' }
                          }}
                        >
                          Open LinkedIn Post Box
                        </Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<ContentCopyRoundedIcon />}
                          onClick={async () => {
                            await navigator.clipboard.writeText(generatedLinkedInPost.post_text);
                            setCopiedLinkedIn(true);
                            setTimeout(() => setCopiedLinkedIn(false), 3000);
                          }}
                          sx={{ fontWeight: 700, py: 1.2 }}
                        >
                          {copiedLinkedIn ? 'Copied!' : 'Copy Post Content'}
                        </Button>
                      </Stack>

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        💡 Click <b>"Open LinkedIn Post Box"</b> above, then press <b>Ctrl + V (Paste)</b> inside LinkedIn to share this position with your followers!
                      </Typography>

                      {/* Post Text Preview with Description */}
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          bgcolor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          maxHeight: 180,
                          overflowY: 'auto',
                          fontFamily: 'monospace',
                          fontSize: 12,
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5,
                          color: '#334155'
                        }}
                      >
                        {generatedLinkedInPost.post_text}
                      </Box>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDistributionOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={handleDistributeJob}
            disabled={distributing}
            startIcon={distributing ? <CircularProgress size={18} color="inherit" /> : <PublicRoundedIcon />}
            sx={{ bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
          >
            {distributing ? 'Publishing...' : 'Publish & Post to Selected Platforms'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 4. Candidate Assessment Link Resend Modal */}
      <Dialog open={resendModalOpen} onClose={() => setResendModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>📧 Candidate Assessment Link Resent</DialogTitle>
        <DialogContent>
          {resendResult && (
            <Stack spacing= {2} sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 700 }}>
                {resendResult.message}
              </Alert>

              <Typography variant="body2" color="text.secondary">
                Assessment link has been dispatched to <b>{resendResult.email}</b>. You can also copy and share the link directly with the candidate:
              </Typography>

              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 700, color: '#0f4c5c' }}>
                  {formatLink(resendResult.assessment_link)}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<ContentCopyRoundedIcon />}
                  onClick={() => {
                    void navigator.clipboard.writeText(formatLink(resendResult.assessment_link));
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  sx={{ flexShrink: 0, fontWeight: 700, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
                >
                  {copiedLink ? 'Copied! ✅' : 'Copy Link'}
                </Button>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResendModalOpen(false)} variant="contained" sx={{ fontWeight: 800 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* 5. 📝 Assessment Question Review & Approval Modal */}
      <Dialog
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight={900} color="#0f4c5c">
                📝 Review AI-Generated Assessment Questions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                Review and approve the tailored technical screening questions before sending the link to the candidate.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                component="label"
                size="small"
                variant="outlined"
                startIcon={parsingAssessmentDoc ? <CircularProgress size={14} color="inherit" /> : <CloudUploadRoundedIcon fontSize="small" />}
                disabled={parsingAssessmentDoc}
                sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'none', borderColor: '#087f8c', color: '#087f8c' }}
              >
                {parsingAssessmentDoc ? 'Extracting...' : '📄 Upload Assessment PDF/Doc'}
                <input
                  hidden
                  type="file"
                  accept="application/pdf,.doc,.docx,.txt"
                  onChange={(e) => void handleUploadAssessmentDoc(e.target.files?.[0] ?? null)}
                />
              </Button>
              <Chip
                label={`${reviewQuestions.length} Questions`}
                color="primary"
                sx={{ fontWeight: 800 }}
              />
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
          {reviewCandidateName && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: '#ffffff', borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    TARGET CANDIDATE & ROLE
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {reviewCandidateName} {reviewCandidateEmail ? `(${reviewCandidateEmail})` : ''}
                  </Typography>
                </Box>
                <Chip
                  label={reviewTitle || 'Technical Screening'}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700, color: '#087f8c', borderColor: '#99f6e4' }}
                />
              </Stack>
            </Paper>
          )}

          <Stack spacing={3}>
            {reviewQuestions.map((q, qIdx) => (
              <Card key={qIdx} sx={{ borderRadius: 3, border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Chip label={`Question ${qIdx + 1}`} color="primary" size="small" sx={{ fontWeight: 800 }} />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          const updated = reviewQuestions.filter((_, idx) => idx !== qIdx);
                          setReviewQuestions(updated);
                        }}
                        title="Delete Question"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label={`Question ${qIdx + 1} Prompt`}
                      value={q.prompt}
                      onChange={(e) => {
                        const updated = [...reviewQuestions];
                        updated[qIdx] = { ...updated[qIdx], prompt: e.target.value };
                        setReviewQuestions(updated);
                      }}
                      sx={{ bgcolor: '#ffffff' }}
                    />

                    <Box sx={{ pl: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800} display="block" sx={{ mb: 1 }}>
                        ANSWER OPTIONS (Click Radio Button to Mark Correct Answer):
                      </Typography>
                      <Stack spacing={1.2}>
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = opt.trim().toLowerCase() === q.correct.trim().toLowerCase();
                          return (
                            <Stack key={optIdx} direction="row" spacing={1} alignItems="center">
                              <Radio
                                checked={isCorrect}
                                onChange={() => {
                                  const updated = [...reviewQuestions];
                                  updated[qIdx] = { ...updated[qIdx], correct: opt };
                                  setReviewQuestions(updated);
                                }}
                                color="success"
                                title="Mark as correct answer"
                              />
                              <TextField
                                fullWidth
                                size="small"
                                label={`Option ${String.fromCharCode(65 + optIdx)}`}
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...reviewQuestions];
                                  const newOpts = [...updated[qIdx].options];
                                  const wasCorrect = newOpts[optIdx] === updated[qIdx].correct;
                                  newOpts[optIdx] = e.target.value;
                                  updated[qIdx] = {
                                    ...updated[qIdx],
                                    options: newOpts,
                                    correct: wasCorrect ? e.target.value : updated[qIdx].correct
                                  };
                                  setReviewQuestions(updated);
                                }}
                                sx={{
                                  bgcolor: isCorrect ? '#f0fdf4' : '#ffffff',
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: isCorrect ? '#22c55e' : undefined
                                  }
                                }}
                              />
                              {isCorrect && (
                                <Chip label="Correct ✓" size="small" color="success" sx={{ height: 26, fontWeight: 800, fontSize: 11, flexShrink: 0 }} />
                              )}
                            </Stack>
                          );
                        })}
                      </Stack>
                    </Box>

                    <TextField
                      fullWidth
                      size="small"
                      label="💡 Technical Explanation / Rationale"
                      value={q.exp || ''}
                      onChange={(e) => {
                        const updated = [...reviewQuestions];
                        updated[qIdx] = { ...updated[qIdx], exp: e.target.value };
                        setReviewQuestions(updated);
                      }}
                      sx={{ bgcolor: '#ffffff' }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setReviewQuestions([
                  ...reviewQuestions,
                  {
                    prompt: 'New Technical Question',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correct: 'Option A',
                    exp: 'Explanation for correct answer.'
                  }
                ]);
              }}
              sx={{ borderStyle: 'dashed', py: 1.5, fontWeight: 800, borderRadius: 2, borderColor: '#087f8c', color: '#087f8c' }}
            >
              ➕ Add Another Custom Question
            </Button>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#ffffff', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => void handleSaveQuestionsDraft()}
            disabled={sendingAssessment}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            💾 Save as Draft (Don't Send Yet)
          </Button>
          <Button
            variant="contained"
            startIcon={sendingAssessment ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
            onClick={() => void handleApproveAndSend()}
            disabled={sendingAssessment || reviewQuestions.length === 0}
            sx={{ py: 1.2, px: 3, fontWeight: 800, borderRadius: 2, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
          >
            {sendingAssessment ? 'Sending Assessment Link...' : '🚀 Approve & Send Assessment Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 6. 📅 Schedule Interview Dialog */}
      <Dialog
        open={scheduleInterviewOpen}
        onClose={() => setScheduleInterviewOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            <EventRoundedIcon sx={{ color: '#059669', fontSize: 28 }} />
            <Box>
              <Typography variant="h5" fontWeight={900} color="#0f4c5c">
                📅 Schedule Candidate Interview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Invite candidate to an interactive technical or hiring interview.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
          {targetCandidateForInterview && (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              {/* Candidate Info Card */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2.5, borderColor: '#cbd5e1' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      CANDIDATE DETAILS
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                      {targetCandidateForInterview.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {targetCandidateForInterview.email} • {targetCandidateForInterview.role}
                    </Typography>
                  </Box>
                  {targetCandidateForInterview.percentage !== undefined && (
                    <Chip
                      label={`Passed ${targetCandidateForInterview.percentage}% ✓`}
                      color="success"
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                </Stack>
              </Paper>

              <TextField
                fullWidth
                label="Interview Date & Time"
                type="datetime-local"
                value={interviewForm.scheduled_at}
                onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ bgcolor: '#ffffff' }}
              />

              <TextField
                select
                fullWidth
                label="Interview Format / Round"
                value={interviewForm.interview_type}
                onChange={(e) => setInterviewForm({ ...interviewForm, interview_type: e.target.value })}
                sx={{ bgcolor: '#ffffff' }}
              >
                {['Video (Google Meet)', 'Video (Zoom)', 'Video (MS Teams)', 'Technical Coding Round', 'Technical System Design', 'HR & Culture Fit', 'In-Person Onsite'].map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Interviewer Name / Panel"
                value={interviewForm.interviewer_name}
                onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_name: e.target.value })}
                placeholder="e.g. Lead Technical Architect"
                sx={{ bgcolor: '#ffffff' }}
              />

              <Box>
                <TextField
                  fullWidth
                  label="Meeting / Video Conference Link"
                  value={interviewForm.meeting_link}
                  onChange={(e) => setInterviewForm({ ...interviewForm, meeting_link: e.target.value })}
                  placeholder="e.g. https://meet.jit.si/Cbtshire-Interview-... or your Google Meet link"
                  sx={{ bgcolor: '#ffffff' }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const cleanName = (targetCandidateForInterview?.name || 'Candidate')
                        .trim()
                        .replace(/[^a-zA-Z0-9]/g, '-');
                      setInterviewForm({
                        ...interviewForm,
                        meeting_link: `https://meet.jit.si/Cbtshire-Interview-${cleanName}-${Date.now().toString(36)}`
                      });
                    }}
                    sx={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: 1.5, textTransform: 'none' }}
                  >
                    ⚡ Reset to Instant Live Video Room
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={() => window.open('https://meet.google.com/new', '_blank')}
                    sx={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: 1.5, textTransform: 'none' }}
                  >
                    ➕ Start Real Google Meet Room
                  </Button>
                </Stack>
              </Box>

              <Alert severity="info" sx={{ borderRadius: 2 }}>
                An official interview invitation email with the meeting link, date, and time will be automatically dispatched to <b>{targetCandidateForInterview.email}</b> upon confirmation.
              </Alert>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#ffffff', gap: 1 }}>
          <Button onClick={() => setScheduleInterviewOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={schedulingInterview ? <CircularProgress size={18} color="inherit" /> : <EventRoundedIcon />}
            onClick={() => void handleConfirmScheduleInterview()}
            disabled={schedulingInterview || !interviewForm.scheduled_at}
            sx={{ py: 1.2, px: 3, fontWeight: 800, borderRadius: 2, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            {schedulingInterview ? 'Scheduling & Emailing...' : '🚀 Confirm & Send Interview Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 7. 🎉 Interview Scheduled Confirmation Modal */}
      <Dialog
        open={interviewSuccessOpen}
        onClose={() => setInterviewSuccessOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', bgcolor: '#ecfdf5', color: '#059669', mb: 1 }}>
            <EventRoundedIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h5" fontWeight={900} color="#0f4c5c">
            🎉 Interview Successfully Scheduled!
          </Typography>
        </DialogTitle>
        <DialogContent>
          {interviewSuccessResult && (
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 700 }}>
                Interview invite email successfully sent to {interviewSuccessResult.email}!
              </Alert>

              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5 }}>
                <Stack spacing={1.2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>CANDIDATE</Typography>
                    <Typography variant="subtitle2" fontWeight={800}>{interviewSuccessResult.candidate_name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>SCHEDULED TIME</Typography>
                    <Typography variant="subtitle2" fontWeight={800}>{interviewSuccessResult.scheduled_at}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>FORMAT</Typography>
                    <Typography variant="subtitle2" fontWeight={800}>{interviewSuccessResult.interview_type}</Typography>
                  </Box>
                  {interviewSuccessResult.meeting_link && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>MEETING LINK</Typography>
                      <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#087f8c', fontWeight: 700, wordBreak: 'break-all' }}>
                          {interviewSuccessResult.meeting_link}
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<ContentCopyRoundedIcon />}
                          onClick={() => {
                            void navigator.clipboard.writeText(interviewSuccessResult.meeting_link);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 3000);
                          }}
                          sx={{ flexShrink: 0, fontWeight: 700, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
                        >
                          {copiedLink ? 'Copied!' : 'Copy'}
                        </Button>
                      </Paper>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setInterviewSuccessOpen(false)} fullWidth variant="contained" sx={{ py: 1.2, fontWeight: 800, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
