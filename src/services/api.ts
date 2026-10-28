import axios from 'axios';
import type { CreateUserData, UpdateUserData, RegisterData } from '../utils/types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 if not already on login, register, or verify-email page
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      const publicPaths = ['/login', '/register', '/verify-email'];
      if (!publicPaths.some((p) => window.location.pathname.startsWith(p))) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (data: RegisterData) =>
    api.post('/api/auth/register', data),
  /** Verify 6-digit OTP after registration */
  verifyOtp: (email: string, otp: string) =>
    api.post('/api/auth/verify-otp', { email, otp }),
  /** Resend OTP to the given email */
  resendOtp: (email: string) =>
    api.post('/api/auth/resend-otp', { email }),
  getProfile: () => api.get('/api/auth/profile'),
};

export const taskApi = {
  getTasks: () => api.get('/api/tasks'),
  createTask: (data: { title: string; description: string; status: string; userId?: number }) =>
    api.post('/api/tasks', data),
  updateTask: (taskId: number, data: { title: string; description: string; status?: string }) =>
    api.patch(`/api/tasks/${taskId}`, data),
  updateStatus: (taskId: number, status: string) =>
    api.patch(`/api/tasks/${taskId}/status`, { status }),
  deleteTask: (taskId: number) => api.delete(`/api/tasks/${taskId}`),
};

export const adminApi = {
  getAllUsers: () => api.get('/api/admin/users'),
  createUser: (data: CreateUserData) =>
    api.post('/api/admin/users', data),
  createEmployee: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post('/api/admin/users', data),
  updateUser: (id: number, data: UpdateUserData) =>
    api.patch(`/api/admin/users/${id}`, data),
  deleteUser: (id: number) =>
    api.delete(`/api/admin/users/${id}`),
};

export default api;
