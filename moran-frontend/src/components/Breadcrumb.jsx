import React from 'react';
import { Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * Breadcrumb 组件 - 面包屑导航
 * @param {Array} pathCrumbs - 路径链数组：[{ id: number, name: string }]
 * 功能：渲染面包屑，支持点击导航；首页固定链接。
 * 逻辑：遍历 crumbs 生成 Link，点击时 navigate 到对应路由。
 */
function Breadcrumb({ pathCrumbs = [] }) {
  const navigate = useNavigate();

  const handleCrumbClick = (id) => {
    if (id === null || id === undefined) {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/folder/${id}`);
    }
  };

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ p: 2 }}>
      <Link
        underline="hover"
        color="inherit"
        onClick={() => handleCrumbClick(null)}
      >
        首页
      </Link>
      {pathCrumbs.map((crumb) => (
        <Link
          key={crumb.id} // 稳定 key
          underline="hover"
          color="inherit"
          onClick={() => handleCrumbClick(crumb.id)}
        >
          {crumb.name}
        </Link>
      ))}
    </Breadcrumbs>
  );
}

export default Breadcrumb;