import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErro('');
    try {
      await login(email, senha);
      navigate('/');
    } catch {
      setErro('Email ou senha inválidos.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#102442]">
      <form onSubmit={onSubmit} className="bg-white rounded-xl p-10 w-full max-w-sm">
        <div className="text-2xl font-black text-[#102442] tracking-widest mb-1">
          NEXO <span className="text-[#39caaa]">LOG</span>
        </div>
        <p className="text-[#71809a] mb-6">Portal Logístico Multitransportadoras</p>
        {erro && <div className="bg-red-50 text-[#c53644] text-sm rounded-lg p-3 mb-4">{erro}</div>}
        <label className="block text-xs font-bold text-[#475569] mb-1">Email</label>
        <input
          className="w-full border border-[#ced8e5] rounded-lg p-3 mb-4"
          value={email} onChange={e => setEmail(e.target.value)} type="email" required
        />
        <label className="block text-xs font-bold text-[#475569] mb-1">Senha</label>
        <input
          className="w-full border border-[#ced8e5] rounded-lg p-3 mb-6"
          value={senha} onChange={e => setSenha(e.target.value)} type="password" required
        />
        <button className="w-full bg-[#137a65] text-white font-bold py-3 rounded-lg">Entrar</button>
      </form>
    </div>
  );
}
