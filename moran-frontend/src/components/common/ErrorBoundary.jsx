import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * ErrorBoundary 组件 - 错误边界
 * 功能：捕获子组件渲染错误，提供友好回退 UI（错误提示 + 重试按钮）。
 * 逻辑：使用 React.Component 实现 static getDerivedStateFromError + componentDidCatch。
 * 使用：包裹易出错组件，如 <ErrorBoundary><FileTable ... /></ErrorBoundary>。
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary 捕获错误:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            p: 4,
            mt: 2,
          }}
        >
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>
            加载文件列表时发生错误
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            {this.state.error?.message || '未知错误'}
          </Typography>
          <Button variant="contained" onClick={this.handleRetry}>
            重试
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;