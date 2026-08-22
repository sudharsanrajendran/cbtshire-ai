import { useEffect, useState } from 'react';
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
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import VideoCameraFrontRoundedIcon from '@mui/icons-material/VideoCameraFrontRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import GradingRoundedIcon from '@mui/icons-material/GradingRounded';
import type { Candidate, Interview } from '../types';
import { getCandidates } from '../services/candidateService';
import { createInterview, getInterviews, updateInterviewStatus } from '../services/interviewService';
import { getAssessmentAttempts, type CandidateAssessmentAttempt } from '../services/assessmentService';

export function InterviewPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [attempts, setAttempts] = useState<CandidateAssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  // Scheduling Dialog State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    candidate_id: '',
    candidate_name: '',
    candidate_email: '',
    interviewer_name: 'Hiring Team Lead',
    interview_type: 'Video (Google Meet)',
    scheduled_at: '',
    meeting_link: ''
  });

  // Completion & Feedback Dialog State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [targetInterviewForFeedback, setTargetInterviewForFeedback] = useState<Interview | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackDecision, setFeedbackDecision] = useState('Hire / Passed');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [intList, candList, attList] = await Promise.all([
        getInterviews().catch(() => []),
        getCandidates().catch(() => []),
        getAssessmentAttempts().catch(() => [])
      ]);
      setInterviews(intList);
      setCandidates(candList);
      setAttempts(attList);
    } catch (e) {
      console.error('Error loading interview data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  // Filter Categories
  const scheduledInterviews = interviews.filter(
    (i) => !i.status || i.status.toLowerCase() === 'scheduled' || i.status.toLowerCase() === 'pending'
  );
  const completedInterviews = interviews.filter(
    (i) => i.status && (i.status.toLowerCase() === 'completed' || i.status.toLowerCase() === 'finished' || i.status.toLowerCase() === 'interview completed')
  );

  // Candidates who completed assessments or are ready to be scheduled
  const passedCandidatesList = candidates.filter((c) => {
    const hasScheduled = interviews.some((i) => i.candidate_id === c.id && i.status?.toLowerCase() === 'scheduled');
    return !hasScheduled;
  });

  const openScheduleDialogForCandidate = (cand?: Candidate | null, attempt?: CandidateAssessmentAttempt | null) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    const cleanCandName = (cand?.name || attempt?.candidate_name || 'Candidate')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '-');
    const instantMeetingRoom = `https://meet.jit.si/Cbtshire-Interview-${cleanCandName}-${Date.now().toString(36)}`;

    if (cand) {
      setSelectedCandidate(cand);
      setForm({
        candidate_id: String(cand.id),
        candidate_name: cand.name,
        candidate_email: cand.email,
        interviewer_name: 'Hiring Team Lead',
        interview_type: 'Video (1-Click Video Call)',
        scheduled_at: localISOTime,
        meeting_link: instantMeetingRoom
      });
    } else if (attempt) {
      setSelectedCandidate({
        id: attempt.candidate_id,
        name: attempt.candidate_name,
        email: attempt.candidate_email,
        role: attempt.role,
        status: 'Shortlisted',
        skills: [],
        match_score: 95,
        applied_at: new Date().toISOString()
      });
      setForm({
        candidate_id: String(attempt.candidate_id),
        candidate_name: attempt.candidate_name,
        candidate_email: attempt.candidate_email,
        interviewer_name: 'Hiring Team Lead',
        interview_type: 'Video (1-Click Video Call)',
        scheduled_at: localISOTime,
        meeting_link: instantMeetingRoom
      });
    } else {
      setSelectedCandidate(null);
      setForm({
        candidate_id: '',
        candidate_name: '',
        candidate_email: '',
        interviewer_name: 'Hiring Team Lead',
        interview_type: 'Video (1-Click Video Call)',
        scheduled_at: localISOTime,
        meeting_link: instantMeetingRoom
      });
    }
    setScheduleModalOpen(true);
  };

  const handleSaveInterview = async () => {
    setScheduling(true);
    try {
      await createInterview({
        candidate_id: form.candidate_id ? Number(form.candidate_id) : undefined,
        candidate_name: form.candidate_name || selectedCandidate?.name || 'Candidate',
        candidate_email: form.candidate_email || selectedCandidate?.email || '',
        interviewer_name: form.interviewer_name || 'Hiring Team Lead',
        interview_type: form.interview_type || 'Video',
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        meeting_link: form.meeting_link || ''
      });

      setScheduleModalOpen(false);
      await loadAll();
      setTabIndex(0); // Switch to Scheduled tab
    } catch (err: any) {
      console.error('Failed to schedule interview:', err);
      alert(err?.response?.data?.detail || 'Failed to schedule interview.');
    } finally {
      setScheduling(false);
    }
  };

  const handleOpenFeedback = (interview: Interview) => {
    setTargetInterviewForFeedback(interview);
    setFeedbackNotes('');
    setFeedbackDecision('Hire / Passed');
    setFeedbackModalOpen(true);
  };

  const handleSaveFeedback = async () => {
    if (!targetInterviewForFeedback) return;
    setSavingFeedback(true);
    try {
      await updateInterviewStatus(targetInterviewForFeedback.id, 'Completed');
      setFeedbackModalOpen(false);
      await loadAll();
      setTabIndex(2); // Switch to Finished tab
    } catch (e) {
      console.error('Save feedback error:', e);
    } finally {
      setSavingFeedback(false);
    }
  };

  const copyMeetLink = (text: string, id: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <Stack spacing={3}>
      {/* Header Banner */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
        <Box>
          <Typography variant="h3" sx={{ fontSize: 34, fontWeight: 900, color: '#0f4c5c' }}>
            Interviews & Video Meet Hub
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Manage upcoming scheduled video meetings, schedule passed candidates, and record evaluation feedback.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddRoundedIcon />}
          onClick={() => openScheduleDialogForCandidate(null)}
          sx={{ py: 1.2, px: 3, fontWeight: 800, borderRadius: 2.5, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
        >
          ➕ Schedule Interview
        </Button>
      </Stack>

      {/* 3 Categories / Tabs Navigation */}
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 0.5, bgcolor: '#ffffff' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { py: 1.8, fontWeight: 800, fontSize: '0.95rem' }
          }}
        >
          <Tab
            icon={<AccessTimeRoundedIcon />}
            iconPosition="start"
            label={`1. Scheduled Interviews (${scheduledInterviews.length})`}
          />
          <Tab
            icon={<HowToRegRoundedIcon />}
            iconPosition="start"
            label={`2. Ready to Schedule (${passedCandidatesList.length})`}
          />
          <Tab
            icon={<CheckCircleRoundedIcon />}
            iconPosition="start"
            label={`3. Finished / Completed (${completedInterviews.length})`}
          />
        </Tabs>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: 🕒 SCHEDULED INTERVIEWS (READY TO JOIN)                           */}
      {/* ========================================================================= */}
      {!loading && tabIndex === 0 && (
        <Stack spacing={2}>
          {scheduledInterviews.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 1 }} />
              <Typography variant="h6" fontWeight={800} color="#334155">
                No upcoming scheduled interviews right now
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, mb: 2 }}>
                Schedule an interview from the "Ready to Schedule" tab or click the button below.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={() => setTabIndex(1)}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                View Candidates Ready to Schedule
              </Button>
            </Paper>
          ) : (
            scheduledInterviews.map((item) => {
              const formattedDate = new Date(item.scheduled_at).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });

              return (
                <Card
                  key={item.id}
                  sx={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 3.5,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2.5}>
                      {/* Top Row: Candidate details & Status */}
                      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1.5}>
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Typography variant="h6" fontWeight={900} color="#1e293b">
                              {item.candidate_name}
                            </Typography>
                            <Chip
                              label={item.interview_type || 'Video Interview'}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1' }}
                            />
                            <Chip
                              label="🟢 Upcoming / Live"
                              size="small"
                              color="success"
                              sx={{ fontWeight: 800 }}
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Role: <b>{item.candidate_role || 'Candidate'}</b> • Email: <b>{item.candidate_email || 'Candidate Email'}</b> • Interviewer: <b>{item.interviewer_name}</b>
                          </Typography>
                        </Box>

                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f0fdfa', borderColor: '#99f6e4', borderRadius: 2, textAlign: { xs: 'left', md: 'right' } }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={800} display="block">
                            📅 SCHEDULED DATE & TIME
                          </Typography>
                          <Typography variant="subtitle2" fontWeight={900} color="#0f766e">
                            {formattedDate}
                          </Typography>
                        </Paper>
                      </Stack>

                      <Divider />

                      {/* Middle Row: 🎥 JOIN MEETING NOW & Copy Link Banner */}
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: '#f8fafc',
                          borderColor: '#cbd5e1',
                          borderRadius: 2.5,
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { sm: 'center' },
                          justifyContent: 'space-between',
                          gap: 2
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                          <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: '#e0f2fe', color: '#0284c7' }}>
                            <VideoCameraFrontRoundedIcon sx={{ fontSize: 28 }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={800} display="block">
                              MEETING LINK / VIDEO ROOM
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                color: '#087f8c',
                                fontWeight: 800,
                                wordBreak: 'break-all'
                              }}
                            >
                              {item.meeting_link || 'https://meet.google.com/hiring-room'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Action Buttons: 🎥 JOIN MEETING NOW & COPY */}
                        <Stack direction="row" spacing={1.2} sx={{ flexShrink: 0 }}>
                          {item.meeting_link && (
                            <Button
                              variant="contained"
                              size="medium"
                              startIcon={<OpenInNewRoundedIcon />}
                              onClick={() => window.open(item.meeting_link, '_blank')}
                              sx={{
                                fontWeight: 900,
                                px: 2.5,
                                py: 1,
                                borderRadius: 2,
                                bgcolor: '#059669',
                                '&:hover': { bgcolor: '#047857' }
                              }}
                            >
                              🎥 Join Meeting Now
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            size="medium"
                            startIcon={<ContentCopyRoundedIcon />}
                            onClick={() => copyMeetLink(item.meeting_link || '', item.id)}
                            sx={{ fontWeight: 700, borderRadius: 2 }}
                          >
                            {copiedId === item.id ? 'Copied! ✅' : 'Copy Link'}
                          </Button>
                        </Stack>
                      </Paper>

                      {/* Bottom Row: Actions */}
                      <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<GradingRoundedIcon />}
                          onClick={() => handleOpenFeedback(item)}
                          sx={{ fontWeight: 800, borderRadius: 2, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
                        >
                          ✅ Finish & Add Feedback
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 📅 READY TO SCHEDULE (PASSED CANDIDATES)                           */}
      {/* ========================================================================= */}
      {!loading && tabIndex === 1 && (
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: 2.5, fontWeight: 600 }}>
            Candidates listed here have completed their screening or are shortlisted. Click <b>"📅 Schedule Interview"</b> to set a meeting time and dispatch the Google Meet invitation email!
          </Alert>

          {passedCandidatesList.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3 }}>
              <HowToRegRoundedIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 1 }} />
              <Typography variant="h6" fontWeight={800} color="#334155">
                All shortlisted candidates have active scheduled interviews!
              </Typography>
            </Paper>
          ) : (
            passedCandidatesList.map((cand) => {
              // Find matching assessment attempt if any
              const attempt = attempts.find((a) => a.candidate_id === cand.id);

              return (
                <Card
                  key={cand.id}
                  sx={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                            {cand.name}
                          </Typography>
                          {attempt ? (
                            <Chip
                              label={`Assessment: ${attempt.percentage}% Passed 🎉`}
                              color={attempt.passed ? 'success' : 'warning'}
                              size="small"
                              sx={{ fontWeight: 800 }}
                            />
                          ) : (
                            <Chip
                              label={cand.status || 'Shortlisted'}
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 800 }}
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Target Role: <b>{cand.role || 'Candidate'}</b> • Email: <b>{cand.email}</b>
                        </Typography>
                      </Box>

                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<EventRoundedIcon />}
                        onClick={() => openScheduleDialogForCandidate(cand, attempt)}
                        sx={{
                          py: 1,
                          px: 2.5,
                          fontWeight: 800,
                          borderRadius: 2,
                          bgcolor: '#059669',
                          '&:hover': { bgcolor: '#047857' }
                        }}
                      >
                        📅 Schedule Interview
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ✅ FINISHED / COMPLETED INTERVIEWS                                */}
      {/* ========================================================================= */}
      {!loading && tabIndex === 2 && (
        <Stack spacing={2}>
          {completedInterviews.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3 }}>
              <CheckCircleRoundedIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 1 }} />
              <Typography variant="h6" fontWeight={800} color="#334155">
                No finished interviews recorded yet.
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                When an interview concludes, click "Finish & Add Feedback" on any scheduled interview to archive it here.
              </Typography>
            </Paper>
          ) : (
            completedInterviews.map((item) => (
              <Card
                key={item.id}
                sx={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 3,
                  bgcolor: '#f8fafc'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Typography variant="subtitle1" fontWeight={900} color="#1e293b">
                          {item.candidate_name}
                        </Typography>
                        <Chip
                          label="Completed ✓"
                          color="success"
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                        <Chip
                          label={item.interview_type || 'Video'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Role: <b>{item.candidate_role || 'Candidate'}</b> • Interviewer: <b>{item.interviewer_name}</b> • Date: {new Date(item.scheduled_at).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Chip
                      label="Evaluation Recorded"
                      color="primary"
                      sx={{ fontWeight: 800 }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      {/* ========================================================================= */}
      {/* 📅 SCHEDULE INTERVIEW MODAL                                               */}
      {/* ========================================================================= */}
      <Dialog
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
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
                Set meeting schedule and send video conference invitation email to the candidate.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            {/* Candidate Selector / Info */}
            {selectedCandidate ? (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2.5, borderColor: '#cbd5e1' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TARGET CANDIDATE
                </Typography>
                <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                  {selectedCandidate.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCandidate.email} • {selectedCandidate.role}
                </Typography>
              </Paper>
            ) : (
              <TextField
                select
                fullWidth
                label="Select Candidate"
                value={form.candidate_id}
                onChange={(e) => {
                  const candId = e.target.value;
                  const cand = candidates.find((c) => String(c.id) === candId);
                  setForm({
                    ...form,
                    candidate_id: candId,
                    candidate_name: cand?.name || '',
                    candidate_email: cand?.email || ''
                  });
                }}
                sx={{ bgcolor: '#ffffff' }}
              >
                <MenuItem value="">-- Select Candidate --</MenuItem>
                {candidates.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.email}) - {c.role}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              fullWidth
              label="Interview Date & Time"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: '#ffffff' }}
            />

            <TextField
              select
              fullWidth
              label="Interview Format / Round"
              value={form.interview_type}
              onChange={(e) => setForm({ ...form, interview_type: e.target.value })}
              sx={{ bgcolor: '#ffffff' }}
            >
              {['Video (Google Meet)', 'Video (Zoom)', 'Video (MS Teams)', 'Technical Coding Round', 'Technical System Design', 'HR & Culture Fit', 'In-Person Onsite'].map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Interviewer Name / Panel"
              value={form.interviewer_name}
              onChange={(e) => setForm({ ...form, interviewer_name: e.target.value })}
              placeholder="e.g. Lead Technical Architect"
              sx={{ bgcolor: '#ffffff' }}
            />

            <Box>
              <TextField
                fullWidth
                label="Meeting / Video Conference Link"
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                placeholder="e.g. https://meet.jit.si/Cbtshire-Interview-... or your Google Meet link"
                sx={{ bgcolor: '#ffffff' }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const cleanName = (form.candidate_name || selectedCandidate?.name || 'Candidate')
                      .trim()
                      .replace(/[^a-zA-Z0-9]/g, '-');
                    setForm({
                      ...form,
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
              An official interview invitation email with the meeting link, date, and time will be automatically dispatched to <b>{form.candidate_email || selectedCandidate?.email || 'the candidate'}</b> upon confirmation.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#ffffff', gap: 1 }}>
          <Button onClick={() => setScheduleModalOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={scheduling ? <CircularProgress size={18} color="inherit" /> : <EventRoundedIcon />}
            onClick={() => void handleSaveInterview()}
            disabled={scheduling || !form.scheduled_at}
            sx={{ py: 1.2, px: 3, fontWeight: 800, borderRadius: 2, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            {scheduling ? 'Scheduling & Emailing...' : '🚀 Confirm & Send Interview Invite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* 📝 FINISH & ADD FEEDBACK MODAL                                            */}
      {/* ========================================================================= */}
      <Dialog
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={900} color="#0f4c5c">
            ✅ Record Interview Evaluation & Feedback
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Candidate: <b>{targetInterviewForFeedback?.candidate_name}</b>
          </Typography>
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <TextField
              select
              fullWidth
              label="Hiring Recommendation / Decision"
              value={feedbackDecision}
              onChange={(e) => setFeedbackDecision(e.target.value)}
              sx={{ bgcolor: '#ffffff' }}
            >
              {['Strong Hire (Exceptional Fit)', 'Hire / Passed', 'Hold / Next Round Needed', 'Reject'].map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Technical & Behavioral Feedback Notes"
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Enter observations on technical proficiency, problem solving, communication, and key strengths..."
              sx={{ bgcolor: '#ffffff' }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#ffffff', gap: 1 }}>
          <Button onClick={() => setFeedbackModalOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveFeedback()}
            disabled={savingFeedback}
            sx={{ py: 1.2, px: 3, fontWeight: 800, borderRadius: 2, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
          >
            {savingFeedback ? 'Saving...' : '💾 Complete & Save Feedback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
