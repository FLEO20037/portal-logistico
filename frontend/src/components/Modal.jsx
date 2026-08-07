export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-[#102442aa] flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-[#13233e]">{title}</h2>
          <button onClick={onClose} className="text-[#137a65] font-bold">Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}
