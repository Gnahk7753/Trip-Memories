import { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setT({ id, msg, type });
    setTimeout(() => setT((c) => (c && c.id === id ? null : c)), 3000);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div className="fixed top-16 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
          <div className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg text-white ${t.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            {t.type === 'error' ? '⚠️ ' : '✓ '}{t.msg}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
