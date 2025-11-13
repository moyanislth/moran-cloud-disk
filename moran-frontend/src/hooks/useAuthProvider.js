import { useState, useEffect, useCallback } from 'react';
import { axiosInstance } from '../utils/api';

/**
 * useAuthProvider - 用户认证逻辑 Hook
 * 功能：
 *  - 初始化 token（localStorage / cookie）
 *  - 提供 login / logout 方法
 *  - 统一 axios header 管理
 *  - 状态：user, loading
 */
export function useAuthProvider() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** 从存储中获取 token */
  const getStoredToken = useCallback(() => {
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    const cookie = document.cookie.split('; ').find((row) => row.startsWith('jwt='));
    return cookie ? cookie.split('=')[1] : null;
  }, []);

  /** 初始化认证状态 */
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser({ token });
    }
    setLoading(false);
  }, [getStoredToken]);

  /** 登录逻辑 */
  const login = useCallback((token, rememberMe) => {
    setUser({ token });
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;

    if (rememberMe) {
      localStorage.setItem('token', token);
      document.cookie = `jwt=${token}; max-age=${7 * 24 * 60 * 60}; path=/; Secure; SameSite=Strict`;
    } else {
      localStorage.removeItem('token');
      document.cookie = `jwt=${token}; path=/; Secure; SameSite=Strict`;
    }
  }, []);

  /** 登出逻辑 */
  const logout = useCallback(() => {
    setUser(null);
    delete axiosInstance.defaults.headers.common.Authorization;
    localStorage.removeItem('token');
    document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.replace('/login'); // 替换跳转，避免后退
  }, []);

  return { user, login, logout, loading };
}
