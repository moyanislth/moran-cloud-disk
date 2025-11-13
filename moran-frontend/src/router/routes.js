import React from 'react';
import { Navigate } from 'react-router-dom';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';

// 路由守护 loader（v7 特性：服务器式检查，内联使用解耦）
const protectedLoader = () => {
  const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1];
  if (!token) {
    throw new Response('', { status: 401 });
  }
  return null;
};

const publicLoader = () => {
  const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('jwt='))?.split('=')[1];
  if (token) {
    return { redirect: '/dashboard' };
  }
  return null;
};

// 路由配置（纯数据结构，解耦 UI 导入）
export const routes = [
  {
    path: '/',
    loader: publicLoader,
    element: React.createElement(Navigate, { to: '/login', replace: true }),
  },
  {
    path: '/login',
    loader: publicLoader,
    element: React.createElement(Login),
  },
  {
    path: '/dashboard/*',
    loader: protectedLoader,
    element: React.createElement(Dashboard),
  },
];