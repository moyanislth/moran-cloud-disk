import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataGrid } from '@mui/x-data-grid';
import { LinearProgress } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { Container, Button, Dialog, DialogTitle, DialogContent, TextField, Alert, Typography, Link, CircularProgress, IconButton, Chip, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../hooks/useAuth';
import { axiosInstance } from '../utils/api';
import { saveAs } from 'file-saver';

function FileList({ parentId: propParentId, onFolderClick }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [parentId, setParentId] = useState(propParentId || null);
  const [queryVersion, setQueryVersion] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState({});

  useEffect(() => {
    setParentId(propParentId || null);
  }, [propParentId]);

  useEffect(() => {
    if (parentId !== undefined) {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setQueryVersion(prev => prev + 1);
    }
  }, [parentId, queryClient]);

  const { data: files = [], refetch, isLoading } = useQuery({
    queryKey: ['files', parentId, queryVersion, user?.token],
    queryFn: async () => {
      const url = `/files?parentId=${parentId || ''}`;
      const res = await axiosInstance.get(url);
      console.log('Query files response:', res.data.length, 'items for parentId:', parentId);
      console.log('Files data with lost flag:', res.data.map(f => ({ id: f.id, name: f.name, lost: f.lost, deleted: f.deleted })));  // Debug log
      return res.data;
    },
    enabled: !!user && !!user.token,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  const { data: quota } = useQuery({
    queryKey: ['quota', user?.token],
    queryFn: () => axiosInstance.get('/files/quota').then(res => res.data),
    enabled: !!user && !!user.token
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      if (!user?.token) throw new Error('No token, please login');
      const formData = new FormData();
      formData.append('file', file);
      const url = '/files/upload';
      const config = {
        timeout: 30000,
        headers: {
          'Content-Type': undefined  // 强制 auto multipart, 覆盖任何 base
        }
      };
      if (parentId) {
        config.params = { parentId };
      }
      const res = await axiosInstance.post(url, formData, config);
      return res;
    },
    onSuccess: () => {
      setQueryVersion(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      refetch();
      setError('');
    },
    onError: (err) => {
      console.error('Upload error:', err);
      setError(`上传失败: ${err.response?.data?.message || err.message || '未知错误'}`);
    }
  });

  const onDrop = (acceptedFiles) => {
    if (!user?.token) {
      setError('请先登录');
      return;
    }
    setError('');
    acceptedFiles.forEach((file) => uploadMutation.mutate(file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: true,
    disabled: uploadMutation.isPending || !user?.token
  });

  const manualRefetch = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['quota'] });
  };

  const handleFolderClick = (id) => {
    setParentId(id);
    if (onFolderClick) onFolderClick(id);
  };

  // Preprocess rows for lost files
  const processedRows = files.map(file => ({
    ...file,
    isLost: file.lost || file.size === 0,
    rowSx: { opacity: (file.lost || file.size === 0) ? 0.5 : 1 }
  }));

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { 
      field: 'name', 
      headerName: '名称', 
      width: 300, 
      renderCell: (params) => {
        const isLost = params.row.isLost;
        const handleClick = (e) => {
          e.preventDefault();
          if (params.row.isFolder && !isLost) {
            handleFolderClick(params.row.id);
          } else if (!params.row.isFolder && !isLost) {
            // Open preview in new tab
            const previewUrl = `${axiosInstance.defaults.baseURL}/files/${params.row.id}/preview`;
            window.open(previewUrl, '_blank');
          }
        };
        return (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Link 
              href="#"
              onClick={handleClick}
              sx={{ opacity: isLost ? 0.5 : 1, cursor: isLost ? 'not-allowed' : 'pointer' }}
            >
              {params.row.isFolder ? '[文件夹]' : ''}{params.value}
            </Link>
            {isLost && (
              <Chip 
                label="已丢失" 
                size="small" 
                color="error" 
                sx={{ ml: 1 }} 
              />
            )}
          </Box>
        );
      }
    },
    { 
      field: 'size', 
      headerName: '大小', 
      width: 130, 
      valueFormatter: (params) => {
        if (!params || params.value === null || params.value === undefined) return '-';
        return (params.value / 1024 / 1024).toFixed(2) + ' MB';
      }
    },
    { 
      field: 'uploadTime', 
      headerName: '修改时间', 
      width: 200, 
      type: 'dateTime',
      valueGetter: (params) => {
        if (!params || !params.value) return null;
        return new Date(params.value);
      }
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 250,
      renderCell: (params) => {
        const isLost = params.row.isLost;
        const isAdmin = true;  // MVP 单用户，默认 admin
        const progressKey = `download-${params.row.id}`;
        const currentProgress = downloadProgress[progressKey] || 0;
        return (
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            {!isLost && (
              <>
                {!params.row.isFolder ? (
                  <Button size="small" onClick={() => downloadFile(params.row.id, params.row.name)} disabled={isLost}>
                    下载
                  </Button>
                ) : (
                  <Button size="small" onClick={() => downloadFolderMutation.mutate(params.row.id)} disabled={isLost}>
                    下载文件夹
                  </Button>
                )}
                {!params.row.isFolder && (
                  <Button 
                    size="small" 
                    onClick={() => { setSelectedId(params.row.id); setOpenDialog(true); setNewName(params.row.name); }} 
                    disabled={isLost}
                  >
                    重命名
                  </Button>
                )}
              </>
            )}
            {isAdmin && (
              <IconButton 
                size="small" 
                color="error" 
                onClick={() => deleteFile(params.row.id)} 
                disabled={!isAdmin}
                title={isLost ? '清理丢失记录' : '删除'}
              >
                <DeleteIcon />
              </IconButton>
            )}
            {currentProgress > 0 && (
              <Box sx={{ width: 100, ml: 1 }}>
                <LinearProgress variant="determinate" value={currentProgress} />
                <Typography variant="caption">{currentProgress}%</Typography>
              </Box>
            )}
          </Box>
        );
      }
    }
  ];

  const downloadFile = async (id, fileName) => {
    try {
      const response = await axiosInstance.get(`/files/${id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';  // Use file name from params
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError(`下载失败: ${err.response?.data?.message || err.message || '未知错误'}`);
    }
  };

  const downloadFolderMutation = useMutation({
    mutationFn: (id) => {
      return axiosInstance.get(`/files/${id}/download-zip`, { 
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(prev => ({ ...prev, [`download-${id}`]: progress }));
          }
        }
      });
    },
    onSuccess: (response, id) => {
      const file = files.find(f => f.id === id);
      saveAs(response.data, `${file?.name || 'folder'}.zip`);
      setDownloadProgress(prev => ({ ...prev, [`download-${id}`]: 0 }));
      setError('');
    },
    onError: (err, id) => {
      console.error('Folder download error:', err);
      setError(`文件夹下载失败: ${err.response?.data?.message || err.message || '未知错误'}`);
      setDownloadProgress(prev => ({ ...prev, [`download-${id}`]: 0 }));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/files/${id}`),
    onSuccess: () => {
      setQueryVersion(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      refetch();
    },
    onError: () => setError('删除失败')
  });

  const deleteFile = (id) => {
    const file = files.find(f => f.id === id);
    const isLost = file?.lost || file?.size === 0;
    const message = isLost 
      ? '确认直接删除已丢失文件记录？（仅清理数据库，扣除配额）' 
      : '确认删除正常文件？（物理删除服务器文件 + 清理数据库 + 扣除配额）';
    if (window.confirm(message)) {
      deleteMutation.mutate(id);
    }
  };

  const renameMutation = useMutation({
    mutationFn: (data) => axiosInstance.put(`/files/${data.id}/rename`, { newName: data.name }),
    onSuccess: () => {
      setOpenDialog(false);
      setQueryVersion(prev => prev + 1);
      refetch();
    },
    onError: () => setError('重命名失败')
  });

  const handleRename = () => {
    renameMutation.mutate({ id: selectedId, name: newName });
  };

  const createFolderMutation = useMutation({
    mutationFn: (name) => axiosInstance.post('/files/folder', { name, parentId }),
    onSuccess: () => {
      setQueryVersion(prev => prev + 1);
      refetch();
    },
    onError: () => {
      setError('创建文件夹失败');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['files', parentId] });
    }
  });

  const createFolder = () => {
    const name = prompt('文件夹名称:');
    if (name) {
      createFolderMutation.mutate(name);
    }
  };

  console.log('Debug - Current parentId:', parentId, 'Files length:', files.length, 'Query version:', queryVersion, 'Token:', user?.token ? 'present' : 'missing');
  console.log('User role:', user?.role);  // Debug role

  return (
    <Container sx={{ p: 2 }}>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <div {...getRootProps()} style={{ border: '2px dashed #ccc', p: 20, textAlign: 'center', mb: 2, opacity: uploadMutation.isPending ? 0.6 : 1 }}>
        <input {...getInputProps()} />
        <p>{isDragActive ? '释放文件上传' : '拖拽文件上传，或点击选择'}</p>
        {uploadMutation.isPending && <CircularProgress size={24} />}
        {uploadMutation.isPending && <Typography variant="body2">上传中...</Typography>}
      </div>
      <div sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button onClick={createFolder} variant="outlined" disabled={createFolderMutation.isPending || !user?.token}>
          新建文件夹
        </Button>
        <IconButton onClick={manualRefetch} sx={{ ml: 1 }}>
          <RefreshIcon />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1 }}>手动刷新</Typography>
      </div>
      {quota && (
        <Typography>已用: {(quota.usedSpace / quota.totalSpace * 100).toFixed(1)}%</Typography>
      )}
      {(isLoading || uploadMutation.isPending) ? (
        <CircularProgress />
      ) : (
        <DataGrid 
          rows={processedRows} 
          columns={columns} 
          pageSize={10} 
          checkboxSelection={false} 
          loading={isLoading}
          getRowClassName={(params) => params.row.isLost ? 'lost-row' : ''}
          sx={{
            '& .lost-row': {
              opacity: 0.5
            }
          }}
        />
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