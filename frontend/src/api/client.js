import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('appcse_token');
  if (token) {
    // If token length exceeds 2KB (likely containing base64 data from previous session), clear it to prevent HTTP 431
    if (token.length > 2048) {
      console.warn('Oversized auth token detected (>2KB), clearing localStorage to prevent HTTP 431.');
      localStorage.removeItem('token');
      localStorage.removeItem('appcse_token');
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 431 || error.response.status === 401)) {
      console.warn(`Auth error (${error.response.status}), clearing tokens.`);
      localStorage.removeItem('token');
      localStorage.removeItem('appcse_token');
    }
    return Promise.reject(error);
  }
);

export default client;
