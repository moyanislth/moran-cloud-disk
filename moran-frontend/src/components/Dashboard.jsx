import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppBar, Toolbar, Typography, Button, Breadcrumbs, Link } from '@mui/material';
import { useNavigate, useMatch, Routes, Route } from 'react-router-dom';
import { FileList } from './FileList';
import { axiosInstance } from '../utils/api';

/**
 * Dashboard 组件 - 文件管理仪表板主页面
 * 功能：渲染 AppBar、面包屑导航、文件列表；处理文件夹导航和路径链更新。
 * 依赖：useAuth hook 处理退出；react-router 处理路由；api.js 处理后端请求。
 */
function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const match = useMatch('/dashboard/folder/:id');
  const [currentParentId, setCurrentParentId] = useState(null);
  const [pathChain, setPathChain] = useState([]); // 路径链数组：[{ id: number, name: string }]

  /**
   * 获取路径链
   * @param {number} id - 文件夹 ID
   * @returns {Promise<void>} - 更新 pathChain 状态
   * 逻辑：调用 API 获取链路数据，映射为 {id, name} 格式；捕获错误并日志。
   */
  const fetchPathChain = useCallback(async (id) => {
    try {
      const res = await axiosInstance.get(`/files/path/${id}`);
      const chain = res.data.map((f) => ({ id: f.id, name: f.name }));
      setPathChain(chain);
    } catch (err) {
      console.error('获取路径链错误:', err);
    }
  }, []);

  // 监听路由参数变化，更新当前父文件夹 ID 和路径链
  useEffect(() => {
    const parentId = match ? parseInt(match.params.id, 10) : null;
    setCurrentParentId(parentId);
    if (parentId) {
      fetchPathChain(parentId);
    } else {
      setPathChain([]);
    }
  }, [match, fetchPathChain]); // 添加 fetchPathChain 依赖，确保 ESLint 合规

  /**
   * 处理导航（文件夹点击或面包屑点击）
   * @param {number|null} id - 目标文件夹 ID（null 表示根目录）
   * 逻辑：更新状态、导航路由、刷新路径链；统一拆分避免重复代码。
   */
  const handleNavigation = useCallback((id) => {
    setCurrentParentId(id);
    if (id === null) {
      setPathChain([]);
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/folder/${id}`);
      fetchPathChain(id);
    }
  }, [navigate, fetchPathChain]);

  return (
    <>
      {/* AppBar - 应用顶部栏 */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            墨染云盘
          </Typography>
          <Button color="inherit" onClick={logout}>
            退出
          </Button>
        </Toolbar>
      </AppBar>

      {/* Breadcrumbs - 面包屑导航 */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ p: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => handleNavigation(null)}
        >
          首页
        </Link>
        {pathChain.map((crumb) => (
          <Link
            key={crumb.id} // 使用 id 作为 key，更稳定
            underline="hover"
            color="inherit"
            onClick={() => handleNavigation(crumb.id)}
          >
            {crumb.name}
          </Link>
        ))}
      </Breadcrumbs>

      {/* Routes - 路由匹配文件列表 */}
      <Routes>
        <Route
          path="/*" // 合并根路径和 /folder/:id，简化匹配
          element={
            <FileList
              parentId={currentParentId}
              onFolderClick={handleNavigation} // 统一传入导航 handler
            />
          }
        />
      </Routes>
    </>
  );
}

export default Dashboard;