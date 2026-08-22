import { useState } from 'react';
import { Alert, Box, Button, Chip, Link, Stack, TextField, Typography } from '@mui/material';
import { forgotPassword, login, register, resetPassword, verifyOtp } from '../services/authService';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify_otp' | 'reset';

export function LoginPage({ initialMode = 'signin' }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setMessage('');
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        await register(name, email, password);
        setMode('signin');
        setMessage('Account created. Sign in with your email and password.');
      } else if (mode === 'signin') {
        const result = await login(email, password);
        localStorage.setItem('cbtshire_token', result.access_token);
        localStorage.setItem('northstar_token', result.access_token);
        window.location.href = '/dashboard';
      } else if (mode === 'forgot') {
        const res = await forgotPassword(email);
        setMode('verify_otp');
        setMessage(res.message || '6-digit OTP code sent to your email.');
      } else if (mode === 'verify_otp') {
        const res = await verifyOtp(email, otp);
        setMode('reset');
        setMessage(res.message || 'Code verified successfully! Now enter your new password below.');
      } else if (mode === 'reset') {
        const res = await resetPassword(email, otp, newPassword);
        setMode('signin');
        setPassword('');
        setOtp('');
        setNewPassword('');
        setMessage(res.message || 'Password updated successfully! Please sign in with your new password.');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || 'An error occurred. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getOverline = () => {
    if (mode === 'signin') return 'WELCOME BACK';
    if (mode === 'signup') return 'GET STARTED';
    if (mode === 'forgot') return 'RESET PASSWORD';
    if (mode === 'verify_otp') return 'VERIFY CODE';
    return 'SET NEW PASSWORD';
  };

  const getTitle = () => {
    if (mode === 'signin') return 'Sign in to your workspace';
    if (mode === 'signup') return 'Create your workspace';
    if (mode === 'forgot') return 'Forgot your password?';
    if (mode === 'verify_otp') return 'Enter reset code';
    return 'Create new password';
  };

  const getSubtitle = () => {
    if (mode === 'signin') return 'Continue shaping your next great team.';
    if (mode === 'signup') return 'Start building a thoughtful hiring process.';
    if (mode === 'forgot') return 'Enter your account email to receive a 6-digit verification code.';
    if (mode === 'verify_otp') return 'Enter the 6-digit OTP code sent to your email.';
    return 'Enter your new password below to reset your account.';
  };

  const isSubmitDisabled = () => {
    if (loading) return true;
    if (mode === 'signin') return !email || !password;
    if (mode === 'signup') return !name || !email || !password;
    if (mode === 'forgot') return !email;
    if (mode === 'verify_otp') return !email || !otp;
    if (mode === 'reset') return !email || !otp || !newPassword;
    return false;
  };

  const getButtonText = () => {
    if (loading) return 'Please wait...';
    if (mode === 'signin') return 'Sign in';
    if (mode === 'signup') return 'Create account';
    if (mode === 'forgot') return 'Send 6-digit Code';
    if (mode === 'verify_otp') return 'Verify Code';
    return 'Update Password';
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { md: '1.1fr 1fr' }, bgcolor: '#f6f8f7' }}>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, p: 7, bgcolor: '#102d37', color: '#fff', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#ef8354', color: '#102d37', display: 'grid', placeItems: 'center', fontWeight: 900, fontFamily: 'Georgia' }}>C</Box>
          <Typography fontWeight={800}>Cbtshire.ai</Typography>
        </Stack>
        <Box>
          <Typography variant="h1" sx={{ fontSize: 62, lineHeight: 1.02, color: '#f4fbfa' }}>Make room for great people.</Typography>
          <Typography sx={{ mt: 3, maxWidth: 420, color: '#a7c0bf', fontSize: 17, lineHeight: 1.7 }}>A considered hiring workspace for teams who care about the journey as much as the outcome.</Typography>
          <Chip label="Human-led · AI-assisted" variant="outlined" sx={{ mt: 4, color: '#d9efec', borderColor: '#44747a' }} />
        </Box>
        <Typography variant="caption" sx={{ color: '#759596' }}>Cbtshire.ai Talent OS</Typography>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 3, md: 7 } }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '.14em', fontWeight: 800 }}>{getOverline()}</Typography>
          <Typography variant="h3" sx={{ mt: 1, fontSize: 38, fontWeight: 700 }}>{getTitle()}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, fontSize: 15 }}>{getSubtitle()}</Typography>

          <Stack spacing={2.2} sx={{ mt: 4 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {message && <Alert severity="success">{message}</Alert>}

            {mode === 'signup' && (
              <TextField label="Your name" value={name} onChange={(event) => setName(event.target.value)} fullWidth required />
            )}

            {(mode === 'signin' || mode === 'signup' || mode === 'forgot' || mode === 'verify_otp' || mode === 'reset') && (
              <TextField
                label="Work email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                fullWidth
                required
                disabled={mode === 'verify_otp' || mode === 'reset'}
              />
            )}

            {(mode === 'signin' || mode === 'signup') && (
              <Box>
                <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} fullWidth required />
                {mode === 'signin' && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.8 }}>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      underline="hover"
                      onClick={() => handleModeChange('forgot')}
                      sx={{ color: 'primary.main', fontWeight: 600, fontSize: 13 }}
                    >
                      Forgot password?
                    </Link>
                  </Box>
                )}
              </Box>
            )}

            {mode === 'verify_otp' && (
              <TextField
                label="6-Digit Verification Code (OTP)"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                fullWidth
                required
                placeholder="e.g. 123456"
                autoFocus
              />
            )}

            {mode === 'reset' && (
              <>
                <TextField
                  label="6-Digit Verification Code (OTP)"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  fullWidth
                  required
                  disabled
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  fullWidth
                  required
                  autoFocus
                />
              </>
            )}

            <Button variant="contained" size="large" onClick={() => void submit()} disabled={isSubmitDisabled()} sx={{ py: 1.5 }}>
              {getButtonText()}
            </Button>

            <Stack spacing={1} alignItems="center">
              {mode === 'signin' && (
                <Button color="primary" onClick={() => handleModeChange('signup')}>
                  Need an account? Create one
                </Button>
              )}
              {mode === 'signup' && (
                <Button color="primary" onClick={() => handleModeChange('signin')}>
                  Already have an account? Sign in
                </Button>
              )}
              {(mode === 'forgot' || mode === 'verify_otp' || mode === 'reset') && (
                <Button color="primary" onClick={() => handleModeChange('signin')}>
                  Back to Sign in
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

