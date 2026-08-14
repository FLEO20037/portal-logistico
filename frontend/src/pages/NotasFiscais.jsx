import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { ordenar, ThOrdenavel } from '../utils/ordenacao';

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
  const [ordenacao, setOrdenacao] = useState({ chave: null, dir: 'asc' });
  const [clienteFiltro, setClienteFiltro] = useState('');
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

  function alternarOrdenacao(chave) {
    setOrdenacao(prev => prev.chave === chave ? { chave, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { chave, dir: 'asc' });
  }

  const listaExibida = ordenar(
    clienteFiltro ? lista.filter(n => String(n.cliente_id) === clienteFiltro) : lista,
    ordenacao.chave, ordenacao.dir
  );

  return (
    <div>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notas fiscais</h1>
          <p className="text-[#71809a]">Cadastre a NF-e com origem, destino e vincule os CT-es de transporte.</p>
        </div>
        {usuario?.is_admin && <button onClick={abrirNovo} className="bg-[#137a65] text-white font-bold px-4 py-3 rounded-lg">Adicionar NF-e</button>}
      </div>
      <div className="flex gap-2 my-4">
        <input
          className="border border-[#ced8e5] rounded-lg p-3 w-72"
          placeholder="Pesquisar por número, origem ou destino"
          value={busca}
          onChange={e => { setBusca(e.target.value); carregar(e.target.value); }}
        />
        {usuario?.is_admin && clientes.length > 0 && (
          <select className="border border-[#ced8e5] rounded-lg p-3" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>
      <div className="bg-white border border-[#e2e9f1] rounded-xl p-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[#71809a] text-xs uppercase">
              <ThOrdenavel label="Número NF" chave="numero_nf" ordenacao={ordenacao} onClick={alternarOrdenacao} />
              <ThOrdenavel label="Origem" chave="origem" ordenacao={ordenacao} onClick={alternarOrdenacao} />
              <ThOrdenavel label="Destino" chave="destino" ordenacao={ordenacao} onClick={alternarOrdenacao} />
              <th className="p-2">Transportadora(s)</th>
              <ThOrdenavel label="Valor" chave="valor_nf" ordenacao={ordenacao} onClick={alternarOrdenacao} />
              <ThOrdenavel label="CT-es" chave="qtd_ctes" ordenacao={ordenacao} onClick={alternarOrdenacao} />
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaExibida.map(n => (
              <tr key={n.id} className="border-b border-[#edf1f5]">
                <td className="p-2">{n.numero_nf}</td>
                <td className="p-2">{n.origem || '—'}</td>
                <td className="p-2">{n.destino || '—'}</td>
                <td className="p-2">{n.transportadoras?.join(', ') || '—'}</td>
                <td className="p-2">{brl(n.valor_nf)}</td>
                <td className="p-2">{n.qtd_ctes}</td>
                <td className="p-2">
                  <button onClick={() => navigate(`/notas-fiscais/${n.id}`)} className="text-[#137a65] font-bold mr-3">Ver CT-es</button>
                  {usuario?.is_admin && <button onClick={() => abrirEditar(n)} className="text-[#137a65] font-bold mr-3">Editar</button>}
                  {usuario?.is_admin && <button onClick={() => excluir(n.id)} className="text-[#c53644] font-bold">Excluir</button>}
                </td>
              </tr>
            ))}
            {listaExibida.length === 0 && <tr><td className="p-2 text-[#71809a]" colSpan={7}>Nenhuma nota fiscal encontrada.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar nota fiscal' : 'Nova nota fiscal'}>
        {!editId && (
          <div className="bg-[#f4f7fb] border border-[#e2e9f1] rounded-lg p-3 mb-4">
            <label className="text-xs font-bold text-[#475569] block mb-1">Preencher automaticamente a partir do PDF da NF-e (DANFE)</label>
            <input type="file" accept=".pdf" className="text-sm" onChange={extrairDePdf} disabled={extraindo} />
            {extraindo && <p className="text-xs text-[#71809a] mt-1">Lendo o PDF...</p>}
            {avisoExtracao && <p className="text-xs text-[#9b6400] mt-1">{avisoExtracao}</p>}
          </div>
        )}
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
