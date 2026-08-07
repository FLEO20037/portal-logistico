import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fdata = v => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

export default function NotaFiscalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [nf, setNf] = useState(null);
  const [ctes, setCtes] = useState([]);
  const [boletosPorCte, setBoletosPorCte] = useState({});
  const [transportadoras, setTransportadoras] = useState([]);

  const [modalCte, setModalCte] = useState(false);
  const [formCte, setFormCte] = useState({ transportadora_id: '', numero_cte: '', valor_frete: '', data_emissao: '', pdf: null, xml: null });

  const [modalBoleto, setModalBoleto] = useState(false);
  const [cteAtual, setCteAtual] = useState(null);
  const [formBoleto, setFormBoleto] = useState({ numero: '', valor: '', vencimento: '', status: 'PENDENTE', pdf: null });

  async function carregar() {
    const { data: dnf } = await api.get(`/notas-fiscais/${id}`);
    setNf(dnf.dados);
    const { data: dctes } = await api.get('/ctes', { params: { nf_id: id } });
    setCtes(dctes.dados);
    const mapa = {};
    for (const c of dctes.dados) {
      const { data: db } = await api.get('/boletos', { params: { cte_id: c.id } });
      mapa[c.id] = db.dados;
    }
    setBoletosPorCte(mapa);
  }

  useEffect(() => {
    carregar();
    if (usuario?.is_admin) api.get('/transportadoras').then(r => setTransportadoras(r.data.dados));
  }, [id]);

  async function salvarCte(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('nf_id', id);
    Object.entries(formCte).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, v); });
    await api.post('/ctes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setModalCte(false);
    setFormCte({ transportadora_id: '', numero_cte: '', valor_frete: '', data_emissao: '', pdf: null, xml: null });
    carregar();
  }

  async function excluirCte(cteId) {
    if (!confirm('Excluir este CT-e e seus boletos?')) return;
    await api.delete(`/ctes/${cteId}`);
    carregar();
  }

  function abrirBoleto(cteId) {
    setCteAtual(cteId);
    setFormBoleto({ numero: '', valor: '', vencimento: '', status: 'PENDENTE', pdf: null });
    setModalBoleto(true);
  }

  async function salvarBoleto(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('cte_id', cteAtual);
    Object.entries(formBoleto).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, v); });
    await api.post('/boletos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setModalBoleto(false);
    carregar();
  }

  async function excluirBoleto(boletoId) {
    if (!confirm('Excluir este boleto?')) return;
    await api.delete(`/boletos/${boletoId}`);
    carregar();
  }

  if (!nf) return <p className="text-[#71809a]">Carregando...</p>;

  return (
    <div>
      <button onClick={() => navigate('/notas-fiscais')} className="text-[#137a65] font-bold mb-3">← Voltar às notas fiscais</button>
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">NF-e {nf.numero_nf}</h1>
          <p className="text-[#71809a]">{nf.origem} → {nf.destino} · valor da NF: {brl(nf.valor_nf)}</p>
        </div>
        {usuario?.is_admin && <button onClick={() => setModalCte(true)} className="bg-[#137a65] text-white font-bold px-4 py-3 rounded-lg">Adicionar CT-e</button>}
      </div>

      <div className="bg-white border border-[#e2e9f1] rounded-xl p-5 mt-5">
        <h2 className="font-bold mb-3">CT-es vinculados a esta NF-e</h2>
        {ctes.length === 0 && <p className="text-[#71809a]">Nenhum CT-e cadastrado nesta nota.</p>}
        {ctes.map(c => (
          <div key={c.id} className="border border-[#e1e8ef] rounded-lg p-4 my-3">
            <div className="flex justify-between items-center">
              <div>
                <strong>CT-e {c.numero_cte}</strong>
                <p className="text-[#71809a] text-sm">{c.transportadora} · {brl(c.valor_frete)} · {fdata(c.data_emissao)}</p>
                <div className="flex gap-3 mt-1 text-sm">
                  {c.pdf && <a className="text-[#137a65] font-bold" target="_blank" href={`${API_BASE}/${c.pdf}`}>Ver PDF</a>}
                  {c.xml && <a className="text-[#137a65] font-bold" target="_blank" href={`${API_BASE}/${c.xml}`}>Baixar XML</a>}
                </div>
              </div>
              {usuario?.is_admin && (
                <div>
                  <button onClick={() => excluirCte(c.id)} className="text-[#c53644] font-bold mr-3">Excluir</button>
                  <button onClick={() => abrirBoleto(c.id)} className="bg-[#137a65] text-white font-bold px-3 py-2 rounded-lg">Adicionar boleto</button>
                </div>
              )}
            </div>
            <div className="mt-3">
              <strong className="text-sm">Boletos da {c.transportadora}</strong>
              {(boletosPorCte[c.id] || []).map(b => (
                <div key={b.id} className="flex justify-between items-center bg-[#f7fafc] rounded-lg p-3 mt-2 text-sm">
                  <span>
                    {b.numero} · vence {fdata(b.vencimento)} · {brl(b.valor)}{' '}
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.status === 'PAGO' ? 'bg-[#e2f8f0] text-[#147a64]' : 'bg-[#fff0d4] text-[#9b6400]'}`}>{b.status}</span>
                  </span>
                  {usuario?.is_admin && <button onClick={() => excluirBoleto(b.id)} className="text-[#c53644] font-bold">Excluir</button>}
                </div>
              ))}
              {(boletosPorCte[c.id] || []).length === 0 && <p className="text-[#71809a] text-sm mt-2">Nenhum boleto cadastrado.</p>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalCte} onClose={() => setModalCte(false)} title="Novo CT-e">
        <form onSubmit={salvarCte} className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Transportadora
            <select required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formCte.transportadora_id} onChange={e => setFormCte({ ...formCte, transportadora_id: e.target.value })}>
              <option value="">Selecione</option>
              {transportadoras.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Número do CT-e
            <input required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formCte.numero_cte} onChange={e => setFormCte({ ...formCte, numero_cte: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Valor do frete
            <input type="number" step="0.01" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formCte.valor_frete} onChange={e => setFormCte({ ...formCte, valor_frete: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Data de emissão
            <input type="date" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formCte.data_emissao} onChange={e => setFormCte({ ...formCte, data_emissao: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Arquivo PDF
            <input type="file" accept=".pdf" className="text-sm" onChange={e => setFormCte({ ...formCte, pdf: e.target.files[0] })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Arquivo XML
            <input type="file" accept=".xml" className="text-sm" onChange={e => setFormCte({ ...formCte, xml: e.target.files[0] })} />
          </label>
          <div className="col-span-2 flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setModalCte(false)} className="px-4 py-2">Cancelar</button>
            <button className="bg-[#137a65] text-white font-bold px-4 py-2 rounded-lg">Salvar</button>
          </div>
        </form>
      </Modal>

      <Modal open={modalBoleto} onClose={() => setModalBoleto(false)} title="Novo boleto">
        <form onSubmit={salvarBoleto} className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Número do boleto
            <input required className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formBoleto.numero} onChange={e => setFormBoleto({ ...formBoleto, numero: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Valor
            <input type="number" step="0.01" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formBoleto.valor} onChange={e => setFormBoleto({ ...formBoleto, valor: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Vencimento
            <input type="date" className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formBoleto.vencimento} onChange={e => setFormBoleto({ ...formBoleto, vencimento: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569]">Status
            <select className="border border-[#ced8e5] rounded-lg p-2 font-normal" value={formBoleto.status} onChange={e => setFormBoleto({ ...formBoleto, status: e.target.value })}>
              <option>PENDENTE</option><option>PAGO</option><option>VENCIDO</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-[#475569] col-span-2">Arquivo PDF
            <input type="file" accept=".pdf" className="text-sm" onChange={e => setFormBoleto({ ...formBoleto, pdf: e.target.files[0] })} />
          </label>
          <div className="col-span-2 flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setModalBoleto(false)} className="px-4 py-2">Cancelar</button>
            <button className="bg-[#137a65] text-white font-bold px-4 py-2 rounded-lg">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
