import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { getDashboard } from '../services/dashboardService';
import type { Candidate, DashboardStats, Job } from '../types';
import { CandidateReviewModal } from './CandidateReviewModal';

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const loadData = () => {
    void getDashboard().then((data) => {
      setStats(data.stats);
      setJobs(data.jobs);
      setCandidates(data.candidates);
    }).catch(() => setError('Could not load dashboard data from the API.'));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) return <Alert severity="error">{error} Refresh after starting the FastAPI server.</Alert>;
  if (!stats) return <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  const statCards = [['Active jobs', stats.active_jobs, '#087f8c'], ['Total candidates', stats.total_candidates, '#6875d8'], ['Interviews', stats.interviews, '#ef8354'], ['Offers', stats.offers, '#2e9d70']];
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 } }}>Your hiring workspace.</Typography>
          <Typography color="text.secondary" sx={{ mt: .5 }}>Live data from your recruitment API.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/jobs')}>
          Create a job
        </Button>
      </Stack>
      <Alert icon={<AutoAwesomeRoundedIcon />} severity="info"><b>AI is assistive only.</b> Review generated insights before making hiring decisions.</Alert>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {statCards.map(([label, value, color]) => (
          <Card key={label as string}>
            <CardContent>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color as string }} />
              <Typography variant="h4" sx={{ mt: 2 }}>{value}</Typography>
              <Typography color="text.secondary">{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr .8fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">Recent candidates</Typography>
                <Typography variant="body2" color="text.secondary">Tap any candidate to review full resume & AI screening</Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate('/candidates')}>
                See all
              </Button>
            </Stack>
            <Stack spacing={1.5} sx={{ mt: 2.5 }}>
              {candidates.length === 0 ? (
                <Typography color="text.secondary">No candidates yet.</Typography>
              ) : (
                candidates.map((candidate) => (
                  <Stack
                    key={candidate.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setModalOpen(true);
                    }}
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#f1f5f9',
                        borderColor: '#93c5fd',
                        transform: 'translateX(4px)'
                      }
                    }}
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontWeight={800}>{candidate.name}</Typography>
                        {(candidate.match_score || 0) >= 70 && (
                          <Chip label={`${candidate.match_score}% Match`} size="small" sx={{ fontWeight: 800, fontSize: 10, bgcolor: '#dcfce7', color: '#166534' }} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{candidate.role} · {candidate.email}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={candidate.status || 'Screening'} size="small" />
                      <Button size="small" variant="text" startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontWeight: 700, fontSize: 12, minWidth: 0 }}>
                        View
                      </Button>
                    </Stack>
                  </Stack>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
        <CandidateReviewModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          candidate={selectedCandidate}
          onScheduleInterview={() => navigate('/interviews')}
          onAssessmentSent={() => loadData()}
        />
        <Card>
          <CardContent>
            <Typography variant="h6">Open roles</Typography>
            <Typography variant="body2" color="text.secondary">Live jobs returned by the API</Typography>
            <Stack spacing={2} sx={{ mt: 2.5 }}>
              {jobs.filter((job) => job.status === 'published').length === 0 ? (
                <Typography color="text.secondary">No published jobs yet.</Typography>
              ) : (
                jobs.filter((job) => job.status === 'published').map((job) => (
                  <Box key={job.id}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={700}>{job.title}</Typography>
                      <Typography variant="caption">{job.applicants} applicants</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={Math.min(100, job.applicants)} sx={{ mt: 1 }} />
                  </Box>
                ))
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
