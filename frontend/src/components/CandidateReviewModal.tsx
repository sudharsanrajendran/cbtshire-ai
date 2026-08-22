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
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
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
  const [sendingAssessment, setSendingAssessment] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  if (!candidate) return null;

  const matchScore = candidate.match_score || 75;
  const isShortlisted = matchScore >= 70;
  const resumeFilename = candidate.resume_info?.filename || `${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`;
  const resumeText = candidate.resume_info?.extracted_text || candidate.resume_info?.parsed_summary || candidate.match_explanation || 'No resume content recorded for this candidate.';
  const dataUri = candidate.resume_info?.data_uri || '';
  const fileUrl = candidate.resume_info?.storage_url || (candidate.resume_info as any)?.file_url || dataUri;

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

  const handleDownload = () => {
    if (candidate.resume_info?.file_base64) {
      try {
        const byteCharacters = atob(candidate.resume_info.file_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const mime = candidate.resume_info.content_type || 'application/pdf';
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = resumeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      } catch (e) {
        console.error('Base64 decode failed', e);
      }
    }

    if (candidate.resume_info?.storage_url && candidate.resume_info.storage_url.startsWith('http')) {
      window.open(candidate.resume_info.storage_url, '_blank');
      return;
    }

    // Fallback text download
    const element = document.createElement('a');
    const fileBlob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = resumeFilename.endsWith('.pdf') ? resumeFilename.replace('.pdf', '.txt') : resumeFilename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleOpenInNewTab = () => {
    if (dataUri) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${dataUri}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
      return;
    }
    if (fileUrl) {
      window.open(fileUrl, '_blank');
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
      {/* Modal Header */}
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
              Applied for: <strong style={{ color: '#0284c7' }}>{candidate.role}</strong> · {candidate.email} · {candidate.location || 'India'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">✕</IconButton>
        </Stack>
      </DialogTitle>

      {/* Modal Body */}
      <DialogContent sx={{ mt: 2, flex: 1, overflowY: 'auto' }}>
        <Stack spacing={2.5}>
          {sendSuccessMsg && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {sendSuccessMsg}
            </Alert>
          )}

          {/* Original Resume Document Action Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: 2.5,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { sm: 'center' },
              gap: 1.5
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Candidate's Uploaded Resume Document
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#0f172a', mt: 0.2 }}>
                📎 {resumeFilename}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="contained"
                startIcon={<DownloadRoundedIcon />}
                onClick={handleDownload}
                sx={{ fontWeight: 800, bgcolor: '#0284c7', borderRadius: 2, '&:hover': { bgcolor: '#0369a1' } }}
              >
                Download Original PDF
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<LaunchRoundedIcon />}
                onClick={handleOpenInNewTab}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Open in Full Window
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
          </Paper>

          {/* Real PDF Viewer Frame (if data_uri or file_base64 exists) */}
          {dataUri ? (
            <Box
              sx={{
                width: '100%',
                height: { xs: '550px', md: '720px' },
                bgcolor: '#525659',
                border: '1.5px solid #cbd5e1',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <iframe
                src={`${dataUri}#toolbar=1&navpanes=0`}
                title={resumeFilename}
                width="100%"
                height="100%"
                style={{ border: 'none', display: 'block' }}
              />
            </Box>
          ) : (
            /* Fallback formatted document sheet when PDF stream was not stored */
            <Box>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  bgcolor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 3,
                  maxHeight: '550px',
                  overflowY: 'auto',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
                  fontSize: 13.5,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  color: '#1e293b',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
              >
                {resumeText}
              </Paper>
            </Box>
          )}

          {/* Quick AI Match & Skills Reference */}
          <Card variant="outlined" sx={{ bgcolor: isShortlisted ? '#f0fdf4' : '#fffbeb', borderColor: isShortlisted ? '#86efac' : '#fde68a' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                <Box>
                  <Typography variant="caption" fontWeight={800} sx={{ color: isShortlisted ? '#15803d' : '#b45309', textTransform: 'uppercase' }}>
                    AI Screening Recommendation
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: isShortlisted ? '#166534' : '#92400e' }}>
                    Candidate is <strong>{matchScore}% Suitable</strong> for {candidate.role}.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.8} flexWrap="wrap">
                  {(candidate.skills || []).slice(0, 5).map((s) => (
                    <Chip key={s} label={s} size="small" sx={{ fontWeight: 700, fontSize: 11, bgcolor: '#ffffff', border: '1px solid #cbd5e1' }} />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>

      {/* Footer HR Actions */}
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
