import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import TowerOfHanoi from '../components/TowerOfHanoi';
import WaterSort from '../components/WaterSort';
import Sudoku from '../components/Sudoku';
import Minesweeper from '../components/Minesweeper';
import SlidingPuzzle from '../components/SlidingPuzzle';
import RushHour from '../components/RushHour';
import Sokoban from '../components/Sokoban';
import PegSolitaire from '../components/PegSolitaire';
import Nonogram from '../components/Nonogram';
import { ChevronLeft, Info, XCircle } from 'lucide-react';

const GAME_DESCRIPTIONS = {
  'hanoi': `[เป้าหมาย]
ย้ายห่วงดิสก์ทั้งหมดจากเสาเริ่มต้นไปยังเสาเป้าหมายที่กำหนด (ดูชื่อเสาได้จากหน้าจอ)

[กติกา]
1. ย้ายได้ทีละ 1 ห่วงเท่านั้น
2. ห่วงที่ใหญ่กว่าห้ามวางทับห่วงที่เล็กกว่า

[วิธีเล่น]
- คลิกที่เสาเพื่อ "หยิบ" ห่วงบนสุด
- คลิกเสาอื่นที่ว่างหรือมีห่วงใหญ่กว่าเพื่อ "วาง"`,

  'water_sort': `[เป้าหมาย]
คัดแยกสีน้ำในหลอดแก้วให้แต่ละหลอดมีเพียงสีเดียว

[กติกา]
1. เทน้ำลงในหลอดที่มี "สีเดียวกัน" อยู่ด้านบนสุดเท่านั้น
2. หลอดปลายทางต้องมีที่ว่างเหลือ
3. หลอดที่ว่างเปล่าสามารถเทสีใดลงไปก็ได้

[วิธีเล่น]
- คลิกหลอดต้นทางเพื่อเลือก (หลอดจะลอยขึ้น)
- คลิกหลอดปลายทางเพื่อเทน้ำลงไป`,

  'sudoku': `[เป้าหมาย]
เติมตัวเลข 1-9 ลงในช่องว่างให้ครบทั้งตาราง

[กติกา]
- ห้ามมีตัวเลขซ้ำกันใน "แถว" (Row) เดียวกัน
- ห้ามมีตัวเลขซ้ำกันใน "หลัก" (Column) เดียวกัน
- ห้ามมีตัวเลขซ้ำกันใน "ตารางย่อย 3x3"

[วิธีเล่น]
- คลิกที่ช่องว่างให้เกิด Cursor
- พิมพ์ตัวเลข 1-9 จากคีย์บอร์ด หรือลบด้วย Backspace`,

  'minesweeper': `[เป้าหมาย]
เปิดช่องทั้งหมดที่ "ไม่มี" ระเบิดซ่อนอยู่

[กติกา]
- ตัวเลขในช่องบอกจำนวนระเบิดใน 8 ช่องรอบข้าง
- หากกดโดนช่องที่มีระเบิด เกมจะจบลงทันที

[วิธีเล่น]
- คลิกซ้าย: เพื่อเปิดช่อง
- คลิกขวา: เพื่อปักธง (Flag) หรือยกเลิกธง ในจุดที่สงสัยว่าเป็นระเบิด`,

  'sliding': `[เป้าหมาย]
เลื่อนแผ่นตัวเลขเพื่อเรียงลำดับจาก 1 ถึง N และเว้นช่องว่างไว้ที่มุมล่างขวาสุด

[วิธีเล่น]
- คลิกที่ตัวเลขที่อยู่ติดกับ "ช่องว่าง" (บน/ล่าง/ซ้าย/ขวา) เพื่อเลื่อนตัวเลขนั้นเข้าไปแทนที่ช่องว่าง
- เรียงให้ได้ 1, 2, 3... ตามลำดับ`,

  'rushhour': `[เป้าหมาย]
นำรถคันหลัก (สีฟ้า/มีสัญลักษณ์พิเศษ) ออกไปยังทางออกด้านขวาสุด

[กติกา]
- รถแนวนอน: เลื่อนได้เฉพาะ "ซ้าย-ขวา"
- รถแนวตั้ง: เลื่อนได้เฉพาะ "ขึ้น-ลง"
- รถไม่สามารถเลื่อนทะลุหรือข้ามรถคันอื่นได้

[วิธีเล่น]
- คลิกเลือกรถที่ต้องการ (จะมีไฮไลท์)
- คลิกพื้นที่ว่างในแนวเลื่อนของรถนั้นเพื่อทำการย้ายตำแหน่ง`,

  'pegsolitaire': `[เป้าหมาย]
กำจัดหมุด (Peg) ให้เหลือเพียงอันเดียวที่จุดกึ่งกลางของตาราง

[กติกา]
- การกำจัดหมุดทำได้โดยการให้หมุดตัวหนึ่ง "กระโดดข้าม" หมุดที่อยู่ติดกันไปยังช่องว่าง
- หมุดที่ถูกกระโดดข้ามจะถูกกำจัดออก

[วิธีเล่น]
- คลิกเลือกหมุดที่ต้องการย้าย
- คลิกที่ช่องว่างปลายทาง (ต้องเป็นการกระโดดข้ามหมุด 1 ตัวพอดี)`,

  'sokoban': `[เป้าหมาย]
ผลักกล่องทุกใบไปวางทับบน "จุดเป้าหมาย" (สีแดง) ให้ครบ

[กติกา]
- คุณสามารถผลักกล่องได้ทีละ 1 ใบเท่านั้น
- ไม่สามารถผลักกล่องติดกัน 2 ใบได้
- ไม่สามารถดึงกล่องกลับมาได้ (ระวังอย่าผลักเข้ามุม)

[วิธีเล่น]
- ใช้ปุ่มลูกศร (บน-ล่าง-ซ้าย-ขวา) บนคีย์บอร์ด
- หรือคลิกปุ่มลูกศรบนหน้าจอเพื่อควบคุมตัวละคร`,

  'nonogram': `[เป้าหมาย]
ระบายสีช่องตามตัวเลขคำใบ้เพื่อสร้างรูปภาพที่ถูกต้อง

[กติกา]
- ตัวเลขขอบตารางบอกถึง "จำนวนช่องที่ต้องระบายสีติดกัน"
- หากมีหลายเลข เช่น "3 1" หมายถึงต้องมีบล็อกระบาย 3 ช่องติดกัน เว้นระยะอย่างน้อย 1 ช่อง แล้วตามด้วยบล็อกระบายอีก 1 ช่อง

[วิธีเล่น]
- คลิกซ้าย: เพื่อระบายสี
- คลิกขวา: เพื่อทำเครื่องหมายกากบาท (X) ในช่องที่มั่นใจว่าไม่มีสี`,


};

