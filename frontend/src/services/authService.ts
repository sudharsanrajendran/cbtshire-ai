import { api } from './api';
import type { User } from '../types';
export const login = async (email: string, password: string) => (await api.post<{ access_token: string; user: User }>('/auth/login', { email, password })).data;
export const register = async (name: string, email: string, password: string) => (await api.post<{ access_token: string; user: User }>('/auth/register', { name, email, password, organization: 'Cbtshire.ai' })).data;
export const getMe = async () => (await api.get<User>('/auth/me')).data;
export const forgotPassword = async (email: string) => (await api.post<{ success: boolean; message: string; email_sent?: boolean; otp?: string }>('/auth/forgot-password', { email })).data;
export const verifyOtp = async (email: string, otp: string) => (await api.post<{ success: boolean; message: string }>('/auth/verify-otp', { email, otp })).data;
export const resetPassword = async (email: string, otp: string, newPassword: string) => (await api.post<{ success: boolean; message: string }>('/auth/reset-password', { email, otp, new_password: newPassword })).data;
export const updateProfile = async (payload: {
  name?: string;
  linkedin_profile_url?: string;
  naukri_recruiter_id?: string;
  indeed_employer_id?: string;
  careers_page_url?: string;
}) => (await api.put<User>('/auth/profile', payload)).data;


