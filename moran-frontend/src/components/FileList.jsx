import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import { useDropzone } from 'react-dropzone';
import { Container, Button, Dialog, DialogTitle, DialogContent, TextField, Alert, Typography, Link, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';  // 从 AuthContext 获取 user，确保 query enabled
import { axiosInstance } from '../utils/api';

function FileList() {
  const { user } = useAuth();  // 确保登录后 query
  const queryClient = useQueryClient();
  const [parentId, setParentId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', parentId],
    queryFn: () => axiosInstance.get(`/files?parentId=${parentId || ''}`).then(res => res.data),
    enabled: !!user,  // 登录后才 query，减少无谓调用
    staleTime: 0  // 立即 stale，确保 refetch 有效
  });

  const { data: quota } = useQuery({
    queryKey: ['quota'],
    queryFn: () => axiosInstance.get('/files/quota').then(res => res.data),
    enabled: !!user
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      await axiosInstance.post('/files/upload', formData, {
        params: { parentId: parentId || undefined },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', parentId] });  // 强制 invalidate + refetch
      queryClient.invalidateQueries({ queryKey: ['quota'] });  // 刷新 quota
      setError('');  // 清错误
    },
    onError: (err) => {
      console.error('Upload error:', err);
      setError(`上传失败: ${err.response?.data?.message || err.message || '未知错误'}`);
    }
  });

  const onDrop = (acceptedFiles) => {
    setError('');  // 清旧错误
    acceptedFiles.forEach((file) => {
      uploadMutation.mutate(file);  // mutation 处理，避免循环
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: true,
    disabled: uploadMutation.isPending  // 上传中禁用 drop
  });

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { 
      field: 'name', 
      headerName: '名称', 
      width: 300, 
      renderCell: (params) => (
        <Link href={params.row.isFolder ? `/dashboard/folder/${params.row.id}` : `#`} onClick={(e) => {
          if (params.row.isFolder) {
            setParentId(params.row.id);
          }
          e.preventDefault();
        }}>
          {params.row.isFolder ? '[文件夹]' : ''}{params.value}
        </Link>
      )
    },
    { field: 'size', headerName: '大小', width: 130, valueFormatter: (params) => params.value ? (params.value / 1024 / 1024).toFixed(2) + ' MB' : '-' },
    { field: 'uploadTime', headerName: '修改时间', width: 200, type: 'dateTime' },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      renderCell: (params) => (
        <>
          <Button size="small" onClick={() => downloadFile(params.row.id)}>下载</Button>
          <Button size="small" onClick={() => { setSelectedId(params.row.id); setOpenDialog(true); setNewName(params.row.name); }}>重命名</Button>
          <Button size="small" color="error" onClick={() => deleteFile(params.row.id)}>删除</Button>
        </>
      )
    }
  ];

  const downloadFile = async (id) => {
    const link = document.createElement('a');
    link.href = `${axiosInstance.defaults.baseURL}/files/${id}/download`;
    link.download = '';
    link.click();
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', parentId] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
    onError: () => setError('删除失败')
  });

  const deleteFile = (id) => {
    if (window.confirm('确认删除?')) {
      deleteMutation.mutate(id);
    }
  };

  const renameMutation = useMutation({
    mutationFn: (data) => axiosInstance.put(`/files/${data.id}/rename`, { newName: data.name }),
    onSuccess: () => {
      setOpenDialog(false);
      queryClient.invalidateQueries({ queryKey: ['files', parentId] });
    },
    onError: () => setError('重命名失败')
  });

  const handleRename = () => {
    renameMutation.mutate({ id: selectedId, name: newName });
  };

  const createFolderMutation = useMutation({
    mutationFn: (name) => axiosInstance.post('/files/folder', { name, parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', parentId] });
    },
    onError: () => setError('创建文件夹失败')
  });

  const createFolder = () => {
    const name = prompt('文件夹名称:');
    if (name) {
      createFolderMutation.mutate(name);
    }
  };

  return (
    <Container sx={{ p: 2 }}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <div {...getRootProps()} style={{ border: '2px dashed #ccc', p: 20, textAlign: 'center', mb: 2, opacity: uploadMutation.isPending ? 0.6 : 1 }}>
        <input {...getInputProps()} />
        <p>{isDragActive ? '释放文件上传' : '拖拽文件上传，或点击选择'}</p>
        {uploadMutation.isPending && <CircularProgress size={24} />}
        {uploadMutation.isPending && <Typography variant="body2">上传中...</Typography>}
      </div>
      <Button onClick={createFolder} variant="outlined" sx={{ mb: 2 }} disabled={createFolderMutation.isPending}>
        新建文件夹
      </Button>
      {quota && (
        <Typography>已用: {(quota.usedSpace / quota.totalSpace * 100).toFixed(1)}%</Typography>
      )}
      {(isLoading || uploadMutation.isPending) ? (
        <CircularProgress />
      ) : (
        <DataGrid rows={files} columns={columns} pageSize={10} checkboxSelection={false} loading={isLoading} />
      )}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>重命名</DialogTitle>
        <DialogContent>
          <TextField fullWidth value={newName} onChange={e => setNewName(e.target.value)} />
          <Button onClick={handleRename} disabled={renameMutation.isPending}>确认</Button>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default FileList;