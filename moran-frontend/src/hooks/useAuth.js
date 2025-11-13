import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext'; // 相对路径导入 AuthContext（从独立上下文文件）

/**
 * useAuth hook - 认证状态钩子
 * 功能：从 AuthContext 获取 user、login、logout。
 * 使用：const { user, login, logout } = useAuth();
 * 错误处理：若未在 Provider 内使用，抛出错误。
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 AuthContext.Provider 内使用');
  }
  return context;
};