import axios from 'axios';

/**
 * axiosInstance - 通用 API 客户端
 * 功能：
 *  - 动态 baseURL（兼容 Vite）
 *  - 统一超时与 Accept 头
 *  - 自动附加 Token
 *  - 响应拦截统一处理 401（清除凭证 + 重定向登录）
 *  - 生产模式下关闭日志
 */
const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'production'
    ? '/api'
    : 'http://localhost:8080/api',
  headers: {
    Accept: 'application/json, text/plain, */*',
  },
  timeout: 10000,
});

/** 请求拦截器 - 自动注入 Authorization Token */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.MODE !== 'production') {
      // 开发环境可选日志
      console.debug('[API REQUEST]', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** 响应拦截器 - 统一处理错误与登录过期 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status } = error.response || {};

    if (status === 401) {
      localStorage.removeItem('token');
      document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (import.meta.env.MODE !== 'production') {
      console.error('[API ERROR]', status, error.response?.data);
    }

    return Promise.reject(error);
  }
);

export { axiosInstance };
