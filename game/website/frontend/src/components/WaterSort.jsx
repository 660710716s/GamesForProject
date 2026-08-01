import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

const WaterSort = ({ sessionData, currentUser, onBack, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { tubes: initialTubes, tube_capacity, num_tubes, num_colors } = initial_state;

  const [tubes, setTubes] = useState(initialTubes);
  const [selectedTube, setSelectedTube] = useState(null);
  const [moves, setMoves] = useState(0);
  const [adminMoveCount, setAdminMoveCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  // Similarity: fraction of tubes that are uniform (single color or empty)
  const calcSimilarity = (currentTubes) => {
    let completed = 0;
    for (const tube of currentTubes) {
      if (tube.length === 0 || (tube.length === tube_capacity && new Set(tube).size === 1)) completed++;
    }
    return completed / num_tubes;
  };

  const { min_moves_required, solution } = initial_state;

  const handleSolve = () => {
    const solvedTubes = [];
    for (let i = 1; i <= num_colors; i++) {
      solvedTubes.push(Array(tube_capacity).fill(i));
    }
    while (solvedTubes.length < num_tubes) {
      solvedTubes.push([]);
    }
    setTubes(solvedTubes);
    setMoves(min_moves_required);
    setIsSuccess(true);
  };

  const [hinting, setHinting] = useState(false);

  const handleStepSolve = async () => {
    if (hinting) return;
    setHinting(true);
    
    try {
      const resp = await api.post('/session/hint', {
        session_id,
        current_state: { tubes }
      });
      
      if (resp.data.status === "success") {
        const move = resp.data.move; // { from, to }
        if (move) {
          const newTubes = tubes.map(t => [...t]);
          const source = newTubes[move.from];
          const dest = newTubes[move.to];
          
          if (source.length > 0 && dest.length < tube_capacity) {
            const color = source[source.length - 1];
            let count = 0;
            for (let i = source.length - 1; i >= 0; i--) {
              if (source[i] === color) count++;
              else break;
            }
            const space = tube_capacity - dest.length;
            const amt = Math.min(count, space);
            
            for (let k = 0; k < amt; k++) {
              dest.push(source.pop());
            }
          }
          
          setTubes(newTubes);
          setMoves(m => m + 1);
          setSelectedTube(null);
          if (!isAdmin) setHintCount(c => c + 1);
          logAction(move.from, move.to, "admin_hint").catch(e => console.error(e));
        }
      } else if (resp.data.status === "dead_end") {
        alert("This configuration is impossible to solve. Dead end reached. Please restart.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to compute hint.");
    }
    
    setHinting(false);
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  // Check Win Condition:
  // Every tube must either be completely empty (len == 0) or completely full (len == capacity) AND uniform
  useEffect(() => {
    let sorted = true;
    for (const tube of tubes) {
      if (tube.length !== 0 && tube.length !== tube_capacity) {
        sorted = false;
        break;
      }
      if (tube.length === tube_capacity) {
        // all elements must be identical
        const firstColor = tube[0];
        if (!tube.every((c) => c === firstColor)) {
          sorted = false;
          break;
        }
      }
    }
    
    if (sorted && !isSuccess) {
      setIsSuccess(true);
      submitWin();
      return;
    }

    // Deadlock Detection: Check if any move is possible
    let hasPossibleMove = false;
    for (let i = 0; i < tubes.length; i++) {
      if (tubes[i].length === 0) continue;
      const topColor = tubes[i][tubes[i].length - 1];

      for (let j = 0; j < tubes.length; j++) {
        if (i === j) continue;
        
        // Move to empty tube is always possible
        if (tubes[j].length === 0) {
          // Optimization: Only count as possible move if source tube isn't already uniform
          const firstColor = tubes[i][0];
          const isUniform = tubes[i].every(c => c === firstColor);
          // If it's already uniform and we're moving it to an empty tube, 
          // that's usually just shuffling, but legally it's a move.
          // However, to be "human-useful", we'll say it's possible.
          hasPossibleMove = true;
          break;
        }

        // Move to existing color is possible if top matches and has space
        if (tubes[j].length < tube_capacity && tubes[j][tubes[j].length - 1] === topColor) {
          hasPossibleMove = true;
          break;
        }
      }
      if (hasPossibleMove) break;
    }

    if (!hasPossibleMove && !isSuccess) {
      sessionData.onStuck && sessionData.onStuck();
    }
  }, [tubes, isSuccess, tube_capacity, sessionData]);

  const submitWin = async () => {
    setSubmitting(true);
    try {
      const resp = await api.post('/session/end', {
        session_id: session_id,
        is_success: true
      });
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

  const logAction = async (fromIdx, toIdx, actionType = 'player_move') => {
    try {
      await api.post('/session/action', {
        session_id: session_id,
        action_detail: {
          from_tube: fromIdx,
          to_tube: toIdx,
          type: actionType
        },
        timestamp_ms: Date.now(),
        similarity_score: calcSimilarity(tubes)
      });
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  const handleTubeClick = (tubeIdx) => {
    if (isSuccess) return;

    if (selectedTube === null) {
      // Pick up a tube if it has liquid
      if (tubes[tubeIdx].length > 0) {
        setSelectedTube(tubeIdx);
      }
    } else {
      // Try to pour from selectedTube -> tubeIdx
      const sourceTube = tubes[selectedTube];
      const destTube = tubes[tubeIdx];

      // Cancel if clicking the same
      if (selectedTube === tubeIdx) {
        setSelectedTube(null);
        return;
      }

      // Check spatial rules
      if (sourceTube.length === 0) {
        setSelectedTube(null);
        return; 
      }
      if (destTube.length >= tube_capacity) {
        setSelectedTube(null); // Dest is full
        return;
      }

      const topColor = sourceTube[sourceTube.length - 1];

      // Dest must be empty OR top color must match
      if (destTube.length > 0 && destTube[destTube.length - 1] !== topColor) {
        setSelectedTube(null); // Illegal pour
        return;
      }

      // Calculate how many layers of topColor exist in source
      let colorCount = 0;
      for (let i = sourceTube.length - 1; i >= 0; i--) {
        if (sourceTube[i] === topColor) colorCount++;
        else break;
      }

      // Calculate space left in dest
      const freeSpace = tube_capacity - destTube.length;
      
      // Amount to transfer is the minimum of matching color blocks and available space
      const transferAmount = Math.min(colorCount, freeSpace);

      if (transferAmount > 0) {
        // Apply changes
        const newTubes = [...tubes];
        newTubes[tubeIdx] = [...destTube, ...Array(transferAmount).fill(topColor)];
        newTubes[selectedTube] = sourceTube.slice(0, sourceTube.length - transferAmount);
        
        setTubes(newTubes);
        setMoves(moves + 1);
        logAction(selectedTube, tubeIdx);
      }
      
      setSelectedTube(null);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Water Sort Module</h2>
        <p style={{ color: 'var(--text-muted)' }}>Sort fluids until columns are uniform</p>
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

      {/* Racking array */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem', maxWidth: '800px' }}>
        {tubes.map((tube, idx) => (
          <div 
            key={idx}
            onClick={() => handleTubeClick(idx)}
            style={{ 
              width: '60px', 
              height: `${(tube_capacity * 40) + 10}px`,
              border: '4px solid rgba(255, 255, 255, 0.2)',
              borderTop: 'none',
              borderBottomLeftRadius: '30px',
              borderBottomRightRadius: '30px',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex', 
              flexDirection: 'column-reverse', 
              justifyContent: 'flex-start',
              padding: '4px',
              overflow: 'hidden',
              position: 'relative',
              cursor: isSuccess ? 'default' : 'pointer',
              transform: selectedTube === idx ? 'translateY(-20px)' : 'translateY(0)',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease',
              boxShadow: selectedTube === idx ? '0 10px 25px rgba(6, 182, 212, 0.4)' : '0 4px 6px rgba(0,0,0,0.3)'
            }}
          >
            {tube.map((colorId, cIdx) => {
              const hue = (colorId * 65) % 360; // Spread colors widely
              return (
                <div 
                  key={cIdx}
                  style={{
                    width: '100%',
                    height: '40px',
                    background: `linear-gradient(220deg, hsl(${hue}, 90%, 60%), hsl(${hue}, 100%, 45%))`,
                    borderTop: '1px solid rgba(255,255,255,0.4)',
                    borderBottomLeftRadius: cIdx === 0 ? '20px' : '0',
                    borderBottomRightRadius: cIdx === 0 ? '20px' : '0',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {!isSuccess && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {!isAdmin && (
            <button 
              onClick={handleStepSolve}
              disabled={hintCount >= MAX_HINTS}
              style={{ 
                background: hintCount >= MAX_HINTS ? 'rgba(100,116,139,0.1)' : 'rgba(234, 179, 8, 0.1)', 
                color: hintCount >= MAX_HINTS ? '#64748b' : '#eab308', 
                border: `1px solid ${hintCount >= MAX_HINTS ? '#334155' : '#eab308'}`, 
                padding: '8px 16px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px',
                cursor: hintCount >= MAX_HINTS ? 'not-allowed' : 'pointer',
                opacity: hintCount >= MAX_HINTS ? 0.5 : 1
              }}
            >
              💡 Hint ({hintCount}/{MAX_HINTS})
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={handleStepSolve} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>NEXT STEP (ADMIN)</button>
              <button onClick={handleSolve} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>MASTER SOLVE (ADMIN)</button>
            </>
          )}
        </div>
      )}

      {isSuccess && (
        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', maxWidth: '400px' }}>
          <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Purity Achieved</h3>
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
    </div>
  );
};

export default WaterSort;
