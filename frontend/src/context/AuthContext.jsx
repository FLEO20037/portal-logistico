import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('token', data.dados.token);
    localStorage.setItem('usuario', JSON.stringify(data.dados.usuario));
    setUsuario(data.dados.usuario);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
