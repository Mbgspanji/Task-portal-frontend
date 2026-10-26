import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  throw new Error('VITE_API_URL must be configured before starting the application.');
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
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
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  getProfile: () => api.get('/api/auth/profile'),
};

export const taskApi = {
  getTasks: () => api.get('/api/tasks'),
  createTask: (data: { title: string; description: string; status: string }) =>
    api.post('/api/tasks', data),
  updateTask: (taskId: number, data: { title: string; description: string }) =>
    api.patch(`/api/tasks/${taskId}`, data),
  updateStatus: (taskId: number, status: string) =>
    api.patch(`/api/tasks/${taskId}/status`, { status }),
  deleteTask: (taskId: number) => api.delete(`/api/tasks/${taskId}`),
};

export const adminApi = {
  createEmployee: (data: { name: string; email: string; password: string }) =>
    api.post('/api/admin/users', data),
  getAllUsers: () => api.get('/api/admin/users'),
};

export default api;
