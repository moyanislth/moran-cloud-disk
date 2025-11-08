import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { TextField, Button, Checkbox, FormControlLabel, Container, Typography, Box } from '@mui/material';
import { axiosInstance } from '../utils/api';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/auth/login', { username, password, rememberMe });
      login(response.data.token, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || '登录失败，请检查用户名和密码');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4">墨染云盘</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          <TextField margin="normal" required fullWidth label="用户名" value={username} onChange={e => setUsername(e.target.value)} />
          <TextField margin="normal" required fullWidth label="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <FormControlLabel control={<Checkbox checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />} label="记住我" />
          {error && <Typography color="error">{error}</Typography>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>登录</Button>
          {/* QQ mock */}
          <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => alert('QQ登录: 后续迭代')}>QQ登录</Button>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;