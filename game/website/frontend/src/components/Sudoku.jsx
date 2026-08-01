import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

const Sudoku = ({ sessionData, currentUser, onBack, onStuck, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { grid: initialGrid, solution, min_moves_required } = initial_state;
  // Track the current grid state. We duplicate it to avoid mutating props.
  const [grid, setGrid] = useState(initialGrid.map(row => [...row]));
  const [moves, setMoves] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  // Similarity: fraction of cells matching solution
  const calcSimilarity = (currentGrid) => {
    let correct = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentGrid[r][c] !== 0 && currentGrid[r][c] === solution[r][c]) correct++;
      }
    }
    return correct / 81;
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  const handleSolve = () => {
    setGrid(solution.map(row => [...row]));
    setMoves(min_moves_required); 
    setIsSuccess(true);
  };

  const handleStepSolve = () => {
    // Find first empty cell and fill it from solution
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const newGrid = grid.map(row => [...row]);
          newGrid[r][c] = solution[r][c];
          setGrid(newGrid);
          if (!isAdmin) setHintCount(cnt => cnt + 1);
          return;
        }
      }
    }
  };

  // Validation Check against solution
  useEffect(() => {
    let complete = true;
    let correct = true;
    let errors = 0;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          complete = false;
        } else if (grid[r][c] !== solution[r][c]) {
          correct = false;
          errors++;
        }
      }
    }

    if (complete && correct && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    } else if (complete && !correct) {
      // Board full but wrong
      onStuck?.();
    } else if (errors > 10) {
      // Too many errors, suggest reset
      onStuck?.();
    }
  }, [grid]);

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

  const handleCellChange = (r, c, value) => {
    if (isSuccess || initialGrid[r][c] !== 0) return; // Cannot edit locked cells

    const valStr = value.slice(-1); // Only take latest char
    let num = parseInt(valStr, 10);
    if (isNaN(num) && valStr !== '') return;
    if (valStr === '') num = 0;

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = num;
    setGrid(newGrid);
    setMoves(moves + 1);

    // Background log
    api.post('/session/action', {
      session_id: session_id,
      action_detail: { r, c, value: num },
      timestamp_ms: Date.now(),
      similarity_score: calcSimilarity(newGrid)
    }).catch(e => console.error(e));
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Sudoku Grid</h2>
        <p style={{ color: 'var(--text-muted)' }}>Complete the 9x9 matrix logically.</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px' }}>Attempts: {moves}</span>
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
        gridTemplateColumns: 'repeat(9, 40px)', 
        gridTemplateRows: 'repeat(9, 40px)', 
        border: '2px solid var(--accent-cyan)',
        background: 'rgba(0,0,0,0.5)',
        marginBottom: '2rem',
        boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)'
      }}>
        {grid.map((row, r) => 
          row.map((cellValue, c) => {
            const isLocked = initialGrid[r][c] !== 0;
            const isWrong = !isLocked && cellValue !== 0 && cellValue !== solution[r][c];

            const borderRight = (c === 2 || c === 5) ? '2px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)';
            const borderBottom = (r === 2 || r === 5) ? '2px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)';

            return (
              <input 
                key={`${r}-${c}`}
                type="text"
                value={cellValue === 0 ? '' : cellValue}
                onChange={(e) => handleCellChange(r, c, e.target.value)}
                readOnly={isLocked}
                style={{
                  width: '100%',
                  height: '100%',
                  margin: 0,
                  padding: 0,
                  textAlign: 'center',
                  background: isLocked ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: isLocked ? 'var(--text-muted)' : (isWrong ? '#ef4444' : 'var(--accent-cyan)'),
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '1.25rem',
                  fontWeight: isLocked ? 400 : 600,
                  border: 'none',
                  borderRight: borderRight,
                  borderBottom: borderBottom,
                  borderRadius: 0,
                  outline: 'none',
                  cursor: isLocked || isSuccess ? 'default' : 'text'
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
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Logic Verified</h3>
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

export default Sudoku;
