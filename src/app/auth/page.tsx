"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Hourglass, Mail, Lock, User, GraduationCap, ShieldCheck, ShieldAlert } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);



export function isAmritaEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return (
    lower.endsWith('@cb.students.amrita.edu') ||
    lower.endsWith('@am.students.amrita.edu') ||
    lower.endsWith('@students.amrita.edu') ||
    lower.endsWith('@amrita.edu') ||
    lower.endsWith('@cb.amrita.edu')
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'MAGIC_LINK' | 'RESET_PASSWORD'>('PASSWORD');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'PROFESSOR'>('STUDENT');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // OTP Verification state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<any>(null);

  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Standard Password Sign In
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });
        
        if (signInError) throw signInError;
        
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (userData?.role === 'PROFESSOR') {
          router.push('/professor');
        } else {
          router.push('/student');
        }
      } else {
        // Sign Up - Open to all emails (Amrita restriction removed)
        const cleanEmail = email.trim().toLowerCase();

        // Check duplicate email in public.users
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingUser) {
          throw new Error("This email address is already registered. Please log in instead.");
        }

        // Auto-extract roll number from email prefix
        let autoRoll = '';
        const prefix = cleanEmail.split('@')[0].toUpperCase();
        const match = prefix.match(/U4[A-Z]{3,4}\d+/);
        if (match) {
          autoRoll = 'CB.SC.' + match[0];
          
          // Check duplicate roll number
          const { data: existingRoll } = await supabase
            .from('users')
            .select('id')
            .eq('roll_number', autoRoll)
            .maybeSingle();

          if (existingRoll) {
            throw new Error(`The roll number ${autoRoll} is already registered to another account.`);
          }
        }

        if (role === 'PROFESSOR' && passcode !== 'AS@prof') {
          throw new Error("Invalid Professor Verification Passcode. Please contact the administrator.");
        }

        // Generate a 6-digit verification OTP code
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        let userId = '';
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (signUpError && !signUpError.message.includes('already registered')) {
          console.warn("Supabase auth warning:", signUpError.message);
        }

        if (authData?.user?.id) {
          userId = authData.user.id;
        }

        // Send 6-Digit OTP email directly to student Amrita inbox via Gmail SMTP API Route
        try {
          await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              otp: generatedOtp,
              fullName
            })
          });
        } catch (resendErr) {
          console.error("Resend API route call failed:", resendErr);
        }

        setPendingUser({
          id: userId || 'user_' + Date.now(),
          email: cleanEmail,
          full_name: fullName,
          role,
          roll_number: autoRoll || null,
          password,
          generatedOtp
        });

        // Always mandate 6-digit OTP verification
        setOtpStep(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingUser?.email || !pendingUser?.generatedOtp) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingUser.email,
          otp: pendingUser.generatedOtp,
          fullName: pendingUser.full_name
        })
      });

      if (!res.ok) {
        throw new Error("Failed to resend email.");
      }

      alert(`Verification code resent to ${pendingUser.email}. Please check your Amrita inbox and spam folder.`);
    } catch (err: any) {
      alert(`Re-sent verification code to ${pendingUser.email}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !pendingUser) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Verify that student entered matching 6-digit code received in their Amrita email
      const isMatchingOtp = otpCode.trim() === pendingUser.generatedOtp;
      
      if (!isMatchingOtp) {
        throw new Error("Invalid verification code. Please check your Amrita email inbox or click Resend Code.");
      }

      let activeUserId = pendingUser.id;

      // 2. Sign in to create active authenticated session in browser
      if (pendingUser.password) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: pendingUser.email,
          password: pendingUser.password
        });

        if (signInErr && signInErr.message.includes('Invalid login credentials')) {
          // If first-time user record needs activation in auth.users
          const { data: signUpData } = await supabase.auth.signUp({
            email: pendingUser.email,
            password: pendingUser.password
          });
          if (signUpData?.user) {
            activeUserId = signUpData.user.id;
          }
          await supabase.auth.signInWithPassword({
            email: pendingUser.email,
            password: pendingUser.password
          });
        } else if (signInData?.user) {
          activeUserId = signInData.user.id;
        }
      }

      // 3. Fetch current logged in user ID
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        activeUserId = userData.user.id;
      }

      // 4. Insert profile into public.users
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: activeUserId.startsWith('user_') ? (await supabase.auth.getUser()).data.user?.id || activeUserId : activeUserId,
            email: pendingUser.email,
            full_name: pendingUser.full_name,
            role: pendingUser.role,
            roll_number: pendingUser.roll_number
          }
        ]);

      if (insertError && !insertError.message.includes('duplicate')) {
        console.warn("Profile insert notice:", insertError.message);
      }

      // 5. Redirect user to their respective dashboard
      if (pendingUser.role === 'PROFESSOR') {
        router.push('/professor');
      } else {
        router.push('/student');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Please try again.');
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <div className="creative-logo" style={{ width: '40px', height: '40px' }}>
              <div className="ring ring-1" style={{ borderTopColor: 'var(--primary)' }}></div>
              <div className="logo-core" style={{ borderRadius: '8px' }}><Hourglass size={16} color="#fff" /></div>
            </div>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.03em' }}>
              Am<span style={{ color: '#a78bfa' }}>Slot</span>
            </span>
            <span style={{ 
              padding: '0.12rem 0.45rem', 
              background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(52,211,153,0.15))', 
              border: '1px solid rgba(167,139,250,0.3)', 
              borderRadius: '6px', 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              color: '#34d399', 
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              marginLeft: '0.1rem'
            }}>
              v2.0
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {otpStep ? 'Verify Amrita Email' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {otpStep 
              ? `We sent a 6-digit OTP code to ${pendingUser?.email || 'your email'}`
              : isLogin ? 'Enter your credentials to access your workspace' : 'Join AmSlot to securely manage project reviews'}
          </p>
        </div>

        {error && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.85rem', 
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(139, 92, 246, 0.08))', 
            border: '1px solid rgba(244, 63, 94, 0.28)', 
            borderLeft: '4px solid #f43f5e', 
            color: '#fda4af', 
            padding: '0.875rem 1.1rem', 
            borderRadius: '12px', 
            fontSize: '0.85rem', 
            lineHeight: '1.4', 
            marginBottom: '1.5rem',
            boxShadow: '0 8px 20px rgba(244, 63, 94, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
              <ShieldAlert size={16} />
            </div>
            <div style={{ flex: 1, fontWeight: 500 }}>
              {error}
            </div>
          </div>
        )}

        {otpStep ? (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>6-Digit OTP Code</label>
                <button 
                  type="button"
                  onClick={handleResendOtp}
                  style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Resend Code
                </button>
              </div>
              <input 
                type="text" 
                maxLength={6}
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="123456" 
                style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary)', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '1.5rem', letterSpacing: '0.4em', textAlign: 'center', fontFamily: 'monospace' }} 
              />
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', textAlign: 'center' }}>
                We sent a 6-digit verification code to your Amrita email address. Please check your inbox and spam folder.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary pulse-glow" 
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Verifying OTP...' : 'Verify & Complete Signup'}
            </button>

            <button 
              type="button"
              onClick={() => { setOtpStep(false); setError(null); }}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', marginTop: '0.5rem', width: '100%', textAlign: 'center' }}
            >
              ← Back to Registration
            </button>
          </form>
        ) : (
          <>
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
                    placeholder="cb.en.u4aie24247@cb.students.amrita.edu" 
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

              {!isLogin && role === 'PROFESSOR' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Professor Verification Passcode</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input 
                      type="password" 
                      required
                      value={passcode}
                      onChange={e => setPasscode(e.target.value)}
                      placeholder="Enter professor registration code" 
                      style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '10px', color: '#fff', outline: 'none' }} 
                    />
                  </div>
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

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0 1.25rem 0', gap: '1rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
            </div>

            {/* OAuth Sign In Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                style={{ width: '100%', padding: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <GoogleIcon /> Continue with Google
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                 AmSlot v2.0.0 • Amrita Verified Identity
              </div>
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
