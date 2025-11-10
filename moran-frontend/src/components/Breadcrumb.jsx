import React from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Breadcrumb({ pathCrumbs = [] }) {
  const navigate = useNavigate();

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ p: 2 }}>
      <Link underline="hover" color="inherit" onClick={() => navigate('/dashboard')}>
        首页
      </Link>
      {pathCrumbs.map((crumb, i) => (
        <Link key={i} underline="hover" color="inherit" onClick={() => navigate(`/dashboard/folder/${crumb.id}`)}>
          {crumb.name}
        </Link>
      ))}
    </Breadcrumbs>
  );
}

export default Breadcrumb;