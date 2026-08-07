import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const vazio = { nome: '', cnpj: '', email: '', senha: '', ativo: true, is_admin: false };

export default function Clientes() {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);

  async function carregar(q = '') {
    const { data } = await api.get('/clientes', { params: { q } });
    setLista(data.dados);
  }

  useEffect(() => { carregar(); }, []);

  function abrir(cliente = null) {
    setEditId(cliente?.id || null);
    setForm(cliente ? { ...cliente, senha: '' } : vazio);
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (editId) await api.put(`/clientes/${editId}`, form);
    else await api.post('/clientes', form);
    setModal(false);
    carregar(busca);
  }

  async function excluir(id) {
    if (!confirm('Excluir este cliente?')) return;
    await api.delete(`/clientes/${id}`);
    carregar(busca);
  }

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-[#71809a]">Cadastre e gerencie os clientes com acesso ao portal.</p>
        </div>
        <button onClick={() => abrir()} className="bg-[#137a65] text-white font-bold px-4 py-3 rounded-lg">Novo cliente</button>
      </div>
      <input
        className="border border-[#ced8e5] rounded-lg p-3 my-4 w-72"
        placeholder="Pesquisar por nome, CNPJ ou email"
        value={busca}
        onChange={e => { setBusca(e.target.value); carregar(e.target.value); }}
      />
      <div className="bg-white border border-[#e2e9f1] rounded-xl p-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[#71809a] text-xs uppercase">
              <th className="p-2">Nome</th><th className="p-2">CNPJ</th><th className="p-2">Email</th>
              <th className="p-2">Status</th><th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(c => (
              <tr key={c.id} className="border-b border-[#edf1f5]">
                <td className="p-2">{c.nome}</td>
                <td className="p-2">{c.cnpj}</td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.ativo ? 'bg-[#e2f8f0] text-[#147a64]' : 'bg-[#fff0d4] text-[#9b6400]'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-2">
                  <button onClick={() => abrir(c)} className="text-[#137a65] font-bold mr-3">Editar</button>
                  <button onClick={() => excluir(c.id)} className="text-[#c53644] font-bold">Excluir</button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td className="p-2 text-[#71809a]" colSpan={5}>Nenhum cliente cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar cliente' : 'Novo cliente'}>
        <form onSubmit={salvar} className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Nome
            <input required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">CNPJ
            <input required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Email
            <input required type="email" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Senha {editId && '(deixe em branco para manter)'}
            <input type="password" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required={!editId} />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#475569]">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} /> Ativo
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-[#475569]">
            <input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })} /> Administrador
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
