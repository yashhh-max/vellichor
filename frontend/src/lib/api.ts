import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Empty string = same-origin (Vite dev proxy forwards /api to backend; in prod
// the frontend is served alongside /api on the same host). Override with
// VITE_API_URL if you deploy frontend and backend to different hosts.
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT from localStorage on every request.
api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Surface backend error messages cleanly for components to read.
export type ApiError = {
  status: number;
  message: string;
  fieldErrors?: { field: string; msg: string }[];
};

export function toApiError(err: unknown): ApiError {
  const ax = err as AxiosError<{ message?: string; errors?: { field: string; msg: string }[] }>;
  if (ax?.isAxiosError) {
    const status = ax.response?.status ?? 0;
    const data = ax.response?.data;
    return {
      status,
      message: data?.message || ax.message || 'Network error',
      fieldErrors: data?.errors,
    };
  }
  return { status: 0, message: 'Unknown error' };
}

export default api;
