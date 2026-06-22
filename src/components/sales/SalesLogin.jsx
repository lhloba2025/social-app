import React, { useState } from 'react';
import { salesApi } from '@/api/salesClient';
import HoveraLogo from './HoveraLogo';
import { Loader2, LogIn } from 'lucide-react';

// بوابة الدخول لفريق المبيعات. تُستدعى من الصفحتين عند غياب الجلسة.
export default function SalesLogin({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await salesApi.login(username.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err.message || 'تعذّر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-3 mb-8">
          <HoveraLogo size={64} withText={false} />
          <h1 className="text-2xl font-extrabold text-white">هوفيرا</h1>
          <p className="text-slate-400 text-sm">بوابة فريق المبيعات</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm mb-1.5">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="أدخل اسم المستخدم"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-1.5">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-rose-950/50 border border-rose-800 text-rose-300 text-sm rounded-lg px-3 py-2 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            دخول
          </button>
        </form>
      </div>
    </div>
  );
}
