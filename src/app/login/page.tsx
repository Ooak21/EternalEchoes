'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/');
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html { -webkit-text-size-adjust: 100%; }

        body {
          background: #0c0c0b;
          color: #e8e4dc;
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
        }

        .login-input {
          width: 100%;
          background: #0c0c0b;
          border: 1px solid #1e1e1c;
          color: #e8e4dc;
          font-size: 16px; /* Prevents iOS zoom */
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          padding: 15px 18px;
          outline: none;
          transition: border-color 0.2s;
          border-radius: 0;
          -webkit-appearance: none;
          min-height: 52px;
        }
        .login-input:focus { border-color: #c9a96e; }
        .login-input::placeholder { color: #2e2e2a; }

        .btn-submit {
          width: 100%;
          background: #c9a96e;
          color: #0c0c0b;
          border: none;
          padding: 16px 36px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
          border-radius: 0;
          min-height: 52px;
          -webkit-tap-highlight-color: transparent;
        }
        .btn-submit:hover { background: #d9b97e; }
        .btn-submit:disabled { background: #222220; color: #444440; cursor: not-allowed; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.55s ease both; }

        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        background: '#0c0c0b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        paddingTop: 'max(40px, env(safe-area-inset-top))',
        paddingBottom: 'max(40px, env(safe-area-inset-bottom))',
      } as React.CSSProperties}>

        {/* Radial glow */}
        <div style={{
          position: 'fixed',
          top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(201,169,110,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="fade-up" style={{ width: '100%', maxWidth: '400px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, color: '#e8e4dc', letterSpacing: '0.04em' }}>
                Eternal
              </span>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 600, color: '#c9a96e', letterSpacing: '0.04em' }}>
                Echoes
              </span>
            </div>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#3a3a37', fontStyle: 'italic' }}>
              A living record of your life
            </p>
          </div>

          {sent ? (
            /* ── Sent state ── */
            <div style={{ textAlign: 'center', padding: '44px 28px', border: '1px solid #1e1e1c', background: '#111110' }}>
              <div style={{ fontSize: '26px', color: '#c9a96e', marginBottom: '18px' }}>✦</div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, color: '#e8e4dc', marginBottom: '12px' }}>
                Check your email
              </h2>
              <p style={{ fontSize: '14px', color: '#555550', fontWeight: 300, lineHeight: 1.7 }}>
                Magic link sent to<br />
                <span style={{ color: '#c9a96e', fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: '16px' }}>
                  {email}
                </span>
              </p>
              <p style={{ fontSize: '12px', color: '#2e2e2a', marginTop: '16px' }}>
                Check spam if it doesn't arrive.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                style={{
                  marginTop: '24px',
                  background: 'none',
                  border: '1px solid #1e1e1c',
                  color: '#555550',
                  padding: '11px 24px',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  minHeight: '44px',
                }}
              >
                Use different email
              </button>
            </div>
          ) : (
            /* ── Login form ── */
            <div style={{ border: '1px solid #1a1a18', background: '#111110', padding: '36px 28px' }}>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '26px', fontWeight: 300, color: '#e8e4dc', marginBottom: '8px' }}>
                Sign in
              </h1>
              <p style={{ fontSize: '13px', color: '#444440', fontWeight: 300, marginBottom: '28px', lineHeight: 1.65 }}>
                Enter your email for a magic link. No password needed.
              </p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="login-input"
                  autoComplete="email"
                  inputMode="email"
                />
                <button type="submit" disabled={loading} className="btn-submit">
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>

              {message && (
                <p style={{ marginTop: '14px', fontSize: '13px', color: '#cc5555', textAlign: 'center' }}>
                  {message}
                </p>
              )}

              <p style={{ marginTop: '24px', fontSize: '11px', color: '#2a2a28', textAlign: 'center', lineHeight: 1.6 }}>
                New here? Signing in creates your account automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}