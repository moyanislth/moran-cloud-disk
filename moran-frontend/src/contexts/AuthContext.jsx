import { createContext } from 'react';

/**
 * AuthContext - 认证上下文
 * 功能：管理用户认证状态、登录/登出逻辑、token 存储。
 * 提供值：{ user: { token }, login(token, rememberMe), logout() }
 * 使用：在 Provider 中包裹 App；在组件中使用 useAuth() 消费。
 */
export const AuthContext = createContext();