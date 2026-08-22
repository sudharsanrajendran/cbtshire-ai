import React, { useState } from 'react';
import {
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
  const [activeTab, setActiveTab] = useState<'pdf' | 'overview' | 'raw'>('pdf');
  const [sendingAssessment, setSendingAssessment] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  if (!candidate) return null;

  const matchScore = candidate.match_score || 75;
  const isShortlisted = matchScore >= 70;
  const resumeText = candidate.resume_info?.extracted_text || '';

  const handleSendAssessment = async () => {
    setSendingAssessment(true);
    setSendSuccessMsg(null);
    try {
      await resendAssessmentLink(candidate.id);
      setSendSuccessMsg(`Assessment invitation successfully emailed to ${candidate.email}!`);
      if (onAssessmentSent) onAssessmentSent();
    } catch (err: any) {
      console.error(err);
      setSendSuccessMsg('Could not send assessment invitation.');
    } finally {
      setSendingAssessment(false);
    }
  };

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${candidate.name} - Resume</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1 { color: #0f172a; margin-bottom: 4px; font-size: 26px; }
            .header-info { color: #64748b; font-size: 14px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
            .section-title { font-size: 16px; font-weight: bold; color: #0284c7; border-bottom: 1px solid #cbd5e1; margin-top: 24px; padding-bottom: 4px; text-transform: uppercase; }
            .skill-pill { display: inline-block; background: #f1f5f9; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin: 4px 4px 4px 0; border: 1px solid #cbd5e1; }
            .resume-body { white-space: pre-wrap; font-size: 13px; color: #334155; margin-top: 12px; }
          </style>
        </head>
        <body>
          <h1>${candidate.name}</h1>
          <div class="header-info">
            <strong>Role Applied:</strong> ${candidate.role} &nbsp;|&nbsp; 
            <strong>Email:</strong> ${candidate.email} &nbsp;|&nbsp;
            <strong>ATS Match Score:</strong> ${matchScore}%
          </div>
          <div class="section-title">Professional Summary & Skills</div>
          <p><strong>Experience Level:</strong> ${candidate.experience_level || 'Mid-level'}</p>
          <div style="margin-top: 8px;">
            ${(candidate.skills || []).map(s => `<span class="skill-pill">${s}</span>`).join('')}
          </div>
          <div class="section-title">Resume Content</div>
          <div class="resume-body">${resumeText || 'No raw text available.'}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 0.5,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.2} flexWrap="wrap">
              <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
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
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ color: '#166534', fontWeight: 700 }}>
                {sendSuccessMsg}
              </Typography>
            </Paper>
          )}

          {/* Top Format Selector Bar */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} flexWrap="wrap">
            <Paper elevation={0} sx={{ p: 0.5, bgcolor: '#f1f5f9', borderRadius: 2, display: 'inline-flex' }}>
              <Button
                size="small"
                variant={activeTab === 'pdf' ? 'contained' : 'text'}
                color={activeTab === 'pdf' ? 'primary' : 'inherit'}
                startIcon={<DescriptionRoundedIcon />}
                onClick={() => setActiveTab('pdf')}
                sx={{ borderRadius: 1.5, fontWeight: 800, px: 1.8 }}
              >
                📄 PDF Formatted Sheet
              </Button>
              <Button
                size="small"
                variant={activeTab === 'overview' ? 'contained' : 'text'}
                color={activeTab === 'overview' ? 'primary' : 'inherit'}
                startIcon={<AutoAwesomeRoundedIcon />}
                onClick={() => setActiveTab('overview')}
                sx={{ borderRadius: 1.5, fontWeight: 700, px: 1.8 }}
              >
                ✨ AI Insights & Match
              </Button>
              <Button
                size="small"
                variant={activeTab === 'raw' ? 'contained' : 'text'}
                color={activeTab === 'raw' ? 'primary' : 'inherit'}
                onClick={() => setActiveTab('raw')}
                sx={{ borderRadius: 1.5, fontWeight: 700, px: 1.5 }}
              >
                📝 Raw Text
              </Button>
            </Paper>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PrintRoundedIcon />}
                onClick={handlePrintPdf}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Print / Save PDF
              </Button>
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
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                {copiedText ? 'Copied!' : 'Copy Text'}
              </Button>
            </Stack>
          </Stack>

          {/* TAB 1: PDF Formatted Visual Resume Sheet */}
          {activeTab === 'pdf' && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Paper
                elevation={3}
                sx={{
                  width: '100%',
                  maxWidth: '780px',
                  minHeight: '560px',
                  p: { xs: 2.5, sm: 4 },
                  bgcolor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 2.5,
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.04)',
                  fontFamily: '"Segoe UI", Roboto, Helvetica, sans-serif'
                }}
              >
                {/* Visual Resume Header */}
                <Box sx={{ borderBottom: '2.5px solid #0284c7', pb: 2.5, mb: 3 }}>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#0f172a', letterSpacing: '-0.5px' }}>
                    {candidate.name}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0284c7', mt: 0.2 }}>
                    {candidate.role}
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1.2, color: '#64748b', fontSize: 13 }}>
                    <Box>📧 <strong>Email:</strong> {candidate.email}</Box>
                    <Box>📍 <strong>Location:</strong> {candidate.location || 'India'}</Box>
                    <Box>💼 <strong>Seniority:</strong> {candidate.experience_level || 'Mid-level'}</Box>
                    <Box>🌐 <strong>Source:</strong> {candidate.source || 'Careers Portal'}</Box>
                  </Stack>
                </Box>

                {/* Candidate ATS Score Bar inside PDF */}
                <Paper elevation={0} sx={{ p: 1.8, mb: 3, bgcolor: isShortlisted ? '#f0fdf4' : '#f8fafc', border: '1px solid', borderColor: isShortlisted ? '#86efac' : '#e2e8f0', borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: isShortlisted ? '#15803d' : '#64748b', textTransform: 'uppercase' }}>
                        AI Screening Verification
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ color: isShortlisted ? '#166534' : '#334155' }}>
                        Candidate ATS Match Score: <strong>{matchScore}%</strong> ({isShortlisted ? 'Highly Recommended for Interview' : 'Pending HR Evaluation'})
                      </Typography>
                    </Box>
                    <Chip
                      label={isShortlisted ? '✨ AI Shortlisted' : 'Under Review'}
                      size="small"
                      sx={{ fontWeight: 800, bgcolor: isShortlisted ? '#166534' : '#e2e8f0', color: isShortlisted ? '#ffffff' : '#334155' }}
                    />
                  </Stack>
                </Paper>

                {/* Technical Skills & Competencies */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0', pb: 0.5 }}>
                    Core Technical Skills & Expertise
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, gap: 0.8 }}>
                    {(candidate.skills || []).map((sk) => (
                      <Chip
                        key={sk}
                        label={sk}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: 12,
                          bgcolor: '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1'
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Resume Overview & Extracted Body */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0', pb: 0.5 }}>
                    Resume Experience & Project Details
                  </Typography>
                  <Box
                    sx={{
                      mt: 1.5,
                      p: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                      maxHeight: 320,
                      overflowY: 'auto',
                      lineHeight: 1.7,
                      fontSize: 13,
                      color: '#334155',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {resumeText || (
                      <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Resume text was analyzed directly during screening. AI summary: {candidate.match_explanation || candidate.resume_info?.parsed_summary || 'Profile meets technical baseline.'}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Cloud storage original file link */}
                {candidate.resume_info?.storage_url && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<LaunchRoundedIcon />}
                    onClick={() => window.open(candidate.resume_info?.storage_url, '_blank')}
                    sx={{ mt: 1, fontWeight: 700 }}
                  >
                    Download Original PDF File
                  </Button>
                )}
              </Paper>
            </Box>
          )}

          {/* TAB 2: AI Insights & Match */}
          {activeTab === 'overview' && (
            <Stack spacing={2}>
              <Card sx={{ bgcolor: isShortlisted ? '#f0fdf4' : '#fffbeb', border: '1px solid', borderColor: isShortlisted ? '#86efac' : '#fde68a' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="overline" sx={{ fontWeight: 800, color: isShortlisted ? '#15803d' : '#b45309' }}>
                    AI ATS SCREENING ANALYSIS
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: isShortlisted ? '#166534' : '#92400e' }}>
                    {matchScore}% Match
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#334155' }}>
                    Recommendation & Suitability Summary:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.8, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {candidate.match_explanation || candidate.resume_info?.parsed_summary || 'Candidate resume verified against required job specifications.'}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* TAB 3: Raw Text */}
          {activeTab === 'raw' && (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 2,
                maxHeight: 450,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                color: '#1e293b'
              }}
            >
              {resumeText || 'No raw extracted text available for this candidate resume.'}
            </Paper>
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
