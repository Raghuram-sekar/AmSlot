"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Hourglass, Mail, Lock, User, GraduationCap, ShieldCheck } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'PROFESSOR'>('STUDENT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Sign In
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) throw signInError;
        
        // Fetch role to redirect correctly
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (userData?.role === 'PROFESSOR') {
          router.push('/professor');
        } else {
          router.push('/student');
        }
      } else {
        // Sign Up
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Auto-login failed after signup.");

        // Insert into public.users
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            { id: authData.user.id, email, full_name: fullName, role }
          ]);

        if (insertError) throw insertError;

        // Redirect based on role
        if (role === 'PROFESSOR') {
          router.push('/professor');
        } else {
          router.push('/student');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google authentication.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div className="fluid-blob blob-1" style={{ opacity: 0.15, top: '10%', left: '20%' }}></div>
      <div className="fluid-blob blob-2" style={{ opacity: 0.15, bottom: '10%', right: '20%' }}></div>

      <div className="glass-panel animate-fade-in-up" style={{ width: '100%', maxWidth: '450px', padding: '3rem 2.5rem', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div className="creative-logo" style={{ width: '48px', height: '48px', marginBottom: '1rem' }}>
            <div className="ring ring-1" style={{ borderTopColor: 'var(--primary)' }}></div>
            <div className="logo-core" style={{ borderRadius: '8px' }}><Hourglass size={16} color="#fff" /></div>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
            {isLogin ? 'Enter your credentials to access your workspace' : 'Join AmSlot to securely manage project reviews'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe" 
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} 
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@university.edu" 
                style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input 
                type="password"
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} 
              />
            </div>
          </div>

          {!isLogin && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
               <button 
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  style={{ flex: 1, padding: '0.875rem', borderRadius: '10px', background: role === 'STUDENT' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.02)', border: `1px solid ${role === 'STUDENT' ? 'var(--primary)' : 'var(--card-border)'}`, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
               >
                 <GraduationCap size={20} color={role === 'STUDENT' ? 'var(--primary)' : 'rgba(255,255,255,0.5)'} />
                 <span style={{ fontSize: '0.875rem', fontWeight: role === 'STUDENT' ? 700 : 500 }}>Student</span>
               </button>
               <button 
                  type="button"
                  onClick={() => setRole('PROFESSOR')}
                  style={{ flex: 1, padding: '0.875rem', borderRadius: '10px', background: role === 'PROFESSOR' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255,255,255,0.02)', border: `1px solid ${role === 'PROFESSOR' ? '#34d399' : 'var(--card-border)'}`, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
               >
                 <ShieldCheck size={20} color={role === 'PROFESSOR' ? '#34d399' : 'rgba(255,255,255,0.5)'} />
                 <span style={{ fontSize: '0.875rem', fontWeight: role === 'PROFESSOR' ? 700 : 500 }}>Professor</span>
               </button>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary pulse-glow" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '1rem', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? 'Secure Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <button 
          onClick={handleGoogleAuth}
          style={{ 
            width: '100%', padding: '1rem', background: '#fff', color: '#000', 
            borderRadius: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            gap: '0.75rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            transition: 'transform 0.2s', border: 'none'
          }}
          onMouseOver={e=>e.currentTarget.style.transform='scale(1.02)'}
          onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
