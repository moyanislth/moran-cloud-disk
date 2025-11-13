import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Link, IconButton, Chip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { axiosInstance } from '../../utils/api';

/**
 * FileTable 组件 - 文件表格展示与操作
 * @param {Array} files - 文件列表数组
 * @param {Function} onFolderClick - 点击文件夹回调
 * @param {Function} onRename - 重命名回调 (id, name)
 * @param {Function} onDelete - 删除回调 (id)
 * @param {Function} onDownload - 下载文件回调 ({id, name})
 * @param {Function} onFolderDownload - 下载文件夹回调 (id)
 * 功能：渲染 DataGrid，处理行点击（预览/导航）、操作按钮（下载/重命名/删除）。
 * 逻辑：预处理 lost 行；renderCell 自定义名称列（图标 + 链接）；actions 列按钮（lost 文件仅显示可点击删除）。
 */
function FileTable({ files, onFolderClick, onRename, onDelete, onDownload, onFolderDownload }) {
  const processedRows = files.map((file) => ({
    ...file,
    isLost: file.lost || file.size === 0,
  }));

  const handleNameClick = (row) => {
    const isLost = row.isLost;
    if (row.isFolder && !isLost) {
      onFolderClick(row.id);
    } else if (!row.isFolder && !isLost) {
      const previewUrl = `${axiosInstance.defaults.baseURL}/files/${row.id}/preview`;
      window.open(previewUrl, '_blank');
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    {
      field: 'name',
      headerName: '名称',
      width: 300,
      renderCell: ({ row }) => {
        const isLost = row.isLost;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {row.isFolder ? (
              <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
            ) : (
              <InsertDriveFileIcon sx={{ mr: 1, color: 'grey.500' }} />
            )}
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleNameClick(row);
              }}
              sx={{ opacity: isLost ? 0.5 : 1, cursor: isLost ? 'not-allowed' : 'pointer' }}
            >
              {row.isFolder ? '[文件夹] ' : ''}{row.name}
            </Link>
            {isLost && <Chip label="已丢失" size="small" color="error" sx={{ ml: 1 }} />}
          </Box>
        );
      },
    },
    {
      field: 'size',
      headerName: '大小',
      width: 120,
      valueFormatter: (params) => {
        if (!params) return '-'; // 防御：处理 params 为 null 的边缘场景（如 DataGrid 初始化/空行）
        const value = params.value;
        return value ? `${(value / 1024 / 1024).toFixed(2)} MB` : '-';
      },
    },
    { field: 'createdAt', headerName: '创建时间', width: 150 },
    { field: 'updatedAt', headerName: '更新时间', width: 150 },
    {
      field: 'actions',
      headerName: '操作',
      width: 150,
      sortable: false,
      renderCell: ({ row }) => {
        const isLost = row.isLost;
        if (isLost) {
          // lost 文件：仅显示可点击删除按钮
          return (
            <Box>
              <IconButton onClick={() => onDelete(row.id)} color="error" size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          );
        }
        // 正常文件：显示下载 + 编辑 + 删除
        return (
          <Box>
            <IconButton
              onClick={() => (row.isFolder ? onFolderDownload(row.id) : onDownload({ id: row.id, name: row.name }))}
              size="small"
            >
              <DownloadIcon />
            </IconButton>
            <IconButton onClick={() => onRename(row.id, row.name)} size="small">
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => onDelete(row.id)} color="error" size="small">
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  return (
    <DataGrid
      rows={processedRows}
      columns={columns}
      initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
      pageSizeOptions={[10, 25, 50]}
      checkboxSelection={false}
      disableRowSelectionOnClick
      getRowClassName={(params) => (params.row.isLost ? 'lost-row' : '')}
      sx={{
        '& .lost-row': { opacity: 0.5 },
        '& .MuiDataGrid-columnHeaders': { backgroundColor: 'grey.100' },
      }}
    />
  );
}

export default FileTable;