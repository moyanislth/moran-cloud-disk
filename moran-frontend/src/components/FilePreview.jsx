import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { axiosInstance } from '../utils/api';

/**
 * FilePreview 组件 - 文件预览模态框
 * @param {boolean} open - 模态是否打开
 * @param {Function} onClose - 关闭回调
 * @param {number} fileId - 文件 ID
 * @param {string} fileName - 文件名
 * 功能：根据文件类型渲染预览（图像/文档）；支持错误处理。
 * 逻辑：useEffect 生成 previewUrl；条件渲染 img/iframe。
 */
function FilePreview({ open, onClose, fileId, fileName = '' }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && fileId) {
      setLoading(true);
      setError('');
      const url = `${axiosInstance.defaults.baseURL}/files/${fileId}/preview`;
      setPreviewUrl(url);
      setLoading(false);
    }
  }, [open, fileId]);

  const handleClose = useCallback(() => {
    setPreviewUrl('');
    setError('');
    onClose();
  }, [onClose]);

  const isImage = fileName.match(/\.(jpg|jpeg|png|gif|bmp|svg)$/i);
  const isDocument = fileName.match(/\.(pdf|doc|docx)$/i);

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          p: 4,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          {fileName}
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : isImage ? (
          <img
            src={previewUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            onError={() => setError('预览加载失败')}
          />
        ) : isDocument ? (
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: '70vh', border: 'none' }}
            title={fileName}
            onError={() => setError('文档预览失败，请下载查看')}
          />
        ) : (
          <Alert severity="info">不支持该文件类型的预览</Alert>
        )}
      </Box>
    </Modal>
  );
}

export default FilePreview;