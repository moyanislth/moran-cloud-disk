import { useContext } from 'react';
import { AuthContext } from '../App';

export const useAuth = () => useContext(AuthContext);
