"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { GraduationCap, ShieldCheck, User, Lock } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'STUDENT' | 'PROFESSOR'>('STUDENT');
  const [fullName, setFullName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }

      // Pre-fill name from Google if available
      if (session.user.user_metadata?.full_name) {
        setFullName(session.user.user_metadata.full_name);
      }

      // Check if user already exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (existingUser) {
        // They are already onboarded, redirect to their dashboard
        if (existingUser.role === 'PROFESSOR') {
          router.push('/professor');
        } else {
          router.push('/student');
        }
      } else {
        // Need to onboard
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session.");

      if (role === 'PROFESSOR' && passcode !== 'AS@prof') {
        throw new Error("Invalid Professor Verification Passcode. Please contact the administrator.");
      }

      const { error } = await supabase
        .from('users')
        .insert([
          { 
            id: session.user.id, 
            email: session.user.email, 
            full_name: fullName, 
            role 
          }
        ]);

      if (error) throw error;

      showToast("Profile completed successfully!", "success");

      // Redirect to correct dashboard
      if (role === 'PROFESSOR') {
        router.push('/professor');
      } else {
        router.push('/student');
      }
      
    } catch (error: any) {
      showToast(error.message || "Failed to complete profile.", "error");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050508', color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="status-beacon" style={{ width: '16px', height: '16px' }} />
          <div style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>AUTHENTICATING_IDENTITY...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', background: '#050508' }}>
      <div className="fluid-blob blob-1" style={{ opacity: 0.15, top: '10%', left: '20%' }}></div>
      <div className="fluid-blob blob-2" style={{ opacity: 0.15, bottom: '10%', right: '20%' }}></div>

      <div className="glass-panel animate-fade-in-up" style={{ width: '100%', maxWidth: '500px', padding: '3.5rem 2.5rem', position: 'relative', zIndex: 10 }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="badge" style={{ display: 'inline-block', marginBottom: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
            PROFILE INCOMPLETE
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff' }}>Complete Your Setup</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Please verify your designation to access the workspace.</p>
        </div>

        <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', fontWeight: 600 }}>Verify Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input 
                type="text" 
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe" 
                style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'border-color 0.2s' }} 
                onFocus={e=>e.currentTarget.style.borderColor='var(--primary)'}
                onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Pulled from your Google Account.</p>
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', fontWeight: 600 }}>Select System Designation</label>
             <div style={{ display: 'flex', gap: '1rem' }}>
               <button 
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  style={{ flex: 1, padding: '1.5rem 1rem', borderRadius: '12px', background: role === 'STUDENT' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)', border: `2px solid ${role === 'STUDENT' ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
               >
                 <GraduationCap size={28} color={role === 'STUDENT' ? 'var(--primary)' : 'rgba(255,255,255,0.4)'} />
                 <span style={{ fontSize: '1rem', fontWeight: role === 'STUDENT' ? 800 : 600 }}>Student</span>
               </button>
               <button 
                  type="button"
                  onClick={() => setRole('PROFESSOR')}
                  style={{ flex: 1, padding: '1.5rem 1rem', borderRadius: '12px', background: role === 'PROFESSOR' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.02)', border: `2px solid ${role === 'PROFESSOR' ? '#34d399' : 'rgba(255,255,255,0.05)'}`, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
               >
                 <ShieldCheck size={28} color={role === 'PROFESSOR' ? '#34d399' : 'rgba(255,255,255,0.4)'} />
                 <span style={{ fontSize: '1rem', fontWeight: role === 'PROFESSOR' ? 800 : 600 }}>Professor</span>
               </button>
            </div>
          </div>

          {role === 'PROFESSOR' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', fontWeight: 600 }}>Professor Verification Passcode</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input 
                  type="password" 
                  required
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  placeholder="Enter professor registration code" 
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none', transition: 'border-color 0.2s' }} 
                  onFocus={e=>e.currentTarget.style.borderColor='var(--primary)'}
                  onBlur={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary lava-btn-glow" 
            style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', marginTop: '1rem', opacity: submitting ? 0.7 : 1, borderRadius: '100px' }}
            disabled={submitting}
          >
            {submitting ? 'Initializing Workspace...' : 'Initialize Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
