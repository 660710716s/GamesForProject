import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, X } from 'lucide-react';

const Nonogram = ({ sessionData, currentUser, onBack, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { size, row_hints, col_hints, solution, min_moves_required } = initial_state;

  // 0: Empty, 1: Filled, 2: X (Crossed)
  const [grid, setGrid] = useState(Array(size).fill().map(() => Array(size).fill(0)));
  const [moves, setMoves] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;
  
  // Similarity: fraction of cells matching solution
  const calcSimilarity = (currentGrid) => {
    let matching = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if ((currentGrid[r][c] === 1) === (solution[r][c] === 1)) matching++;
      }
    }
    return matching / (size * size);
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  const handleSolve = () => {
    setGrid(solution.map(row => [...row]));
    setMoves(min_moves_required);
    setIsSuccess(true);
  };

  const handleStepSolve = () => {
    const newGrid = grid.map(row => [...row]);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const shouldBeFilled = solution[r][c] === 1;
        
        if (shouldBeFilled && grid[r][c] !== 1) {
          newGrid[r][c] = 1;
          setGrid(newGrid);
          setMoves(m => m + 1);
          if (!isAdmin) setHintCount(cnt => cnt + 1);
          return;
        }
        if (!shouldBeFilled && grid[r][c] === 1) {
          newGrid[r][c] = 0;
          setGrid(newGrid);
          setMoves(m => m + 1);
          if (!isAdmin) setHintCount(cnt => cnt + 1);
          return;
        }
      }
    }
  };

  useEffect(() => {
    // Check win condition
    let matches = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isFilled = grid[r][c] === 1;
        const shouldBeFilled = solution[r][c] === 1;
        if (isFilled !== shouldBeFilled) {
          matches = false;
          break;
        }
      }
      if (!matches) break;
    }

    if (matches && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    }
  }, [grid]);

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

  const handleCellClick = (r, c, isRightClick = false) => {
    if (isSuccess) return;

    const newGrid = grid.map(row => [...row]);
    if (isRightClick) {
      newGrid[r][c] = newGrid[r][c] === 2 ? 0 : 2;
    } else {
      newGrid[r][c] = newGrid[r][c] === 1 ? 0 : 1;
    }
    
    setGrid(newGrid);
    setMoves(m => m + 1);

    api.post('/session/action', {
      session_id, action_detail: { r, c, type: newGrid[r][c] }, timestamp_ms: Date.now(),
      similarity_score: calcSimilarity(newGrid)
    }).catch(e => console.error(e));
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Nonogram Protocol</h2>
        <p style={{ color: 'var(--text-muted)' }}>Decode the matrix using the row and column indicators.</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px' }}>Cells Filled: {moves}</span>
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
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '1rem' }}>(Left Click: Fill, Right Click: X)</p>
      </div>
      <div style={{ display: 'flex' }}>
        {/* Row Hints Container */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', marginTop: '100px' }}>
          {row_hints.map((hints, idx) => (
            <div key={`row-hint-${idx}`} style={{ 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'flex-end', 
              paddingRight: '15px',
              fontSize: '0.9rem',
              color: 'var(--accent-cyan)'
            }}>
              {hints.join(' ')}
            </div>
          ))}
        </div>

        <div>
          {/* Column Hints Container */}
          <div style={{ display: 'flex', marginBottom: '10px' }}>
            <div style={{ width: '0px' }} /> {/* Spacer */}
            {col_hints.map((hints, idx) => (
              <div key={`col-hint-${idx}`} style={{ 
                width: '40px', 
                minHeight: '100px',
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'flex-end', 
                fontSize: '0.9rem',
                color: 'var(--accent-cyan)',
                marginRight: '2px'
              }}>
                {hints.map((h, hIdx) => <div key={hIdx}>{h}</div>)}
              </div>
            ))}
          </div>

          {/* Rendering the Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${size}, 40px)`, 
            gap: '2px' 
          }}>
            {grid.map((row, r) => 
              row.map((val, c) => (
                <div 
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => { e.preventDefault(); handleCellClick(r, c, true); }}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: val === 1 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    position: 'relative'
                  }}
                >
                  {val === 2 && <X size={20} color="rgba(255,255,255,0.3)" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {!isSuccess && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Pattern Decoded</h3>
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

export default Nonogram;
