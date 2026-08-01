import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const OperatorLab = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [puzzle, setPuzzle] = useState(null);
  const [ops, setOps] = useState([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [loading, setLoading] = useState(true);
  const [hintLoading, setHintLoading] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [puzzleStartTime, setPuzzleStartTime] = useState(Date.now());
  const isAdmin = ['adminnaew', 'admincpsu'].includes(currentUser?.username);
  const allOps = ['+', '-', '*', '**', '/', '//', '%'];
  const MAX_HINTS = 3;

  const fetchPuzzle = async () => {
    setLoading(true);
    setFeedback(null);
    setOps([null, null, null]);
    setActiveSlot(null);
    setHintCount(0);
    setPuzzleStartTime(Date.now());
    try {
      const resp = await api.get('/api/operator-lab/puzzle');
      setPuzzle(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPuzzle(); }, []);

  const handleSlotClick = (idx) => {
    if (feedback === 'correct') return;
    setActiveSlot(idx);
  };

  const handleOpClick = (op) => {
    if (activeSlot === null || feedback === 'correct') return;
    const newOps = [...ops];
    newOps[activeSlot] = op;
    setOps(newOps);
    setFeedback(null);

    // Auto-advance to next empty slot
    let next = null;
    for (let i = activeSlot + 1; i < 3; i++) {
      if (newOps[i] === null) { next = i; break; }
    }
    if (next === null) {
      for (let i = 0; i < activeSlot; i++) {
        if (newOps[i] === null) { next = i; break; }
      }
    }
    setActiveSlot(next !== null ? next : activeSlot);
  };

  const handleCheck = async () => {
    if (!puzzle || ops.some(o => o === null)) return;
    try {
      const resp = await api.post('/api/operator-lab/check', {
        numbers: puzzle.numbers,
        operators: ops,
        target: puzzle.target
      });
      const correct = resp.data.is_correct;
      if (correct) {
        setFeedback('correct');
        setSolvedCount(c => c + 1);
      } else {
        setFeedback('wrong');
        setTimeout(() => setFeedback(null), 1200);
      }
      // Log attempt to DB (fire-and-forget)
      if (currentUser?.user_id) {
        api.post('/api/operator-lab/log', {
          user_id: currentUser.user_id,
          numbers: puzzle.numbers,
          target: puzzle.target,
          operators_used: ops,
          is_correct: correct,
          hint_used: hintCount > 0,
          solve_time_ms: Date.now() - puzzleStartTime
        }).catch(e => console.error('Log failed:', e));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHint = async () => {
    if (!puzzle || hintLoading) return;
    if (!isAdmin && hintCount >= MAX_HINTS) return;
    setHintLoading(true);
    try {
      const resp = await api.post('/api/operator-lab/hint', {
        numbers: puzzle.numbers,
        target: puzzle.target
      });
      const solution = resp.data.operators; // e.g. ['+', '*', '-']
      
      if (isAdmin) {
        // Admin: fill all slots
        setOps(solution);
      } else {
        // User: fill only the FIRST empty slot
        const newOps = [...ops];
        for (let i = 0; i < 3; i++) {
          if (newOps[i] === null) {
            newOps[i] = solution[i];
            break;
          }
        }
        setOps(newOps);
        setHintCount(c => c + 1);
      }
      setFeedback(null);
      setActiveSlot(null);
    } catch (err) {
      console.error("Hint failed:", err);
    } finally {
      setHintLoading(false);
    }
  };

  const handleClear = () => {
    setOps([null, null, null]);
    setActiveSlot(0);
    setFeedback(null);
  };

  if (loading && !puzzle) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>กำลังโหลดโจทย์...</p>
      </div>
    );
  }

  const borderColor = feedback === 'correct' ? '#22c55e' : feedback === 'wrong' ? '#ef4444' : '#1e293b';
  const bgGlow = feedback === 'correct' ? 'rgba(34,197,94,0.08)' : feedback === 'wrong' ? 'rgba(239,68,68,0.08)' : 'transparent';

  return (
    <div style={{ maxWidth: isEmbedded ? '100%' : 800, margin: isEmbedded ? 0 : '0 auto', padding: isEmbedded ? '1rem 0' : '2rem 1rem' }}>

      {/* Top Bar - Hidden if embedded */}
      {!isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', color: '#94a3b8', border: '1px solid #334155',
            padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer'
          }}>
            ← กลับ Dashboard
          </button>
          <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
            แก้ได้แล้ว: <span style={{ color: '#06b6d4', fontWeight: 700 }}>{solvedCount}</span> ข้อ
          </div>
        </div>
      )}

      {/* Title - Hidden if embedded */}
      {!isEmbedded && (
        <>
          <h1 style={{
            textAlign: 'center', fontSize: '2rem', fontWeight: 800, color: '#f8fafc',
            marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif"
          }}>
            🧮 Operator Lab
          </h1>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
            เติมเครื่องหมายให้สมการเป็นจริง (ใช้ลำดับความสำคัญแบบ Python)
          </p>
        </>
      )}

      {/* ===== EQUATION CARD ===== */}
      <div style={{
        background: bgGlow,
        border: `3px solid ${borderColor}`,
        borderRadius: 24,
        padding: '3rem 1.5rem',
        transition: 'all 0.3s ease',
        animation: feedback === 'wrong' ? 'shake 0.3s ease' : 'none'
      }}>
        {/* Equation Row:  N  [?]  N  [?]  N  [?]  N  =  Target */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexWrap: 'wrap', gap: '0.75rem'
        }}>
          {puzzle && puzzle.numbers.map((num, i) => (
            <React.Fragment key={i}>
              {/* Number Block */}
              <div style={{
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 900,
                color: '#e2e8f0',
                fontFamily: "'Outfit', monospace",
                minWidth: 50, textAlign: 'center',
                lineHeight: 1
              }}>
                {num}
              </div>

              {/* Operator Slot (only 3 slots between 4 numbers) */}
              {i < 3 && (
                <button
                  onClick={() => handleSlotClick(i)}
                  style={{
                    width: 'clamp(48px, 10vw, 64px)',
                    height: 'clamp(48px, 10vw, 64px)',
                    borderRadius: 14,
                    border: activeSlot === i
                      ? '3px solid #06b6d4'
                      : ops[i]
                        ? '2px solid #475569'
                        : '2px dashed #334155',
                    background: activeSlot === i
                      ? 'rgba(6,182,212,0.15)'
                      : ops[i]
                        ? '#1e293b'
                        : '#0f172a',
                    color: ops[i] ? '#f1f5f9' : '#334155',
                    fontSize: 'clamp(1.2rem, 3.5vw, 1.8rem)',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: activeSlot === i ? '0 0 16px rgba(6,182,212,0.35)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {ops[i] || '?'}
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Equals and Target */}
          <div style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 300,
            color: '#475569', margin: '0 0.5rem'
          }}>=</div>
          <div style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 900,
            color: feedback === 'correct' ? '#22c55e' : '#06b6d4',
            fontFamily: "'Outfit', monospace",
            minWidth: 50, textAlign: 'center',
            transition: 'color 0.3s'
          }}>
            {puzzle?.target}
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div style={{
            textAlign: 'center', marginTop: '1.5rem',
            fontSize: '1.1rem', fontWeight: 800,
            color: feedback === 'correct' ? '#22c55e' : '#ef4444',
            letterSpacing: '0.15em'
          }}>
            {feedback === 'correct' ? '✅ ถูกต้อง! สมการเป็นจริง' : '❌ ไม่ถูก ลองใหม่อีกครั้ง'}
          </div>
        )}
      </div>

      {/* ===== OPERATOR BUTTONS ===== */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        gap: '0.75rem', margin: '2rem 0'
      }}>
        {allOps.map(op => {
          const opColors = {
            '+': '#94a3b8', '-': '#94a3b8',
            '*': '#06b6d4', '/': '#06b6d4',
            '//': '#0891b2', '%': '#8b5cf6', '**': '#f59e0b'
          };
          const c = opColors[op] || '#94a3b8';
          return (
            <button
              key={op}
              onClick={() => handleOpClick(op)}
              disabled={activeSlot === null}
              style={{
                width: 80, height: 80,
                borderRadius: 20,
                border: `2px solid ${c}44`,
                background: '#0f172a',
                color: c,
                fontSize: op.length > 1 ? '1.4rem' : '2rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                cursor: activeSlot !== null ? 'pointer' : 'not-allowed',
                opacity: activeSlot !== null ? 1 : 0.4,
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => {
                if (activeSlot !== null) {
                  e.currentTarget.style.background = `${c}22`;
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.borderColor = c;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#0f172a';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = `${c}44`;
              }}
            >
              {op}
            </button>
          );
        })}
      </div>

      {/* ===== ACTION BUTTONS ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 500, margin: '0 auto' }}>
        
        {/* User Hint Button */}
        {!isAdmin && (
          <button 
            onClick={handleHint} 
            disabled={hintLoading || feedback === 'correct' || hintCount >= MAX_HINTS}
            style={{
              padding: '12px', borderRadius: 14,
              background: hintCount >= MAX_HINTS ? 'rgba(100,116,139,0.1)' : 'rgba(234, 179, 8, 0.1)', 
              color: hintCount >= MAX_HINTS ? '#64748b' : '#eab308', 
              border: `1px solid ${hintCount >= MAX_HINTS ? '#334155' : '#eab308'}`,
              fontSize: '0.9rem', fontWeight: 800, 
              cursor: hintCount >= MAX_HINTS ? 'not-allowed' : 'pointer',
              opacity: hintCount >= MAX_HINTS ? 0.5 : 1,
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {hintLoading ? '⏳ กำลังคำนวณ...' : `💡 Hint (${hintCount}/${MAX_HINTS})`}
          </button>
        )}

        {/* Admin Next Step */}
        {isAdmin && (
          <button 
            onClick={handleHint} 
            disabled={hintLoading || feedback === 'correct'}
            style={{
              padding: '12px', borderRadius: 14,
              background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', 
              border: '1px solid rgba(6,182,212,0.3)',
              fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {hintLoading ? '⏳ กำลังคำนวณ...' : '🤖 AI: Next Step (Admin)'}
          </button>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Clear */}
          <button onClick={handleClear} style={{
            flex: 1, padding: '16px', borderRadius: 16,
            background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}>
            ล้าง
          </button>

          {/* Check */}
          {feedback === 'correct' ? (
            <button onClick={fetchPuzzle} style={{
              flex: 2, padding: '16px', borderRadius: 16,
              background: '#22c55e', color: '#fff', border: 'none',
              fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(34,197,94,0.4)',
              transition: 'all 0.15s ease'
            }}>
              ข้อถัดไป →
            </button>
          ) : (
            <button onClick={handleCheck} disabled={ops.some(o => o === null)} style={{
              flex: 2, padding: '16px', borderRadius: 16,
              background: ops.every(o => o !== null)
                ? 'linear-gradient(135deg, #06b6d4, #6366f1)'
                : '#1e293b',
              color: ops.every(o => o !== null) ? '#fff' : '#475569',
              border: ops.every(o => o !== null) ? 'none' : '1px solid #334155',
              fontSize: '1.1rem', fontWeight: 800,
              cursor: ops.every(o => o !== null) ? 'pointer' : 'not-allowed',
              boxShadow: ops.every(o => o !== null) ? '0 6px 20px rgba(6,182,212,0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}>
              ✓ Check
            </button>
          )}
        </div>
      </div>

      {/* Precedence Hint */}
      <div style={{
        marginTop: '2.5rem', textAlign: 'center',
        color: '#475569', fontSize: '0.75rem',
        display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap'
      }}>
        <span>🔹 ลำดับ Python:  <b style={{ color: '#f59e0b' }}>**</b> → <b style={{ color: '#06b6d4' }}>* / // %</b> → <b style={{ color: '#94a3b8' }}>+ -</b></span>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};

export default OperatorLab;
