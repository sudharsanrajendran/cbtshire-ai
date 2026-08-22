import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, ClickAwayListener, Divider, Drawer, IconButton, InputAdornment, LinearProgress, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Paper, Stack, TextField, Toolbar, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import type { Candidate, DashboardStats, Job } from './types';
import { useAuth } from './hooks/useAuth';
import { ModulePage } from './components/ModulePage';
import { login, register } from './services/authService';
import { getDashboard } from './services/dashboardService';
import { searchAll } from './services/advancedService';
import { EventPage } from './components/EventPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';
import { InterviewPage } from './components/InterviewPage';
import { SettingsPage } from './components/SettingsPage';
import { PublicApplyPage } from './components/PublicApplyPage';
import { AssessmentPortalPage } from './components/AssessmentPortalPage';
import { IntegrationsPage } from './components/IntegrationsPage';

const navGroups = [{ label: 'Workspace', items: [{ label: 'Overview', path: '/dashboard', icon: <DashboardRoundedIcon /> }, { label: 'Jobs', path: '/jobs', icon: <WorkOutlineRoundedIcon /> }, { label: 'Candidates', path: '/candidates', icon: <GroupOutlinedIcon /> }, { label: 'Integrations', path: '/integrations', icon: <ExtensionOutlinedIcon /> }] }, { label: 'Process', items: [{ label: 'Assessments', path: '/assessments', icon: <AssignmentOutlinedIcon /> }, { label: 'Interviews', path: '/interviews', icon: <EventOutlinedIcon /> }, { label: 'Hiring events', path: '/hiring-events', icon: <EventOutlinedIcon /> }, { label: 'Offers', path: '/offers', icon: <LocalOfferOutlinedIcon /> }] }, { label: 'Insights', items: [{ label: 'Analytics', path: '/analytics', icon: <InsightsOutlinedIcon /> }] }];
const chartData = [{ month: 'Feb 01', applications: 48 }, { month: 'Feb 08', applications: 76 }, { month: 'Feb 15', applications: 62 }, { month: 'Feb 22', applications: 108 }, { month: 'Mar 01', applications: 94 }, { month: 'Mar 08', applications: 132 }, { month: 'Mar 15', applications: 156 }];
const fallbackStats: DashboardStats = { total_jobs: 24, active_jobs: 12, total_candidates: 1842, shortlisted: 168, interviews: 64, offers: 18, hired: 11 };
const fallbackJobs: Job[] = [{ id: 1, title: 'Senior Product Designer', department: 'Design', location: 'Remote / US', employment_type: 'Full-time', experience_level: 'Senior', status: 'published', applicants: 184, openings: 1, updated_at: 'Today', skills: ['Figma', 'Research'] }, { id: 2, title: 'Frontend Engineer', department: 'Engineering', location: 'New York, NY', employment_type: 'Full-time', experience_level: 'Mid-level', status: 'published', applicants: 126, openings: 2, updated_at: 'Yesterday', skills: ['React', 'TypeScript'] }, { id: 3, title: 'Growth Marketing Lead', department: 'Marketing', location: 'Remote / US', employment_type: 'Full-time', experience_level: 'Lead', status: 'draft', applicants: 0, openings: 1, updated_at: 'Mar 14', skills: ['SEO', 'Lifecycle'] }];
const fallbackCandidates: Candidate[] = [{ id: 1, name: 'Sofia Laurent', email: 'sofia.laurent@email.com', role: 'Product Designer', location: 'Austin, TX', match_score: 94, status: 'Shortlisted', applied_at: '2h ago', skills: ['Figma', 'Systems', 'Research'] }, { id: 2, name: 'Marcus Johnson', email: 'marcus.j@email.com', role: 'Frontend Engineer', location: 'Brooklyn, NY', match_score: 91, status: 'Interview', applied_at: '5h ago', skills: ['React', 'TypeScript', 'GraphQL'] }, { id: 3, name: 'Elena Rossi', email: 'elena.rossi@email.com', role: 'Growth Marketing Lead', location: 'Chicago, IL', match_score: 87, status: 'Screening', applied_at: 'Yesterday', skills: ['Content', 'SEO', 'B2B'] }];

function App() { const { user, isAuthenticated, checking, logout } = useAuth(); if (checking) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Typography color="text.secondary">Checking your session...</Typography></Box>; return <Routes><Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} /><Route path="/apply/:jobId" element={<PublicApplyPage />} /><Route path="/assessment/:token" element={<AssessmentPortalPage />} /><Route path="*" element={isAuthenticated ? <Shell userName={user?.name ?? 'Workspace admin'} logout={logout} /> : <Navigate to="/login" replace />} /></Routes>; }

