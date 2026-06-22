import React, { useState } from 'react';
import { salesApi } from '@/api/salesClient';
import HoveraLogo from './HoveraLogo';
import { Loader2, LogIn } from 'lucide-react';

// بوابة الدخول لفريق المبيعات. تُستدعى من الصفحتين عند غياب الجلسة.
export default function SalesLogin({ onSuccess, ar = true }) {
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
      setError(err.message || (ar ? 'تعذّر تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      {/* وهج خلفي */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-1/4 w-[36rem] h-[36rem] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/4 w-[36rem] h-[36rem] rounded-full bg-violet-600/15 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl shadow-indigo-950/40">
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-white/10">
              <HoveraLogo size={56} withText={false} ar={ar} />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{ar ? 'هوفيرا' : 'Hovera'}</h1>
            <p className="text-slate-400 text-sm">{ar ? 'بوابة فريق المبيعات' : 'Sales Team Portal'}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-[13px] font-medium mb-1.5">{ar ? 'اسم المستخدم' : 'Username'}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
                placeholder={ar ? 'أدخل اسم المستخدم' : 'Enter your username'}
              />
            </div>
            <div>
              <label className="block text-slate-300 text-[13px] font-medium mb-1.5">{ar ? 'كلمة المرور' : 'Password'}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3.5 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl px-3 py-2.5 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {ar ? 'دخول' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
