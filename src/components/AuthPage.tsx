import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

type Mode = 'login' | 'signup';

export function AuthPage() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<'student' | 'counselor'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (profile?.role === 'student') navigate('/student', { replace: true });
    if (profile?.role === 'counselor') navigate('/counselor', { replace: true });
  }, [profile, authLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup' && role === 'counselor') {
      const expected = import.meta.env.VITE_COUNSELOR_INVITE_CODE as string | undefined;
      if (!expected || inviteCode.trim() !== expected.trim()) {
        setError('Invalid invite code. Please contact your administrator.');
        setLoading(false);
        return;
      }
    }

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } },
      });
      if (error) {
        setError(error.message);
      } else {
        toast.success('Account created successfully!');
        if (data.user) {
          await new Promise((res) => setTimeout(res, 500));
          if (role === 'student') navigate('/student', { replace: true });
          else navigate('/counselor', { replace: true });
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        toast.success('Welcome back!');
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profileData?.role === 'student') navigate('/student', { replace: true });
        else if (profileData?.role === 'counselor') navigate('/counselor', { replace: true });
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-5">
      {/* Logo + wordmark */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center shadow-md mb-4">
          <Heart className="w-8 h-8 text-white" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Ayo</h1>
        <p className="text-slate-400 text-sm mt-1">Your Mental Wellness Companion</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        {/* Mode toggle */}
        <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                mode === m
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <Label htmlFor="name" className="text-xs font-medium text-slate-600">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="mt-1.5 rounded-xl border-stone-200 focus:border-teal-400 h-10 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-600">I am a…</Label>
                <div className="flex gap-2 mt-1.5">
                  {(['student', 'counselor'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setInviteCode(''); setError(''); }}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 capitalize ${
                        role === r
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-stone-200 text-slate-500 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'counselor' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 space-y-2.5">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Counselor accounts require an invite code issued by your administrator.
                  </p>
                  <div>
                    <Label htmlFor="inviteCode" className="text-xs font-medium text-slate-600">
                      Invite Code
                    </Label>
                    <Input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter your invite code"
                      required
                      className="mt-1.5 rounded-xl border-amber-200 focus:border-amber-400 h-10 text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <Label htmlFor="email" className="text-xs font-medium text-slate-600">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1.5 rounded-xl border-stone-200 focus:border-teal-400 h-10 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-xs font-medium text-slate-600">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="mt-1.5 rounded-xl border-stone-200 focus:border-teal-400 h-10 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl leading-snug">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 rounded-xl h-10 text-sm font-medium shadow-sm mt-1"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </Button>
        </form>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center leading-relaxed max-w-xs">
        Your responses are private and only shared with your counselor.
      </p>
    </div>
  );
}
