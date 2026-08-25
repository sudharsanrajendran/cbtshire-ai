import React from 'react';
import { Box, Card, CardContent, Typography, LinearProgress, Chip, Stack, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StarsIcon from '@mui/icons-material/Stars';

interface ScoreBreakdown {
  skills_score: number;
  skills_max: number;
  experience_score: number;
  experience_max: number;
  title_score: number;
  title_max: number;
  education_score: number;
  education_max: number;
  certification_score: number;
  certification_max: number;
}

interface ATSScoreCardProps {
  atsScore: number;
  isShortlisted?: boolean;
  scoreBreakdown?: ScoreBreakdown;
  matchingSkills?: string[];
  missingSkills?: string[];
  explanation?: string;
}

export const ATSScoreCard: React.FC<ATSScoreCardProps> = ({
  atsScore,
  isShortlisted = atsScore >= 70,
  scoreBreakdown = {
    skills_score: Math.round(atsScore * 0.4),
    skills_max: 40,
    experience_score: Math.round(atsScore * 0.25),
    experience_max: 25,
    title_score: Math.round(atsScore * 0.15),
    title_max: 15,
    education_score: Math.round(atsScore * 0.1),
    education_max: 10,
    certification_score: Math.round(atsScore * 0.1),
    certification_max: 10,
  },
  matchingSkills = [],
  missingSkills = [],
  explanation,
}) => {
  const getBadgeColor = (score: number) => {
    if (score >= 70) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const color = getBadgeColor(atsScore);

  const metrics = [
    { label: 'Skills Match (40%)', val: scoreBreakdown.skills_score, max: scoreBreakdown.skills_max },
    { label: 'Experience Match (25%)', val: scoreBreakdown.experience_score, max: scoreBreakdown.experience_max },
    { label: 'Job Title Match (15%)', val: scoreBreakdown.title_score, max: scoreBreakdown.title_max },
    { label: 'Education Match (10%)', val: scoreBreakdown.education_score, max: scoreBreakdown.education_max },
    { label: 'Certification Match (10%)', val: scoreBreakdown.certification_score, max: scoreBreakdown.certification_max },
  ];

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <StarsIcon sx={{ color, fontSize: 32 }} />
            <Typography variant="h6" fontWeight={700} color="#1e293b">
              ATS Match Analysis
            </Typography>
          </Box>

          <Box
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: 50,
              bgcolor: color === '#10b981' ? '#ecfdf5' : color === '#f59e0b' ? '#fffbe6' : '#fef2f2',
              border: `1.5px solid ${color}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isShortlisted ? '🟢 SHORTLISTED' : atsScore >= 50 ? '🟡 UNDER REVIEW' : '🔴 LOW MATCH'}
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color }}>
              {atsScore} <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>/ 100</Typography>
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="#64748b" mb={3}>
          {explanation || `Candidate scored ${atsScore}/100 based on skill relevance, experience depth, title similarity, and background alignment.`}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.5}>
          Deterministic Weighted Score Breakdown
        </Typography>

        <Stack spacing={1.5} mb={3}>
          {metrics.map((m, idx) => (
            <Box key={idx}>
              <Box display="flex" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" fontWeight={600} color="#475569">
                  {m.label}
                </Typography>
                <Typography variant="caption" fontWeight={700} color="#1e293b">
                  {m.val} / {m.max}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (m.val / m.max) * 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: color,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {matchingSkills.length > 0 && (
          <Box mb={2}>
            <Box display="flex" alignItems="center" gap={0.5} mb={1}>
              <CheckCircleIcon sx={{ color: '#10b981', fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={700} color="#065f46">
                Strong Verified Skill Matches ({matchingSkills.length})
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={0.75}>
              {matchingSkills.map((sk, i) => (
                <Chip key={i} label={sk} size="small" color="success" variant="outlined" sx={{ fontWeight: 600, bgcolor: '#f0fdf4' }} />
              ))}
            </Box>
          </Box>
        )}

        {missingSkills.length > 0 && (
          <Box>
            <Box display="flex" alignItems="center" gap={0.5} mb={1}>
              <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={700} color="#92400e">
                Missing / Recommended Skill Alignment ({missingSkills.length})
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={0.75}>
              {missingSkills.map((sk, i) => (
                <Chip key={i} label={sk} size="small" color="warning" variant="outlined" sx={{ fontWeight: 600, bgcolor: '#fffbe6' }} />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
