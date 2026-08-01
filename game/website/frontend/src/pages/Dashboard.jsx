import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { LogOut, Play, Lock, CheckCircle, BarChart2, Code, Terminal, Activity, ArrowRight } from 'lucide-react';
import LevelBadge, { LEVEL_CONFIG } from '../components/LevelBadge';

const GAME_IMAGES = {
  'Tower of Hanoi': '/assets/games/hanoi.png',
  'Water Sort Puzzle': '/assets/games/watersort.png',
  'Peg Solitaire': '/assets/games/pegsolitaire.png',
  'Sliding Puzzle (15-Puzzle)': '/assets/games/sliding.png',
  'Rush Hour (Traffic Jam)': '/assets/games/rushhour.png',
  'Sokoban': '/assets/games/sokoban.png',
  'Sudoku': '/assets/games/sudoku.png',
  'Nonogram (Picross)': '/assets/games/nonogram.png',
  'Minesweeper': '/assets/games/minesweeper.png',
};

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGames = async () => {
      if (!currentUser) return;
      try {
        const response = await api.get(`/games?user_id=${currentUser.user_id}`);
        setGames(response.data);
      } catch (err) {
        console.error("Failed to load games", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [currentUser]);

  const [selectedLevels, setSelectedLevels] = useState({});
  const isAdmin = ['adminnaew', 'admincpsu'].includes(currentUser?.username);

  const masteredCount = games.filter(g => g.is_mastered).length;
  const totalCount = games.length || 10;
  const progressRatio = masteredCount / totalCount;
  
  const handlePlay = (gameId) => {
    let url = `/play/${gameId}`;
    if (isAdmin && selectedLevels[gameId]) {
      url += `?level=${selectedLevels[gameId]}`;
    }
    navigate(url);
  };
  
  const handleLevelChange = (e, gameId) => {
    setSelectedLevels(prev => ({
      ...prev,
      [gameId]: parseInt(e.target.value) || 1
    }));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <LevelBadge level={currentUser?.level} size="small" showTitle={false} />
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{currentUser?.username}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600, color: LEVEL_CONFIG[Math.min(currentUser?.level || 1, 10)]?.color || 'var(--accent-cyan)' }}>
              Lv.{currentUser?.level} — {LEVEL_CONFIG[Math.min(currentUser?.level || 1, 10)]?.title || 'Novice'}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin/stats')} 
              style={{ 
                background: 'rgba(6, 182, 212, 0.1)', 
                color: 'var(--accent-cyan)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}
            >
              <BarChart2 size={18} /> Admin Center
            </button>
          )}
          <button onClick={logout} style={{ background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      {/* Profile / Stats / Featured Labs */}
      <section className="glass-panel animate-fade-in" style={{ marginBottom: '3rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', padding: '2rem 3rem' }}>
        {/* Left: Progress Ring */}
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent-cyan)" strokeWidth="8" 
              strokeDasharray="339.292" 
              strokeDashoffset={339.292 - (339.292 * progressRatio)}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s ease-in-out', filter: 'drop-shadow(0 0 8px var(--accent-cyan))' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1 }}>{masteredCount}/{totalCount}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mastered</span>
          </div>
        </div>
        
        {/* Middle: Text Context */}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <LevelBadge level={currentUser?.level} size="large" showTitle={true} />
            <div>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Level {currentUser?.level} — {LEVEL_CONFIG[Math.min(currentUser?.level || 1, 10)]?.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                {masteredCount === totalCount
                  ? "All systems mastered. Awaiting level synchronization."
                  : `Complete all ${totalCount} simulations with >=25% efficiency to advance to Level ${(currentUser?.level || 1) + 1}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Featured Lab Shortcut (The "Quick Access" feature) */}
        <div 
          onClick={() => navigate('/operator-lab')}
          style={{ 
            flex: '0 0 300px',
            background: 'rgba(6, 182, 212, 0.05)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '16px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)';
          }}
        >
          <div style={{ width: 48, height: 48, background: 'rgba(6, 182, 212, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
            <Code size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '1px', marginBottom: '2px' }}>PRIORITY LAB</div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Operator Lab</h4>
          </div>
          <ArrowRight size={20} style={{ marginLeft: 'auto', color: 'var(--accent-cyan)' }} />
          
          {/* Subtle Background Icon */}
          <Terminal size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }} />
        </div>
      </section>

      {/* Game Grid */}
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={20} color="var(--accent-indigo)" /> Available Simulations
      </h3>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading network...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {games.map((g, idx) => {
            const isActive = true;
            
            return (
              <div 
                key={g.game_id} 
                className="glass-panel" 
                style={{ 
                  padding: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  opacity: isActive ? 1 : 0.6,
                  transform: `translateY(0)`,
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: g.is_mastered ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => { 
                  if(isActive) {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)';
                    e.currentTarget.querySelector('img').style.transform = 'scale(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.querySelector('img').style.transform = 'scale(1)';
                }}
              >
                {/* Image Section */}
                <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                   <img 
                    src={GAME_IMAGES[g.game_name] || '/assets/games/default.png'} 
                    alt={g.game_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }}
                   />
                   <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(10, 10, 12, 0.9) 100%)' }} />
                   
                   <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px', width: 'calc(100% - 24px)', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--accent-cyan)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.3)' }}>
                        {g.category}
                      </span>
                      {g.is_mastered && <CheckCircle size={16} color="var(--accent-cyan)" />}
                   </div>
                   
                   <h4 style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', fontSize: '1.25rem', margin: 0 }}>{g.game_name}</h4>
                </div>
                
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {isActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isAdmin && (
                      <div style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '1.5px', marginBottom: '6px' }}>⚡ ADMIN — LEVEL OVERRIDE</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={selectedLevels[g.game_id] || currentUser?.level || 1}
                            onChange={(e) => handleLevelChange(e, g.game_id)}
                            style={{ flex: 1, accentColor: '#f59e0b', cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <LevelBadge level={selectedLevels[g.game_id] || currentUser?.level || 1} size="small" showTitle={false} />
                            <span style={{ fontWeight: 700, color: '#f59e0b', minWidth: '16px' }}>
                              {selectedLevels[g.game_id] || currentUser?.level || 1}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '4px' }}>
                          {LEVEL_CONFIG[Math.min(selectedLevels[g.game_id] || currentUser?.level || 1, 10)]?.title} Difficulty
                        </div>
                      </div>
                    )}
                    <button 
                      style={{ 
                        background: g.is_mastered ? 'rgba(255,255,255,0.05)' : 'rgba(6, 182, 212, 0.1)', 
                        color: g.is_mastered ? 'var(--text-muted)' : 'var(--accent-cyan)', 
                        border: '1px solid rgba(6, 182, 212, 0.3)', 
                        padding: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        fontWeight: 600,
                        width: '100%'
                      }}
                      onClick={() => handlePlay(g.game_id)}
                    >
                      <Play size={16} fill="currentColor" /> {g.is_mastered ? "Re-Simulate" : "Initiate"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', padding: '10px', justifyContent: 'center' }}>
                    <Lock size={16} /> Locked (WIP)
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
};

export default Dashboard;
