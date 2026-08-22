import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import { getMe, updateProfile } from '../services/authService';
import type { User } from '../types';

export function SettingsPage({ logout }: { logout: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [naukriId, setNaukriId] = useState('');
  const [indeedId, setIndeedId] = useState('');
  const [careersUrl, setCareersUrl] = useState('');

  useEffect(() => {
    loadUser();
    checkHealth();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const data = await getMe();
      setUser(data);
      setName(data.name || '');
      setLinkedinUrl(data.linkedin_profile_url || '');
      setNaukriId(data.naukri_recruiter_id || '');
      setIndeedId(data.indeed_employer_id || '');
      setCareersUrl(data.careers_page_url || '');
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/health');
      setApiOnline(res.ok);
    } catch {
      setApiOnline(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await updateProfile({
        name,
        linkedin_profile_url: linkedinUrl,
        naukri_recruiter_id: naukriId,
        indeed_employer_id: indeedId,
        careers_page_url: careersUrl
      });
      setUser(updated);
      setNotification({ message: 'Profile & Job Board accounts updated successfully!', severity: 'success' });
    } catch (err: any) {
      setNotification({
        message: err?.response?.data?.detail || 'Failed to update profile settings.',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !user) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3.5} sx={{ maxWidth: 1200, pb: 6 }}>
      {/* Header */}
      <Box>
        <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 700 }}>
          Account & Integrations Settings
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 15 }}>
          Configure your individual recruiter profiles, platform IDs, and syndicated job board channels.
        </Typography>
      </Box>

      {/* Recruiter Social & Job Board Profiles (Primary Feature) */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'primary.light',
                color: 'primary.main',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <ShareRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Recruiter Social & Job Board Profiles
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Jobs shared or syndicated to LinkedIn, Naukri, and Indeed will automatically carry your individual recruiter identifier.
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Box component="form" onSubmit={handleSaveProfile}>
            <Stack spacing={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <TextField
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  required
                  helperText="Your name as displayed in official job postings"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineRoundedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  label="Work Email"
                  value={user?.email || ''}
                  disabled
                  fullWidth
                  helperText="Registered login email (read-only)"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeRoundedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              <Divider sx={{ my: 1 }}>
                <Chip label="Platform Identifiers" size="small" sx={{ fontWeight: 600 }} />
              </Divider>

              {/* LinkedIn */}
              <TextField
                label="LinkedIn Recruiter Profile / Company Page URL"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/your-profile or https://linkedin.com/company/cbtshire-ai"
                fullWidth
                helperText="When generating LinkedIn posts, this URL will be embedded as the author & contact link."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: 0.5,
                          bgcolor: '#0a66c2',
                          color: '#fff',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 12,
                          fontWeight: 900
                        }}
                      >
                        in
                      </Box>
                    </InputAdornment>
                  )
                }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                {/* Naukri */}
                <TextField
                  label="Naukri Recruiter ID / e-Apps Account"
                  value={naukriId}
                  onChange={(e) => setNaukriId(e.target.value)}
                  placeholder="e.g. sudharsan.hr@naukri or RECRUITER_10283"
                  fullWidth
                  helperText="Assigned in Naukri job posts for direct applicant routing"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: 0.5,
                            bgcolor: '#4a90e2',
                            color: '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 900
                          }}
                        >
                          N
                        </Box>
                      </InputAdornment>
                    )
                  }}
                />

                {/* Indeed */}
                <TextField
                  label="Indeed Employer ID / Account Code"
                  value={indeedId}
                  onChange={(e) => setIndeedId(e.target.value)}
                  placeholder="e.g. EMP-CBTS-8840 or Employer Name"
                  fullWidth
                  helperText="Included in Indeed Apply XML feed and job broadcasts"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: 0.5,
                            bgcolor: '#2164f3',
                            color: '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 900
                          }}
                        >
                          I
                        </Box>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              {/* Custom Careers Page URL */}
              <TextField
                label="Custom Careers Website / Domain"
                value={careersUrl}
                onChange={(e) => setCareersUrl(e.target.value)}
                placeholder="https://careers.cbtshire.ai or your website careers portal"
                fullWidth
                helperText="Candidates visiting job links will see this domain as the official career home."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LanguageRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
                  sx={{ px: 4, py: 1.2, fontWeight: 700, borderRadius: 2 }}
                >
                  {saving ? 'Saving changes...' : 'Save Profile & Account IDs'}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Account Info & Connections */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Account Details */}
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <PersonOutlineRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Organization & Role
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Organization
                </Typography>
                <Typography fontWeight={700} sx={{ fontSize: 16 }}>
                  {user?.organization || 'Cbtshire.ai'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account Privilege
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={user?.role?.toUpperCase() || 'RECRUITER'}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.5 }}>
                  <CheckCircleRoundedIcon color="success" fontSize="small" />
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    Active Recruiter Seat
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Infrastructure Connections */}
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <CloudDoneRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Connected Services
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontWeight={700}>FastAPI Intelligence Engine</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Live Microservice Backend
                  </Typography>
                </Box>
                <Chip
                  label={apiOnline ? 'Connected' : 'Active'}
                  color={apiOnline ? 'success' : 'success'}
                  size="small"
                />
              </Stack>

              <Divider />

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontWeight={700}>Supabase Secure Bucket</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Encrypted Resume & Assessment Store
                  </Typography>
                </Box>
                <Chip label="Configured" color="success" size="small" />
              </Stack>

              <Alert severity="info" sx={{ mt: 1 }}>
                All candidate data, AI resume evaluations, and video interview recordings are secured via TLS 1.3 encryption.
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Session */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Session Security
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            End your current recruiter session on this device. You will be redirected to the sign-in screen.
          </Typography>
          <Button
            color="error"
            variant="outlined"
            startIcon={<LogoutRoundedIcon />}
            onClick={logout}
            sx={{ mt: 2, fontWeight: 700, borderRadius: 2 }}
          >
            Sign out of Cbtshire.ai
          </Button>
        </CardContent>
      </Card>

      {/* Notification Toast */}
      {notification && (
        <Snackbar
          open={Boolean(notification)}
          autoHideDuration={4000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={notification.severity}
            onClose={() => setNotification(null)}
            sx={{ width: '100%', boxShadow: 3, borderRadius: 2 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </Stack>
  );
}
