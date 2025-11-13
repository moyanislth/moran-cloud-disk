
import { useDropzone } from 'react-dropzone';
import { Box, Typography, CircularProgress } from '@mui/material';

/**
 * FileUploadZone 组件 - 拖拽上传区域
 * @param {Object} uploadMutation - React Query mutation 对象
 * @param {number|null} parentId - 父文件夹 ID（未直接使用，但预留扩展）
 * @param {Object} user - 用户信息
 * @param {Function} setError - 设置错误状态
 * 功能：处理文件拖拽/点击上传；显示加载状态。
 * 逻辑：Dropzone 配置 multiple，支持进度反馈。
 */
function FileUploadZone({ uploadMutation, user, setError }) {
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
    disabled: uploadMutation.isPending || !user?.token,
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed #ccc',
        p: 5,
        textAlign: 'center',
        mb: 2,
        opacity: uploadMutation.isPending ? 0.6 : 1,
        cursor: 'pointer',
        borderRadius: 1,
      }}
    >
      <input {...getInputProps()} />
      <Typography>{isDragActive ? '释放文件上传' : '拖拽文件上传，或点击选择'}</Typography>
      {uploadMutation.isPending && (
        <>
          <CircularProgress size={24} sx={{ mt: 1 }} />
          <Typography variant="body2">上传中...</Typography>
        </>
      )}
    </Box>
  );
}

export default FileUploadZone;