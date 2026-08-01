import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle } from 'lucide-react';

const RushHour = ({ sessionData, currentUser, onBack, onStuck, isAdmin }) => {
  const { updateUserLevel } = useAuth();
  const { session_id, initial_state } = sessionData;
  const { vehicles: initialVehicles, grid_size, exit_y } = initial_state;

  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selectedId, setSelectedId] = useState(null);
  const [moves, setMoves] = useState(0);
  const [adminMoveCount, setAdminMoveCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const MAX_HINTS = 3;

  // Similarity: how close the target vehicle (index 0) is to exit
  const calcSimilarity = (currentVehicles) => {
    const target = currentVehicles[0]; // Primary vehicle is always index 0
    const distToExit = (grid_size - target.length) - target.x;
    const maxDist = grid_size - target.length;
    return maxDist > 0 ? 1 - (distToExit / maxDist) : 1;
  };

  const { solution, min_moves_required } = initial_state;

  const handleSolve = () => {
    const newVehicles = vehicles.map(v =>
      v.type === 'player' ? { ...v, x: grid_size - v.w } : v
    );
    setVehicles(newVehicles);
    setMoves(min_moves_required);
    setIsSuccess(true);
  };

  const [hinting, setHinting] = useState(false);

  // Solver: Real-Time Dynamic Hinting
  const handleStepSolve = async () => {
    if (hinting) return;
    setHinting(true);

    try {
      const resp = await api.post('/session/hint', {
        session_id,
        current_state: { vehicles, grid_size, exit_y }
      });

      if (resp.data.status === "success") {
        const move = resp.data.move; // { v_idx, nx, ny }
        if (move) {
          const newVehicles = [...vehicles];
          newVehicles[move.v_idx] = { ...newVehicles[move.v_idx], x: move.nx, y: move.ny };

          setVehicles(newVehicles);
          setMoves(m => m + 1);

          const v = newVehicles[move.v_idx];
          api.post('/session/action', {
            session_id, action_detail: { v_idx: move.v_idx, nx: v.x, ny: v.y, type: isAdmin ? 'admin_hint' : 'user_hint' }, timestamp_ms: Date.now(),
            similarity_score: calcSimilarity(newVehicles)
          }).catch(e => console.error(e));
          if (!isAdmin) setHintCount(c => c + 1);
        }
      } else if (resp.data.status === "dead_end") {
        alert("The traffic is completely jammed in a dead end. Please reset the grid.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to compute hint.");
    }
    setHinting(false);
  };

  const efficiency = moves === 0 ? 100 : Math.round((min_moves_required / moves) * 100);

  // Check Win
  useEffect(() => {
    const player = vehicles.find(v => v.type === 'player');
    if (player && player.x + player.w === grid_size && !isSuccess) {
      setIsSuccess(true);
      submitWin();
    }
  }, [vehicles]);



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

  const getCellMap = () => {
    const map = Array(grid_size).fill().map(() => Array(grid_size).fill(null));
    vehicles.forEach(v => {
      for (let r = v.y; r < v.y + v.h; r++) {
        for (let c = v.x; c < v.x + v.w; c++) {
          map[r][c] = v.id;
        }
      }
    });
    return map;
  };

  const handleCellClick = (r, c) => {
    if (isSuccess) return;

    const map = getCellMap();
    const clickedId = map[r][c];

    if (clickedId !== null) {
      // Select vehicle
      setSelectedId(selectedId === clickedId ? null : clickedId);
      return;
    }

    if (selectedId && clickedId === null) {
      // Attempt to move selected vehicle to empty space
      const v = vehicles.find(v => v.id === selectedId);
      const isHorizontal = v.w > v.h;

      // Ensure click is along valid axis
      if (isHorizontal && r !== v.y) return;
      if (!isHorizontal && c !== v.x) return;

      // Ensure path is clear
      let pathClear = true;
      let newX = v.x;
      let newY = v.y;

      if (isHorizontal) {
        const step = c < v.x ? -1 : 1;
        const targetX = step === 1 ? c - v.w + 1 : c;
        // Check blocks between v.x and targetX
        const start = Math.min(v.x, targetX);
        const end = Math.max(v.x + v.w - 1, targetX + v.w - 1);
        for (let i = start; i <= end; i++) {
          if (map[v.y][i] !== null && map[v.y][i] !== v.id) pathClear = false;
        }
        if (pathClear) newX = targetX;
      } else {
        const step = r < v.y ? -1 : 1;
        const targetY = step === 1 ? r - v.h + 1 : r;
        const start = Math.min(v.y, targetY);
        const end = Math.max(v.y + v.h - 1, targetY + v.h - 1);
        for (let i = start; i <= end; i++) {
          if (map[i][v.x] !== null && map[i][v.x] !== v.id) pathClear = false;
        }
        if (pathClear) newY = targetY;
      }

      if (pathClear && (newX !== v.x || newY !== v.y)) {
        const newVehicles = vehicles.map(vh => vh.id === v.id ? { ...vh, x: newX, y: newY } : vh);
        setVehicles(newVehicles);
        setSelectedId(null);
        setMoves(moves + 1);

        api.post('/session/action', {
          session_id, action_detail: { id: v.id, newX, newY }, timestamp_ms: Date.now(),
          similarity_score: calcSimilarity(newVehicles)
        }).catch(e => console.error(e));
      }
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '8px' }}>Traffic Routing</h2>
        <p style={{ color: 'var(--text-muted)' }}>Free the primary unit (Cyan) through the exit portal.</p>
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

      <div style={{ position: 'relative', paddingRight: '20px', marginBottom: '2rem' }}>
        {/* The Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${grid_size}, 50px)`,
          gridTemplateRows: `repeat(${grid_size}, 50px)`,
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(255,255,255,0.1)',
          position: 'relative'
        }}>
          {Array(grid_size * grid_size).fill(0).map((_, idx) => (
            <div
              key={idx}
              onClick={() => handleCellClick(Math.floor(idx / grid_size), idx % grid_size)}
              style={{ border: '1px solid rgba(255,255,255,0.05)' }}
            />
          ))}

          {/* Render Vehicles on top */}
          {vehicles.map(v => {
            const isSelected = selectedId === v.id;
            return (
              <div
                key={v.id}
                onClick={() => handleCellClick(v.y, v.x)}
                style={{
                  position: 'absolute',
                  top: v.y * 50 + 2,
                  left: v.x * 50 + 2,
                  width: (v.w * 50) - 4,
                  height: (v.h * 50) - 4,
                  background: v.type === 'player' ? 'var(--accent-cyan)' : 'var(--accent-indigo)',
                  borderRadius: '6px',
                  boxShadow: isSelected ? '0 0 15px rgba(255,255,255,0.5)' : '0 4px 6px rgba(0,0,0,0.3)',
                  border: isSelected ? '2px solid white' : 'none',
                  cursor: isSuccess ? 'default' : 'pointer',
                  transition: 'top 0.2s ease, left 0.2s ease, box-shadow 0.2s ease'
                }}
              />
            );
          })}
        </div>

        {/* Exit Portal */}
        <div style={{
          position: 'absolute',
          right: 0,
          top: exit_y * 50,
          width: '20px',
          height: '50px',
          background: 'rgba(6, 182, 212, 0.2)',
          borderRight: '4px solid var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6,182,212,0.4)',
          borderTopRightRadius: '4px',
          borderBottomRightRadius: '4px'
        }}>
        </div>
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
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Routing Complete</h3>
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

export default RushHour;
