import { useCallback, useEffect, useState } from 'react';
import { getJobs } from '../services/jobService';
import { getCandidates } from '../services/candidateService';
import { getAssessments } from '../services/assessmentService';
import { getInterviews } from '../services/interviewService';
import { getOffers } from '../services/offerService';
export function useRecruitment<T>(resource: 'jobs' | 'candidates' | 'assessments' | 'interviews' | 'offers') { const [items, setItems] = useState<T[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const reload = useCallback(async () => { setLoading(true); setError(''); try { const loaders = { jobs: getJobs, candidates: getCandidates, assessments: getAssessments, interviews: getInterviews, offers: getOffers }; setItems((await loaders[resource]()) as T[]); } catch { setError('Connect the API and sign in to load this workspace.'); } finally { setLoading(false); } }, [resource]); useEffect(() => { void reload(); }, [reload]); return { items, loading, error, reload }; }
