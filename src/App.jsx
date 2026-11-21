import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { api } from './api.js';
import { AuthCtx, useAuth } from './auth.jsx';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import NewTrip from './pages/NewTrip.jsx';
import Trip from './pages/Trip.jsx';
import Profile from './pages/Profile.jsx';

function Shell() {
  const { user, setUser } = useAuth();
  const logout = async () => { await api.post('/auth/logout'); setUser(null); };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-indigo-600">🌴 Kỷ niệm chuyến đi</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/profile" className="font-medium truncate max-w-[9rem]">{user.full_name}</Link>
            <button onClick={logout} className="text-slate-500 hover:text-slate-800">Đăng xuất</button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trips/new" element={<NewTrip />} />
          <Route path="/trips/:id" element={<Trip />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => { api.get('/me').then((d) => setUser(d.user)).catch(() => setUser(null)); }, []);
  if (user === undefined) return <div className="p-10 text-center text-slate-500">Đang tải…</div>;
  return <AuthCtx.Provider value={{ user, setUser }}>{user ? <Shell /> : <Auth />}</AuthCtx.Provider>;
}
