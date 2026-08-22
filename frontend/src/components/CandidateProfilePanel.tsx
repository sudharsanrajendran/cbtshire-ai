import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import type { Job } from '../types';
import { uploadResume } from '../services/advancedService';
import { getJobs } from '../services/jobService';
import { matchCandidate } from '../services/aiService';

type Match = { job: Job; explanation?: string; overall_score?: number | null; strengths?: string[]; missing_skills?: string[]; error?: string };
export function CandidateProfilePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(''); setMatches([]);
    try {
      const uploaded = await uploadResume(file);
      setCandidateId(uploaded.candidate_id); setAnalysis(uploaded.analysis ?? 'Resume uploaded for recruiter review.');
      const jobs = (await getJobs()).filter((job) => job.status === 'published');
      const results = await Promise.all(jobs.map(async (job) => { try { return { job, ...(await matchCandidate({ candidate_id: uploaded.candidate_id, job_id: job.id })) }; } catch { return { job, error: 'Match unavailable' }; } }));
      setMatches(results.sort((left, right) => (right.overall_score ?? -1) - (left.overall_score ?? -1)));
    } catch (caught) { const detail = isAxiosError(caught) ? caught.response?.data?.detail : undefined; setError(detail ?? (caught instanceof Error ? caught.message : 'Resume upload or analysis failed. Check Supabase Storage and AI configuration.')); } finally { setLoading(false); }
  };
  return <Card sx={{ mb: 3, borderColor: '#c8e7e3' }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={3}><Box><Stack direction="row" alignItems="center" gap={1}><AutoAwesomeRoundedIcon color="primary" /><Typography variant="h6">Profile resume match</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Upload a resume to see which published jobs fit the profile. AI output requires recruiter review.</Typography></Box><Button component="label" variant="outlined" startIcon={<CloudUploadRoundedIcon />}>Choose PDF / DOC / DOCX<input hidden type="file" accept="application/pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Button></Stack>{file && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2} sx={{ mt: 2 }}><Typography variant="body2">Selected: <b>{file.name}</b></Typography><Button variant="contained" onClick={() => void analyze()} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze profile'}</Button></Stack>}{error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}{loading && <LinearProgress sx={{ mt: 2 }} />}{candidateId && !loading && <Box sx={{ mt: 3 }}><Typography variant="subtitle1" fontWeight={800}>AI profile analysis</Typography><Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{analysis}</Typography><Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={800}>Suitable published jobs</Typography>{matches.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No published jobs available for matching.</Typography> : <Stack spacing={1.5} sx={{ mt: 1.5 }}>{matches.map((match) => <Box key={match.job.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={700}>{match.job.title}</Typography><Typography variant="caption" color="text.secondary">{match.job.department} · {match.job.location}</Typography></Box>{match.error ? <Chip label={match.error} size="small" color="warning" /> : <Chip label={typeof match.overall_score === 'number' ? `${match.overall_score}% match` : 'AI review'} size="small" color="success" />}</Stack>{typeof match.overall_score === 'number' && <LinearProgress variant="determinate" value={match.overall_score} sx={{ mt: 1 }} />}{match.explanation && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap' }}>{match.explanation}</Typography>}{match.strengths?.map((strength) => <Chip key={strength} label={strength} size="small" sx={{ mr: .5, mt: 1 }} />)}{match.missing_skills?.map((skill) => <Chip key={skill} label={`Missing: ${skill}`} size="small" color="warning" sx={{ mr: .5, mt: 1 }} />)}</Box>)}</Stack>}</Box>}</CardContent></Card>;
}
