import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Flag, Bomb } from 'lucide-react';

const Minesweeper = ({ sessionData, currentUser, onBack, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { board, width, height, num_mines } = initial_state;

  // State: 0 = hidden, 1 = revealed, 2 = flagged.
  const [mask, setMask] = useState(Array(height).fill().map(() => Array(width).fill(0)));
  const [gameOver, setGameOver] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [moves, setMoves] = useState(0);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  // Similarity: fraction of safe cells revealed
  const calcSimilarity = (currentMask) => {
    let totalSafe = 0, revealed = 0;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (board[r][c] !== -1) {
          totalSafe++;
          if (currentMask[r][c] === 1) revealed++;
        }
      }
    }
    return totalSafe > 0 ? revealed / totalSafe : 1;
  };

  const { min_moves_required } = initial_state;
  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  const handleSolve = () => {
    const solvedMask = mask.map((row, r) => 
      row.map((val, c) => board[r][c] === -1 ? val : 1)
    );
    setMask(solvedMask);
    setMoves(min_moves_required);
    setIsSuccess(true);
  };

  const handleStepSolve = () => {
    // Find first safe hidden cell
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (board[r][c] !== -1 && mask[r][c] !== 1) {
          handleCellClick(r, c);
          if (!isAdmin) setHintCount(cnt => cnt + 1);
          return;
        }
      }
    }
  };

  // Check Win condition (All non-mine cells must be revealed)
  useEffect(() => {
    if (gameOver) return;
    
    let safeRemaining = 0;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (board[r][c] !== -1 && mask[r][c] !== 1) {
          safeRemaining++;
        }
      }
    }

    if (safeRemaining === 0 && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    }
  }, [mask, gameOver]);

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

  const handleCellClick = (r, c) => {
    if (gameOver || isSuccess || mask[r][c] === 1 || mask[r][c] === 2) return;

    // Log action
    api.post('/session/action', {
      session_id, action_detail: { type: 'reveal', r, c }, timestamp_ms: Date.now(),
      similarity_score: calcSimilarity(mask)
    }).catch(e => console.error(e));

    // Mine hit
    if (board[r][c] === -1) {
      setGameOver(true);
      // Reveal all mines natively
      const newMask = mask.map((row, rr) => 
        row.map((val, cc) => board[rr][cc] === -1 ? 1 : val)
      );
      setMask(newMask);
      return;
    }

     // Flood fill safely on 0
    revealCell(r, c);
    setMoves(m => m + 1);
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameOver || isSuccess || mask[r][c] === 1) return;

    const newMask = mask.map(row => [...row]);
    newMask[r][c] = mask[r][c] === 2 ? 0 : 2; // Toggle Flag
    setMask(newMask);
  };

  const revealCell = (startR, startC) => {
    const newMask = mask.map(row => [...row]);
    const queue = [[startR, startC]];
    
    while(queue.length > 0) {
      const [r, c] = queue.shift();
      if (r < 0 || r >= height || c < 0 || c >= width || newMask[r][c] === 1) continue;

      newMask[r][c] = 1;

      // If it's a 0, reveal neighbors
      if (board[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr !== 0 || dc !== 0) queue.push([r + dr, c + dc]);
          }
        }
      }
    }
    setMask(newMask);
  };

  const getNumberColor = (num) => {
    const colors = ['transparent', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#1f2937', '#64748b'];
    return colors[num] || '#fff';
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Minesweeper Protocol</h2>
        <p style={{ color: 'var(--text-muted)' }}>Identify {num_mines} anomalies. Left click reveal, Right click flag.</p>
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
        gridTemplateColumns: `repeat(${width}, 30px)`, 
        gridTemplateRows: `repeat(${height}, 30px)`, 
        gap: '2px',
        background: 'rgba(255,255,255,0.05)',
        padding: '2px',
        marginBottom: '2rem',
        borderRadius: '8px',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
      }}>
        {board.map((row, r) => 
          row.map((val, c) => {
            const isRevealed = mask[r][c] === 1;
            const isFlagged = mask[r][c] === 2;

            return (
              <div 
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                onContextMenu={(e) => handleRightClick(e, r, c)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: isRevealed 
                    ? (val === -1 ? '#ef4444' : 'rgba(255,255,255,0.03)') 
                    : 'rgba(255,255,255,0.15)',
                  borderTop: isRevealed ? 'none' : '2px solid rgba(255,255,255,0.3)',
                  borderLeft: isRevealed ? 'none' : '2px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isRevealed ? 'default' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: getNumberColor(val),
                  boxShadow: isRevealed ? 'inset 0 0 5px rgba(0,0,0,0.5)' : 'none',
                  transition: 'background 0.1s ease'
                }}
              >
                {!isRevealed && isFlagged && <Flag size={16} color="#f59e0b" />}
                {isRevealed && val === -1 && <Bomb size={20} color="#fff" />}
                {isRevealed && val > 0 && val}
              </div>
            );
          })
        )}
      </div>

      {gameOver && !isSuccess && (
        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Anomaly Triggered</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Protocol Failed.</p>
          <button className="btn-primary" onClick={onBack}>Acknowledge</button>
        </div>
      )}

      {!isSuccess && !gameOver && (
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
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Sector Swept</h3>
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

export default Minesweeper;
