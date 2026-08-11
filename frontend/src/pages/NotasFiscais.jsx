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

  async function salvar(e) {
    e.preventDefault();
    await api.post('/notas-fiscais', form);
    setModal(false);
    setForm(vazio);
    carregar(busca);
  }

  async function excluir(id) {
    if (!confirm('Excluir esta nota fiscal e todos os CT-es e boletos vinculados?')) return;
    await api.delete(`/notas-fiscais/${id}`);
    carregar(busca);
  }

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notas fiscais</h1>
          <p className="text-[#71809a]">Cadastre a NF-e com origem, destino e vincule os CT-es de transporte.</p>
        </div>
        {usuario?.is_admin && <button onClick={() => setModal(true)} className="bg-[#137a65] text-white font-bold px-4 py-3 rounded-lg">Adicionar NF-e</button>}
      </div>
      <input
        className="border border-[#ced8e5] rounded-lg p-3 my-4 w-72"
        placeholder="Pesquisar por número, origem ou destino"
        value={busca}
        onChange={e => { setBusca(e.target.value); carregar(e.target.value); }}
      />
      <div className="bg-white border border-[#e2e9f1] rounded-xl p-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[#71809a] text-xs uppercase">
              <th className="p-2">Número NF</th><th className="p-2">Origem</th><th className="p-2">Destino</th>
              <th className="p-2">Valor</th><th className="p-2">CT-es</th><th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(n => (
              <tr key={n.id} className="border-b border-[#edf1f5]">
                <td className="p-2">{n.numero_nf}</td>
                <td className="p-2">{n.origem || '—'}</td>
                <td className="p-2">{n.destino || '—'}</td>
                <td className="p-2">{brl(n.valor_nf)}</td>
                <td className="p-2">{n.qtd_ctes}</td>
                <td className="p-2">
                  <button onClick={() => navigate(`/notas-fiscais/${n.id}`)} className="text-[#137a65] font-bold mr-3">Ver CT-es</button>
                  {usuario?.is_admin && <button onClick={() => excluir(n.id)} className="text-[#c53644] font-bold">Excluir</button>}
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td className="p-2 text-[#71809a]" colSpan={6}>Nenhuma nota fiscal cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nova nota fiscal">
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Cliente
            <select required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
              <option value="">Selecione</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Número da NF-e
            <input required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.numero_nf} onChange={e => setForm({ ...form, numero_nf: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Data de emissão
            <input type="date" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.data_emissao} onChange={e => setForm({ ...form, data_emissao: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Valor da NF
            <input type="number" step="0.01" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.valor_nf} onChange={e => setForm({ ...form, valor_nf: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Peso (kg)
            <input type="number" step="0.01" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Volumes
            <input type="number" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.volumes} onChange={e => setForm({ ...form, volumes: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Origem
            <input className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Destino
            <input className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} />
          </label>
          <div className="col-span-2 flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2">Cancelar</button>
            <button className="bg-[#137a65] text-white font-bold px-4 py-2 rounded-lg">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
