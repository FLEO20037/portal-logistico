export function ordenar(lista, chave, dir) {
  if (!chave) return lista;
  return [...lista].sort((a, b) => {
    let va = a[chave], vb = b[chave];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

export function ThOrdenavel({ label, chave, ordenacao, onClick }) {
  const ativa = ordenacao.chave === chave;
  return (
    <th className="p-2 cursor-pointer select-none" onClick={() => onClick(chave)}>
      {label} {ativa && (ordenacao.dir === 'asc' ? '▲' : '▼')}
    </th>
  );
}
