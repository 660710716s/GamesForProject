import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const Sokoban = ({ sessionData, currentUser, onBack, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { size, layout, boxes: initialBoxes, player: initialPlayer } = initial_state;

  const [player, setPlayer] = useState(initialPlayer);
  const [boxes, setBoxes] = useState(initialBoxes); // Array of [r, c]
  const [moves, setMoves] = useState(0);
  const [adminMoveCount, setAdminMoveCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hinting, setHinting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  // Similarity: fraction of boxes on target positions
  const calcSimilarity = (currentBoxes) => {
    const targets = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (layout[r][c] === 2) targets.push(`${r},${c}`);
      }
    }
    if (targets.length === 0) return 1;
    const onTarget = currentBoxes.filter(b => targets.includes(`${b[0]},${b[1]}`)).length;
    return onTarget / targets.length;
  };

  const { solution, min_moves_required } = initial_state;

  const handleSolve = () => {
    const targets = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (layout[r][c] === 2) targets.push([r, c]);
      }
    }
    setBoxes(targets);
    setMoves(min_moves_required);
    setIsSuccess(true);
  };

  const handleStepSolve = async () => {
    if (hinting) return;
    setHinting(true);
    try {
      const resp = await api.post('/session/hint', {
        session_id,
        current_state: { layout, player, boxes }
      });
      
      if (resp.data.status === 'success') {
        const move = resp.data.move;
        attemptMove(move.dir[0], move.dir[1], true);
        if (!isAdmin) setHintCount(c => c + 1);
      } else {
        alert("Hint computing failed or deadlock detected.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to compute hint.");
    }
    setHinting(false);
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  // Check Win Condition: all targets covered
  useEffect(() => {
    let allOnTarget = true;
    for (let i = 0; i < boxes.length; i++) {
      const [br, bc] = boxes[i];
      if (layout[br][bc] !== 2) {
        allOnTarget = false;
        break;
      }
    }

    if (boxes.length > 0 && allOnTarget && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    }
  }, [boxes]);

  // Deadlock Detection
  useEffect(() => {
    if (isSuccess) return;

    for (const [br, bc] of boxes) {
      // If box is on target, ignore for simple corner deadlock
      if (layout[br][bc] === 2) continue;

      const isWallUp = layout[br - 1][bc] === 1;
      const isWallDown = layout[br + 1][bc] === 1;
      const isWallLeft = layout[br][bc - 1] === 1;
      const isWallRight = layout[br][bc + 1] === 1;

      // Simple Corner Deadlock: Blocked in 2 perpendicular directions by walls
      if ((isWallUp || isWallDown) && (isWallLeft || isWallRight)) {
        sessionData.onStuck && sessionData.onStuck();
        break;
      }
    }
  }, [boxes, isSuccess, layout, sessionData]);

  const submitWin = async () => {
    setSubmitting(true);
    try {
      const resp = await api.post('/session/end', { session_id, is_success: true });
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

  const getBoxAt = (r, c) => boxes.findIndex(b => b[0] === r && b[1] === c);

  const attemptMove = useCallback((dr, dc, isAdminHint = false) => {
    if (isSuccess) return;

    const [pr, pc] = player;
    const nr = pr + dr;
    const nc = pc + dc;

    if (layout[nr][nc] === 1) return; // Hit wall

    const boxIdx = getBoxAt(nr, nc);
    if (boxIdx !== -1) {
      // Trying to push a box
      const nbr = nr + dr;
      const nbc = nc + dc;

      // Check if space behind box is clear (not wall and not another box)
      if (layout[nbr][nbc] === 1 || getBoxAt(nbr, nbc) !== -1) return; // Blocked

      // Push valid
      const newBoxes = [...boxes];
      newBoxes[boxIdx] = [nbr, nbc];
      setBoxes(newBoxes);
    }

    // Move player
    setPlayer([nr, nc]);
    setMoves(m => m + 1);

    api.post('/session/action', {
      session_id, action_detail: { direction: [dr, dc], type: isAdminHint ? 'admin_hint' : 'player_move' }, timestamp_ms: Date.now(),
      similarity_score: calcSimilarity(boxes)
    }).catch(e => console.error(e));
  }, [player, boxes, isSuccess, layout]);

  // Global Keybindings
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': attemptMove(-1, 0); break;
        case 'ArrowDown': case 's': case 'S': attemptMove(1, 0); break;
        case 'ArrowLeft': case 'a': case 'A': attemptMove(0, -1); break;
        case 'ArrowRight': case 'd': case 'D': attemptMove(0, 1); break;
        default: return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attemptMove]);

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Logistics Push</h2>
        <p style={{ color: 'var(--text-muted)' }}>Move crates to target sectors using WASD or Arrows.</p>
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, 35px)`,
        gridTemplateRows: `repeat(${size}, 35px)`,
        background: 'rgba(0,0,0,0.5)',
        border: '4px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        position: 'relative',
        marginBottom: '2rem',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
      }}>
        {/* Render Base Layer */}
        {layout.map((row, r) => 
          row.map((cellType, c) => (
            <div key={`base-${r}-${c}`} style={{
              width: '100%',
              height: '100%',
              background: cellType === 1 ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: cellType === 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {cellType === 2 && (
                <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 5px #ef4444' }} />
              )}
            </div>
          ))
        )}

        {/* Render Boxes */}
        {boxes.map((b, idx) => {
          const [br, bc] = b;
          const onTarget = layout[br][bc] === 2;
          return (
            <div key={`box-${idx}`} style={{
              position: 'absolute',
              top: br * 35,
              left: bc * 35,
              width: '35px',
              height: '35px',
              padding: '2px',
              transition: 'top 0.1s linear, left 0.1s linear'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: onTarget ? '#10b981' : '#f59e0b',
                borderRadius: '4px',
                border: '2px solid rgba(0,0,0,0.3)',
                boxShadow: onTarget ? '0 0 10px #10b981' : 'inset 0 0 10px rgba(255,255,255,0.3)'
              }} />
            </div>
          );
        })}

        {/* Render Player */}
        <div style={{
          position: 'absolute',
          top: player[0] * 35,
          left: player[1] * 35,
          width: '35px',
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'top 0.1s linear, left 0.1s linear',
          zIndex: 10
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            background: 'var(--accent-cyan)',
            borderRadius: '50%',
            boxShadow: '0 0 10px var(--accent-cyan)'
          }} />
        </div>
      </div>

      {/* Mobile D-Pad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 50px)', gap: '8px', marginBottom: '1rem' }}>
        <div />
        <button className="btn-primary" style={{ padding: '12px' }} onClick={() => attemptMove(-1, 0)}><ArrowUp size={20} /></button>
        <div />
        <button className="btn-primary" style={{ padding: '12px' }} onClick={() => attemptMove(0, -1)}><ArrowLeft size={20} /></button>
        <button className="btn-primary" style={{ padding: '12px' }} onClick={() => attemptMove(1, 0)}><ArrowDown size={20} /></button>
        <button className="btn-primary" style={{ padding: '12px' }} onClick={() => attemptMove(0, 1)}><ArrowRight size={20} /></button>
      </div>

      {!isSuccess && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {!isAdmin && (
            <button onClick={handleStepSolve} disabled={hintCount >= MAX_HINTS}
              style={{ background: hintCount >= MAX_HINTS ? 'rgba(100,116,139,0.1)' : 'rgba(234, 179, 8, 0.1)', color: hintCount >= MAX_HINTS ? '#64748b' : '#eab308', border: `1px solid ${hintCount >= MAX_HINTS ? '#334155' : '#eab308'}`, padding: '8px 16px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px', cursor: hintCount >= MAX_HINTS ? 'not-allowed' : 'pointer', opacity: hintCount >= MAX_HINTS ? 0.5 : 1 }}>
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
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Sector Secured</h3>
          {submitting ? (
            <p>Evaluating Performance Matrix...</p>
          ) : (
            <>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>{levelUpMsg}</p>
              <button className="btn-primary" onClick={onBack}>Return</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Sokoban;
