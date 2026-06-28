import axios from 'axios';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

// Attach bearer token (kept in localStorage as a fallback to the cookie)
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('ypp_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Normalise error messages
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err?.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

export default api;
