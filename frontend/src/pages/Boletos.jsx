import { useEffect, useState } from 'react';
import api from '../api';
import { ordenar, ThOrdenavel } from '../utils/ordenacao';

const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fdata = v => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
const ORDEM_STATUS = { VENCIDO: 0, PENDENTE: 1, PAGO: 2 };

export default function Boletos() {
  const [lista, setLista] = useState([]);
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState({ chave: 'status', dir: 'asc' });

  async function carregar(st = status) {
    const { data } = await api.get('/boletos', { params: st ? { status: st } : {} });
    setLista(data.dados);
  }

  useEffect(() => { carregar(); }, []);

  async function marcarPago(id) {
    if (!confirm('Confirmar que este boleto já foi pago?')) return;
    await api.patch(`/boletos/${id}/pagar`);
    carregar();
  }

  function alternarOrdenacao(chave) {
    setOrdenacao(prev => prev.chave === chave ? { chave, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { chave, dir: 'asc' });
  }

  function ordenarBoletos(items) {
    if (ordenacao.chave === 'status') {
      return [...items].sort((a, b) => {
        const sa = ORDEM_STATUS[a.status] ?? 99;
        const sb = ORDEM_STATUS[b.status] ?? 99;
        if (sa !== sb) return ordenacao.dir === 'asc' ? sa - sb : sb - sa;
        return (a.vencimento || '').localeCompare(b.vencimento || '');
      });
    }
    return ordenar(items, ordenacao.chave, ordenacao.dir);
  }

  const filtrados = ordenarBoletos(lista.filter(b => String(b.numero || '').toLowerCase().includes(busca.toLowerCase())));

  return (
    <div>
      <h1 className="text-2xl font-bold">Boletos</h1>
      <p className="text-[#71809a] mb-4">Acompanhe os boletos de todas as transportadoras.</p>
      <div className="flex gap-2 mb-4">
        {['', 'PENDENTE', 'PAGO', 'VENCIDO'].map(s => (
          <button key={s} onClick={() => { setStatus(s); carregar(s); }} className={`px-4 py-2 rounded-lg font-bold text-sm ${status === s ? 'bg-[#137a65] text-white' : 'bg-white border border-[#ced8e5]'}`}>{s || 'Todos'}</button>
        ))}
        <input className="border border-[#ced8e5] rounded-lg p-2 ml-2 flex-1" placeholder="Pesquisar por número" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      <div className="bg-white border border-[#e2e9f1] rounded-xl p-5">
        <table className="w-full border-collapse">
          <thead><tr className="text-left text-[#71809a] text-xs uppercase">
            <ThOrdenavel label="Número" chave="numero" ordenacao={ordenacao} onClick={alternarOrdenacao} />
            <ThOrdenavel label="Valor" chave="valor" ordenacao={ordenacao} onClick={alternarOrdenacao} />
            <ThOrdenavel label="Vencimento" chave="vencimento" ordenacao={ordenacao} onClick={alternarOrdenacao} />
            <ThOrdenavel label="Transportadora" chave="transportadora" ordenacao={ordenacao} onClick={alternarOrdenacao} />
            <ThOrdenavel label="Status" chave="status" ordenacao={ordenacao} onClick={alternarOrdenacao} />
            <th className="p-2">PDF</th><th className="p-2">Ação</th>
          </tr></thead>
          <tbody>
            {filtrados.map(b => <tr key={b.id} className="border-b border-[#edf1f5]">
              <td className="p-2">{b.numero}</td><td className="p-2">{brl(b.valor)}</td><td className="p-2">{fdata(b.vencimento)}</td><td className="p-2">{b.transportadora || '—'}</td>
              <td className="p-2"><span className={`text-xs font-bold px-2 py-1 rounded-full ${b.status === 'PAGO' ? 'bg-[#e2f8f0] text-[#147a64]' : 'bg-[#fff0d4] text-[#9b6400]'}`}>{b.status}</span></td>
              <td className="p-2">{b.pdf_url ? <a className="text-[#137a65] font-bold" target="_blank" rel="noreferrer" href={b.pdf_url}>Ver PDF</a> : '—'}</td>
              <td className="p-2">{b.status !== 'PAGO' && <button onClick={() => marcarPago(b.id)} className="text-[#137a65] font-bold">Marcar como pago</button>}</td>
            </tr>)}
            {filtrados.length === 0 && <tr><td className="p-2 text-[#71809a]" colSpan={7}>Nenhum boleto encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
