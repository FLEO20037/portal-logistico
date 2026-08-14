import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const vazio = { cliente_id: '', numero_nf: '', data_emissao: '', valor_nf: '', peso: '', volumes: '', origem: '', destino: '' };
const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export default function NotasFiscais() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);
  const [extraindo, setExtraindo] = useState(false);
  const [avisoExtracao, setAvisoExtracao] = useState('');
  const navigate = useNavigate();
  const { usuario } = useAuth();

  async function carregar(q = '') {
    const { data } = await api.get('/notas-fiscais', { params: { q } });
    setLista(data.dados);
  }

  useEffect(() => {
    carregar();
    if (usuario?.is_admin) api.get('/clientes').then(r => setClientes(r.data.dados));
  }, []);

  function abrirNovo() {
    setEditId(null);
    setForm(vazio);
    setAvisoExtracao('');
    setModal(true);
  }

  function abrirEditar(n) {
    setEditId(n.id);
    setForm({ cliente_id: n.cliente_id, numero_nf: n.numero_nf, data_emissao: n.data_emissao || '',
      valor_nf: n.valor_nf, peso: n.peso, volumes: n.volumes, origem: n.origem || '', destino: n.destino || '' });
    setAvisoExtracao('');
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (editId) await api.put(`/notas-fiscais/${editId}`, form);
    else await api.post('/notas-fiscais', form);
    setModal(false);
    setEditId(null);
    setForm(vazio);
    carregar(busca);
  }

  async function excluir(id) {
    if (!confirm('Excluir esta nota fiscal e todos os CT-es e boletos vinculados?')) return;
    await api.delete(`/notas-fiscais/${id}`);
    carregar(busca);
  }

  async function extrairDePdf(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    setExtraindo(true);
    setAvisoExtracao('');
    try {
      const fd = new FormData();
      fd.append('arquivo', arquivo);
      const { data } = await api.post('/notas-fiscais/extrair', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const d = data.dados;
      setForm(prev => ({
        ...prev,
        numero_nf: d.numero_nf || prev.numero_nf,
        valor_nf: d.valor_nf ?? prev.valor_nf,
        peso: d.peso ?? prev.peso,
        volumes: d.volumes ?? prev.volumes,
        data_emissao: d.data_emissao || prev.data_emissao,
      }));
      setAvisoExtracao(data.mensagem);
    } catch (err) {
      setAvisoExtracao(err.response?.data?.mensagem || 'Erro ao ler o PDF.');
    } finally {
      setExtraindo(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notas fiscais</h1>
          <p className="text-[#71809a]">Cadastre a NF-e com origem, destino e vincule os CT-es de transporte.</p>
        </div>
        {usuario?.is_admin && <button onClick={abrirNovo} className="bg-[#137a65] text-white font-bold px-4 py-3 rounded-lg">Adicionar NF-e</button>}
      </div>
