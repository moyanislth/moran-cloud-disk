import React, { useState, useTransition, useEffect } from 'react';
import {
  Container, Alert, Box, Typography, Button,
  IconButton, CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import FileUploadZone from './FileUploadZone';
import FileTable from './FileTable';
import RenameDialog from './RenameDialog';
import ErrorBoundary from '../common/ErrorBoundary';
import FileTableSkeleton from '../common/FileTableSkeleton';
import { useFileQuery } from '../../hooks/useFileQuery';
import { useFileMutations } from '../../hooks/useFileMutations';

/**
 * FileList - 文件管理主组件
 * 功能：
 *  - 管理文件查询与所有突变（上传、删除、下载、重命名、新建文件夹）
 *  - 提供 Skeleton、ErrorBoundary 与 useTransition 异步状态
 *  - 对子组件进行状态协调（Folder 点击、Rename、Refetch）
 */
function FileList({ parentId: propParentId, onFolderClick }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [parentId, setParentId] = useState(propParentId || null);
  const [queryVersion, setQueryVersion] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [openDialog, setOpenDialog] = useState(false);

  /** 文件与配额查询 */
  const { files, quota, isLoading, refetch } = useFileQuery({
    parentId, queryVersion, user, setError
  });

  /** 文件操作突变 */
  const mutations = useFileMutations({
    queryClient, files, setError, parentId
  });

  const {
    uploadMutation,
    downloadMutation,
    downloadFolderMutation,
    deleteMutation,
    renameMutation,
    createFolderMutation
  } = mutations;

  /** 父目录变更响应 */
  useEffect(() => {
    if (propParentId !== parentId) {
      startTransition(() => {
        setParentId(propParentId || null);
        setQueryVersion(v => v + 1);
      });
    }
  }, [propParentId, parentId]);

  /** 手动刷新 */
  const handleRefetch = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['quota'] });
  };

  /** 打开 / 关闭重命名对话框 */
  const handleRenameOpen = (file) => {
    startTransition(() => {
      setSelectedFile(file);
      setOpenDialog(true);
    });
  };
  const handleRenameClose = () => {
    startTransition(() => {
      setOpenDialog(false);
      setSelectedFile(null);
    });
  };

  /** 重命名提交 */
  const handleRenameSubmit = async (newName) => {
    if (!selectedFile) return;
    await renameMutation.mutateAsync({ id: selectedFile.id, name: newName });
  };

  /** 新建文件夹 */
  const handleCreateFolder = async () => {
    const name = prompt('文件夹名称:');
    if (name?.trim()) await createFolderMutation.mutateAsync(name.trim());
  };

  /** 文件夹点击导航 */
  const handleFolderClick = (id) => {
    startTransition(() => {
      setParentId(id);
      setQueryVersion(v => v + 1);
    });
    onFolderClick?.(id);
  };

  /** 渲染文件表格或骨架 */
  const renderTable = () => {
    if (isLoading || isPending) return <FileTableSkeleton />;
    return (
      <ErrorBoundary>
        <FileTable
          files={files}
          onFolderClick={handleFolderClick}
          onRename={(id, name) => handleRenameOpen({ id, name })}
          onDelete={(id) => deleteMutation.mutateAsync(id)}
          onDownload={(data) => downloadMutation.mutateAsync(data)}
          onFolderDownload={(id) => downloadFolderMutation.mutateAsync(id)}
        />
      </ErrorBoundary>
    );
  };

  if (!user?.token) return <Typography>请先登录</Typography>;

  return (
    <Container sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <FileUploadZone
        uploadMutation={uploadMutation}
        parentId={parentId}
        user={user}
        setError={setError}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          variant="outlined"
          onClick={handleCreateFolder}
          disabled={createFolderMutation.isPending}
        >
          新建文件夹
        </Button>
        <IconButton
          onClick={handleRefetch}
          sx={{ ml: 1 }}
          disabled={isPending}
        >
          <RefreshIcon />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1 }}>手动刷新</Typography>
      </Box>

      {quota && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          已用空间: {((quota.usedSpace / quota.totalSpace) * 100).toFixed(1)}%
        </Typography>
      )}

      {uploadMutation.isPending ? <CircularProgress /> : renderTable()}

      <RenameDialog
        open={openDialog}
        onClose={handleRenameClose}
        fileName={selectedFile?.name || ''}
        onSubmit={handleRenameSubmit}
        isPending={renameMutation.isPending}
      />
    </Container>
  );
}

export default FileList;
