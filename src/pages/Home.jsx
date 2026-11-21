import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import SmartImg from '../components/SmartImg.jsx';

export default function Home() {
  const [trips, setTrips] = useState(null);
  useEffect(() => { api.get('/trips').then((d) => setTrips(d.trips)); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Dòng thời gian</h1>
        <Link to="/trips/new" className="btn btn-primary">+ Add Memories</Link>
      </div>
      {trips === null ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : trips.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">Chưa có chuyến đi nào. Hãy tạo kỷ niệm đầu tiên! 🎒</div>
      ) : (
        <ol className="relative border-l-2 border-indigo-200 ml-3 space-y-8">
          {trips.map((t) => (
            <li key={t.id} className="ml-6">
              <span className="absolute -left-[9px] mt-1 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-slate-50" />
              <div className="text-xs font-medium text-indigo-600 mb-1">{fmtDate(t.trip_date)}</div>
              <Link to={`/trips/${t.id}`} className="card block overflow-hidden hover:shadow-md transition">
                {t.cover_url ? (
                  <SmartImg src={t.cover_url} loading="lazy" className="w-full h-44 sm:h-56 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-r from-indigo-400 to-pink-400" />
                )}
                <div className="p-4">
                  <h2 className="font-semibold text-lg">{t.name}</h2>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {t.members.map((m) => (
                      <span key={m.id} className="text-xs bg-slate-100 rounded-full px-2.5 py-1">{m.full_name}</span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
