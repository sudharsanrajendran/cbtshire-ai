import { useEffect, useRef, useState } from 'react';
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
  FormControlLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VideocamOffRoundedIcon from '@mui/icons-material/VideocamOffRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import PhonelinkEraseRoundedIcon from '@mui/icons-material/PhonelinkEraseRounded';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

type Question = { id: number; prompt: string; options: string[] };

export function AssessmentPortalPage() {
  const { token } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Proctoring, Camera & Audio States
  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-time Audio / Voice Proctoring States
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioViolations, setAudioViolations] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Real-time Visual & Phone Detection States
  const [visualViolations, setVisualViolations] = useState(0);
  const [faceDetected, setFaceDetected] = useState(true);
  const [lookingAway, setLookingAway] = useState(false);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [strikes, setStrikes] = useState(0);

  // Anti-Cheating Incident Tracker
  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyPasteEvents, setCopyPasteEvents] = useState(0);
  const [disqualified, setDisqualified] = useState(false);
  const [disqualificationReason, setDisqualificationReason] = useState<string>('');
  const [warningAlert, setWarningAlert] = useState<string | null>(null);

  // Popup Modal Dialog State
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    percentage: number;
    passed: boolean;
    integrity_flag: boolean;
    tab_switches?: number;
    audio_violations?: number;
    visual_violations?: number;
    strikes?: number;
  } | null>(null);

  useEffect(() => {
    void api
      .get(`/public/assessments/${token}`)
      .then((response) => setQuestions(response.data.questions))
      .catch(() => setError('This assessment link is invalid or expired.'));
  }, [token]);

  // Handle Video Stream attachment to Video Element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, proctoringStarted]);

  // Start Camera + Microphone & Turn On AI Proctoring
  const startProctoringCamera = async () => {
    setCameraLoading(true);
    setError('');
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });
      setStream(userStream);
      setCameraActive(true);
      setProctoringStarted(true);

      // Setup Real-time Web Audio API Analyser
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(userStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (audioErr) {
        console.warn('Audio Context initialization note:', audioErr);
      }

      // Request Full Screen Mode for Max Security
      if (document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen().catch(() => {
          console.log('Fullscreen request dismissed or blocked');
        });
      }
    } catch (err) {
      console.error(err);
      setError('📹 Camera & Microphone Access Required! Please grant permission to your webcam & mic to start the proctored assessment.');
    } finally {
      setCameraLoading(false);
    }
  };

  // Submit Assessment Handler
  const submit = async (overrideTabSwitches?: number, isDisqualifiedParam?: boolean, overrideStrikes?: number) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');

    const switchesToReport = overrideTabSwitches !== undefined ? overrideTabSwitches : tabSwitches;
    const strikesToReport = overrideStrikes !== undefined ? overrideStrikes : strikes;

    try {
      const result = await api.post(
        `/public/assessments/${token}/submit`,
        { ...answers },
        {
          params: {
            tab_switches: switchesToReport,
            fullscreen_exits: 0,
            copy_paste_events: copyPasteEvents,
            audio_violations: audioViolations,
            visual_violations: visualViolations,
            strikes: strikesToReport,
            time_taken: 180
          }
        }
      );

      const finalResult = {
        ...result.data,
        passed: isDisqualifiedParam ? false : result.data.passed,
        integrity_flag: isDisqualifiedParam ? true : result.data.integrity_flag,
        strikes: strikesToReport,
        audio_violations: audioViolations,
        visual_violations: visualViolations
      };

      setSubmissionResult(finalResult);
      setResultModalOpen(true);
    } catch {
      setError('Assessment submission failed. Please try again.');
    } finally {
      setSubmitting(false);
      // Stop webcam stream & audio on submission
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Add a strike and check for maximum disqualification threshold (3 strikes)
  const registerStrike = (reason: string) => {
    if (disqualified || submissionResult) return;
    setStrikes((prev) => {
      const updated = prev + 1;
      setWarningAlert(`⚠️ PROCTORING STRIKE ${updated}/3: ${reason}`);
      if (updated >= 3) {
        setDisqualified(true);
        setDisqualificationReason(`Maximum proctoring violations exceeded (3 Strikes: ${reason}). Test has been automatically terminated.`);
        void submit(tabSwitches, true, updated);
      }
      return updated;
    });
  };

  // Real-time Audio Level & Speech Monitoring Loop
  useEffect(() => {
    if (!proctoringStarted || !analyserRef.current || disqualified || submissionResult) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let consecutiveHighNoiseFrames = 0;
    let lastAudioStrikeTime = 0;

    const checkAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
      setAudioLevel(normalizedLevel);

      // Detect loud background voice / speech / consultation (sustained noise level > 38%)
      const now = Date.now();
      if (normalizedLevel > 38) {
        consecutiveHighNoiseFrames++;
        if (consecutiveHighNoiseFrames > 12 && now - lastAudioStrikeTime > 7000) {
          lastAudioStrikeTime = now;
          consecutiveHighNoiseFrames = 0;
          setAudioViolations((v) => v + 1);
          registerStrike('Continuous human voice / excessive noise detected. Talking or receiving oral answers is forbidden.');
        }
      } else {
        consecutiveHighNoiseFrames = Math.max(0, consecutiveHighNoiseFrames - 1);
      }

      animationFrameRef.current = requestAnimationFrame(checkAudio);
    };

    animationFrameRef.current = requestAnimationFrame(checkAudio);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [proctoringStarted, disqualified, submissionResult]);

  // Real-time Visual Frame & Phone / Camera Detection via Canvas
  useEffect(() => {
    if (!proctoringStarted || !videoRef.current || disqualified || submissionResult) return;

    let lastVisualStrikeTime = 0;
    let darkFrameCount = 0;
    let lookingAwayFrameCount = 0;
    let glareFrameCount = 0;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const W = 160;
      const H = 120;
      canvas.width = W;
      canvas.height = H;
      ctx.drawImage(video, 0, 0, W, H);

      const imgData = ctx.getImageData(0, 0, W, H);
      const data = imgData.data;

      let skinCountCenter = 0;
      let skinCountLeft = 0;
      let skinCountRight = 0;
      let brightScreenPixels = 0;
      let darkBezelPixels = 0;
      let totalLuminance = 0;

      const totalPixels = W * H;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = (y * W + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLuminance += lum;

          // Skin tone detection in RGB (human face)
          const isSkin =
            r > 60 &&
            g > 35 &&
            b > 20 &&
            r > g &&
            r > b &&
            Math.abs(r - g) > 10 &&
            r - Math.min(g, b) > 12;

          if (isSkin) {
            if (x >= W * 0.25 && x <= W * 0.75 && y >= H * 0.12 && y <= H * 0.85) {
              skinCountCenter++;
            } else if (x < W * 0.25) {
              skinCountLeft++;
            } else if (x > W * 0.75) {
              skinCountRight++;
            }
          }

          // Phone screen / camera lens reflection or device held in front
          // Mobile phones produce bright screen area surrounded by dark bezel or high luminance rectangular patch
          if (lum > 220) {
            brightScreenPixels++;
          }
          if (lum < 28 && y > H * 0.3) {
            darkBezelPixels++;
          }
        }
      }

      const avgLum = totalLuminance / totalPixels;
      const centerArea = (W * 0.5) * (H * 0.73);
      const centerSkinRatio = skinCountCenter / centerArea;
      const now = Date.now();

      // 1. Camera Covered or Pitch Dark
      if (avgLum < 12) {
        darkFrameCount++;
        if (darkFrameCount > 3 && now - lastVisualStrikeTime > 5000) {
          lastVisualStrikeTime = now;
          darkFrameCount = 0;
          setFaceDetected(false);
          setVisualViolations((v) => v + 1);
          registerStrike('Camera covered or face not visible in frame.');
        }
        return;
      }

      // 2. Face Not Centered / Looking Away / Turned Head
      if (centerSkinRatio < 0.05) {
        lookingAwayFrameCount++;
        if (lookingAwayFrameCount > 3) {
          setLookingAway(true);
          setFaceDetected(false);
        }
        if (lookingAwayFrameCount > 6 && now - lastVisualStrikeTime > 5000) {
          lastVisualStrikeTime = now;
          lookingAwayFrameCount = 0;
          setVisualViolations((v) => v + 1);
          registerStrike('Head turned away or face not looking at the screen.');
        }
      } else if (skinCountLeft > skinCountCenter * 2.2 || skinCountRight > skinCountCenter * 2.2) {
        lookingAwayFrameCount++;
        if (lookingAwayFrameCount > 3) {
          setLookingAway(true);
        }
        if (lookingAwayFrameCount > 6 && now - lastVisualStrikeTime > 5000) {
          lastVisualStrikeTime = now;
          lookingAwayFrameCount = 0;
          setVisualViolations((v) => v + 1);
          registerStrike('Sideways head direction detected. Keep eyes on screen.');
        }
      } else {
        lookingAwayFrameCount = 0;
        setLookingAway(false);
        setFaceDetected(true);
      }

      // 3. Phone / Mobile Device / Screen Glare Detected
      const brightRatio = (brightScreenPixels / totalPixels) * 100;
      const bezelRatio = (darkBezelPixels / totalPixels) * 100;
      if (brightRatio > 8 || (brightRatio > 3 && bezelRatio > 12)) {
        glareFrameCount++;
        if (glareFrameCount > 2) {
          setPhoneDetected(true);
        }
        if (glareFrameCount > 4 && now - lastVisualStrikeTime > 5000) {
          lastVisualStrikeTime = now;
          glareFrameCount = 0;
          setVisualViolations((v) => v + 1);
          registerStrike('Mobile device / screen reflection detected. Using phones or taking photos is prohibited.');
        }
      } else {
        glareFrameCount = 0;
        setPhoneDetected(false);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [proctoringStarted, disqualified, submissionResult]);

  // Anti-Cheating Window / Tab Focus Event Listeners
  useEffect(() => {
    if (!proctoringStarted || submissionResult || disqualified) return;

    const triggerDisqualification = (reason: string) => {
      setTabSwitches((prev) => {
        const updated = prev + 1;
        setWarningAlert(`❌ DISQUALIFIED & FAILED: ${reason}. Switching tabs or navigating away is strictly prohibited.`);
        setDisqualified(true);
        void submit(updated, true);
        return updated;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerDisqualification('Tab switch / window minimize detected');
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        triggerDisqualification('Focus lost / navigated away from test window');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerDisqualification('Exited full screen mode');
      }
    };

    const preventCopyPaste = (e: Event) => {
      e.preventDefault();
      setCopyPasteEvents((prev) => prev + 1);
      setWarningAlert('🚫 Copying & pasting is disabled during this proctored assessment.');
    };

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('cut', preventCopyPaste);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('cut', preventCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [proctoringStarted, submissionResult, disqualified]);

  // Full-page Completion / Exit Screen when test has been submitted or terminated
  if (submissionResult) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
        <Card sx={{ maxWidth: 650, width: '100%', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', textAlign: 'center', p: { xs: 2, sm: 4 } }}>
          <CardContent>
            <Stack spacing={3} alignItems="center">
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 2.5,
                  borderRadius: '50%',
                  bgcolor: submissionResult.passed ? '#ecfdf5' : '#fef2f2',
                  color: submissionResult.passed ? '#059669' : '#dc2626'
                }}
              >
                {submissionResult.passed ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 64 }} />
                ) : (
                  <CancelRoundedIcon sx={{ fontSize: 64 }} />
                )}
              </Box>

              <Box>
                <Typography variant="h4" fontWeight={900} color={submissionResult.passed ? '#0f4c5c' : '#b91c1c'}>
                  {submissionResult.passed
                    ? '🎉 Assessment Successfully Completed!'
                    : submissionResult.integrity_flag
                    ? '❌ Assessment Terminated / Disqualified'
                    : '📋 Assessment Submitted'}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 500, mx: 'auto' }}>
                  {submissionResult.passed
                    ? 'Your test responses and proctoring integrity data have been verified and submitted to the recruiter.'
                    : submissionResult.integrity_flag
                    ? 'Proctoring violations (Tab switches, speaking/oral assistance, or mobile phone usage) were flagged.'
                    : 'Your answers have been recorded.'}
                </Typography>
              </Box>

              <Paper variant="outlined" sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, width: '100%' }}>
                <Stack direction="row" justifyContent="space-around" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>FINAL SCORE</Typography>
                    <Typography variant="h4" fontWeight={900} color="#087f8c">
                      {submissionResult.percentage}%
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>CORRECT</Typography>
                    <Typography variant="h4" fontWeight={900} color="#334155">
                      {submissionResult.score} / {questions.length}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>INTEGRITY</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={submissionResult.passed ? 'Passed ✓' : submissionResult.integrity_flag ? 'Disqualified ❌' : 'Under Review'}
                        color={submissionResult.passed ? 'success' : submissionResult.integrity_flag ? 'error' : 'default'}
                        sx={{ fontWeight: 800 }}
                      />
                    </Box>
                  </Box>
                </Stack>
              </Paper>

              <Alert severity="info" sx={{ width: '100%', borderRadius: 2, textAlign: 'left' }}>
                Camera & microphone streams have been released. Your test session is safely closed. You may now close this browser tab.
              </Alert>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => {
                  window.close();
                  window.location.href = 'about:blank';
                }}
                sx={{ py: 1.5, fontSize: 16, fontWeight: 800, borderRadius: 2.5, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
              >
                🚪 Exit Assessment & Close Tab
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f8f7', p: { xs: 2, md: 5 }, userSelect: 'none' }}>
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        {/* Header Title */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f4c5c' }}>
              Cbtshire.ai Proctored Technical Assessment
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              AI Camera Monitoring & Tab Integrity Lock Active
            </Typography>
          </Box>
          <Chip
            icon={<ShieldRoundedIcon />}
            label="Proctoring Enforced"
            color="primary"
            sx={{ fontWeight: 700, bgcolor: '#087f8c' }}
          />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
        {warningAlert && <Alert severity="warning" sx={{ mb: 3, borderRadius: 2, fontWeight: 700 }}>{warningAlert}</Alert>}

        {/* STEP 1: Proctoring Setup Screen (Before Starting Test) */}
        {!proctoringStarted ? (
          <Card sx={{ borderRadius: 4, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <CardContent>
              <Stack spacing={3} alignItems="center" textAlign="center">
                <Box sx={{ p: 2, borderRadius: '50%', bgcolor: '#e0f2fe', color: '#0284c7' }}>
                  <SecurityRoundedIcon sx={{ fontSize: 60 }} />
                </Box>
                
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    📹 Live Camera Proctoring & Rules
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: 580, mx: 'auto', mt: 1 }}>
                    To ensure candidate integrity, this assessment requires webcam access and enforces a strict single-window lock.
                  </Typography>
                </Box>

                <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 3, maxWidth: 600, textAlign: 'left', width: '100%' }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <VideocamRoundedIcon color="primary" sx={{ mt: 0.2 }} />
                      <Box>
                        <Typography fontWeight={700} variant="subtitle2">Webcam Camera Monitoring</Typography>
                        <Typography variant="caption" color="text.secondary">Your front camera will monitor head movement and eye direction throughout the test.</Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <LockRoundedIcon color="warning" sx={{ mt: 0.2 }} />
                      <Box>
                        <Typography fontWeight={700} variant="subtitle2">Strict Single Tab Lock</Typography>
                        <Typography variant="caption" color="text.secondary">Navigating away from this tab, opening another browser, or minimizing the window will <b>IMMEDIATELY FAIL & DISQUALIFY</b> your submission.</Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <WarningAmberRoundedIcon color="error" sx={{ mt: 0.2 }} />
                      <Box>
                        <Typography fontWeight={700} variant="subtitle2">Copying & Pasting Disabled</Typography>
                        <Typography variant="caption" color="text.secondary">Copying question text, right-clicking, or pasting content is blocked and flagged.</Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>

                <Button
                  variant="contained"
                  size="large"
                  startIcon={cameraLoading ? <CircularProgress size={20} color="inherit" /> : <VideocamRoundedIcon />}
                  onClick={() => void startProctoringCamera()}
                  disabled={cameraLoading || !questions.length}
                  sx={{ py: 1.8, px: 4, fontSize: 17, fontWeight: 800, borderRadius: 3, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
                >
                  {cameraLoading ? 'Starting Camera...' : '📷 Turn On Camera & Begin Assessment'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          /* STEP 2: Proctored Test Taking Screen */
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 280px' }, gap: 3 }}>
            {/* Questions Container */}
            <Stack spacing={2.5}>
              {questions.map((question, index) => (
                <Card key={question.id} sx={{ borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography fontWeight={800} sx={{ mb: 2, fontSize: 17 }}>
                      {index + 1}. {question.prompt}
                    </Typography>
                    <RadioGroup
                      value={answers[String(question.id)] ?? ''}
                      onChange={(event) => setAnswers({ ...answers, [String(question.id)]: event.target.value })}
                    >
                      {question.options.map((option) => (
                        <FormControlLabel
                          key={option}
                          value={option}
                          control={<Radio color="primary" disabled={disqualified} />}
                          label={option}
                          sx={{ my: 0.5, p: 0.5, borderRadius: 1.5, '&:hover': { bgcolor: '#f1f5f9' } }}
                        />
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="contained"
                size="large"
                onClick={() => void submit()}
                disabled={!questions.length || submitting || Boolean(submissionResult) || disqualified}
                sx={{ py: 1.8, fontSize: 17, fontWeight: 800, borderRadius: 3, bgcolor: '#087f8c', '&:hover': { bgcolor: '#06646f' } }}
              >
                {submitting ? 'Submitting & Validating Integrity...' : 'Submit Proctored Assessment'}
              </Button>
            </Stack>

            {/* Live Camera Proctoring Sidebar Widget */}
            <Box>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, position: 'sticky', top: 20, bgcolor: '#ffffff', borderColor: strikes > 0 ? '#ef4444' : cameraActive ? '#10b981' : '#cbd5e1' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary">
                    AI SENSOR PROCTORING
                  </Typography>
                  <Chip
                    size="small"
                    label={`${strikes}/3 Strikes`}
                    color={strikes === 0 ? 'success' : strikes === 1 ? 'warning' : 'error'}
                    sx={{ fontWeight: 800, height: 20, fontSize: 11 }}
                  />
                </Stack>
                
                <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: '#0f172a', aspectRatio: '4/3', display: 'grid', placeItems: 'center' }}>
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                    />
                  ) : (
                    <Stack alignItems="center" spacing={1} color="#64748b">
                      <VideocamOffRoundedIcon sx={{ fontSize: 40 }} />
                      <Typography variant="caption">Camera Off</Typography>
                    </Stack>
                  )}

                  {/* Hidden Canvas for Live Video Frame Computer Vision Analysis */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Pulsing Live Recording Badge */}
                  {cameraActive && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        px: 1,
                        py: 0.3,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.8
                      }}
                    >
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', animation: 'pulse 1.5s infinite' }} />
                      <Typography variant="caption" color="white" fontWeight={700} sx={{ fontSize: 10 }}>
                        AI MONITORED
                      </Typography>
                    </Box>
                  )}

                  {/* Looking Away Alert Banner on Video Feed */}
                  {lookingAway && !phoneDetected && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        right: 8,
                        bgcolor: 'rgba(234, 88, 12, 0.95)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: 11
                      }}
                    >
                      ⚠️ HEAD TURNED / LOOKING AWAY!
                    </Box>
                  )}

                  {/* Phone Detection Alert Banner on Video Feed */}
                  {phoneDetected && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        right: 8,
                        bgcolor: 'rgba(239, 68, 68, 0.95)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: 11
                      }}
                    >
                      ⚠️ PHONE / SECOND DEVICE DETECTED!
                    </Box>
                  )}
                </Box>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {/* Real-time Microphone Audio & Voice Gauge */}
                  <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <MicRoundedIcon sx={{ fontSize: 16, color: audioLevel > 35 ? '#ef4444' : '#087f8c' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          LIVE AUDIO NOISE LEVEL
                        </Typography>
                      </Box>
                      <Typography variant="caption" fontWeight={800} color={audioLevel > 35 ? '#ef4444' : '#10b981'}>
                        {audioLevel > 35 ? '⚠️ High Sound / Voice' : `${audioLevel}% (Quiet)`}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={audioLevel}
                      color={audioLevel > 35 ? 'error' : 'primary'}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Paper>

                  {/* Phone & Screen Glare Detection Status */}
                  <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      DEVICE & PHONE MONITORING
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color={phoneDetected ? '#ef4444' : '#10b981'}>
                      {phoneDetected ? '❌ Mobile Device Detected' : '🟢 Verified (No External Devices)'}
                    </Typography>
                  </Paper>

                  {/* Face Presence Status */}
                  <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      FACE CENTERING & PRESENCE
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color={faceDetected ? '#10b981' : '#ef4444'}>
                      {faceDetected ? '🟢 Face Centered & Clear' : '❌ Camera Obstructed / No Face'}
                    </Typography>
                  </Paper>

                  {/* Tab Integrity Status */}
                  <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                      TAB & WINDOW INTEGRITY
                    </Typography>
                    <Typography variant="body2" fontWeight={800} color={tabSwitches === 0 ? '#10b981' : '#ef4444'}>
                      {tabSwitches === 0 ? '🟢 Single Tab Locked (Compliant)' : `❌ ${tabSwitches} Tab Switch (Disqualified)`}
                    </Typography>
                  </Paper>
                </Stack>
              </Paper>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

