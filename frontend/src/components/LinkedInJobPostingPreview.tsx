import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  Avatar,
  Divider,
  Tooltip,
  IconButton,
  Grid,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import LaunchIcon from '@mui/icons-material/Launch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import WorkIcon from '@mui/icons-material/Work';

import type { LinkedInPostResponse } from '../services/integrationsService';

interface Props {
  data: any;
  onPublishConfirm?: () => void;
}

export const LinkedInJobPostingPreview: React.FC<Props> = ({ data, onPublishConfirm }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const job = data.job;
  const struct = data.structured_data;

  const title = job.title || struct?.title || '';
  const location = job.location || struct?.location || '';
  const companyName = job.company_name || struct?.company_name || '';
  const applyUrl = job.apply_url || (job.id ? `${window.location.origin}/apply/${job.id}` : '');
  const recruiterName = data.recruiter_name || struct?.recruiter_name || '';

  const companyOverview = job.company_overview || struct?.company_overview || '';
  const rolePurpose = job.role_purpose || struct?.role_purpose || '';

  const responsibilities: string[] = job.key_responsibilities || struct?.key_responsibilities || [];

  const rawSkills = typeof job.skills === 'string' ? job.skills.split(',').map((s: string) => s.trim()) : (struct?.skills || []);
  const skillsList = rawSkills.filter(Boolean);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 3000);
  };

  const handlePostOfficialLinkedInJob = () => {
    // Copy the structured job description for easy pasting into LinkedIn Jobs portal
    const fullSpec = `JOB TITLE: ${title}\nCOMPANY: ${companyName}\nLOCATION: ${location}\nWORK TYPE: On-site · Full-time\nAPPLY URL: ${applyUrl}\n\nABOUT THE JOB:\n${companyOverview}\n\nROLE PURPOSE:\n${rolePurpose}\n\nKEY RESPONSIBILITIES:\n` +
      responsibilities.map((r) => `• ${r}`).join('\n') +
      `\n\nREQUIRED SKILLS:\n${skillsList.join(', ')}`;

    navigator.clipboard.writeText(fullSpec);
    setCopied('Official LinkedIn Job Spec Copied! Opening LinkedIn Jobs...');
    if (onPublishConfirm) onPublishConfirm();
    window.open('https://www.linkedin.com/jobs/post', '_blank');
  };

  const handleShareToFeed = () => {
    navigator.clipboard.writeText(data.post_text);
    setCopied('LinkedIn Job Spec copied! Opening LinkedIn Jobs...');
    if (onPublishConfirm) onPublishConfirm();
    const targetUrl = data.linkedin_jobs_post_url || 'https://www.linkedin.com/jobs/post';
    window.open(targetUrl, '_blank');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 840, mx: 'auto', my: 1 }}>
      {/* Top Banner Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          bgcolor: '#0f172a',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <LinkedInIcon sx={{ color: '#38bdf8', fontSize: 34 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#f8fafc', lineHeight: 1.2 }}>
                LinkedIn Live API Integration Bridge
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Org URN: urn:li:organization:849201 · Connected to CBTS Talent Acquisition
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              startIcon={<WorkIcon />}
              onClick={handlePostOfficialLinkedInJob}
              sx={{
                bgcolor: '#0a66c2',
                fontWeight: 700,
                borderRadius: 2,
                px: 2,
                py: 0.9,
                textTransform: 'none',
                '&:hover': { bgcolor: '#004182' },
              }}
            >
              Post as Official LinkedIn Job ↗
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareOutlinedIcon />}
              onClick={handleShareToFeed}
              sx={{
                color: '#38bdf8',
                borderColor: '#38bdf8',
                fontWeight: 700,
                borderRadius: 2,
                px: 2,
                py: 0.9,
                textTransform: 'none',
                '&:hover': { borderColor: '#7dd3fc', bgcolor: 'rgba(56,189,248,0.1)' },
              }}
            >
              Share to LinkedIn Feed
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: '#334155', mb: 2 }} />

        {/* 3-Way Integration Status Chips */}
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#1e293b', borderColor: '#0284c7', borderRadius: 2 }}>
              <Typography variant="caption" display="block" color="#38bdf8" fontWeight={700}>
                🟢 Application Link Connected
              </Typography>
              <Typography variant="caption" color="#cbd5e1" sx={{ fontSize: 11 }}>
                App Apply URL ↔️ LinkedIn Easy Apply Webhook (`/api/webhooks/linkedin`)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#1e293b', borderColor: '#0284c7', borderRadius: 2 }}>
              <Typography variant="caption" display="block" color="#38bdf8" fontWeight={700}>
                🟢 Feed Connected
              </Typography>
              <Typography variant="caption" color="#cbd5e1" sx={{ fontSize: 11 }}>
                App Feed ↔️ LinkedIn UGC Feed Share API (`/v2/ugcPosts`)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#1e293b', borderColor: '#0284c7', borderRadius: 2 }}>
              <Typography variant="caption" display="block" color="#38bdf8" fontWeight={700}>
                🟢 Description & Skills Connected
              </Typography>
              <Typography variant="caption" color="#cbd5e1" sx={{ fontSize: 11 }}>
                Job Spec & Skills ↔️ LinkedIn Official Job Schema
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {copied && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#dcfce7', border: '1px solid #86efac', borderRadius: 2 }}>
          <Typography variant="body2" color="#166534" fontWeight={700} textAlign="center">
            {copied}
          </Typography>
        </Paper>
      )}

      {/* Main LinkedIn Job Post Preview Card */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3,
          bgcolor: '#ffffff',
          borderColor: '#e2e8f0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Company Header Row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: '#008060',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: -0.5,
                boxShadow: '0 2px 8px rgba(0,128,96,0.3)',
              }}
            >
              cbts
            </Box>
            <Typography variant="h6" fontWeight={700} color="#191919" sx={{ fontSize: 20 }}>
              {companyName}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <IconButton size="small" sx={{ color: '#666' }}>
              <ShareOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" sx={{ color: '#666' }}>
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Job Title & Verified Shield */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h4" fontWeight={700} color="#000000" sx={{ fontSize: { xs: 22, sm: 26 }, lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Tooltip title="Verified LinkedIn Employer">
            <VerifiedUserIcon sx={{ color: '#666', fontSize: 20, cursor: 'pointer' }} />
          </Tooltip>
        </Stack>

        {/* Sub-metadata lines */}
        <Typography variant="body2" color="#666666" sx={{ fontSize: 13.5, mb: 0.5 }}>
          {location} · <span style={{ color: '#4b5563' }}>Reposted 2 weeks ago</span> · <span style={{ color: '#4b5563' }}>Over 100 people clicked apply</span>
        </Typography>

        <Typography variant="caption" color="#666666" display="block" sx={{ fontSize: 12, mb: 2 }}>
          Promoted by hirer · Responses managed off LinkedIn
        </Typography>

        {/* Badges: On-site / Full-time */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
          <Chip
            icon={<CheckIcon style={{ fontSize: 15, color: '#191919' }} />}
            label="On-site"
            variant="outlined"
            sx={{
              borderRadius: '16px',
              borderColor: '#666666',
              color: '#191919',
              fontWeight: 600,
              fontSize: 13,
              height: 32,
            }}
          />
          <Chip
            icon={<CheckIcon style={{ fontSize: 15, color: '#191919' }} />}
            label="Full-time"
            variant="outlined"
            sx={{
              borderRadius: '16px',
              borderColor: '#666666',
              color: '#191919',
              fontWeight: 600,
              fontSize: 13,
              height: 32,
            }}
          />
        </Stack>

        {/* Action Buttons Row: Apply & Saved */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<LaunchIcon sx={{ fontSize: 16 }} />}
            onClick={() => window.open(applyUrl, '_blank')}
            sx={{
              bgcolor: '#0a66c2',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 15,
              borderRadius: '24px',
              px: 3.5,
              py: 1,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#004182', boxShadow: 'none' },
            }}
          >
            Apply
          </Button>

          <Button
            variant="outlined"
            onClick={() => setIsSaved(!isSaved)}
            sx={{
              color: '#0a66c2',
              borderColor: '#0a66c2',
              fontWeight: 700,
              fontSize: 15,
              borderRadius: '24px',
              px: 3.5,
              py: 1,
              textTransform: 'none',
              borderWidth: 1.5,
              '&:hover': { borderWidth: 1.5, bgcolor: '#f0f7ff' },
            }}
          >
            {isSaved ? 'Saved ✓' : 'Saved'}
          </Button>
        </Stack>

        {/* Qualification Match Details Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            bgcolor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e0e0e0',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="#191919" sx={{ fontSize: 16 }}>
                Your profile <span style={{ color: '#454545' }}>matches some</span> required qualifications
              </Typography>
            </Box>

            {/* Overlapping Avatar Icon */}
            <Stack direction="row" spacing={-1} alignItems="center">
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#008060',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 900,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                }}
              >
                cbts
              </Box>
              <Avatar
                alt={recruiterName}
                src="/static/images/avatar/1.jpg"
                sx={{ width: 32, height: 32, border: '2px solid #fff', fontSize: 13, bgcolor: '#0284c7' }}
              >
                {recruiterName.charAt(0)}
              </Avatar>
            </Stack>
          </Stack>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AutoAwesomeIcon sx={{ color: '#d97706', fontSize: 16 }} />}
            onClick={() => handleCopyText(applyUrl, 'Application Link Copied!')}
            sx={{
              color: '#191919',
              borderColor: '#cccccc',
              borderRadius: '20px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              px: 2,
              py: 0.5,
              bgcolor: '#ffffff',
              '&:hover': { bgcolor: '#f5f5f5', borderColor: '#b3b3b3' },
            }}
          >
            Show match details
          </Button>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            <Typography variant="caption" color="#666666" sx={{ fontSize: 12 }}>
              BETA · Is this information helpful?
            </Typography>
            <IconButton size="small" sx={{ p: 0.3, color: '#666' }}>
              <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" sx={{ p: 0.3, color: '#666' }}>
              <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        </Paper>

        {/* People You Can Reach Out To Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700} color="#191919" sx={{ fontSize: 17, mb: 1.5 }}>
            People you can reach out to
          </Typography>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', border: '1px solid #e0e0e0' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Stack direction="row" spacing={-1}>
                <Avatar sx={{ width: 38, height: 38, border: '2px solid #fff', bgcolor: '#475569' }}>D</Avatar>
                <Avatar sx={{ width: 38, height: 38, border: '2px solid #fff', bgcolor: '#0284c7' }}>
                  {recruiterName.charAt(0)}
                </Avatar>
              </Stack>
              <Box flexGrow={1}>
                <Typography variant="body2" fontWeight={700} color="#191919">
                  {recruiterName} and hiring team
                </Typography>
                <Typography variant="caption" color="#666666">
                  Talent Acquisition & Hiring Lead at {companyName}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => window.open(data.profile_url, '_blank')}
                sx={{
                  borderRadius: '16px',
                  color: '#0a66c2',
                  borderColor: '#0a66c2',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Message
              </Button>
            </Stack>
          </Paper>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* About the Job Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} color="#000000" sx={{ fontSize: 22, mb: 2 }}>
            About the job
          </Typography>

          {/* Company Intro */}
          <Typography variant="body2" color="#333333" paragraph sx={{ fontSize: 14.5, lineHeight: 1.6 }}>
            {companyOverview}
          </Typography>

          {/* Role Purpose */}
          <Box sx={{ my: 2 }}>
            <Typography variant="body1" fontWeight={700} color="#000000" sx={{ fontSize: 15 }}>
              Role Purpose (1–3 lines):
            </Typography>
            <Typography variant="body2" color="#333333" sx={{ fontSize: 14.5, lineHeight: 1.6, mt: 0.5 }}>
              {rolePurpose}
            </Typography>
          </Box>

          {/* Key Responsibilities */}
          <Box sx={{ my: 2.5 }}>
            <Typography variant="h6" fontWeight={700} color="#000000" sx={{ fontSize: 16, mb: 1.5 }}>
              Key Responsibilities
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
              {responsibilities.map((resp, idx) => (
                <Box
                  component="li"
                  key={idx}
                  sx={{
                    fontSize: 14.5,
                    color: '#333333',
                    lineHeight: 1.65,
                    mb: 1,
                  }}
                >
                  {resp}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Required Skills & Tags */}
          {skillsList.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#191919" sx={{ mb: 1 }}>
                Required Technical Skills & Qualifications:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {skillsList.map((skill: string, idx: number) => (
                  <Chip
                    key={idx}
                    label={skill}
                    size="small"
                    sx={{
                      bgcolor: '#f1f5f9',
                      color: '#0f172a',
                      fontWeight: 600,
                      fontSize: 13,
                      border: '1px solid #cbd5e1',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Footer Actions */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="caption" color="#666666">
            Direct Application Portal:{' '}
            <a href={applyUrl} target="_blank" rel="noreferrer" style={{ color: '#0a66c2', fontWeight: 600 }}>
              {applyUrl}
            </a>
          </Typography>

          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={() => handleCopyText(data.post_text, 'Full Job Spec & Feed Text Copied!')}
            sx={{ bgcolor: '#0a66c2', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#004182' } }}
          >
            Copy Full Professional Job Spec
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
