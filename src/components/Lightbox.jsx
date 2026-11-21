import { useEffect } from 'react';
import { download } from '../api.js';

// Xem ảnh/video ngay trong trang (không mở tab mới), có nút lưu về máy
export default function Lightbox({ items, index, onClose, onIndex }) {
  const it = items[index];
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [index, items.length]);
  if (!it) return null;
  const stop = (e) => e.stopPropagation();
  const nav = 'absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white text-2xl leading-none hover:bg-white/30';
  return (
    <div className="fixed inset-0 z-40 bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-3 text-white" onClick={stop}>
        <span className="text-sm">{index + 1} / {items.length}</span>
        <div className="flex gap-2">
          <button className="btn bg-white/15 text-white hover:bg-white/25" onClick={() => download(it.url)}>
            ⬇ Lưu {it.media_type === 'video' ? 'video' : 'hình'}
          </button>
          <button className="btn bg-white/15 text-white hover:bg-white/25" onClick={onClose}>✕ Đóng</button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 pb-4">
        {index > 0 && <button className={`${nav} left-2`} onClick={(e) => { stop(e); onIndex(index - 1); }}>‹</button>}
        {it.media_type === 'video'
          ? <video key={it.id} src={it.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" onClick={stop} />
          : <img key={it.id} src={it.url} alt="" className="max-h-full max-w-full object-contain rounded-lg" onClick={stop} />}
        {index < items.length - 1 && <button className={`${nav} right-2`} onClick={(e) => { stop(e); onIndex(index + 1); }}>›</button>}
      </div>
    </div>
  );
}
