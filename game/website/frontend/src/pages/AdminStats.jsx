import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ChevronLeft, BarChart2, Users, Trophy, Play, CheckCircle, TrendingUp, Download, Zap, Clock, Brain, ChevronDown, ChevronRight } from 'lucide-react';

const AdminStats = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const isAdmin = ['adminnaew', 'admincpsu'].includes(currentUser?.username);

    const [summary, setSummary] = useState(null);
    const [gameStats, setGameStats] = useState([]);
    const [userStats, setUserStats] = useState([]);
    const [userDetail, setUserDetail] = useState([]);
    const [operatorLab, setOperatorLab] = useState(null);
    const [timeSeries, setTimeSeries] = useState([]);
    const [period, setPeriod] = useState('daily');
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview, users, games

    useEffect(() => {
        if (!isAdmin) {
            navigate('/dashboard');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const [sumRes, gameRes, userRes, timeRes, detailRes, opRes] = await Promise.all([
                    api.get('/admin/stats/summary'),
                    api.get('/admin/stats/games'),
                    api.get('/admin/stats/users'),
                    api.get(`/admin/stats/time-series?period=${period}`),
                    api.get('/admin/stats/users/detail'),
                    api.get('/admin/stats/operator-lab')
                ]);
                setSummary(sumRes.data);
                setGameStats(gameRes.data);
                setUserStats(userRes.data);
                setTimeSeries(timeRes.data);
                setUserDetail(detailRes.data);
                setOperatorLab(opRes.data);
            } catch (err) {
                console.error("Failed to fetch admin stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAdmin, navigate, period]);

    const handleExport = (type, username = null) => {
        const baseUrl = api.defaults.baseURL || '';
        const params = username ? `?username=${encodeURIComponent(username)}` : '';
        window.open(`${baseUrl}/admin/export/${type}${params}`, '_blank');
    };

    if (!isAdmin) return null;

    const tabStyle = (tab) => ({
        padding: '8px 20px',
        borderRadius: '8px',
        background: activeTab === tab ? 'var(--accent-indigo)' : 'transparent',
        color: activeTab === tab ? 'white' : 'var(--text-muted)',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        transition: 'all 0.2s ease'
    });

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart2 color="var(--accent-cyan)" /> Neural Command Center
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Platform-wide diagnostics and performance metrics</p>
                    </div>
                </div>
                {/* CSV Export Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleExport('sessions')} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                        background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s'
                    }}>
                        <Download size={14} /> Sessions CSV
                    </button>
                    <button onClick={() => handleExport('actions')} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                        background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s'
                    }}>
                        <Download size={14} /> Actions CSV
                    </button>
                    <button onClick={() => handleExport('operator-lab')} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                        background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)',
                        borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s'
                    }}>
                        <Download size={14} /> Operator Lab CSV
                    </button>
                </div>
            </header>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <div className="animate-pulse" style={{ color: 'var(--accent-cyan)' }}>Analyzing Data Matrix...</div>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { icon: <Play size={18} />, label: 'TOTAL SESSIONS', value: summary?.total_sessions, color: 'var(--accent-cyan)', border: 'var(--accent-cyan)' },
                            { icon: <Users size={18} />, label: 'ACTIVE VANGUARDS', value: summary?.total_users, color: 'var(--accent-indigo)', border: 'var(--accent-indigo)' },
                            { icon: <CheckCircle size={18} />, label: 'SUCCESS RATE', value: `${summary?.success_rate}%`, color: '#10b981', border: '#10b981' },
                            { icon: <TrendingUp size={18} />, label: 'AVG EFFICIENCY', value: `${summary?.avg_efficiency}%`, color: 'var(--accent-purple)', border: 'var(--accent-purple)' },
                            { icon: <Brain size={18} />, label: 'OP LAB ATTEMPTS', value: operatorLab?.total_attempts || 0, color: '#eab308', border: '#eab308' },
                            { icon: <Zap size={18} />, label: 'OP LAB ACCURACY', value: `${operatorLab?.accuracy || 0}%`, color: '#f97316', border: '#f97316' },
                        ].map((kpi, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '1.25rem', borderLeft: `4px solid ${kpi.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: kpi.color }}>{kpi.icon}</span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>{kpi.label}</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{kpi.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tab Navigation */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', marginBottom: '2rem', width: 'fit-content' }}>
                        <button onClick={() => setActiveTab('overview')} style={tabStyle('overview')}>📊 Overview</button>
                        <button onClick={() => setActiveTab('users')} style={tabStyle('users')}>👤 User Analytics</button>
                        <button onClick={() => setActiveTab('games')} style={tabStyle('games')}>🎮 Game Performance</button>
                    </div>

                    {/* === OVERVIEW TAB === */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                            {/* Activity Trends */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Activity Trends</h3>
                                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' }}>
                                        {['daily', 'weekly', 'monthly'].map(p => (
                                            <button
                                                key={p}
                                                onClick={() => setPeriod(p)}
                                                style={{
                                                    fontSize: '0.75rem', padding: '4px 12px', borderRadius: '6px',
                                                    background: period === p ? 'var(--accent-indigo)' : 'transparent',
                                                    color: period === p ? 'white' : 'var(--text-muted)',
                                                    border: 'none', cursor: 'pointer'
                                                }}
                                            >{p.toUpperCase()}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', padding: '0 1rem' }}>
                                    {timeSeries.map((t, i) => (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div
                                                style={{
                                                    width: '100%',
                                                    background: 'linear-gradient(to top, var(--accent-indigo), var(--accent-cyan))',
                                                    height: `${Math.min(100, (t.count / (Math.max(...timeSeries.map(x => x.count)) || 1)) * 100)}%`,
                                                    borderRadius: '4px 4px 0 0', minHeight: '4px'
                                                }}
                                                title={`${t.period}: ${t.count} sessions`}
                                            />
                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', transform: 'rotate(-45deg)', marginTop: '8px' }}>
                                                {t.period.split('-').slice(-1)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Vanguards */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Trophy size={18} color="#fbbf24" /> Top Vanguards
                                </h3>
                                <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <th style={{ padding: '8px' }}>USERNAME</th>
                                                <th style={{ padding: '8px' }}>LVL</th>
                                                <th style={{ padding: '8px' }}>SESSIONS</th>
                                                <th style={{ padding: '8px' }}>EFF.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userStats.slice(0, 8).map((u, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{u.username}</td>
                                                    <td style={{ padding: '10px 8px' }}><span style={{ color: 'var(--accent-cyan)' }}>{u.level}</span></td>
                                                    <td style={{ padding: '10px 8px' }}>{u.total_sessions}</td>
                                                    <td style={{ padding: '10px 8px' }}>{u.avg_efficiency}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Operator Lab Summary */}
                            {operatorLab && operatorLab.total_attempts > 0 && (
                                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                    <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Brain size={18} color="#eab308" /> Operator Lab Analytics
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {[
                                            { label: 'Total Attempts', value: operatorLab.total_attempts },
                                            { label: 'Accuracy', value: `${operatorLab.accuracy}%` },
                                            { label: 'Avg Solve Time', value: `${operatorLab.avg_solve_time_s}s` },
                                            { label: 'Hint Usage', value: `${operatorLab.hint_usage_rate}%` },
                                        ].map((item, i) => (
                                            <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{item.label}</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#eab308' }}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === USER ANALYTICS TAB === */}
                    {activeTab === 'users' && (
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem' }}>📋 Detailed User Analytics</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ padding: '10px' }}></th>
                                            <th style={{ padding: '10px' }}>USERNAME</th>
                                            <th style={{ padding: '10px' }}>LEVEL</th>
                                            <th style={{ padding: '10px' }}>SESSIONS</th>
                                            <th style={{ padding: '10px' }}>WINS</th>
                                            <th style={{ padding: '10px' }}>WIN RATE</th>
                                            <th style={{ padding: '10px' }}>HINTS</th>
                                            <th style={{ padding: '10px' }}>AVG TIME</th>
                                            <th style={{ padding: '10px' }}>OP LAB</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userDetail.map((u, i) => (
                                            <React.Fragment key={i}>
                                                <tr
                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', cursor: 'pointer', background: expandedUser === i ? 'rgba(99,102,241,0.05)' : 'transparent' }}
                                                    onClick={() => setExpandedUser(expandedUser === i ? null : i)}
                                                >
                                                    <td style={{ padding: '12px 10px', width: '30px' }}>
                                                        {expandedUser === i ? <ChevronDown size={16} color="var(--accent-cyan)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                                                    </td>
                                                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{u.username}</td>
                                                    <td style={{ padding: '12px 10px' }}><span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{u.level}</span></td>
                                                    <td style={{ padding: '12px 10px' }}>{u.total_sessions}</td>
                                                    <td style={{ padding: '12px 10px', color: '#10b981' }}>{u.total_wins}</td>
                                                    <td style={{ padding: '12px 10px' }}>
                                                        <span style={{ color: (u.total_wins / Math.max(u.total_sessions, 1) * 100) > 50 ? '#10b981' : '#f59e0b' }}>
                                                            {Math.round(u.total_wins / Math.max(u.total_sessions, 1) * 100)}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 10px', color: '#eab308' }}>{u.total_hints_used}</td>
                                                    <td style={{ padding: '12px 10px' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Clock size={12} color="var(--text-muted)" /> {u.avg_time_per_session_s}s
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 10px', fontSize: '0.75rem' }}>
                                                        {u.operator_lab.attempts > 0
                                                            ? <span style={{ color: '#eab308' }}>{u.operator_lab.correct}/{u.operator_lab.attempts} ({u.operator_lab.accuracy}%)</span>
                                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                        }
                                                    </td>
                                                </tr>
                                                {/* Expanded: Per-game breakdown */}
                                                {expandedUser === i && (
                                                    <tr>
                                                        <td colSpan="9" style={{ padding: '0 10px 16px 50px', background: 'rgba(0,0,0,0.15)' }}>
                                                            {/* Per-user CSV Download */}
                                                            <div style={{ display: 'flex', gap: '8px', padding: '12px 0 8px', flexWrap: 'wrap' }}>
                                                                <button onClick={(e) => { e.stopPropagation(); handleExport('sessions', u.username); }} style={{
                                                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                                                                    background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)',
                                                                    borderRadius: '6px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700
                                                                }}>
                                                                    <Download size={11} /> Sessions
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleExport('actions', u.username); }} style={{
                                                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                                                                    background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)',
                                                                    borderRadius: '6px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700
                                                                }}>
                                                                    <Download size={11} /> Actions
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleExport('operator-lab', u.username); }} style={{
                                                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                                                                    background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)',
                                                                    borderRadius: '6px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700
                                                                }}>
                                                                    <Download size={11} /> Op Lab
                                                                </button>
                                                            </div>
                                                            {/* Per-game breakdown */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', padding: '4px 0' }}>
                                                                {u.games.map((g, gi) => (
                                                                    <div key={gi} style={{
                                                                        padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                                    }}>
                                                                        <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '8px', color: 'var(--accent-cyan)' }}>{g.game}</div>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.72rem' }}>
                                                                            <span style={{ color: 'var(--text-muted)' }}>Plays:</span><span>{g.plays}</span>
                                                                            <span style={{ color: 'var(--text-muted)' }}>Wins:</span><span style={{ color: '#10b981' }}>{g.wins} ({g.win_rate}%)</span>
                                                                            <span style={{ color: 'var(--text-muted)' }}>Efficiency:</span><span>{g.avg_efficiency}%</span>
                                                                            <span style={{ color: 'var(--text-muted)' }}>Avg Time:</span><span>{g.avg_time_s}s</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* === GAME PERFORMANCE TAB === */}
                    {activeTab === 'games' && (
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem' }}>🎮 Module Performance Diagnostics</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ padding: '12px' }}>GAME MODULE</th>
                                            <th style={{ padding: '12px' }}>ENGAGEMENT</th>
                                            <th style={{ padding: '12px' }}>SUCCESS RATE</th>
                                            <th style={{ padding: '12px' }}>AVG EFFICIENCY</th>
                                            <th style={{ padding: '12px' }}>DIFFICULTY INDEX</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gameStats.map((g, i) => {
                                            // Difficulty index: inverse of success rate — higher = harder
                                            const difficulty = Math.round(100 - g.success_rate);
                                            const diffColor = difficulty > 70 ? '#ef4444' : difficulty > 40 ? '#f59e0b' : '#10b981';
                                            const diffLabel = difficulty > 70 ? 'HARD' : difficulty > 40 ? 'MEDIUM' : 'EASY';

                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem' }}>
                                                    <td style={{ padding: '16px 12px', fontWeight: 600 }}>{g.game_name}</td>
                                                    <td style={{ padding: '16px 12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', maxWidth: '100px' }}>
                                                                <div style={{ height: '100%', background: 'linear-gradient(to right, var(--accent-indigo), var(--accent-cyan))', width: `${Math.min(100, (g.total_sessions / (summary?.total_sessions || 1)) * 100 * 5)}%`, borderRadius: '3px' }} />
                                                            </div>
                                                            <span style={{ fontSize: '0.8rem' }}>{g.total_sessions}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 12px' }}>
                                                        <span style={{ color: g.success_rate > 50 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{g.success_rate}%</span>
                                                    </td>
                                                    <td style={{ padding: '16px 12px' }}>{g.avg_efficiency}%</td>
                                                    <td style={{ padding: '16px 12px' }}>
                                                        <span style={{
                                                            color: diffColor, fontWeight: 700, fontSize: '0.75rem',
                                                            padding: '3px 10px', borderRadius: '12px',
                                                            background: `${diffColor}15`, border: `1px solid ${diffColor}40`
                                                        }}>
                                                            {diffLabel} ({difficulty})
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminStats;
