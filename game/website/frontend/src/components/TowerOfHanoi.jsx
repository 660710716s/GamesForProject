import React, { useState, useEffect } from 'react';
import api from '../api';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TowerOfHanoi = ({ sessionData, currentUser, onBack, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { rods: initialRods, num_disks, target_rod } = initial_state;
  
  useEffect(() => {
    console.log("[Hanoi] Session Started:", {
        start_rod: initialRods.findIndex(r => r.length > 0),
        target_rod: target_rod,
        num_disks: num_disks
    });
    
    // Check for overlap immediately on mount
    const startRodIdx = initialRods.findIndex(r => r.length > 0);
    if (startRodIdx === target_rod) {
        console.error("[Hanoi] CRITICAL: Overlap detected on mount. Start == Target.");
        // We could force a refresh here, but for now we log it clearly
    }
  }, [initialRods, target_rod, num_disks]);

  const [rods, setRods] = useState(initialRods);
  const [selectedRod, setSelectedRod] = useState(null);
  const [moves, setMoves] = useState(0);
  const [adminMoveCount, setAdminMoveCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  const { min_moves_required, solution } = initial_state;

  const handleSolve = () => {
    const solvedRods = initialRods.map((_, i) => i === target_rod ? Array.from({ length: num_disks }, (_, k) => num_disks - k) : []);
    setRods(solvedRods);
    setMoves(min_moves_required);
    setIsSuccess(true);
  };

  const handleStepSolve = async () => {
    try {
      const response = await api.post('/session/hint', {
        session_id: session_id,
        current_state: { rods, target_rod }
      });
      
      if (response.data.status === 'success' && response.data.move) {
        const { from, to } = response.data.move;
        
        // Prevent accidental invalid moves from state mismatch
        if (rods[from].length === 0) return;
        
        const newRods = [...rods];
        const disk = newRods[from][newRods[from].length - 1];
        newRods[from] = newRods[from].slice(0, -1);
        newRods[to] = [...newRods[to], disk];
        
        setRods(newRods);
        setMoves(m => m + 1);
        
        if (!isAdmin) setHintCount(c => c + 1);
        api.post('/session/action', {
          session_id, action_detail: { from, to, type: isAdmin ? 'admin_step' : 'user_hint' }, timestamp_ms: Date.now(),
          similarity_score: calcSimilarity(newRods)
        }).catch(e => console.error(e));
      } else if (response.data.status === 'dead_end') {
        alert(response.data.detail);
      }
    } catch (e) {
      console.error("Hint evaluation failure:", e);
    }
  };

  // Similarity: fraction of disks correctly on target rod
  const calcSimilarity = (currentRods) => {
    const targetDisks = currentRods[target_rod].length;
    return targetDisks / num_disks;
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  // Check win condition
  useEffect(() => {
    // If the target rod has all disks in correct order
    const isWin = rods[target_rod].length === num_disks && 
                  rods[target_rod].every((val, idx) => val === num_disks - idx);
    
    if (isWin && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    }
  }, [rods]);

  const submitWin = async () => {
    setSubmitting(true);
    try {
      const resp = await api.post('/session/end', {
        session_id: session_id,
        is_success: true
      });
      // Check if they leveled up
      if (resp.data.leveled_up) {
        setLevelUpMsg(`Protocol Upgraded to Level ${resp.data.new_level}!`);
        updateUserLevel(resp.data.new_level);
      } else {
        setLevelUpMsg(`Sector Secured. Mastery Progress: ${resp.data.mastery_progress}`);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const logAction = async (fromIdx, toIdx, diskMoved) => {
    try {
      await api.post('/session/action', {
        session_id: session_id,
        action_detail: {
          from_rod: fromIdx,
          to_rod: toIdx,
          moved_disk: diskMoved
        },
        timestamp_ms: Date.now(),
        similarity_score: calcSimilarity(rods)
      });
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  const handleRodClick = (rodIdx) => {
    if (isSuccess) return;

    if (selectedRod === null) {
      // Selecting a rod to pick from
      if (rods[rodIdx].length > 0) {
        setSelectedRod(rodIdx);
      }
    } else {
      // Dropping disk on a rod
      if (selectedRod === rodIdx) {
        // Deselect
        setSelectedRod(null);
        return;
      }

      const sourceRod = rods[selectedRod];
      const destRod = rods[rodIdx];
      const diskToMove = sourceRod[sourceRod.length - 1];

      // Validate move (Can't place larger on smaller)
      if (destRod.length > 0 && diskToMove > destRod[destRod.length - 1]) {
        setSelectedRod(null); // Invalid move
        return;
      }

      // Perform move
      const newRods = [...rods];
      newRods[selectedRod] = [...sourceRod.slice(0, -1)];
      newRods[rodIdx] = [...destRod, diskToMove];
      
      setRods(newRods);
      setMoves(moves + 1);
      setSelectedRod(null);
      
      // Log it
      logAction(selectedRod, rodIdx, diskToMove);
    }
  };

  const getDiskWidth = (diskSize) => {
    return `${40 + (diskSize * 15)}px`;
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Tower of Hanoi</h2>
        <p style={{ color: 'var(--text-muted)' }}>Move all disks to Rod {target_rod + 1}</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px' }}>Moves: {moves}</span>
          {isAdmin && (
            <>
              <span style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', padding: '4px 12px', borderRadius: '12px' }}>Optimal: {min_moves_required}</span>
              <span style={{ 
                background: efficiency >= 90 ? 'rgba(16, 185, 129, 0.1)' : efficiency >= 60 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                color: efficiency >= 90 ? '#10b981' : efficiency >= 60 ? '#f59e0b' : '#ef4444', 
                padding: '4px 12px', 
                borderRadius: '12px' 
              }}>
                Efficiency: {efficiency}%
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', height: '240px', alignItems: 'flex-end', marginBottom: '4rem' }}>
        {rods.map((rod, idx) => (
          <div 
            key={idx}
            onClick={() => handleRodClick(idx)}
            style={{ 
              width: '160px', 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'flex-end', 
              alignItems: 'center',
              position: 'relative',
              cursor: isSuccess ? 'default' : 'pointer',
              background: selectedRod === idx ? 'rgba(6, 182, 212, 0.05)' : 'transparent',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              transition: 'background 0.2s ease'
            }}
          >
            {/* The visual poll/stick */}
            <div style={{ position: 'absolute', width: '12px', height: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', zIndex: 0 }}></div>
            
            {/* The Disks */}
            <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: '4px', paddingBottom: '4px' }}>
              {rod.map((disk, dIdx) => {
                // Calculate colors dynamically based on disk size to look cool
                const hue = 180 + (disk * 25);
                return (
                  <div 
                    key={dIdx}
                    style={{
                      height: '24px',
                      width: getDiskWidth(disk),
                      background: `linear-gradient(90deg, hsl(${hue}, 80%, 40%), hsl(${hue + 20}, 80%, 50%))`,
                      borderRadius: '12px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.3)',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                  />
                );
              })}
            </div>
            
            {/* The base */}
            <div style={{ 
              width: '100%', 
              height: '12px', 
              background: idx === target_rod ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)', 
              borderRadius: '6px', 
              zIndex: 2,
              boxShadow: idx === target_rod ? '0 0 15px var(--accent-cyan)' : 'none'
            }} />
          </div>
        ))}
      </div>

      {!isSuccess && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {/* User Hint Button */}
          {!isAdmin && (
            <button 
              onClick={handleStepSolve}
              disabled={hintCount >= MAX_HINTS}
              style={{ 
                background: hintCount >= MAX_HINTS ? 'rgba(100,116,139,0.1)' : 'rgba(234, 179, 8, 0.1)', 
                color: hintCount >= MAX_HINTS ? '#64748b' : '#eab308', 
                border: `1px solid ${hintCount >= MAX_HINTS ? '#334155' : '#eab308'}`, 
                padding: '8px 16px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: hintCount >= MAX_HINTS ? 'not-allowed' : 'pointer',
                opacity: hintCount >= MAX_HINTS ? 0.5 : 1
              }}
            >
              💡 Hint ({hintCount}/{MAX_HINTS})
            </button>
          )}
          {/* Admin Buttons */}
          {isAdmin && (
            <>
              <button 
                onClick={handleStepSolve}
                style={{ 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: '#10b981', 
                  border: '1px solid #10b981', 
                  padding: '8px 16px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  borderRadius: '4px'
                }}
              >
                NEXT STEP (ADMIN)
              </button>
              <button 
                onClick={handleSolve}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  border: '1px solid #ef4444', 
                  padding: '8px 16px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  borderRadius: '4px'
                }}
              >
                MASTER SOLVE (ADMIN)
              </button>
            </>
          )}
        </div>
      )}

      {isSuccess && (
        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', maxWidth: '400px' }}>
          <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Sequence Complete</h3>
          {submitting ? (
            <p>Evaluating Performance Matrix...</p>
          ) : (
            <>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>{levelUpMsg}</p>
              <button className="btn-primary" onClick={onBack}>Return to Dashboard</button>
            </>
          )}
        </div>
      )}

      {/* Helper */}
      {!isSuccess && selectedRod !== null && (
        <div style={{ color: 'var(--accent-cyan)', fontSize: '0.875rem' }}>Select destination sector...</div>
      )}
    </div>
  );
};

export default TowerOfHanoi;
