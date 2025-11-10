import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api',
  // 移除全局 Content-Type，让 FormData auto multipart
  headers: {  // 空或只 Accept
    'Accept': 'application/json, text/plain, */*'
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Axios request:', config.method, config.url, 'Headers:', config.headers, 'Content-Type:', config.headers['Content-Type']);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    console.error('Axios error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);