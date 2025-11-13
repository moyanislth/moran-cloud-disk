import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router/routes';
import { AuthContext } from './contexts/AuthContext';
import { useAuthProvider } from './hooks/useAuthProvider';

/**
 * App - 应用根组件
 * 功能：
 *  - 提供全局 AuthContext（useAuthProvider）
 *  - 挂载 React Router v7
 */
function App() {
  const { user, login, logout, loading } = useAuthProvider();

  if (loading) return <div>加载中...</div>;

  const router = createBrowserRouter(routes, {
    basename: '/',
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  });

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <RouterProvider router={router} />
    </AuthContext.Provider>
  );
}

export default App;
