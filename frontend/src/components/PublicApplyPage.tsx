import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useParams } from 'react-router-dom';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { api } from '../services/api';

type Job = {
  id: number;
  title: string;
  department: string;
  location: string;
  experience_level: string;
  skills: string[];
  description: string;
};

export function PublicApplyPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void api
      .get<Job>(`/public/jobs/${jobId}`)
      .then((response) => setJob(response.data))
      .catch(() => setError('This job is not currently available or has expired.'));
  }, [jobId]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: event.target.value });
    setError('');
  };

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      return setError('Please enter your full name and email address.');
    }
    if (!file) {
      return setError('Please upload your resume (PDF or Word document).');
    }

    setSubmitting(true);
    setError('');

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append('file', file);

    try {
      await api.post(`/public/jobs/${jobId}/apply`, body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmitted(true);
    } catch (caught: any) {
      setError(
        caught?.response?.data?.detail ||
          'Application could not be submitted. Please check the resume file and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: '#f8fafc' }}>
        {error ? (
          <Alert severity="error" sx={{ maxWidth: 500, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : (
          <CircularProgress />
        )}
      </Box>
    );
  }

  // Once submitted, exit the form and show full-page success screen
  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
        <Paper
          elevation={3}
          sx={{
            maxWidth: 600,
            width: '100%',
            p: { xs: 3.5, sm: 5 },
            borderRadius: 4,
            textAlign: 'center',
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)'
          }}
        >
          <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#ecfdf5', display: 'grid', placeItems: 'center', mx: 'auto', mb: 2.5 }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 52, color: '#10b981' }} />
          </Box>

          <Typography variant="h4" fontWeight={900} sx={{ color: '#0f172a', mb: 1, letterSpacing: '-0.5px' }}>
            Application Submitted!
          </Typography>

          <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.6, mb: 3 }}>
            Thank you, <strong>{form.name}</strong>. Your application and resume for <strong>{job.title}</strong> have been successfully received.
          </Typography>

          <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 2.5, textAlign: 'left', mb: 3.5 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#166534', mb: 0.6 }}>
              📌 What happens next?
            </Typography>
            <Typography variant="body2" sx={{ color: '#15803d', lineHeight: 1.6 }}>
              Our recruitment team and AI screening system are evaluating your profile. If your resume is shortlisted, our HR team will send the official assessment link and next steps directly to <strong>{form.email}</strong>.
            </Typography>
          </Paper>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => {
                window.location.href = '/';
              }}
              sx={{
                py: 1.3,
                px: 3,
                fontWeight: 800,
                borderRadius: 2.5,
                bgcolor: '#087f8c',
                '&:hover': { bgcolor: '#06646f' }
              }}
            >
              Exit & Return Home
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                setSubmitted(false);
                setForm({ name: '', email: '', phone: '' });
                setFile(null);
              }}
              sx={{
                py: 1.3,
                px: 3,
                fontWeight: 700,
                borderRadius: 2.5
              }}
            >
              Submit Another Application
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: { xs: 4, md: 8 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 780, mx: 'auto' }}>
        {/* Job Header */}
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#0284c7', mb: 1 }}>
            <WorkOutlineRoundedIcon sx={{ fontSize: 18 }} />
            <Typography variant="overline" fontWeight={800} letterSpacing={1}>
              {job.department || 'OPEN POSITION'}
            </Typography>
          </Stack>

          <Typography variant="h3" fontWeight={900} sx={{ color: '#0f172a', fontSize: { xs: 28, md: 36 } }}>
            {job.title}
          </Typography>

          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1.5, color: '#64748b', fontSize: 14 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <LocationOnRoundedIcon sx={{ fontSize: 16 }} />
              <span>{job.location || 'Remote / Hybrid'}</span>
            </Stack>
            <span>•</span>
            <span>{job.experience_level || 'Mid to Senior'}</span>
          </Stack>

          {job.skills && job.skills.length > 0 && (
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2.5 }}>
              {job.skills.map((skill) => (
                <Chip key={skill} label={skill} size="small" sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }} />
              ))}
            </Stack>
          )}
        </Paper>

        {/* Application Form */}
        <Card elevation={2} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a' }}>
                  Apply for this position
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Please fill in your details and upload your latest resume.
                </Typography>
              </Box>

              {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

              <TextField
                label="Full name"
                value={form.name}
                onChange={set('name')}
                required
                fullWidth
                placeholder="e.g. Sudharsan R"
              />

              <TextField
                label="Email address"
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                fullWidth
                placeholder="e.g. sudharsan@example.com"
                helperText="All assessment invites & interview updates will be sent to this email"
              />

              <TextField
                label="Phone number"
                value={form.phone}
                onChange={set('phone')}
                fullWidth
                placeholder="e.g. +91 9876543210"
              />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#334155' }}>
                  Resume / CV (PDF or DOCX) *
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  startIcon={<CloudUploadRoundedIcon />}
                  sx={{
                    p: 2,
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderRadius: 2,
                    fontWeight: 700,
                    color: file ? '#059669' : '#0284c7',
                    borderColor: file ? '#10b981' : '#cbd5e1',
                    bgcolor: file ? '#f0fdf4' : '#f8fafc'
                  }}
                >
                  {file ? `Selected: ${file.name}` : 'Click to Upload Resume Document'}
                  <input
                    hidden
                    type="file"
                    accept="application/pdf,.doc,.docx"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </Button>
              </Box>

              {job.description && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#334155', mb: 0.5 }}>
                      Job Overview:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {job.description}
                    </Typography>
                  </Box>
                </>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={() => void submit()}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{
                  py: 1.5,
                  fontWeight: 800,
                  borderRadius: 2.5,
                  bgcolor: '#087f8c',
                  '&:hover': { bgcolor: '#06646f' }
                }}
              >
                {submitting ? 'Submitting Application & Screening Resume...' : 'Submit Application'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
