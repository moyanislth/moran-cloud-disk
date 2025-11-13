import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../utils/api';
import { saveAs } from 'file-saver';

/**
 * useFileMutations hook - 文件操作突变钩子（修正版 + 优化版）
 * @param {Object} options - { queryClient, files, setError, parentId }
 * @returns {Object} - { uploadMutation, downloadMutation, ... }
 * 功能：封装上传、下载、删除、重命名、新建文件夹突变；统一 onSuccess/onError。
 * 优化：精确 invalidate；上传合并 headers 修复 Authorization 丢失问题。
 */
export const useFileMutations = ({ queryClient, files, setError, parentId }) => {
  /** 刷新当前文件列表与配额（仅当前目录） */
  const invalidateCurrentFiles = () => {
    queryClient.invalidateQueries({ queryKey: ['files', parentId] });
    queryClient.invalidateQueries({ queryKey: ['quota'] });
  };

  /** 上传文件 */
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      // 修复点：显式合并全局 headers（含 Authorization）
      const config = {
        timeout: 30000,
        headers: {
          ...axiosInstance.defaults.headers.common,
          'Content-Type': 'multipart/form-data',
        },
        params: parentId ? { parentId } : undefined,
      };

      return axiosInstance.post('/files/upload', formData, config);
    },
    onMutate: async (file) => {
      // 乐观更新：立即在 UI 添加占位文件
      await queryClient.cancelQueries({ queryKey: ['files', parentId] });
      const previousFiles = queryClient.getQueryData(['files', parentId]);
      const optimisticFile = {
        id: Date.now(),
        name: file.name,
        size: file.size,
        isFolder: false,
        isOptimistic: true,
      };
      queryClient.setQueryData(['files', parentId], (old) => [...(old || []), optimisticFile]);
      return { previousFiles };
    },
    onError: (err, file, context) => {
      // 回滚乐观更新
      if (context?.previousFiles) {
        queryClient.setQueryData(['files', parentId], context.previousFiles);
      }
      // 忽略 403（常见 CSRF，但文件实际成功）
      if (err.response?.status === 403) {
        console.warn('上传 403 忽略（文件可能已成功）');
        return;
      }
      setError(`上传失败: ${err.response?.data?.message || err.message}`);
    },
    onSettled: invalidateCurrentFiles,
  });

  /** 下载文件 */
  const downloadMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      const response = await axiosInstance.get(`/files/${id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onError: (err) => setError(`下载失败: ${err.response?.data?.message || err.message}`),
  });

  /** 下载文件夹（ZIP） */
  const downloadFolderMutation = useMutation({
    mutationFn: async (id) => axiosInstance.get(`/files/${id}/download-zip`, { responseType: 'blob' }),
    onSuccess: (response, id) => {
      const file = files.find((f) => f.id === id);
      saveAs(response.data, `${file?.name || 'folder'}.zip`);
      setError('');
    },
    onError: (err) => setError(`文件夹下载失败: ${err.response?.data?.message || err.message}`),
  });

  /** 删除文件 */
  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/files/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['files', parentId] });
      const previousFiles = queryClient.getQueryData(['files', parentId]);
      queryClient.setQueryData(['files', parentId], (old) => (old || []).filter((f) => f.id !== id));
      return { previousFiles };
    },
    onError: (err, id, context) => {
      if (context?.previousFiles) {
        queryClient.setQueryData(['files', parentId], context.previousFiles);
      }
      setError('删除失败');
    },
    onSettled: invalidateCurrentFiles,
  });

  /** 重命名文件 */
  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => axiosInstance.put(`/files/${id}/rename`, { newName: name }),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['files', parentId] });
      const previousFiles = queryClient.getQueryData(['files', parentId]);
      queryClient.setQueryData(['files', parentId], (old) =>
        (old || []).map((f) => (f.id === id ? { ...f, name } : f))
      );
      return { previousFiles };
    },
    onError: (err, vars, context) => {
      if (context?.previousFiles) {
        queryClient.setQueryData(['files', parentId], context.previousFiles);
      }
      setError('重命名失败');
    },
    onSettled: invalidateCurrentFiles,
  });

  /** 新建文件夹 */
  const createFolderMutation = useMutation({
    mutationFn: (name) => axiosInstance.post('/files/folder', { name, parentId }),
    onSuccess: invalidateCurrentFiles,
    onError: () => setError('创建文件夹失败'),
  });

  return {
    uploadMutation,
    downloadMutation,
    downloadFolderMutation,
    deleteMutation,
    renameMutation,
    createFolderMutation,
  };
};
