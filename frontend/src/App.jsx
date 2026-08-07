import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RotaPrivada from './components/RotaPrivada';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Transportadoras from './pages/Transportadoras';
import NotasFiscais from './pages/NotasFiscais';
import NotaFiscalDetail from './pages/NotaFiscalDetail';
import Boletos from './pages/Boletos';

function Protegida({ children }) {
  return (
    <RotaPrivada>
      <Layout>{children}</Layout>
    </RotaPrivada>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protegida><Dashboard /></Protegida>} />
          <Route path="/clientes" element={<Protegida><Clientes /></Protegida>} />
          <Route path="/transportadoras" element={<Protegida><Transportadoras /></Protegida>} />
          <Route path="/notas-fiscais" element={<Protegida><NotasFiscais /></Protegida>} />
          <Route path="/notas-fiscais/:id" element={<Protegida><NotaFiscalDetail /></Protegida>} />
          <Route path="/boletos" element={<Protegida><Boletos /></Protegida>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
