import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not sign in — check your details and try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-9">
          <div className="inline-grid grid-cols-2 gap-1 mb-5" aria-hidden="true">
            <span className="h-3.5 w-3.5 rounded-sm bg-role-student" />
            <span className="h-3.5 w-3.5 rounded-sm bg-role-academic" />
            <span className="h-3.5 w-3.5 rounded-sm bg-role-finance" />
            <span className="h-3.5 w-3.5 rounded-sm bg-role-admin" />
          </div>
          <h1 className="text-[19px] font-semibold text-ink tracking-tight">RATU MIS</h1>
          <p className="text-[13px] text-ink/50 mt-1">Sign in to your campus account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-xl p-6 space-y-4">
          {error && <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="block text-[12px] font-medium text-ink/60 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-[14px] text-ink bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/30 transition"
              placeholder="you@ratu.edu.rw" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink/60 mb-1.5">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-[14px] text-ink bg-white focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/30 transition"
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-ink text-white text-[13px] font-medium rounded-md py-2.5 hover:bg-ink/90 transition disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-[12px] text-ink/35 mt-7 font-mono">KIGALI · MUSANZE · HUYE</p>
      </div>
    </div>
  );
}
