import { useState } from 'react';

// Ảnh tự thử tải lại khi lỗi (ảnh mới up lên CDN có thể chưa sẵn sàng) => không cần F5
export default function SmartImg({ src, className = '', alt = '', ...rest }) {
  const [tries, setTries] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const url = tries ? `${src}${src.includes('?') ? '&' : '?'}r=${tries}` : src;
  return (
    <img
      key={url}
      src={url}
      alt={alt}
      {...rest}
      onLoad={() => setLoaded(true)}
      onError={() => { if (tries < 5) setTimeout(() => setTries((t) => t + 1), 800 * (tries + 1)); }}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
