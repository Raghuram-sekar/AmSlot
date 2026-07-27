"use client";

import { 
  Users, Hourglass, 
  ChevronRight, Fingerprint, BookOpen, 
  GraduationCap, ClipboardCheck, ArrowRight, Play,
  CheckCircle2, RefreshCw, Lock, CalendarDays, MousePointer2
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const Logo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', zIndex: 100 }}>
    <div style={{ width: '32px', height: '32px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)', borderRadius: '10px', boxShadow: '0 0 15px rgba(76, 29, 149, 0.5), inset 0 1px 1px rgba(255,255,255,0.2)' }}>
        <Hourglass size={18} color="#fff" />
    </div>
    <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.04em', fontFamily: 'var(--font-outfit)', color: '#fff'}}>
      Am<span style={{ color: '#a78bfa' }}>Slot</span>
    </span>
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem', 
      padding: '0.2rem 0.55rem', background: 'rgba(139, 92, 246, 0.15)', 
      border: '1px solid rgba(139, 92, 246, 0.35)', borderRadius: '9999px', 
      fontSize: '0.7rem', fontWeight: 800, color: '#a78bfa', letterSpacing: '0.04em',
      marginLeft: '0.2rem'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }}></span>
      v2.0.0
    </span>
  </div>
);

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'prof' | 'student'>('prof');

  useEffect(() => {
    // Avoid SSR hydration issues with a slight delay if necessary, or just true
    setTimeout(() => setMounted(true), 0);
  }, []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0a0a0c', overflowX: 'hidden', color: '#e2e8f0', fontFamily: 'var(--font-inter)' }}>
      
      {/* ── CINEMATIC AMBIENCE ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
         <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.5, maskImage: 'radial-gradient(ellipse at top, black 20%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at top, black 20%, transparent 80%)' }} />
         
         {/* Organic color washes */}
         <div style={{ position: 'absolute', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)', width: '80vw', height: '80vw', top: '-20%', left: '-10%', filter: 'blur(100px)', mixBlendMode: 'screen', animation: 'drift 20s infinite alternate linear' }} />
         <div style={{ position: 'absolute', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 60%)', width: '60vw', height: '60vw', bottom: '-10%', right: '-10%', filter: 'blur(100px)', mixBlendMode: 'screen', animation: 'drift 25s infinite alternate-reverse linear' }} />
      </div>

      {/* ── FLOATING NAVIGATION ── */}
      <nav style={{ 
        position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
        padding: '0.5rem 0.5rem 0.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 'calc(100% - 3rem)', maxWidth: '1000px',
        background: 'rgba(15, 15, 20, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        opacity: mounted ? 1 : 0, transition: 'opacity 1s ease',
      }}>
        <Logo />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href="/auth" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s', borderRadius: '16px' }} onMouseOver={e=>e.currentTarget.style.color='#fff'} onMouseOut={e=>e.currentTarget.style.color='#94a3b8'}>Log In</Link>
          <Link href="/auth" style={{ 
            fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600, 
            padding: '0.6rem 1.25rem', background: '#e2e8f0', color: '#0f172a', borderRadius: '16px',
            boxShadow: '0 4px 15px rgba(255,255,255,0.1)', transition: 'all 0.3s',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }} onMouseOver={e=>{e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.background='#fff'}} onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.background='#e2e8f0'}}>
            Create Workspace <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── NARRATIVE HERO: THE ACADEMIC BRIDGE ── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '10rem', paddingBottom: '6rem', paddingLeft: '2rem', paddingRight: '2rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.2fr) 1fr', gap: '3rem', alignItems: 'center', marginBottom: '10rem' }}>
            
            {/* Left: Text Content */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 2 }}>
                <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '100px', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '2rem' }}>
                      <GraduationCap size={14} /> BUILT FOR HIGHER EDUCATION
                    </div>
                </div>
                
                <h1 className="fade-in-up" style={{ animationDelay: '0.2s', fontSize: 'clamp(3rem, 4.5vw, 5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.5rem', fontFamily: 'var(--font-outfit)', textShadow: '0 10px 30px rgba(0,0,0,0.5)', maxWidth: '900px' }}>
                  The End of Evaluation <br />
                  <span style={{ color: '#a78bfa' }}>Scheduling Chaos.</span>
                </h1>
                
                <p className="fade-in-up" style={{ animationDelay: '0.3s', fontSize: '1.25rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '3rem', maxWidth: '600px', fontWeight: 400 }}>
                  AmSlot provides <strong style={{color: '#fff'}}>Faculty</strong> with a powerful timeline engine to orchestrate reviews, and gives <strong style={{color: '#fff'}}>Students</strong> a fair, collision-proof booking experience.
                </p>
                
                <div className="fade-in-up" style={{ animationDelay: '0.4s', display: 'flex', gap: '1rem', justifyContent: 'flex-start' }}>
                  <Link href="/auth" style={{ textDecoration: 'none' }}>
                    <button style={{ background: '#fff', color: '#0f172a', padding: '1rem 2rem', fontSize: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(255,255,255,0.1)', transition: 'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                      Start Organizing <ChevronRight size={18} />
                    </button>
                  </Link>
                </div>
            </div>

            {/* Right: Application UI Showcase Animation */}
            <div className="fade-in-up" style={{ animationDelay: '0.5s', position: 'relative', width: '100%', height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center', perspective: '2000px' }}>
               
               <div className="interactive-3d-group" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', transformStyle: 'preserve-3d' }}>
               
               {/* Background Ambient Glow */}
               <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) translateZ(-100px)', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 60%)', filter: 'blur(50px)', zIndex: 0 }}></div>
               
               {/* The Professor's Timeline View (Back Layer) */}
               <div className="layer-back" style={{ position: 'relative', zIndex: 1 }}>
                 <div className="float-main-app block-thickness" style={{ width: '400px', background: 'linear-gradient(145deg, #1e1e28, #0f0f14)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', padding: '1.5rem' }}>
                  
                  {/* Fake App Window Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)' }}>
                           <CalendarDays size={18} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', fontFamily: 'var(--font-outfit)' }}>Friday Defenses</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Event Dashboard</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }}></div>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
                    </div>
                  </div>

                  {/* Timeline Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      
                      {/* Completed/Booked Slot */}
                      <div style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 700, width: '60px' }}>09:00</div>
                         <div style={{ flex: 1 }}>
                             <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Team Alpha</div>
                             <div style={{ fontSize: '0.75rem', color: '#64748b' }}>4 Members • Proposal</div>
                         </div>
                         <div style={{ padding: '0.3rem 0.6rem', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', fontSize: '0.7rem', borderRadius: '6px', fontWeight: 700 }}>Confirmed</div>
                      </div>

                      {/* Live Active Slot (Hovering effect) */}
                      <div style={{ border: '1px solid rgba(139, 92, 246, 0.4)', background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
                         <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#a78bfa', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}></div>
                         <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, width: '60px' }}>09:30</div>
                         <div style={{ flex: 1 }}>
                             <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>Team Beta</div>
                             <div style={{ fontSize: '0.75rem', color: '#c4b5fd' }}>Evaluating...</div>
                         </div>
                         <div style={{ padding: '0.3rem 0.6rem', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', fontSize: '0.7rem', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <RefreshCw size={12} className="spin-slow" /> In Review
                         </div>
                      </div>

                      {/* Empty Slot Waiting */}
                      <div className="empty-slot-pulse" style={{ border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700, width: '60px' }}>10:00</div>
                         <div style={{ flex: 1 }}>
                             <div style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>Open Slot</div>
                         </div>
                         <div style={{ padding: '0.3rem 0.6rem', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.7rem', borderRadius: '6px', fontWeight: 700 }}>Available</div>
                      </div>
                  </div>
                 </div>
               </div>

               {/* The Student Booking Action (Front Layer Overlay) */}
               <div className="layer-front" style={{ position: 'absolute', bottom: '8%', right: '-4%', zIndex: 2 }}>
                 <div className="float-overlay-app overlay-thickness" style={{ width: '280px', background: 'linear-gradient(135deg, #0891b2, #1e3a8a)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                     <div className="pulse-lock" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)' }}>
                        <Lock size={18} color="#fff" />
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#bae6fd', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Student Portal</div>
                        <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800, fontFamily: 'var(--font-outfit)', marginBottom: '0.5rem' }}>Locking 10:00 AM</div>
                        
                        {/* Progress Bar Animation representing the ATOMIC LOCK */}
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                           <div className="progress-anim-sync" style={{ height: '100%', background: '#fff', borderRadius: '3px' }}></div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#7dd3fc', marginTop: '0.4rem', textAlign: 'right' }}>Securing slot...</div>
                     </div>
                  </div>
                 </div>
               </div>

               {/* Dynamic Cursor Interaction */}
               <div className="layer-cursor" style={{ position: 'absolute', bottom: '0', right: '0', zIndex: 3 }}>
                 <div className="cursor-anim-sync">
                   <div style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>
                     <MousePointer2 size={32} color="#fff" fill="#0f172a" />
                   </div>
                 </div>
               </div>

               </div>
            </div>
        </div>

        {/* ── THE INTERACTIVE SHOWCASE (The Core App Rendered) ── */}
        <div className="fade-in-up" style={{ animationDelay: '0.6s', position: 'relative', width: '100%', height: 'auto', marginBottom: '12rem', padding: '2rem' }}>
           
           {/* Glow behind the dashboard */}
           <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '80%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 60%)', filter: 'blur(60px)', zIndex: 0 }}></div>

           {/* The Abstract Dashboard Frame */}
           <div style={{ position: 'relative', zIndex: 1, background: 'rgba(15, 15, 20, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '1rem', backdropFilter: 'blur(30px)', boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset' }}>
              
              {/* Window Controls */}
              <div style={{ display: 'flex', gap: '0.4rem', padding: '0.5rem 1rem 1rem' }}>
                 <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444'}}></div>
                 <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#eab308'}}></div>
                 <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e'}}></div>
              </div>

              {/* Internal Workspace App UI Mockup */}
              <div style={{ background: '#0a0a0c', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                 
                 {/* App Header (Professor Context) */}
                 <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <BookOpen size={16} color="#fb923c" />
                          <span style={{ fontSize: '0.85rem', color: '#fb923c', fontWeight: 600 }}>CS402 - Systems Architecture</span>
                       </div>
                       <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-outfit)' }}>Mid-Term Defense Evaluations</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Completion</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>24 / 30 Slots</div>
                       </div>
                       <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'conic-gradient(#34d399 80%, rgba(255,255,255,0.1) 80%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0a0a0c' }}></div>
                       </div>
                    </div>
                 </div>

                 {/* App Body - Split View (Slots vs Action) */}
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', minHeight: '400px' }}>
                    
                    {/* Left: The Timeline/Slots */}
                    <div style={{ padding: '2rem', borderRight: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          
                          {/* Slot 1: Booked */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}>
                             <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#94a3b8', width: '80px' }}>14:00</div>
                             <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                   <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0' }}>Team Alpha</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>4 Members • Project Proposal</div>
                             </div>
                             <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Confirmed</div>
                          </div>

                          {/* Slot 2: Active / Live Connect */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.25rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.4)', position: 'relative', overflow: 'hidden' }}>
                             <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#8b5cf6' }}></div>
                             <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', width: '80px' }}>14:30</div>
                             <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 10px #a78bfa' }}></div>
                                   <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Team Epsilon</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#c4b5fd' }}>5 Members • System Architecture</div>
                             </div>
                             <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                               <RefreshCw size={12} className="spin-slow" /> In Review
                             </div>
                          </div>

                          {/* Slot 3: Available */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.25rem', background: 'transparent', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                             <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#475569', width: '80px' }}>15:00</div>
                             <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>Open Slot</span>
                             </div>
                             <div style={{ padding: '0.4rem 0.8rem', border: '1px dashed rgba(255,255,255,0.2)', color: '#94a3b8', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>Available</div>
                          </div>

                       </div>
                    </div>

                    {/* Right: The Professor Details Panel */}
                    <div style={{ padding: '2rem', background: 'rgba(0,0,0,0.2)' }}>
                       <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Active Session</div>
                       
                       <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                          <h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600, marginBottom: '0.5rem' }}>Team Epsilon</h4>
                          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1rem' }}>Presenting their backend design choices and locking mechanisms.</p>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#cbd5e1' }}><CheckCircle2 size={12} color="#34d399" /> John Doe (Leader)</div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#cbd5e1' }}><CheckCircle2 size={12} color="#34d399" /> Jane Smith</div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#cbd5e1' }}><CheckCircle2 size={12} color="#34d399" /> Alex Jensen</div>
                          </div>
                       </div>

                       <div style={{ background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '1.25rem' }}>
                          <h4 style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                             <ClipboardCheck size={14} /> Professor Notes (Private)
                          </h4>
                          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, opacity: 0.8, fontStyle: 'italic' }}>
                             &quot;Strong database design. Ask John about how they handle node failures in their architecture.&quot;
                          </div>
                       </div>

                    </div>
                 </div>
              </div>

              {/* Floating "Student Mobile View" Overlay */}
              <div className="float-tilt" style={{ position: 'absolute', bottom: '-4rem', right: '-3rem', width: '280px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
                 </div>
                 
                 <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.25rem' }}>Student Portal</div>
                    <div style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 800 }}>Lock a Slot</div>
                 </div>

                 <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Selected Time</div>
                    <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 800 }}>15:00</div>
                 </div>

                 <button style={{ width: '100%', padding: '1rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 20px rgba(139,92,246,0.3)' }}>
                    Confirm Booking <Fingerprint size={16} />
                 </button>
                 
              </div>

           </div>
        </div>

        {/* ── THE TWO SIDES OF AMSLOT (Domain Focused Features) ── */}
        <section style={{ margin: '8rem auto', padding: '0' }}>
           
           <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
             <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.02em', color: '#fff' }}>Connecting the Campus.</h2>
             <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '1rem auto 0' }}>Tailored tools for both sides of the classroom, working together in real-time sync.</p>
           </div>

           {/* Toggle for Feature Context */}
           <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4rem' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '0.4rem' }}>
                    <button onClick={() => setActiveTab('prof')} style={{ padding: '0.75rem 2rem', borderRadius: '100px', border: 'none', background: activeTab === 'prof' ? '#1e293b' : 'transparent', color: activeTab === 'prof' ? '#fff' : '#94a3b8', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={16} color={activeTab === 'prof' ? '#a78bfa' : '#64748b'} /> For Professors
                 </button>
                 <button onClick={() => setActiveTab('student')} style={{ padding: '0.75rem 2rem', borderRadius: '100px', border: 'none', background: activeTab === 'student' ? '#1e293b' : 'transparent', color: activeTab === 'student' ? '#fff' : '#94a3b8', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} color={activeTab === 'student' ? '#38bdf8' : '#64748b'} /> For Students
                 </button>
              </div>
           </div>

           {/* Feature Content */}
           <div style={{ background: 'rgba(15,15,20,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '32px', padding: '4rem', minHeight: '400px', transition: 'all 0.5s' }}>
              
              {activeTab === 'prof' ? (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                   <div>
                      <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>Automated Timelines. Quiet Control.</h3>
                      <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                         Create a &quot;Project Event&quot;, generate 30 slots instantly, and share a join code. Students handle the rest. You just show up and evaluate.
                      </p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0 }}>
                         <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}><CheckCircle2 size={18} color="#a78bfa" /> Hierarchy: Courses → Projects → Events</li>
                         <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}><CheckCircle2 size={18} color="#a78bfa" /> Centralized Private Grading & Notes</li>
                         <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}><CheckCircle2 size={18} color="#a78bfa" /> Live Tracking: See slots fill in real-time</li>
                      </ul>
                   </div>
                   <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(0,0,0,0))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '24px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#0a0a0c', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Event Generation</span>
                            <span style={{ color: '#fff', fontWeight: 600 }}>Create Slots</span>
                         </div>
                         <Play size={20} color="#a78bfa" />
                      </div>
                      <div style={{ padding: '1rem', background: '#0a0a0c', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Evaluation Panel</span>
                            <span style={{ color: '#fff', fontWeight: 600 }}>Record Grade & Notes</span>
                         </div>
                         <ClipboardCheck size={20} color="#a78bfa" />
                      </div>
                   </div>
                </div>
              ) : (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                   <div>
                      <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>No More &quot;Double Booked&quot; Emails.</h3>
                      <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                         Join a course, form your group with an invite code, and book a slot. Our atomic locks mean if you click it first, it&apos;s yours. Zero overlaps.
                      </p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0 }}>
                         <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}><CheckCircle2 size={18} color="#38bdf8" /> Dedicated Team Formation</li>
                         <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}><CheckCircle2 size={18} color="#38bdf8" /> Fair Realtime Availability Board</li>
                         <li style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}><CheckCircle2 size={18} color="#38bdf8" /> Integrated Automatic Waitlisting</li>
                      </ul>
                   </div>
                   <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(0,0,0,0))', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '24px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: '#0a0a0c', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Secure Group Generation</span>
                            <span style={{ color: '#fff', fontWeight: 600 }}>Invite Members</span>
                         </div>
                         <Users size={20} color="#38bdf8" />
                      </div>
                      <div style={{ padding: '1rem', background: '#0a0a0c', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Secure Evaluation Target</span>
                            <span style={{ color: '#fff', fontWeight: 600 }}>Lock a Free Slot</span>
                         </div>
                         <Lock size={20} color="#38bdf8" />
                      </div>
                   </div>
                </div>
              )}

           </div>
        </section>

        {/* ── CTA FOOTER ── */}
        <section style={{ textAlign: 'center', padding: '6rem 2rem', background: 'linear-gradient(180deg, transparent, rgba(139,92,246,0.05))', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '4rem' }}>
           <Hourglass size={32} color="#a78bfa" style={{ margin: '0 auto 1.5rem' }} />
           <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.03em', marginBottom: '1.5rem', color: '#fff' }}>It&apos;s your time.</h2>
           <p style={{ color: '#94a3b8', fontSize: '1.25rem', marginBottom: '3rem' }}>Professors configure. Students execute. Everything just works.</p>
           
           <Link href="/auth" style={{ textDecoration: 'none' }}>
              <button style={{ background: '#fff', color: '#0f172a', padding: '1.2rem 3rem', fontSize: '1.1rem', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(255,255,255,0.15)', transition: 'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}>
                 Create Your Account <ChevronRight size={20} />
              </button>
           </Link>
        </section>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        :root { --font-outfit: 'Outfit', sans-serif; --font-inter: 'Inter', sans-serif; }
        
        /* Animations */
        @keyframes drift { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(20px) rotate(10deg); } }
        @keyframes pop-in { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .fade-in-up { opacity: 0; animation: pop-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fade-in { animation: fade-in 0.5s ease forwards; }

        /* Floating App Interaction */
        .float-tilt { animation: floating-card 8s ease-in-out infinite alternate; transform-origin: center right; }
        @keyframes floating-card { 
           0% { transform: translateY(0) rotate(-2deg); } 
           100% { transform: translateY(-15px) rotate(2deg); } 
        }

        /* Interactive 3D Hover Effect */
        .interactive-3d-group { 
           transform: rotateX(25deg) rotateY(-15deg) rotateZ(10deg) scale(0.95);
           transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
           cursor: pointer; 
           -webkit-font-smoothing: antialiased;
           transform-style: preserve-3d;
        }
        .interactive-3d-group:hover { 
           transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1.05); 
        }

        .layer-back { transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: translateZ(-40px); }
        .interactive-3d-group:hover .layer-back { transform: translateZ(0); }
        
        .layer-front { transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: translateZ(60px); }
        .interactive-3d-group:hover .layer-front { transform: translateZ(20px); box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        
        .layer-cursor { transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: translateZ(100px); }
        .interactive-3d-group:hover .layer-cursor { transform: translateZ(30px); }

        /* Block extrusion trick (3D walls) */
        .block-thickness { transform-style: preserve-3d; }
        .block-thickness::before { /* bottom face */
           content: ''; position: absolute;
           bottom: -16px; left: 16px; width: calc(100% - 32px); height: 16px;
           background: #0f1219;
           transform-origin: top; transform: rotateX(-90deg);
           box-shadow: inset 0 5px 15px rgba(0,0,0,0.8);
        }
        .block-thickness::after { /* left face */
           content: ''; position: absolute;
           top: 16px; left: -16px; width: 16px; height: calc(100% - 32px);
           background: #1a1a24;
           transform-origin: right; transform: rotateY(-90deg);
           box-shadow: inset -5px 0 15px rgba(0,0,0,0.8);
        }

        .overlay-thickness { transform-style: preserve-3d; }
        .overlay-thickness::before { /* bottom face */
           content: ''; position: absolute;
           bottom: -12px; left: 12px; width: calc(100% - 24px); height: 12px;
           background: #06405b;
           transform-origin: top; transform: rotateX(-90deg);
           box-shadow: inset 0 5px 10px rgba(0,0,0,0.5);
           border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;
        }
        .overlay-thickness::after { /* left face */
           content: ''; position: absolute;
           top: 12px; left: -12px; width: 12px; height: calc(100% - 24px);
           background: #0b5175;
           transform-origin: right; transform: rotateY(-90deg);
           box-shadow: inset -5px 0 10px rgba(0,0,0,0.5);
           border-top-left-radius: 4px; border-bottom-left-radius: 4px;
        }

        /* Floating App UI Animations */
        .float-main-app { animation: float-app-y 10s ease-in-out infinite alternate; }
        .float-overlay-app { animation: float-overlay-y 8s ease-in-out infinite alternate; }
        
        @keyframes float-app-y { 
           0% { transform: translateY(0); } 
           100% { transform: translateY(-15px); } 
        }
        @keyframes float-overlay-y { 
           0% { transform: translateY(0); } 
           100% { transform: translateY(-10px); } 
        }

        .pulse-lock { animation: pulse-lock 2s ease-in-out infinite; }
        @keyframes pulse-lock { 
           0% { box-shadow: 0 0 0 rgba(255,255,255,0.4), inset 0 2px 4px rgba(255,255,255,0.3); } 
           50% { box-shadow: 0 0 15px rgba(255,255,255,0.8), inset 0 2px 4px rgba(255,255,255,0.3); } 
           100% { box-shadow: 0 0 0 rgba(255,255,255,0), inset 0 2px 4px rgba(255,255,255,0.3); } 
        }

        .progress-anim-sync { animation: load-sync 3s ease-in-out infinite; }
        @keyframes load-sync { 0% { width: 0%; opacity: 1; } 80% { width: 100%; opacity: 1; } 100% { width: 100%; opacity: 0; } }

        .cursor-anim-sync { animation: cursor-move 3s ease-in-out infinite; }
        @keyframes cursor-move { 
           0% { transform: translate(60px, 60px); opacity: 0; } 
           20% { transform: translate(30px, 30px); opacity: 1; }
           70% { transform: translate(-30px, -45px) scale(0.9); } 
           80% { transform: translate(-30px, -45px) scale(1); } 
           100% { transform: translate(60px, 80px); opacity: 0; } 
        }

        /* Base Typography */
        h1, h2, h3, h4 { color: #f8fafc; }
      `}} />
    </div>
  );
}
