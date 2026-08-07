import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const vazio = { nome: '', cnpj: '', logo: '' };

export default function Transportadoras() {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);

  async function carregar(q = '') {
    const { data } = await api.get('/transportadoras', { params: { q } });
    setLista(data.dados);
  }

  useEffect(() => { carregar(); }, []);

  function abrir(t = null) {
    setEditId(t?.id || null);
    setForm(t || vazio);
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (editId) await api.put(`/transportadoras/${editId}`, form);
    else await api.post('/transportadoras', form);
    setModal(false);
    carregar(busca);
  }

  async function excluir(id) {
    if (!confirm('Excluir esta transportadora?')) return;
    await api.delete(`/transportadoras/${id}`);
    carregar(busca);
  }

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transportadoras</h1>
          <p className="text-[#71809a]">Cadastre as transportadoras parceiras do portal.</p>
        </div>
        <button onClick={() => abrir()} className="bg-[#137a65] text-white font-bold px-4 py-3 rounded-lg">Nova transportadora</button>
      </div>
      <input
        className="border border-[#ced8e5] rounded-lg p-3 my-4 w-72"
        placeholder="Pesquisar por nome ou CNPJ"
        value={busca}
        onChange={e => { setBusca(e.target.value); carregar(e.target.value); }}
      />
      <div className="bg-white border border-[#e2e9f1] rounded-xl p-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[#71809a] text-xs uppercase">
              <th className="p-2">Nome</th><th className="p-2">CNPJ</th><th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(t => (
              <tr key={t.id} className="border-b border-[#edf1f5]">
                <td className="p-2">{t.nome}</td>
                <td className="p-2">{t.cnpj}</td>
                <td className="p-2">
                  <button onClick={() => abrir(t)} className="text-[#137a65] font-bold mr-3">Editar</button>
                  <button onClick={() => excluir(t.id)} className="text-[#c53644] font-bold">Excluir</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td className="p-2 text-[#71809a]" colSpan={3}>Nenhuma transportadora cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar transportadora' : 'Nova transportadora'}>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Nome
            <input required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">CNPJ
            <input required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569] col-span-2">URL do logo (opcional)
            <input className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.logo || ''} onChange={e => setForm({ ...form, logo: e.target.value })} />
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
