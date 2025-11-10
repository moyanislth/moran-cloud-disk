import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { axiosInstance } from './utils/api';

const AuthContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let token = localStorage.getItem('token');
    if (!token) {
      const cookieValue = document.cookie.split('; ').find(row => row.startsWith('jwt='));
      token = cookieValue ? cookieValue.split('=')[1] : null;
    }
    console.log('App init token:', token ? 'found' : 'none');  // Debug token
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const login = (token, rememberMe) => {
    console.log('Login set token:', token ? 'success' : 'fail');  // Debug
    setUser({ token });
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (rememberMe) {
      localStorage.setItem('token', token);
      document.cookie = `jwt=${token}; max-age=${7*24*60*60}; path=/`;
    } else {
      // 非记住我，仅 session
      localStorage.removeItem('token');
      document.cookie = `jwt=${token}; path=/`;  // 无 max-age，session 过期
    }
  };

  const logout = () => {
    setUser(null);
    delete axiosInstance.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard/*" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
export { AuthContext };