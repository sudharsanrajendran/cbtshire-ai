import { api } from './api';
import type { Offer } from '../types';
export const getOffers = async () => (await api.get<Offer[]>('/offers')).data;
export const createOffer = async (payload: Omit<Offer, 'id' | 'candidate_name' | 'status'>) => (await api.post<Offer>('/offers', payload)).data;
