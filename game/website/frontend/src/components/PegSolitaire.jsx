import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

const PegSolitaire = ({ sessionData, currentUser, onBack, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { board: initialBoard } = initial_state;

  const [board, setBoard] = useState(initialBoard);
  const [selectedPos, setSelectedPos] = useState(null); // {r, c}
  const [moves, setMoves] = useState(0);
  const [adminMoveCount, setAdminMoveCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  // Similarity: progress toward 1 remaining peg
  const calcSimilarity = (currentBoard) => {
    let pegs = 0, initial = 0;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (currentBoard[r][c] === 1) pegs++;
        if (initialBoard[r][c] === 1) initial++;
      }
    }
    return initial > 1 ? 1 - (pegs - 1) / (initial - 1) : 1;
  };

  const { solution, min_moves_required } = initial_state;

  const [hinting, setHinting] = useState(false);

  const handleSolve = () => {
    const solvedBoard = board.map((row, r) => 
      row.map((val, c) => (val === -1 ? -1 : (r === 3 && c === 3 ? 1 : 0)))
    );
    setBoard(solvedBoard);
    setMoves(min_moves_required);
    setIsSuccess(true);
  };

  const handleStepSolve = async () => {
    if (hinting) return;
    setHinting(true);
    
    try {
      const resp = await api.post('/session/hint', {
        session_id,
        current_state: { board }
      });
      
      if (resp.data.status === "success") {
        const move = resp.data.move; // { from, to, jumped }
        if (move) {
          const [fr, fc] = move.from;
          const [tr, tc] = move.to;
          const [mr, mc] = move.jumped;

          const newBoard = board.map(row => [...row]);
          newBoard[fr][fc] = 0;
          newBoard[mr][mc] = 0;
          newBoard[tr][tc] = 1;
          
          setBoard(newBoard);
          setMoves(m => m + 1);
          
          api.post('/session/action', {
            session_id, 
            action_detail: { from: move.from, to: move.to, jumped: move.jumped, type: isAdmin ? 'admin_hint' : 'user_hint' }, 
            timestamp_ms: Date.now(),
            similarity_score: calcSimilarity(newBoard)
          }).catch(e => console.error(e));
          if (!isAdmin) setHintCount(c => c + 1);
        }
      } else if (resp.data.status === "dead_end") {
        alert("Tactical Analysis: Mathematical Dead-End. Reset required.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to compute AI hint.");
    }
    setHinting(false);
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  useEffect(() => {
    // Win if exactly 1 peg left
    let pegCount = 0;
    let possibleJumps = 0;

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c] === 1) {
          pegCount++;
          // Check for jumps from this peg
          for (let [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const midR = r + dr;
            const midC = c + dc;
            const destR = r + 2 * dr;
            const destC = c + 2 * dc;
            if (destR >= 0 && destR < 7 && destC >= 0 && destC < 7 && 
                board[midR][midC] === 1 && board[destR][destC] === 0) {
              possibleJumps++;
            }
          }
        }
      }
    }

    if (pegCount === 1 && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    } else if (pegCount > 1 && possibleJumps === 0) {
      // Stuck!
      sessionData.onStuck && sessionData.onStuck();
    }
  }, [board, isSuccess]);

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

  const handleCellClick = (r, c) => {
    if (isSuccess || board[r][c] === -1) return;

    if (selectedPos === null) {
      // Must select a peg
      if (board[r][c] === 1) {
        setSelectedPos({ r, c });
      }
    } else {
      // If clicking same peg, deselect
      if (selectedPos.r === r && selectedPos.c === c) {
        setSelectedPos(null);
        return;
      }

      // If clicking another peg, switch selection
      if (board[r][c] === 1) {
        setSelectedPos({ r, c });
        return;
      }

      // If clicking empty space, check if valid jump
      const { r: sr, c: sc } = selectedPos;
      
      const dr = Math.abs(r - sr);
      const dc = Math.abs(c - sc);

      if ((dr === 2 && dc === 0) || (dr === 0 && dc === 2)) {
        const mr = sr + (r - sr) / 2;
        const mc = sc + (c - sc) / 2;

        if (board[mr][mc] === 1) {
          // Valid Jump!
          const newBoard = board.map(row => [...row]);
          newBoard[sr][sc] = 0; // Remove start
          newBoard[mr][mc] = 0; // Remove middle
          newBoard[r][c] = 1;   // Place at end

          setBoard(newBoard);
          setSelectedPos(null);
          setMoves(moves + 1);

          api.post('/session/action', {
            session_id, 
            action_detail: { from: [sr, sc], to: [r, c], jumped: [mr, mc] }, 
            timestamp_ms: Date.now(),
            similarity_score: calcSimilarity(newBoard)
          }).catch(e => console.error(e));
          return;
        }
      }

      // Invalid move, clear selection
      setSelectedPos(null);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Peg Solitaire</h2>
        <p style={{ color: 'var(--text-muted)' }}>Jump over anomalies to eliminate them. Reduce to 1.</p>
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
        gridTemplateColumns: 'repeat(7, 45px)',
        gridTemplateRows: 'repeat(7, 45px)',
        gap: '8px',
        padding: '16px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '50%',
        boxShadow: '0 0 30px rgba(6, 182, 212, 0.1)',
        marginBottom: '2rem'
      }}>
        {board.map((row, r) => 
          row.map((val, c) => {
            if (val === -1) {
              return <div key={`${r}-${c}`} style={{ visibility: 'hidden' }} />;
            }

            const isSelected = selectedPos && selectedPos.r === r && selectedPos.c === c;
            
            return (
              <div 
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: val === 1 ? (isSelected ? 'var(--accent-cyan)' : 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))') : 'rgba(0,0,0,0.4)',
                  boxShadow: val === 1 
                    ? (isSelected ? '0 0 15px var(--accent-cyan)' : '0 4px 6px rgba(0,0,0,0.3), inset 0 2px 5px rgba(255,255,255,0.8)') 
                    : 'inset 0 4px 6px rgba(0,0,0,0.8)',
                  cursor: isSuccess ? 'default' : 'pointer',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s ease'
                }}
              />
            );
          })
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
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Solitaire Core Reached</h3>
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

export default PegSolitaire;
