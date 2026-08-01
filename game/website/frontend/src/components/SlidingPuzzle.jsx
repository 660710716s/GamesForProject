import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

const SlidingPuzzle = ({ sessionData, currentUser, onBack, onStuck, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { board: initialBoard, size, solved_state, min_moves_required } = initial_state;

  const [board, setBoard] = useState(initialBoard);
  const [moves, setMoves] = useState(0);
  const [adminMoveCount, setAdminMoveCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  // Similarity: fraction of tiles in correct position
  const calcSimilarity = (currentBoard) => {
    let correct = 0;
    const total = size * size - 1; // exclude empty tile
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentBoard[r][c] !== 0 && currentBoard[r][c] === solved_state[r * size + c]) correct++;
      }
    }
    return total > 0 ? correct / total : 1;
  };

  const { solution } = initial_state;

  const handleSolve = () => {
    const newBoard = [];
    for (let r = 0; r < size; r++) {
      newBoard.push(solved_state.slice(r * size, (r + 1) * size));
    }
    setBoard(newBoard);
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
        current_state: { board }
      });
      
      if (resp.data.status === "success") {
        const move = resp.data.move; // { r, c }
        if (move) {
          handleTileClick(move.r, move.c, true);
          if (!isAdmin) setHintCount(c => c + 1);
        }
      } else if (resp.data.status === "dead_end") {
        alert(resp.data.detail || "Sequential Failure. Reset recommended.");
      }
    } catch (e) {
      console.error(e);
      alert("AI Simulation Error.");
    }
    setHinting(false);
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  useEffect(() => {
    // Check win condition
    const currentFlat = [];
    for (let r = 0; r < size; r++) currentFlat.push(...board[r]);
    
    let isWin = true;
    for (let i = 0; i < currentFlat.length; i++) {
      if (currentFlat[i] !== solved_state[i]) {
        isWin = false;
        break;
      }
    }

    if (isWin && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    } else {
      // Logic for "stuck" suggestion (made 3x more moves than needed)
      if (moves > min_moves_required * 3 && !isSuccess) {
        onStuck?.();
      }
    }
  }, [board]);

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

  const handleTileClick = (r, c, isAdminStep = false) => {
    if (isSuccess || board[r][c] === 0) return;

    // Find the 0 (empty)
    let emptyR = -1, emptyC = -1;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j] === 0) {
          emptyR = i; emptyC = j; break;
        }
      }
    }

    // Check if clicked is adjacent to empty
    const isAdjacent = (Math.abs(r - emptyR) === 1 && c === emptyC) || (Math.abs(c - emptyC) === 1 && r === emptyR);
    if (!isAdjacent) return;

    // Swap
    const newBoard = board.map(row => [...row]);
    newBoard[emptyR][emptyC] = newBoard[r][c];
    newBoard[r][c] = 0;
    
    setBoard(newBoard);
    setMoves(moves + 1);

    // Logging
    api.post('/session/action', {
      session_id, 
      action_detail: { from: [r, c], to: [emptyR, emptyC], type: isAdminStep ? 'admin_hint' : 'player_move' }, 
      timestamp_ms: Date.now(),
      similarity_score: calcSimilarity(newBoard)
    }).catch(e => console.error(e));
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Sliding Nexus</h2>
        <p style={{ color: 'var(--text-muted)' }}>Restore the sequence analytically</p>
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
        gridTemplateColumns: `repeat(${size}, 60px)`,
        gap: '4px',
        background: 'rgba(0,0,0,0.3)',
        padding: '8px',
        borderRadius: '12px',
        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)',
        marginBottom: '2rem'
      }}>
        {board.map((row, r) => 
          row.map((val, c) => (
            <div 
              key={`${r}-${c}`}
              onClick={() => handleTileClick(r, c)}
              style={{
                width: '60px',
                height: '60px',
                background: val === 0 ? 'transparent' : 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(99, 102, 241, 0.2))',
                border: val === 0 ? 'none' : '1px solid rgba(6, 182, 212, 0.4)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                cursor: val === 0 || isSuccess ? 'default' : 'pointer',
                boxShadow: val === 0 ? 'none' : '0 4px 6px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => { if(val !== 0 && !isSuccess) e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseLeave={(e) => { if(val !== 0) e.currentTarget.style.transform = 'scale(1)' }}
            >
              {val !== 0 ? val : ''}
            </div>
          ))
        )}
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
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Sequence Restored</h3>
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

export default SlidingPuzzle;
