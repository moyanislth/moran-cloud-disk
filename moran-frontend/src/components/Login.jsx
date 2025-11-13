import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { axiosInstance } from '../utils/api';
import { useNavigate } from 'react-router-dom';

/**
 * Login 组件 - 登录页面
 * 功能：表单输入用户名/密码、记住我选项；提交 API 登录，成功后调用 login hook。
 * 依赖：useAuth 处理认证；axiosInstance 发送登录请求。
 */
function Login() {
  const [credentials, setCredentials] = useState({
    username: 'admin',
    password: 'admin',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'rememberMe') setRememberMe(checked);
  };

  /**
   * 提交登录
   * @param {Event} e - 表单事件
   * 逻辑：POST /auth/login；成功更新 token 并导航；失败显示错误。
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const response = await axiosInstance.post('/auth/login', {
        ...credentials,
        rememberMe,
      });
      login(response.data.token, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4">
          墨染云盘
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ mt: 1, width: '100%' }}
        >
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="用户名"
            name="username"
            autoComplete="username"
            autoFocus
            value={credentials.username}
            onChange={handleInputChange}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="密码"
            type="password"
            id="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={handleInputChange}
          />
          <FormControlLabel
            control={
              <Checkbox
                value="remember"
                color="primary"
                checked={rememberMe}
                onChange={handleInputChange}
                name="rememberMe"
              />
            }
            label="记住我"
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : '登录'}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={() => alert('QQ 登录功能后续迭代开发中')}
            disabled={isSubmitting}
          >
            QQ 登录
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;