"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Hourglass, Mail, Lock, User, GraduationCap, ShieldCheck } from 'lucide-react';

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
