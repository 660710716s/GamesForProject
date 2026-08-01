import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Timer, Award, X } from 'lucide-react';

const InactivityMonitor = ({ children }) => {
  const [isIdle, setIsIdle] = useState(false);
  const [trainingTimeLeft, setTrainingTimeLeft] = useState(600); // 10 minutes
  const [trainingComplete, setTrainingComplete] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // 1. เปลี่ยน lastActivity จาก State เป็น Ref เพื่อป้องกันหน้าเว็บ Re-render ทุกครั้งที่ขยับเมาส์
  const lastActivityRef = useRef(Date.now());

  const IDLE_THRESHOLD = 90000; // 90 seconds

  const resetTimer = useCallback(() => {
    // 2. อัปเดตค่าผ่าน Ref
    lastActivityRef.current = Date.now();
    if (isIdle) {
      setIsIdle(false);
      // Reset training clock if they were idle
      setTrainingTimeLeft(600);
    }
  }, [isIdle]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    const interval = setInterval(() => {
      const now = Date.now();

      // 3. Update Inactivity Status โดยเทียบกับ Ref
      if (now - lastActivityRef.current > IDLE_THRESHOLD) {
        if (!isIdle) setIsIdle(true);
      }

      // 4. Decrement Training Timer 
      if (!isIdle && !trainingComplete) {
        setTrainingTimeLeft(prev => {
          if (prev <= 1) {
            setTrainingComplete(true);
            setShowCompleteModal(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      clearInterval(interval);
    };
    // 5. เอา lastActivity และ trainingTimeLeft ออกจาก Dependencies 
    // เพื่อไม่ให้ setInterval ถูกทำลายและสร้างใหม่ตลอดเวลา
  }, [isIdle, resetTimer, trainingComplete]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}

      {/* Top Status Bar (Training Timer) */}
      {!trainingComplete && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          pointerEvents: 'none'
        }}>
          <div className="glass-panel" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: isIdle ? '1px solid #ef4444' : '1px solid rgba(6, 182, 212, 0.3)',
            background: 'rgba(11, 15, 25, 0.8)',
            backdropFilter: 'blur(8px)',
            transition: 'border-color 0.3s ease'
          }}>
            <Timer size={16} color={isIdle ? '#ef4444' : 'var(--accent-cyan)'} />
            <span style={{
              fontFamily: 'Outfit',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: isIdle ? '#ef4444' : 'var(--text-main)',
              letterSpacing: '0.5px'
            }}>
              Brain Training: {formatTime(trainingTimeLeft)}
            </span>
          </div>
        </div>
      )}

      {/* Inactivity Popup (90s Trigger) */}
      {isIdle && (
        <div
          className="inactivity-popup animate-in-up"
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <div className="glass-panel" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            background: 'rgba(239, 68, 68, 0.05)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            maxWidth: '90vw',
            width: 'max-content'
          }}>
            <AlertCircle color="#ef4444" size={24} className="pulse-slow" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                Activity Warning (Timer Reset)
              </span>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#ced4da' }}>
                จะนับเวลาเมื่อมีการกระทำอะไรทุกๆ 90 วินาทีนะ เปิดไว้เฉยๆไม่นับ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompleteModal && (
        <div className="help-overlay animate-fade-in" style={{ zIndex: 11000 }}>
          <div className="glass-panel help-modal" style={{ textAlign: 'center', position: 'relative' }}>
            <button
              onClick={() => setShowCompleteModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #10b981'
              }} className="pulse-slow">
                <Award size={40} color="#10b981" />
              </div>
            </div>
            <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>Success Achieved</h2>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              ขอบคุณมากวันนี้คุณได้ฝึกสมองครบแล้ว
            </p>
            <button className="btn-primary" onClick={() => setShowCompleteModal(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InactivityMonitor;