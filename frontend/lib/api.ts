import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

function clearSessionAndRedirect() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  document.cookie = 'auth_token=; path=/; max-age=0';
  window.location.replace('/login');
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

    if (!refreshToken) {
      isRefreshing = false;
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    try {
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        'http://localhost:4000/auth/refresh',
        { refreshToken },
      );
      const { accessToken, refreshToken: newRefreshToken } = res.data;

      localStorage.setItem('token', accessToken);
      if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
      document.cookie = `auth_token=${accessToken}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;

      processQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
