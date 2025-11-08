import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppBar, Toolbar, Typography, Button, Breadcrumbs, Link } from '@mui/material';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import FileList from './FileList';

function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumbs = location.pathname.split('/').filter(Boolean);  // 简化面包屑

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>墨染云盘</Typography>
          <Button color="inherit" onClick={() => { navigate('/login'); logout(); }}>退出</Button>
        </Toolbar>
      </AppBar>
      <Breadcrumbs aria-label="breadcrumb" sx={{ p: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => navigate('/dashboard')}>首页</Link>
        {breadcrumbs.map((crumb, i) => <Typography key={i}>{crumb}</Typography>)}
      </Breadcrumbs>
      <Routes>
        <Route path="/" element={<FileList />} />
      </Routes>
    </>
  );
}

export default Dashboard;