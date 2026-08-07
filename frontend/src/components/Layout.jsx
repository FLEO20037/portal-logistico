import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/clientes', label: 'Clientes', adminOnly: true },
  { to: '/transportadoras', label: 'Transportadoras', adminOnly: true },
  { to: '/notas-fiscais', label: 'Notas fiscais' },
  { to: '/boletos', label: 'Boletos' },
];

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#f4f7fb] text-[#13233e]">
      <aside className="w-[230px] bg-[#102442] text-[#c9d8eb] p-7 px-4 flex flex-col">
        <div className="text-xl font-black text-white tracking-widest mb-9 mx-3">
          NEXO <b className="text-[#39caaa]">LOG</b>
        </div>
        <nav className="flex-1">
          {links.filter(l => !l.adminOnly || usuario?.is_admin).map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block w-full text-left rounded-lg px-3 py-3 my-1 font-bold ${isActive ? 'bg-[#1d3b65] text-white' : 'hover:bg-[#1d3b65] hover:text-white'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="text-left rounded-lg px-3 py-3 font-bold hover:bg-[#1d3b65] hover:text-white"
        >
          Sair
        </button>
      </aside>
      <main className="flex-1 p-9">{children}</main>
    </div>
  );
}
