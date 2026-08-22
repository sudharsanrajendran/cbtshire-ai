import React, { useState } from 'react';
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
  IconButton,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import type { Candidate } from '../types';
import { resendAssessmentLink } from '../services/candidateService';

interface CandidateReviewModalProps {
  open: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onScheduleInterview?: (candidate: Candidate) => void;
  onAssessmentSent?: () => void;
}

export function CandidateReviewModal({
  open,
  onClose,
  candidate,
  onScheduleInterview,
  onAssessmentSent
}: CandidateReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'document' | 'ai_insights' | 'raw_text'>('document');
  const [sendingAssessment, setSendingAssessment] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  if (!candidate) return null;

  const matchScore = candidate.match_score || 75;
  const isShortlisted = matchScore >= 70;
  const resumeFilename = candidate.resume_info?.filename || `${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`;
  const resumeText = candidate.resume_info?.extracted_text || '';
  const fileUrl = (candidate.resume_info as any)?.file_url || candidate.resume_info?.storage_url || `https://cbtshire-ai.onrender.com/api/public/candidates/${candidate.id}/resume-file`;

  const handleSendAssessment = async () => {
    setSendingAssessment(true);
    setSendSuccessMsg(null);
    try {
      await resendAssessmentLink(candidate.id);
      setSendSuccessMsg(`Assessment invitation email dispatched directly to ${candidate.email}!`);
      if (onAssessmentSent) onAssessmentSent();
    } catch (err: any) {
      console.error(err);
      setSendSuccessMsg('Could not dispatch assessment link.');
    } finally {
      setSendingAssessment(false);
    }
  };

  const handlePrint = () => {
    if (fileUrl) {
      const printWin = window.open(fileUrl, '_blank');
      printWin?.focus();
    } else {
      window.print();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 0.5,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.2} flexWrap="wrap">
              <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a' }}>
                {candidate.name}
              </Typography>
              <Chip
                icon={<AutoAwesomeRoundedIcon sx={{ fontSize: '14px !important', color: isShortlisted ? '#047857 !important' : '#b45309 !important' }} />}
                label={`${matchScore}% ATS Match ${isShortlisted ? '· Shortlisted' : ''}`}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: 11,
                  bgcolor: isShortlisted ? '#ecfdf5' : '#fffbeb',
                  color: isShortlisted ? '#047857' : '#b45309',
                  border: isShortlisted ? '1px solid #6ee7b7' : '1px solid #fde68a'
                }}
              />
              <Chip
                label={candidate.status || 'Screening'}
                size="small"
                color={candidate.status === 'Assessment Sent' ? 'success' : 'primary'}
                sx={{ fontWeight: 800, fontSize: 11 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
              Applied for: <strong style={{ color: '#0284c7' }}>{candidate.role}</strong> · {candidate.email} · Applied on: {new Date(candidate.applied_at || Date.now()).toLocaleDateString()}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ mt: 2, flex: 1, overflowY: 'auto' }}>
        <Stack spacing={2.5}>
          {sendSuccessMsg && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {sendSuccessMsg}
            </Alert>
          )}

          {/* Navigation Tabs & Actions Toolbar */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} flexWrap="wrap">
            <Paper elevation={0} sx={{ p: 0.5, bgcolor: '#f1f5f9', borderRadius: 2, display: 'inline-flex' }}>
              <Button
                size="small"
                variant={activeTab === 'document' ? 'contained' : 'text'}
                color={activeTab === 'document' ? 'primary' : 'inherit'}
                startIcon={<DescriptionRoundedIcon />}
                onClick={() => setActiveTab('document')}
                sx={{ borderRadius: 1.5, fontWeight: 800, px: 2 }}
              >
                📄 Candidate Uploaded Resume (Original PDF)
              </Button>
              <Button
                size="small"
                variant={activeTab === 'ai_insights' ? 'contained' : 'text'}
                color={activeTab === 'ai_insights' ? 'primary' : 'inherit'}
                startIcon={<AutoAwesomeRoundedIcon />}
                onClick={() => setActiveTab('ai_insights')}
                sx={{ borderRadius: 1.5, fontWeight: 700, px: 2 }}
              >
                ✨ AI Screening Analysis
              </Button>
              <Button
                size="small"
                variant={activeTab === 'raw_text' ? 'contained' : 'text'}
                color={activeTab === 'raw_text' ? 'primary' : 'inherit'}
                onClick={() => setActiveTab('raw_text')}
                sx={{ borderRadius: 1.5, fontWeight: 700, px: 1.5 }}
              >
                📝 Text View
              </Button>
            </Paper>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<LaunchRoundedIcon />}
                onClick={() => window.open(fileUrl, '_blank')}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Open Original File
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = fileUrl;
                  a.download = resumeFilename;
                  a.target = '_blank';
                  a.click();
                }}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Download PDF
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PrintRoundedIcon />}
                onClick={handlePrint}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Print
              </Button>
            </Stack>
          </Stack>

          {/* TAB 1: Real Uploaded PDF / Document Viewer */}
          {activeTab === 'document' && (
            <Box>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2, mb: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#334155' }}>
                    📎 File: <strong>{resumeFilename}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Viewing candidate's exact submitted document
                  </Typography>
                </Stack>
              </Paper>

              {/* Embedded Document / PDF Viewer Frame */}
              <Box
                sx={{
                  width: '100%',
                  height: { xs: '500px', md: '650px' },
                  bgcolor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0`}
                  title="Candidate Uploaded Resume"
                  width="100%"
                  height="100%"
                  style={{ border: 'none', display: 'block' }}
                />
              </Box>

              {/* Text fallback below iframe if candidate wants to quick copy */}
              {resumeText && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    QUICK EXTRACTED RESUME TEXT:
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mt: 0.5,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                      maxHeight: 180,
                      overflowY: 'auto',
                      fontSize: 12,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      color: '#475569'
                    }}
                  >
                    {resumeText}
                  </Paper>
                </Box>
              )}
            </Box>
          )}

          {/* TAB 2: AI Insights & Screening Match */}
          {activeTab === 'ai_insights' && (
            <Stack spacing={2}>
              <Card sx={{ bgcolor: isShortlisted ? '#f0fdf4' : '#fffbeb', border: '1px solid', borderColor: isShortlisted ? '#86efac' : '#fde68a' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="overline" sx={{ fontWeight: 800, color: isShortlisted ? '#15803d' : '#b45309' }}>
                    AI ATS SCREENING ANALYSIS
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: isShortlisted ? '#166534' : '#92400e' }}>
                    {matchScore}% Match {isShortlisted ? '· Highly Suitable' : '· Needs Review'}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#334155' }}>
                    Match Evaluation & Screening Insights:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.8, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {candidate.match_explanation || candidate.resume_info?.parsed_summary || 'Resume analyzed and evaluated against job requirements.'}
                  </Typography>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1e293b' }}>
                    Extracted Technical Skills & Seniority:
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1, gap: 0.8 }}>
                    {candidate.experience_level && (
                      <Chip
                        label={`Seniority: ${candidate.experience_level}`}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: '#f0fdf4', color: '#166534', borderColor: '#86efac', border: '1px solid' }}
                      />
                    )}
                    {(candidate.skills || []).map((sk) => (
                      <Chip key={sk} label={sk} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* TAB 3: Raw Text View */}
          {activeTab === 'raw_text' && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1e293b' }}>
                  Extracted Resume Text:
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyRoundedIcon />}
                  onClick={() => {
                    if (resumeText) {
                      void navigator.clipboard.writeText(resumeText);
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 3000);
                    }
                  }}
                  sx={{ fontWeight: 700, fontSize: 11 }}
                >
                  {copiedText ? 'Copied!' : 'Copy Resume Text'}
                </Button>
              </Stack>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2.5,
                  maxHeight: 500,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b'
                }}
              >
                {resumeText || 'No raw extracted text available for this candidate resume.'}
              </Paper>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        {onScheduleInterview && (
          <Button
            variant="contained"
            color="success"
            startIcon={<EventRoundedIcon />}
            onClick={() => {
              onClose();
              onScheduleInterview(candidate);
            }}
            sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            📅 Schedule Interview
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          startIcon={sendingAssessment ? <CircularProgress size={14} color="inherit" /> : <SendRoundedIcon />}
          onClick={handleSendAssessment}
          disabled={sendingAssessment}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {candidate.status === 'Assessment Sent' ? '🔁 Resend Assessment Link' : '✨ Send Assessment Link'}
        </Button>
        <Button onClick={onClose} variant="outlined" sx={{ fontWeight: 700, borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
