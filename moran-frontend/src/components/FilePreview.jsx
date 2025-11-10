import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography } from '@mui/material';
import { axiosInstance } from '../utils/api';

function FilePreview({ open, onClose, fileId, fileName }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (open && fileId) {
      // 预览 API (后端 /files/{id}/preview)
      const url = `${axiosInstance.defaults.baseURL}/files/${fileId}/preview`;
      setPreviewUrl(url);
    }
  }, [open, fileId]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', p: 4, maxWidth: '80%', maxHeight: '80%' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{fileName}</Typography>
        {previewUrl ? (
          fileName.endsWith('.jpg') || fileName.endsWith('.png') ? (
            <img src={previewUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : (
            <iframe src={previewUrl} style={{ width: '100%', height: '500px' }} />
          )
        ) : (
          <Typography>预览加载中...</Typography>
        )}
      </Box>
    </Modal>
  );
}

export default FilePreview;