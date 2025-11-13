import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../utils/api';

/**
 * useFileQuery - 文件与配额查询 Hook
 * @param {Object} params
 * @param {number|null} params.parentId 当前目录 ID
 * @param {number} params.queryVersion 查询版本号（用于强制刷新）
 * @param {Object} params.user 用户对象（含 token）
 * @param {Function} params.setError 错误回调
 * @returns {{ files: Array, quota: Object|null, isLoading: boolean, refetch: Function }}
 *
 * 功能：
 *  - 查询文件列表与配额信息（并行、缓存友好）
 *  - 错误自动处理
 *  - 缓存策略：5 分钟新鲜、10 分钟保留，减少重复请求
 */
export const useFileQuery = ({ parentId, queryVersion, user, setError }) => {
  const enabled = Boolean(user?.token);

  /** 文件列表查询 */
  const fileQuery = useQuery({
    queryKey: ['files', parentId, queryVersion, user?.token],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/files`, {
        params: { parentId: parentId || '' },
      });
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    onError: (err) => setError(`文件列表加载失败：${err.response?.data?.message || err.message}`),
  });

  /** 用户配额查询 */
  const quotaQuery = useQuery({
    queryKey: ['quota', user?.token],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/files/quota');
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    onError: (err) => setError(`配额加载失败：${err.response?.data?.message || err.message}`),
  });

  return {
    files: fileQuery.data ?? [],
    quota: quotaQuery.data ?? null,
    isLoading: fileQuery.isLoading,
    refetch: fileQuery.refetch,
  };
};