function UserAvatarMenu({ userName, logout }: { userName: string; logout: () => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ p: 0.5 }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: '#ef8354', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {userName.split(' ').map((n) => n[0]).join('')}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          elevation: 6,
          sx: { minWidth: 210, mt: 1, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>{userName}</Typography>
          <Typography variant="caption" color="text.secondary">Workspace Admin</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }} sx={{ py: 1.2, gap: 1.5 }}>
          <SettingsOutlinedIcon fontSize="small" />
          <Typography variant="body2" fontWeight={600}>Settings</Typography>
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); logout(); }} sx={{ py: 1.2, gap: 1.5, color: 'error.main' }}>
          <LogoutRoundedIcon fontSize="small" color="error" />
          <Typography variant="body2" fontWeight={700}>Sign out</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}

function GlobalSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ jobs: Array<{ id: number; title: string }>; candidates: Array<{ id: number; name: string; role: string }> } | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAll(query.trim());
        setResults(res);
      } catch (err) {
        console.error('Search failed', err);
        setResults({ jobs: [], candidates: [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isOpen = Boolean(anchorEl) && (Boolean(results) || loading);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box sx={{ position: 'relative' }}>
        <TextField
          size="small"
          placeholder="Search candidates, jobs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAnchorEl(e.currentTarget);
          }}
          onFocus={(e) => setAnchorEl(e.currentTarget)}
          sx={{ width: { xs: 170, sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f6f8f7' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={16} color="inherit" />
              </InputAdornment>
            ) : query ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQuery('')}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {isOpen && (
          <Paper
            elevation={6}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 1,
              zIndex: 1300,
              maxHeight: 360,
              overflowY: 'auto',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 300,
              bgcolor: '#ffffff',
            }}
          >
            {loading && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Searching workspace...</Typography>
              </Box>
            )}
            {!loading && results && (
              <List disablePadding>
                {results.candidates.length > 0 && (
                  <>
                    <ListSubheader sx={{ bgcolor: '#f0f4f4', fontWeight: 700, lineHeight: '32px', fontSize: 11, letterSpacing: '.05em', color: '#087f8c' }}>
                      CANDIDATES ({results.candidates.length})
                    </ListSubheader>
                    {results.candidates.map((cand) => (
                      <ListItemButton
                        key={`cand-${cand.id}`}
                        onClick={() => {
                          navigate('/candidates');
                          handleClose();
                          setQuery('');
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <GroupOutlinedIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={cand.name} secondary={cand.role} primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} secondaryTypographyProps={{ fontSize: 11 }} />
                      </ListItemButton>
                    ))}
                  </>
                )}
                {results.jobs.length > 0 && (
                  <>
                    <ListSubheader sx={{ bgcolor: '#f0f4f4', fontWeight: 700, lineHeight: '32px', fontSize: 11, letterSpacing: '.05em', color: '#087f8c' }}>
                      JOBS ({results.jobs.length})
                    </ListSubheader>
                    {results.jobs.map((j) => (
                      <ListItemButton
                        key={`job-${j.id}`}
                        onClick={() => {
                          navigate('/jobs');
                          handleClose();
                          setQuery('');
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <WorkOutlineRoundedIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={j.title} primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
                      </ListItemButton>
                    ))}
                  </>
                )}
                {results.candidates.length === 0 && results.jobs.length === 0 && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No matching jobs or candidates found.</Typography>
                  </Box>
                )}
              </List>
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}

function Shell({ userName, logout }: { userName: string; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const mobile = useMediaQuery('(max-width:900px)');
  const drawer = <Sidebar onNavigate={() => setOpen(false)} logout={logout} />;
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {mobile ? (
        <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 268 } }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          open
          PaperProps={{ sx: { width: 268, border: 0, bgcolor: '#102d37', color: '#dceceb' } }}
          sx={{ width: 268, flexShrink: 0, '& .MuiDrawer-paper': { width: 268, boxSizing: 'border-box' } }}
        >
          {drawer}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar
          sx={{
            height: 76,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,.82)',
            backdropFilter: 'blur(12px)',
            justify: 'space-between',
            px: { xs: 2, md: 4 },
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.5}>
            <IconButton onClick={() => setOpen(true)} sx={{ display: { md: 'none' } }}>
              <MenuRoundedIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Live recruitment workspace
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <GlobalSearchBar />
            <NotificationButton />
            <UserAvatarMenu userName={userName} logout={logout} />
          </Stack>
        </Toolbar>
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<ModulePage kind="jobs" />} />
            <Route path="/candidates" element={<ModulePage kind="candidates" />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/assessments" element={<ModulePage kind="assessments" />} />
            <Route path="/interviews" element={<ModulePage kind="interviews" />} />
            <Route path="/hiring-events" element={<EventPage />} />
            <Route path="/offers" element={<ModulePage kind="offers" />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SectionPage title="Settings" subtitle="Shape your workspace and permissions." />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

function Sidebar({ onNavigate, logout }: { onNavigate: () => void; logout: () => void }) {
  return (
    <Box sx={{ height: '100%', py: 3, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 3, mb: 5 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#ef8354', color: '#102d37', display: 'grid', placeItems: 'center', fontWeight: 900, fontFamily: 'Georgia' }}>C</Box>
          <Box>
            <Typography sx={{ fontWeight: 800, letterSpacing: '-.02em', color: 'inherit' }}>Cbtshire.ai</Typography>
            <Typography variant="caption" sx={{ color: '#8fb0b0' }}>TALENT OS</Typography>
          </Box>
        </Stack>
      </Box>
      <Box sx={{ px: 1.5, flex: 1 }}>
        {navGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 3 }}>
            <Typography variant="overline" sx={{ px: 1.5, color: '#729497', letterSpacing: '.12em', fontSize: 10 }}>{group.label}</Typography>
            <List disablePadding>
              {group.items.map((item) => (
                <ListItemButton key={item.path} component={NavLink} to={item.path} onClick={onNavigate} sx={{ borderRadius: 2, mb: .5, color: '#aac1c0', '&.active': { color: '#fff', bgcolor: '#1d4b54', '& .MuiListItemIcon-root': { color: '#ef8354' } }, '&:hover': { bgcolor: 'rgba(255,255,255,.06)', color: '#fff' } }}>
                  <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>
      <Box sx={{ px: 1.5 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,.1)', mb: 1.5 }} />
        <ListItemButton component={NavLink} to="/settings" onClick={onNavigate} sx={{ borderRadius: 2, color: '#aac1c0' }}>
          <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}><SettingsOutlinedIcon /></ListItemIcon>
          <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
        </ListItemButton>
        <Box sx={{ p: 1.5, mt: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#8fb0b0' }}>Workspace</Typography>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>Cbtshire.ai</Typography>
            <Typography variant="caption" sx={{ color: '#ef8354' }}>Enterprise AI</Typography>
          </Box>
          <Tooltip title="Sign out">
            <IconButton size="small" onClick={logout} sx={{ color: '#aac1c0', '&:hover': { color: '#ef8354', bgcolor: 'rgba(255,255,255,.08)' } }}>
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

function NotificationButton() { const [anchor, setAnchor] = useState<null | HTMLElement>(null); return <><IconButton onClick={(e) => setAnchor(e.currentTarget)}><NotificationsNoneRoundedIcon /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem onClick={() => setAnchor(null)}>New candidate application</MenuItem><MenuItem onClick={() => setAnchor(null)}>Interview feedback received</MenuItem></Menu></> }

function Dashboard() { const [stats, setStats] = useState(fallbackStats); const [jobs, setJobs] = useState(fallbackJobs); const [candidates, setCandidates] = useState(fallbackCandidates); useEffect(() => { if (localStorage.getItem('cbtshire_token') || localStorage.getItem('northstar_token')) void getDashboard().then((data) => { setStats(data.stats); setJobs(data.jobs); setCandidates(data.candidates); }).catch(() => undefined); }, []); const statCards = [{ label: 'Active jobs', value: stats.active_jobs, change: '+12.5%', color: '#087f8c' }, { label: 'Total candidates', value: stats.total_candidates.toLocaleString(), change: '+18.2%', color: '#6875d8' }, { label: 'Interviews this month', value: stats.interviews, change: '+8.4%', color: '#ef8354' }, { label: 'Offers extended', value: stats.offers, change: '+4.1%', color: '#2e9d70' }]; return <Stack spacing={3}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}><Box><Typography variant="h3" sx={{ fontSize: { xs: 32, md: 42 }, color: '#16313a' }}>Good morning, Maya.</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Here’s what’s happening across your hiring workspace.</Typography></Box><Button variant="contained" startIcon={<AddRoundedIcon />} sx={{ px: 2.5, py: 1.2 }}>Create a job</Button></Box><Alert icon={<AutoAwesomeRoundedIcon />} severity="info" sx={{ bgcolor: '#e7f4f2', color: '#145b63', border: '1px solid #c8e7e3', '& .MuiAlert-icon': { color: '#087f8c' } }}><b>New: AI candidate summaries</b> are ready for your review across 8 active roles. <Button size="small" endIcon={<ArrowForwardRoundedIcon />} sx={{ ml: 1, color: '#087f8c' }}>View insights</Button></Alert><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>{statCards.map((card) => <Card key={card.label}><CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: card.color, mt: .8 }} /><Chip label={card.change} size="small" icon={<ArrowUpwardRoundedIcon sx={{ fontSize: '14px !important' }} />} sx={{ bgcolor: '#e7f4f2', color: '#247d73', fontSize: 11, fontWeight: 700 }} /></Stack><Typography variant="h4" sx={{ mt: 2, fontSize: { xs: 26, md: 32 }, fontWeight: 800 }}>{card.value}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{card.label}</Typography></CardContent></Card>)}</Box><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.55fr 1fr' }, gap: 2 }}><Card><CardContent sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography variant="h6">Application flow</Typography><Typography variant="body2" color="text.secondary">Qualified applications over the last 6 weeks</Typography></Box><Chip label="Last 6 weeks" variant="outlined" size="small" /></Stack><Box sx={{ height: 270, mt: 3 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="flow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#087f8c" stopOpacity={.26} /><stop offset="100%" stopColor="#087f8c" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8efee" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8aa0a1', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8aa0a1', fontSize: 11 }} /><ChartTooltip contentStyle={{ border: '1px solid #dce9e7', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,.08)' }} /><Area type="monotone" dataKey="applications" stroke="#087f8c" strokeWidth={3} fill="url(#flow)" /></AreaChart></ResponsiveContainer></Box></CardContent></Card><Card><CardContent sx={{ p: 3 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h6">Hiring health</Typography><Typography variant="body2" color="text.secondary">This month’s conversion</Typography></Box><InsightsOutlinedIcon sx={{ color: '#ef8354' }} /></Stack><Stack spacing={2.6} sx={{ mt: 3 }}>{[['Shortlist rate', 68, '#087f8c'], ['Interview conversion', 42, '#6875d8'], ['Offer acceptance', 76, '#2e9d70']].map(([label, value, color]) => <Box key={label as string}><Stack direction="row" justifyContent="space-between" sx={{ mb: .8 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={800}>{value}%</Typography></Stack><LinearProgress variant="determinate" value={value as number} sx={{ height: 8, borderRadius: 10, bgcolor: '#edf2f1', '& .MuiLinearProgress-bar': { bgcolor: color as string, borderRadius: 10 } }} /></Box>)}</Stack><Button endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 3, px: 0 }}>View full analytics</Button></CardContent></Card></Box><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr .8fr' }, gap: 2 }}><Card><CardContent sx={{ p: 0 }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3, pb: 2 }}><Box><Typography variant="h6">Recent candidates</Typography><Typography variant="body2" color="text.secondary">Latest talent entering your pipeline</Typography></Box><Button size="small" endIcon={<ArrowForwardRoundedIcon />}>See all</Button></Stack><Box sx={{ overflowX: 'auto' }}>{candidates.map((candidate, index) => <Stack key={candidate.id} direction="row" alignItems="center" gap={2} sx={{ px: 3, py: 1.7, borderTop: index ? '1px solid #edf2f1' : 0, minWidth: 520 }}><Avatar sx={{ width: 38, height: 38, bgcolor: ['#d8edeb', '#e9e2f4', '#fce3d7'][index], color: '#16313a', fontSize: 13, fontWeight: 800 }}>{candidate.name.split(' ').map((n) => n[0]).join('')}</Avatar><Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={800}>{candidate.name}</Typography><Typography variant="caption" color="text.secondary">{candidate.role} · {candidate.location}</Typography></Box><Chip label={`${candidate.match_score}% match`} size="small" sx={{ bgcolor: '#e7f4f2', color: '#247d73', fontWeight: 700, fontSize: 11 }} /><Chip label={candidate.status} size="small" variant="outlined" sx={{ borderColor: '#d4e0df', fontSize: 11 }} /><Typography variant="caption" color="text.secondary" sx={{ width: 54, textAlign: 'right' }}>{candidate.applied_at}</Typography><IconButton size="small"><MoreHorizRoundedIcon fontSize="small" /></IconButton></Stack>)}</Box></CardContent></Card><Card><CardContent sx={{ p: 3 }}><Typography variant="h6">Open roles</Typography><Typography variant="body2" color="text.secondary">Performance by active job</Typography><Stack spacing={2} sx={{ mt: 2.5 }}>{jobs.filter((j) => j.status === 'published').map((job) => <Box key={job.id}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="body2" fontWeight={700}>{job.title}</Typography><Typography variant="caption" color="text.secondary">{job.applicants} applicants · {job.openings} opening</Typography></Box><Typography variant="body2" fontWeight={800} color="primary">{Math.round(job.applicants / 2.4)}%</Typography></Stack><LinearProgress variant="determinate" value={Math.min(100, job.applicants / 2.4)} sx={{ mt: 1, height: 5, borderRadius: 5, bgcolor: '#edf2f1', '& .MuiLinearProgress-bar': { bgcolor: '#087f8c' } }} /></Box>)}</Stack></CardContent></Card></Box></Stack> }

function SectionPage({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) { const { logout } = useAuth(); if (title === 'Settings') return <SettingsPage logout={logout} />; return <Stack spacing={3}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h3" sx={{ fontSize: 38 }}>{title}</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>{subtitle}</Typography></Box>{action && <Button variant="contained" startIcon={<AddRoundedIcon />}>{action}</Button>}</Stack><Card><CardContent sx={{ py: 7, textAlign: 'center' }}><Typography variant="h5">Your {title.toLowerCase()} workspace is ready.</Typography><Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mt: 1 }}>This module is connected to the FastAPI service layer. Add your first record to start building the hiring journey.</Typography>{action && <Button variant="outlined" sx={{ mt: 3 }} startIcon={<AddRoundedIcon />}>{action}</Button>}</CardContent></Card></Stack> }

function Login() { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const submit = async () => { setLoading(true); setError(''); try { let result; try { result = await login(email, password); } catch { result = await register(name || 'Workspace Admin', email, password); } localStorage.setItem('cbtshire_token', result.access_token); localStorage.setItem('northstar_token', result.access_token); window.location.href = '/dashboard'; } catch { setError('Could not connect to the API. Start the FastAPI server and try again.'); } finally { setLoading(false); } }; return <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { md: '1.1fr 1fr' }, bgcolor: '#f6f8f7' }}><Box sx={{ display: { xs: 'none', md: 'flex' }, p: 7, bgcolor: '#102d37', color: '#fff', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}><Box sx={{ position: 'absolute', width: 520, height: 520, border: '1px solid rgba(255,255,255,.12)', borderRadius: '50%', right: -220, top: 80 }} /><Box sx={{ position: 'absolute', width: 360, height: 360, border: '1px solid rgba(239,131,84,.35)', borderRadius: '50%', right: -110, top: 160 }} /><Stack direction="row" alignItems="center" gap={1.5}><Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#ef8354', color: '#102d37', display: 'grid', placeItems: 'center', fontWeight: 900, fontFamily: 'Georgia' }}>C</Box><Typography fontWeight={800}>Cbtshire.ai</Typography></Stack><Box sx={{ position: 'relative', maxWidth: 560 }}><Typography variant="h1" sx={{ fontSize: { md: 54, lg: 68 }, lineHeight: 1.02, color: '#f4fbfa' }}>Make room for great people.</Typography><Typography sx={{ mt: 3, maxWidth: 400, color: '#a7c0bf', fontSize: 17, lineHeight: 1.7 }}>A considered hiring workspace for teams who care about the journey as much as the outcome.</Typography><Stack direction="row" spacing={1} sx={{ mt: 4 }}><Chip label="Human-led" sx={{ color: '#d9efec', borderColor: '#44747a' }} variant="outlined" /><Chip label="AI-assisted" sx={{ color: '#d9efec', borderColor: '#44747a' }} variant="outlined" /></Stack></Box><Typography variant="caption" sx={{ color: '#759596' }}>© 2026 Cbtshire.ai · Intelligent Hiring & Assessment Platform</Typography></Box><Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 3, md: 7 } }}><Box sx={{ width: '100%', maxWidth: 420 }}><Box sx={{ display: { md: 'none' }, mb: 8 }}><Typography variant="h5" fontWeight={800}>Cbtshire.ai</Typography></Box><Typography variant="overline" sx={{ color: 'primary.main', letterSpacing: '.14em', fontWeight: 800 }}>WELCOME BACK</Typography><Typography variant="h3" sx={{ mt: 1, fontSize: 40 }}>Sign in to your workspace</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Continue shaping your next great team.</Typography><Stack spacing={2.2} sx={{ mt: 4 }}>{error && <Alert severity="error">{error}</Alert>}<TextField label="Your name (first sign-in)" value={name} onChange={(e) => setName(e.target.value)} fullWidth /><TextField label="Work email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth /><TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth /><Button variant="contained" size="large" onClick={() => void submit()} disabled={loading || !email || !password} sx={{ py: 1.5 }}>{loading ? 'Connecting...' : 'Sign in'}</Button></Stack><Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>First time here? Your workspace will be created automatically.</Typography></Box></Box></Box> }

export default App;
