import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Slide,
  Box,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

/**
 * RenameDialog 组件 - 重命名对话框
 * @param {boolean} open - 是否打开
 * @param {Function} onClose - 关闭回调
 * @param {string} fileName - 当前文件名
 * @param {Function} onSubmit - 提交回调 (newName)
 * @param {boolean} isPending - 提交中状态
 * 功能：输入新名称，确认提交；提交后自动关闭。
 * 逻辑：TextField 自动焦点；Slide 过渡动画；美化布局（图标 + 间距）。
 */
const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

function RenameDialog({ open, onClose, fileName, onSubmit, isPending }) {
  const [newName, setNewName] = React.useState(fileName);

  React.useEffect(() => {
    if (open) setNewName(fileName);
  }, [open, fileName]);

  const handleSubmit = () => {
    if (newName.trim()) {
      onSubmit(newName.trim());
      onClose(); // 提交后立即关闭弹窗
    }
  };

  const handleClose = () => {
    setNewName(fileName); // 重置输入
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      aria-labelledby="rename-dialog-title"
    >
      <DialogTitle id="rename-dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small">
            <EditIcon color="primary" />
          </IconButton>
          重命名文件
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <TextField
          fullWidth
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
          margin="dense"
          variant="outlined"
          placeholder="请输入新名称"
          helperText="支持文件夹/文件重命名"
        />
      </DialogContent>
      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button onClick={handleClose} disabled={isPending} variant="outlined">
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending || !newName.trim()}
          variant="contained"
          startIcon={isPending ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ minWidth: 100 }}
        >
          {isPending ? '处理中...' : '确认'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RenameDialog;