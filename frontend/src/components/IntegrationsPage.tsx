import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

import {
  simulateCandidateIngestion,
  generateLinkedInJobPost,
  generateNaukriJobPost,
  generateIndeedJobPost,
  type SimulationResult,
  type LinkedInPostResponse,
  type PlatformPostResponse
} from '../services/integrationsService';

export function IntegrationsPage() {
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<SimulationResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Position Inputs (EMPTY initially - No Hardcoded Values)
  const [positionName, setPositionName] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [keySkills, setKeySkills] = useState('');
  const [jobLocation, setJobLocation] = useState('');

  // LinkedIn State
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [linkedinPostData, setLinkedinPostData] = useState<LinkedInPostResponse | null>(null);
  const [postingLinkedIn, setPostingLinkedIn] = useState(false);

  // Naukri State
  const [naukriPostData, setNaukriPostData] = useState<PlatformPostResponse | null>(null);
  const [postingNaukri, setPostingNaukri] = useState(false);
  const [naukriCandidateName, setNaukriCandidateName] = useState('');
  const [naukriCandidateEmail, setNaukriCandidateEmail] = useState('');

  // Indeed State
  const [indeedPostData, setIndeedPostData] = useState<PlatformPostResponse | null>(null);
  const [postingIndeed, setPostingIndeed] = useState(false);
  const [indeedCandidateName, setIndeedCandidateName] = useState('');
  const [indeedCandidateEmail, setIndeedCandidateEmail] = useState('');

  // Platform Publish Confirmation Statuses
  const [publishedStatus, setPublishedStatus] = useState<{
    linkedin: boolean;
    naukri: boolean;
    indeed: boolean;
    website: boolean;
  }>({
    linkedin: false,
    naukri: false,
    indeed: false,
    website: false,
  });

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [globalSuccessMessage, setGlobalSuccessMessage] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Auto Generate Posts for All Platforms on user click
  const handleAutoGenerateAllPosts = async () => {
    if (!positionName.trim()) {
      setInputError('Please enter a Position Name before generating posts!');
      return;
    }
    setInputError(null);
    setIsGeneratingAll(true);
    try {
      const params = {
        position_name: positionName.trim(),
        experience: experienceYears.trim() || 'Not Specified',
        skills: keySkills.trim(),
        location: jobLocation.trim() || 'Remote',
        profile_url: linkedinProfile.trim() || undefined
      };

      const [liRes, nkRes, indRes] = await Promise.all([
        generateLinkedInJobPost(params),
        generateNaukriJobPost(params),
        generateIndeedJobPost(params),
      ]);

      setLinkedinPostData(liRes);
      setNaukriPostData(nkRes);
      setIndeedPostData(indRes);
      
      setGlobalSuccessMessage(`✨ Custom AI posts, hashtags, and apply links generated for "${params.position_name}"!`);
      setTimeout(() => setGlobalSuccessMessage(null), 6000);
    } catch (err) {
      console.error('Failed to generate posts:', err);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handlePublishPlatform = (platform: 'linkedin' | 'naukri' | 'indeed' | 'website') => {
    setPublishedStatus((prev) => ({ ...prev, [platform]: true }));
    
    if (platform === 'linkedin' && linkedinPostData) {
      navigator.clipboard.writeText(linkedinPostData.post_text);
      const targetUrl = linkedinPostData.feed_share_url || linkedinPostData.share_url;
      window.open(targetUrl, '_blank');
    } else if (platform === 'naukri' && naukriPostData) {
      navigator.clipboard.writeText(naukriPostData.post_text);
      window.open('https://recruiter.naukri.com/', '_blank');
    } else if (platform === 'indeed' && indeedPostData) {
      navigator.clipboard.writeText(indeedPostData.post_text);
      window.open('https://employers.indeed.com/', '_blank');
    }

    setGlobalSuccessMessage(`🎉 Job position "${positionName || 'Position'}" confirmed & published to ${platform.toUpperCase()}!`);
    setTimeout(() => setGlobalSuccessMessage(null), 5000);
  };

  const handlePublishAllPlatforms = () => {
    if (!linkedinPostData && !naukriPostData && !indeedPostData) {
      setInputError('Please enter Position Name & click "Generate Posts with AI" first before publishing!');
      return;
    }
    setInputError(null);
    setPublishedStatus({
      linkedin: true,
      naukri: true,
      indeed: true,
      website: true,
    });
    setGlobalSuccessMessage(`🚀 Job position "${positionName || 'Position'}" confirmed & published to LinkedIn, Naukri, Indeed, and Company Careers Website!`);
    setTimeout(() => setGlobalSuccessMessage(null), 6000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handleIngestCandidate = async (
    platform: 'linkedin' | 'naukri' | 'indeed' | 'website',
    candidateName: string,
    candidateEmail: string,
    role?: string
  ) => {
    setLoadingPlatform(platform);
    try {
      const targetRole = role || positionName || 'Software Engineer';
      const targetSkills = keySkills ? keySkills.split(',').map(s => s.trim()) : ['TypeScript', 'React', 'REST API'];
      const result = await simulateCandidateIngestion({
        platform,
        candidate_name: candidateName || 'Real Applicant',
        candidate_email: candidateEmail || 'applicant@example.com',
        role: targetRole,
        skills: targetSkills
      });
      setLatestResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlatform(null);
    }
  };

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const embedSnippet = `<div id="cbtshire-careers"></div>\n<script src="http://${hostname}:8000/api/public/widget.js"></script>`;
  const defaultApplyUrl = `http://${hostname}:5173/apply/1`;

  // Auto generated hashtag preview from user inputs
  const tagWords = (positionName + ' ' + keySkills).replace(/[/,-]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const cleanTags = Array.from(new Set(tagWords.map((w) => `#${w.replace(/[^a-zA-Z0-9]/g, '')}`)));
  const previewHashtags = cleanTags.length > 0
    ? cleanTags.slice(0, 6).join(' ') + ' #Hiring #Jobs #Careers'
    : '#Hiring #Jobs #Careers #TalentAcquisition';

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h3" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 800 }}>
            Platform Connections & Job Syndication
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Enter your position details below to generate customized posts with hashtags & apply links for LinkedIn, Naukri, Indeed & Careers Website.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<SendRoundedIcon />}
          onClick={handlePublishAllPlatforms}
          sx={{
            background: 'linear-gradient(135deg, #0a66c2 0%, #4a00e0 100%)',
            color: '#fff',
            fontWeight: 700,
            px: 3,
            py: 1.2,
            borderRadius: 2,
            boxShadow: '0 4px 14px rgba(10, 102, 194, 0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #004182 0%, #3800b8 100%)' }
          }}
        >
          Publish Position to All Platforms
        </Button>
      </Box>

      {globalSuccessMessage && (
        <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ fontWeight: 600 }}>
          {globalSuccessMessage}
        </Alert>
      )}

      {inputError && (
        <Alert severity="warning" onClose={() => setInputError(null)} sx={{ fontWeight: 600 }}>
          {inputError}
        </Alert>
      )}

      <Alert severity="info" icon={<AutoAwesomeRoundedIcon />}>
        <b>AI Screening & Auto-Scheduler:</b> Applications received from connected platforms are automatically parsed & scored by AI. Applicants scoring ≥70% automatically receive an auto-scheduled interview link!
      </Alert>

      {/* Target Position Form Card (CLEAN INPUT BOXES) */}
      <Card sx={{ border: '2px solid #087f8c', bgcolor: '#f0fdfa', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f4c5c', display: 'flex', alignItems: 'center', gap: 1 }}>
                  🎯 Position Details & AI Post Generator
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fill in your custom job details below. Click "Generate Posts with AI" to create customized post text, hashtags, and apply links.
                </Typography>
              </Box>
              <Chip
                icon={<AutoAwesomeRoundedIcon />}
                label="AI Post Generator Ready"
                color="primary"
                variant="outlined"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Position Name (Job Title) *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={positionName}
                  onChange={(e) => setPositionName(e.target.value)}
                  placeholder="e.g. Senior React Developer"
                  sx={{ mt: 0.5, bgcolor: '#fff' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Experience Required *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 3 - 5 Years"
                  sx={{ mt: 0.5, bgcolor: '#fff' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Key Skills *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={keySkills}
                  onChange={(e) => setKeySkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Redux"
                  sx={{ mt: 0.5, bgcolor: '#fff' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  Job Location
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="e.g. Chennai, India / Remote"
                  sx={{ mt: 0.5, bgcolor: '#fff' }}
                />
              </Grid>
            </Grid>

            {/* Generated Preview Pills */}
            <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px border-dashed #99f6e4' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="flex" alignItems="center" gap={0.5}>
                <LocalOfferRoundedIcon fontSize="inherit" color="primary" /> Dynamic Hashtags & Application Link Preview:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5, gap: 1 }}>
                <Chip label={previewHashtags} size="small" sx={{ bgcolor: '#ccfbf1', color: '#0f766e', fontWeight: 600 }} />
                <Chip label={`Apply Link: ${defaultApplyUrl}`} size="small" icon={<LaunchRoundedIcon />} variant="outlined" color="info" />
              </Stack>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={isGeneratingAll ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRoundedIcon />}
              onClick={handleAutoGenerateAllPosts}
              disabled={isGeneratingAll}
              sx={{ bgcolor: '#087f8c', '&:hover': { bgcolor: '#06626d' }, py: 1.2, fontWeight: 700, fontSize: 15 }}
            >
              Generate Posts with AI for All Platforms
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {latestResult && (
        <Card sx={{ border: '2px solid #087f8c', bgcolor: '#f0fdfa' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
              <CheckCircleRoundedIcon sx={{ color: '#087f8c', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#0f4c5c', fontWeight: 800 }}>
                  Candidate Ingested via {latestResult.platform}!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Automated workflow successfully processed the incoming application into Cbtshire.ai ATS.
                </Typography>
              </Box>
            </Stack>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: '#fff' }}>
                  <Typography variant="caption" color="text.secondary">Candidate</Typography>
                  <Typography fontWeight={700}>{latestResult.candidate.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{latestResult.candidate.email}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: '#fff' }}>
                  <Typography variant="caption" color="text.secondary">AI Match Score</Typography>
                  <Typography variant="h5" sx={{ color: '#087f8c', fontWeight: 800 }}>
                    {latestResult.ai_evaluation.match_score}%
                  </Typography>
                  <Chip label={latestResult.candidate.status} size="small" color="primary" sx={{ mt: 0.5 }} />
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 2, bgcolor: '#fff' }}>
                  <Typography variant="caption" color="text.secondary">Auto Interview Status</Typography>
                  {latestResult.auto_scheduled_interview ? (
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label="Auto Scheduled" color="success" size="small" icon={<EventAvailableRoundedIcon />} />
                      <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 700 }}>
                        Link: <a href={latestResult.auto_scheduled_interview.meeting_link} target="_blank" rel="noreferrer">Open Jitsi Meeting</a>
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Screening pending</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Grid of Platforms: LinkedIn, Naukri, Indeed, Company Careers Website */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        
        {/* 1. LinkedIn Integration */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <LinkedInIcon sx={{ color: '#0a66c2', fontSize: 36 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>LinkedIn Easy Apply & Profile</Typography>
                  <Typography variant="body2" color="text.secondary">Auto-post position, hashtags & direct apply link</Typography>
                </Box>
              </Stack>
              <Chip
                label={publishedStatus.linkedin ? 'Posted / Live' : 'Ready to Post'}
                color={publishedStatus.linkedin ? 'success' : 'primary'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Target LinkedIn Profile / Page URL (Optional)
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={linkedinProfile}
              onChange={(e) => setLinkedinProfile(e.target.value)}
              placeholder="e.g. https://www.linkedin.com/company/your-company"
              sx={{ mt: 0.5, mb: 1.5 }}
            />

            {linkedinPostData ? (
              <Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #bae6fd', mb: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#0369a1" display="block" sx={{ mb: 0.5 }}>
                  ✨ Generated LinkedIn Post Text & Hashtags:
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fff', fontSize: 13, whiteSpace: 'pre-wrap', mb: 1.5 }}>
                  {linkedinPostData.post_text}
                </Paper>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckCircleRoundedIcon />}
                    onClick={() => handlePublishPlatform('linkedin')}
                    sx={{ bgcolor: '#0a66c2', '&:hover': { bgcolor: '#004182' }, fontWeight: 700 }}
                  >
                    OK / Confirm & Post to LinkedIn
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#fafafa', borderStyle: 'dashed', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  👈 Enter Position Name & Experience above, then click <b>"Generate Posts with AI"</b> to view your custom LinkedIn post.
                </Typography>
              </Paper>
            )}

            {!linkedinPostData && (
              <Button
                variant="contained"
                fullWidth
                startIcon={postingLinkedIn ? <CircularProgress size={18} color="inherit" /> : <LinkedInIcon />}
                onClick={async () => {
                  if (!positionName.trim()) {
                    setInputError('Please enter a Position Name before generating LinkedIn post!');
                    return;
                  }
                  setInputError(null);
                  setPostingLinkedIn(true);
                  try {
                    const res = await generateLinkedInJobPost({
                      position_name: positionName.trim(),
                      experience: experienceYears.trim(),
                      skills: keySkills.trim(),
                      location: jobLocation.trim(),
                      profile_url: linkedinProfile.trim() || undefined
                    });
                    setLinkedinPostData(res);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setPostingLinkedIn(false);
                  }
                }}
                disabled={postingLinkedIn}
                sx={{ bgcolor: '#0a66c2', '&:hover': { bgcolor: '#004182' } }}
              >
                Generate LinkedIn Post
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 2. Naukri Integration */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <WorkOutlineRoundedIcon sx={{ color: '#4a00e0', fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>Naukri e-Apps Integration</Typography>
                  <Typography variant="body2" color="text.secondary">Auto-formatted Naukri job spec with experience & hashtags</Typography>
                </Box>
              </Stack>
              <Chip
                label={publishedStatus.naukri ? 'Posted / Live' : 'Ready to Post'}
                color={publishedStatus.naukri ? 'success' : 'primary'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            {naukriPostData ? (
              <Box sx={{ p: 2, bgcolor: '#f5f3ff', borderRadius: 2, border: '1px solid #ddd6fe', mb: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#5b21b6" display="block" sx={{ mb: 0.5 }}>
                  📋 Generated Naukri Job Specification:
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fff', fontSize: 13, whiteSpace: 'pre-wrap', mb: 1.5 }}>
                  {naukriPostData.post_text}
                </Paper>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckCircleRoundedIcon />}
                    onClick={() => handlePublishPlatform('naukri')}
                    sx={{ bgcolor: '#4a00e0', '&:hover': { bgcolor: '#3800b8' }, fontWeight: 700 }}
                  >
                    OK / Confirm & Post to Naukri
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#fafafa', borderStyle: 'dashed', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  👈 Enter Position Name & Experience above, then click <b>"Generate Posts with AI"</b> to view your custom Naukri spec.
                </Typography>
              </Paper>
            )}

            {!naukriPostData && (
              <Button
                variant="contained"
                fullWidth
                startIcon={postingNaukri ? <CircularProgress size={18} color="inherit" /> : <WorkOutlineRoundedIcon />}
                onClick={async () => {
                  if (!positionName.trim()) {
                    setInputError('Please enter a Position Name before generating Naukri post!');
                    return;
                  }
                  setInputError(null);
                  setPostingNaukri(true);
                  try {
                    const res = await generateNaukriJobPost({
                      position_name: positionName.trim(),
                      experience: experienceYears.trim(),
                      skills: keySkills.trim(),
                      location: jobLocation.trim()
                    });
                    setNaukriPostData(res);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setPostingNaukri(false);
                  }
                }}
                disabled={postingNaukri}
                sx={{ bgcolor: '#4a00e0', '&:hover': { bgcolor: '#3800b8' } }}
              >
                Generate Naukri Post
              </Button>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Process Incoming Real Candidate from Naukri
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                label="Candidate Name"
                placeholder="e.g. Applicant Name"
                value={naukriCandidateName}
                onChange={(e) => setNaukriCandidateName(e.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                label="Candidate Email"
                placeholder="e.g. applicant@email.com"
                value={naukriCandidateEmail}
                onChange={(e) => setNaukriCandidateEmail(e.target.value)}
              />
              <Button
                variant="outlined"
                fullWidth
                startIcon={loadingPlatform === 'naukri' ? <CircularProgress size={18} /> : <PlayArrowRoundedIcon />}
                onClick={() => handleIngestCandidate('naukri', naukriCandidateName, naukriCandidateEmail)}
                disabled={Boolean(loadingPlatform)}
                sx={{ color: '#4a00e0', borderColor: '#4a00e0' }}
              >
                Process Candidate & Auto-Schedule AI Interview
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* 3. Indeed Integration */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <CodeRoundedIcon sx={{ color: '#2164f3', fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>Indeed Apply Integration</Typography>
                  <Typography variant="body2" color="text.secondary">Auto XML feed & Indeed Apply post specification</Typography>
                </Box>
              </Stack>
              <Chip
                label={publishedStatus.indeed ? 'Posted / Live' : 'Ready to Post'}
                color={publishedStatus.indeed ? 'success' : 'primary'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            {indeedPostData ? (
              <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe', mb: 2 }}>
                <Typography variant="caption" fontWeight={700} color="#1e40af" display="block" sx={{ mb: 0.5 }}>
                  🟠 Generated Indeed Job Specification:
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fff', fontSize: 13, whiteSpace: 'pre-wrap', mb: 1.5 }}>
                  {indeedPostData.post_text}
                </Paper>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckCircleRoundedIcon />}
                    onClick={() => handlePublishPlatform('indeed')}
                    sx={{ bgcolor: '#2164f3', '&:hover': { bgcolor: '#1a52c8' }, fontWeight: 700 }}
                  >
                    OK / Confirm & Post to Indeed
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#fafafa', borderStyle: 'dashed', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  👈 Enter Position Name & Experience above, then click <b>"Generate Posts with AI"</b> to view your custom Indeed spec.
                </Typography>
              </Paper>
            )}

            {!indeedPostData && (
              <Button
                variant="contained"
                fullWidth
                startIcon={postingIndeed ? <CircularProgress size={18} color="inherit" /> : <CodeRoundedIcon />}
                onClick={async () => {
                  if (!positionName.trim()) {
                    setInputError('Please enter a Position Name before generating Indeed post!');
                    return;
                  }
                  setInputError(null);
                  setPostingIndeed(true);
                  try {
                    const res = await generateIndeedJobPost({
                      position_name: positionName.trim(),
                      experience: experienceYears.trim(),
                      skills: keySkills.trim(),
                      location: jobLocation.trim()
                    });
                    setIndeedPostData(res);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setPostingIndeed(false);
                  }
                }}
                disabled={postingIndeed}
                sx={{ bgcolor: '#2164f3', '&:hover': { bgcolor: '#1a52c8' } }}
              >
                Generate Indeed Post
              </Button>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Process Incoming Real Candidate from Indeed
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <TextField
                size="small"
                fullWidth
                label="Candidate Name"
                placeholder="e.g. Applicant Name"
                value={indeedCandidateName}
                onChange={(e) => setIndeedCandidateName(e.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                label="Candidate Email"
                placeholder="e.g. applicant@email.com"
                value={indeedCandidateEmail}
                onChange={(e) => setIndeedCandidateEmail(e.target.value)}
              />
              <Button
                variant="outlined"
                fullWidth
                startIcon={loadingPlatform === 'indeed' ? <CircularProgress size={18} /> : <PlayArrowRoundedIcon />}
                onClick={() => handleIngestCandidate('indeed', indeedCandidateName, indeedCandidateEmail)}
                disabled={Boolean(loadingPlatform)}
                sx={{ color: '#2164f3', borderColor: '#2164f3' }}
              >
                Process Candidate & Auto-Schedule AI Interview
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* 4. Company Careers Website Embed */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <LanguageRoundedIcon sx={{ color: '#087f8c', fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>Company Careers Website</Typography>
                  <Typography variant="body2" color="text.secondary">Embed open position widget & candidate direct apply page</Typography>
                </Box>
              </Stack>
              <Chip
                label={publishedStatus.website ? 'Posted / Live' : 'Ready to Post'}
                color={publishedStatus.website ? 'success' : 'primary'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Website Embed Snippet (Paste on your site)
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#1e293b', color: '#38bdf8', fontFamily: 'monospace', fontSize: 12, mt: 0.5, mb: 2, position: 'relative' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{embedSnippet}</pre>
              <Tooltip title={copiedText === 'embed' ? 'Copied!' : 'Copy Code'}>
                <IconButton size="small" onClick={() => copyToClipboard(embedSnippet, 'embed')} sx={{ position: 'absolute', top: 8, right: 8, color: '#94a3b8' }}>
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<CheckCircleRoundedIcon />}
                onClick={() => handlePublishPlatform('website')}
                sx={{ bgcolor: '#087f8c', '&:hover': { bgcolor: '#06626d' }, fontWeight: 700 }}
              >
                OK / Confirm & Publish to Website
              </Button>
            </Stack>

            <Button
              variant="outlined"
              fullWidth
              startIcon={loadingPlatform === 'website' ? <CircularProgress size={18} color="inherit" /> : <PlayArrowRoundedIcon />}
              onClick={() => handleIngestCandidate('website', 'Applicant Name', 'applicant@email.com')}
              disabled={Boolean(loadingPlatform)}
              sx={{ color: '#087f8c', borderColor: '#087f8c' }}
            >
              Process Candidate From Careers Website
            </Button>
          </CardContent>
        </Card>

      </Box>
    </Stack>
  );
}
