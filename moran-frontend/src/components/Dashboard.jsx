import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AppBar, Toolbar, Typography, Button, Breadcrumbs, Link } from '@mui/material';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import FileList from './FileList';
import { axiosInstance } from '../utils/api';

function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [currentParentId, setCurrentParentId] = useState(null);
  const [pathChain, setPathChain] = useState([]);  // [{id, name}]

  useEffect(() => {
    if (params.id) {
      setCurrentParentId(parseInt(params.id, 10));
      fetchPathChain(parseInt(params.id, 10));
    } else {
      setCurrentParentId(null);
      setPathChain([]);
    }
  }, [params.id]);

  const fetchPathChain = async (id) => {
    try {
      const res = await axiosInstance.get(`/files/path/${id}`);
      const chain = res.data.map(f => ({ id: f.id, name: f.name }));
      setPathChain(chain);
    } catch (err) {
      console.error('Fetch path chain error:', err);
    }
  };

  const handleFolderClick = (id) => {
    setCurrentParentId(id);
    navigate(`/dashboard/folder/${id}`);
    fetchPathChain(id);  // 更新 chain
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>墨染云盘</Typography>
          <Button color="inherit" onClick={logout}>退出</Button>
        </Toolbar>
      </AppBar>
      <Breadcrumbs aria-label="breadcrumb" sx={{ p: 2 }}>
        <Link underline="hover" color="inherit" onClick={() => {
          setCurrentParentId(null);
          navigate('/dashboard');
        }}>首页</Link>
        {pathChain.map((crumb, i) => (
          <Link key={i} underline="hover" color="inherit" onClick={() => navigate(`/dashboard/folder/${crumb.id}`)}>
            {crumb.name}
          </Link>
        ))}
      </Breadcrumbs>
      <Routes>
        <Route path="/" element={<FileList parentId={currentParentId} onFolderClick={handleFolderClick} />} />
        <Route path="/folder/:id" element={<FileList parentId={currentParentId} onFolderClick={handleFolderClick} />} />
      </Routes>
    </>
  );
}

export default Dashboard;