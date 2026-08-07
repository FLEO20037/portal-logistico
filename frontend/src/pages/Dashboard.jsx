import { useEffect, useState } from 'react';
import api from '../api';

const brl = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const data = v => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export default function Dashboard() {
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(r => setD(r.data.dados));
  }, []);

  if (!d) return <p className="text-[#71809a]">Carregando...</p>;

  const cards = [
    ['NF-es', d.qtd_nfs],
    ['CT-es', d.qtd_ctes],
    ['Boletos pendentes', d.qtd_boletos_pendentes],
    ['Boletos vencidos', d.qtd_boletos_vencidos],
    ['Boletos pagos', d.qtd_boletos_pagos],
    ['Valor em aberto', brl(d.valor_total_aberto)],
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Visão geral</h1>
      <p className="text-[#71809a] mb-6">NF-e, CT-es e boletos organizados por transporte.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map(([label, val]) => (
          <div key={label} className="bg-white border border-[#e2e9f1] rounded-xl p-5">
            <span className="block text-[#71809a] text-xs mb-2">{label}</span>
            <strong className="text-2xl">{val}</strong>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#e2e9f1] rounded-xl p-5">
        <h2 className="font-bold mb-3">Últimos CT-es cadastrados</h2>
        {d.ultimos_ctes.length === 0 && <p className="text-[#71809a]">Nenhum CT-e cadastrado ainda.</p>}
        {d.ultimos_ctes.map(c => (
          <div key={c.id} className="flex justify-between border-b border-[#edf1f5] py-3 text-sm">
            <span>CT-e {c.numero_cte} · {c.transportadora}</span>
            <span>{brl(c.valor_frete)} · {data(c.data_emissao)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