const GameSessionWrapper = () => {
  const { gameId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const customLevel = queryParams.get('level') ? parseInt(queryParams.get('level'), 10) : null;
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [resetKey, setResetKey] = useState(0); // For forcing remount
  const [isStuck, setIsStuck] = useState(false);
  
  // Scaling Logic
  const gameRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const startSession = async () => {
      try {
        const payload = {
          game_id: parseInt(gameId, 10),
          user_id: currentUser.user_id
        };
        if (customLevel) {
          payload.custom_level = customLevel;
        }
        const response = await api.post('/session/start', payload);
        setSession(response.data);
      } catch (err) {
        console.error("Failed to start session:", err);
        setError("Could not initialize structural matrix.");
      } finally {
        setLoading(false);
      }
    };
    
    startSession();
  }, [gameId, currentUser.user_id]);

  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current) {
        const headerOffset = 100; // Offset for buttons/padding
        const viewportWidth = window.innerWidth - 32;
        const viewportHeight = window.innerHeight - headerOffset;
        
        const contentWidth = gameRef.current.scrollWidth;
        const contentHeight = gameRef.current.scrollHeight;
        
        const scaleX = viewportWidth / contentWidth;
        const scaleY = viewportHeight / contentHeight;
        
        // Ensure scale doesn't exceed 1 and fits in both axes
        const newScale = Math.min(1, scaleX, scaleY);
        
        setScale(newScale);
        setDimensions({ w: contentWidth, h: contentHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 600);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [session, loading, resetKey]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Initializing Protocol...</div>;
  if (error) return <div style={{ color: '#ef4444', padding: '3rem', textAlign: 'center' }}>{error}</div>;

  const handleBack = () => navigate('/dashboard');
  const handleReset = () => {
    // Log the reset event to telemetry
    if (session) {
      api.post('/session/action', {
        session_id: session.session_id,
        action_detail: { type: 'level_reset', is_stuck_state: isStuck },
        timestamp_ms: Date.now()
      }).catch(e => console.error("Telemetry error:", e));
    }
    
    setResetKey(prev => prev + 1);
    setIsStuck(false);
  };

  const type = session.initial_state.game_type || 'unimplemented';

  const isAdmin = ['adminnaew', 'admincpsu'].includes(currentUser?.username);

  const commonProps = {
    sessionData: session,
    currentUser: currentUser,
    isAdmin: isAdmin,
    onBack: handleBack,
    onStuck: () => setIsStuck(true)
  };

  const gameTitles = {
    'hanoi': 'Tower of Hanoi',
    'water_sort': 'Water Sort',
    'sudoku': 'Sudoku',
    'minesweeper': 'Minesweeper',
    'sliding': '15-Puzzle',
    'rushhour': 'Rush Hour',
    'pegsolitaire': 'Peg Solitaire',
    'sokoban': 'Sokoban',
    'nonogram': 'Nonogram'
  };

  const renderGame = () => {
    if (type === 'hanoi') return <TowerOfHanoi key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'water_sort') return <WaterSort key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'sudoku') return <Sudoku key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'minesweeper') return <Minesweeper key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'sliding') return <SlidingPuzzle key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'rushhour') return <RushHour key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'sokoban') return <Sokoban key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'pegsolitaire') return <PegSolitaire key={`${session.session_id}-${resetKey}`} {...commonProps} />;
    if (type === 'nonogram') return <Nonogram key={`${session.session_id}-${resetKey}`} {...commonProps} />;

    
    return (
      <div className="glass-panel" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <h3>Simulation Node Accessed</h3>
        <p style={{ color: 'var(--text-muted)' }}>Locked in development phase.</p>
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem', flexShrink: 0 }}>
        <button 
          onClick={handleBack} 
          style={{ background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px' }}
        >
          <ChevronLeft size={20} /> Abort
        </button>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`info-btn ${isStuck ? 'stuck-pulse' : ''}`} 
            onClick={handleReset}
            style={{ 
              borderColor: isStuck ? '#ef4444' : 'rgba(6,182,212,0.3)',
              color: isStuck ? '#ef4444' : 'var(--accent-cyan)',
              background: isStuck ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6,182,212,0.1)'
            }}
          >
            รีเซ็ตด่าน
          </button>
          <button className="info-btn" onClick={() => setShowHelp(true)}>
            <Info size={16} /> วิธีเล่น
          </button>
        </div>
      </div>

      <div className="game-scale-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'column' }}>
        <div 
          ref={gameRef} 
          style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center',
            width: 'max-content',
            margin: '0 auto',
            transition: 'transform 0.3s ease-out'
          }}
        >
          {renderGame()}
        </div>
      </div>

      {showHelp && (
        <div className="help-overlay animate-fade-in" onClick={() => setShowHelp(false)}>
          <div className="glass-panel help-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)' }}>Sim-Manual: {type.toUpperCase()}</h2>
              <button 
                onClick={() => setShowHelp(false)} 
                style={{ background: 'transparent', color: 'var(--text-muted)' }}
              >
                <XCircle size={24} />
              </button>
            </div>
            <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6, color: '#ced4da' }}>
              {(GAME_DESCRIPTIONS[type] || 'รหัสลับสำหรับการเล่นโมดูลนี้ยังไม่ได้รับการอนุมัติ').split('\n').map((line, i) => {
                const isHeader = line.trim().startsWith('[') && line.trim().endsWith(']');
                return (
                  <div key={i} style={{ 
                    fontWeight: isHeader ? 700 : 400, 
                    color: isHeader ? 'var(--accent-cyan)' : 'inherit',
                    marginTop: isHeader && i > 0 ? '1.25rem' : '0.25rem',
                    fontSize: isHeader ? '1.1rem' : '1rem',
                    letterSpacing: isHeader ? '0.5px' : 'normal'
                  }}>
                    {isHeader ? line.trim().replace(/[\[\]]/g, '') : line}
                  </div>
                );
              })}
            </div>
            <button 
              className="btn-primary" 
              style={{ marginTop: '2rem' }} 
              onClick={() => setShowHelp(false)}
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSessionWrapper;
