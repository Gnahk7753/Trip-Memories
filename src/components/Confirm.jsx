export default function Confirm({ title, message, yes = 'Có', no = 'Không', onYes, onNo }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onNo}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-xs text-center space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">{title}</h3>
        {message && <p className="text-sm text-slate-500">{message}</p>}
        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onNo}>{no}</button>
          <button className="btn btn-primary flex-1" onClick={onYes}>{yes}</button>
        </div>
      </div>
    </div>
  );
}
