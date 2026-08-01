import React from 'react';

/**
 * LevelBadge Component
 * Renders a premium animated emblem based on the player's current level.
 * Levels 1-10, with escalating visual complexity and materials.
 */

const LEVEL_CONFIG = {
  1: {
    title: 'Novice',
    tier: 1,
    emoji: '🔩',
    color: '#b87333',
    glowColor: 'rgba(184, 115, 51, 0.5)',
    borderGrad: 'linear-gradient(135deg, #b87333, #8a6543)',
    bgGrad: 'linear-gradient(145deg, rgba(184,115,51,0.15), rgba(100, 60, 20, 0.1))',
    shape: 'hexagon',
    aura: 'none',
  },
  2: {
    title: 'Apprentice',
    tier: 1,
    emoji: '⚙️',
    color: '#9ab0bb',
    glowColor: 'rgba(154, 176, 187, 0.5)',
    borderGrad: 'linear-gradient(135deg, #9ab0bb, #5c7580)',
    bgGrad: 'linear-gradient(145deg, rgba(154,176,187,0.15), rgba(80, 100, 110, 0.1))',
    shape: 'octagon',
    aura: 'none',
  },
  3: {
    title: 'Tinkerer',
    tier: 1,
    emoji: '🔧',
    color: '#00c896',
    glowColor: 'rgba(0, 200, 150, 0.4)',
    borderGrad: 'linear-gradient(135deg, #00c896, #007a5a)',
    bgGrad: 'linear-gradient(145deg, rgba(0,200,150,0.15), rgba(0, 80, 60, 0.1))',
    shape: 'gear',
    aura: 'pulse-green',
  },
  4: {
    title: 'Solver',
    tier: 2,
    emoji: '🛡️',
    color: '#c0c0c0',
    glowColor: 'rgba(192, 192, 192, 0.5)',
    borderGrad: 'linear-gradient(135deg, #e8e8e8, #9a9a9a)',
    bgGrad: 'linear-gradient(145deg, rgba(192,192,192,0.15), rgba(100,100,100,0.1))',
    shape: 'shield',
    aura: 'shimmer',
  },
  5: {
    title: 'Tactician',
    tier: 2,
    emoji: '⭐',
    color: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    borderGrad: 'linear-gradient(135deg, #ffd700, #b8860b)',
    bgGrad: 'linear-gradient(145deg, rgba(255,215,0,0.15), rgba(120,80,0,0.1))',
    shape: 'star',
    aura: 'golden-pulse',
  },
  6: {
    title: 'Engineer',
    tier: 2,
    emoji: '💎',
    color: '#ff6eb4',
    glowColor: 'rgba(255, 110, 180, 0.5)',
    borderGrad: 'linear-gradient(135deg, #ff8cc8, #c2185b)',
    bgGrad: 'linear-gradient(145deg, rgba(255,110,180,0.15), rgba(120,0,60,0.1))',
    shape: 'double-hex',
    aura: 'rose-shimmer',
  },
  7: {
    title: 'Visionary',
    tier: 3,
    emoji: '🔮',
    color: '#00e5ff',
    glowColor: 'rgba(0, 229, 255, 0.7)',
    borderGrad: 'linear-gradient(135deg, #00e5ff, #007a8a)',
    bgGrad: 'linear-gradient(145deg, rgba(0,229,255,0.15), rgba(0,50,80,0.2))',
    shape: 'crystal',
    aura: 'neon-pulse',
  },
  8: {
    title: 'Virtuoso',
    tier: 3,
    emoji: '👁️',
    color: '#9b59b6',
    glowColor: 'rgba(155, 89, 182, 0.8)',
    borderGrad: 'linear-gradient(135deg, #d198f5, #5e1f8a)',
    bgGrad: 'linear-gradient(145deg, rgba(155,89,182,0.2), rgba(30,0,60,0.3))',
    shape: 'crown',
    aura: 'amethyst-levitate',
  },
  9: {
    title: 'Oracle',
    tier: 3,
    emoji: '🌌',
    color: '#e8e8ff',
    glowColor: 'rgba(200, 200, 255, 0.9)',
    borderGrad: 'linear-gradient(135deg, #ffffff, #a0a0ff, #6060cc)',
    bgGrad: 'linear-gradient(145deg, rgba(160,160,255,0.2), rgba(10,0,40,0.4))',
    shape: 'nebula',
    aura: 'holographic',
  },
  10: {
    title: 'The Anomaly',
    tier: 4,
    emoji: '🌀',
    color: '#ffffff',
    glowColor: 'rgba(255,255,255,1)',
    borderGrad: 'linear-gradient(135deg, #ffffff, #a0e0ff, #ff80ff, #ffffff)',
    bgGrad: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(0,0,0,0.6))',
    shape: 'singularity',
    aura: 'void-pulse',
  },
};

const getAuraStyle = (aura, color, glowColor) => {
  const baseBoxShadow = `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`;
  const animationStyles = {
    'pulse-green': { animation: 'lvlPulse 2s ease-in-out infinite', boxShadow: baseBoxShadow },
    'shimmer': { animation: 'lvlShimmer 3s ease-in-out infinite', boxShadow: baseBoxShadow },
    'golden-pulse': { animation: 'lvlPulse 1.5s ease-in-out infinite', boxShadow: `0 0 25px ${glowColor}, 0 0 50px ${glowColor}` },
    'rose-shimmer': { animation: 'lvlShimmer 2.5s ease-in-out infinite', boxShadow: baseBoxShadow },
    'neon-pulse': { animation: 'lvlPulse 1s ease-in-out infinite', boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}` },
    'amethyst-levitate': { animation: 'lvlFloat 3s ease-in-out infinite', boxShadow: `0 0 40px ${glowColor}, 0 0 80px ${glowColor}` },
    'holographic': { animation: 'lvlHolo 4s linear infinite', boxShadow: `0 0 50px ${glowColor}` },
    'void-pulse': { animation: 'lvlVoid 2s ease-in-out infinite', boxShadow: `0 0 60px ${glowColor}, 0 0 120px ${glowColor}` },
    'none': {},
  };
  return animationStyles[aura] || {};
};

const CSS_ANIMATIONS = `
@keyframes lvlPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}
@keyframes lvlShimmer {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.4); }
}
@keyframes lvlFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
@keyframes lvlHolo {
  0% { filter: hue-rotate(0deg) brightness(1.2); }
  100% { filter: hue-rotate(360deg) brightness(1.2); }
}
@keyframes lvlVoid {
  0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
  50% { opacity: 0.6; transform: scale(1.08) rotate(5deg); }
}
`;

// Simple Hexagon clip using CSS border trick (no SVG needed)
const getShapeClipPath = (shape) => {
  const shapes = {
    hexagon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    shield: 'polygon(0% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%)',
    crystal: 'polygon(50% 0%, 80% 20%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 20%)',
    crown: 'polygon(0% 100%, 0% 40%, 20% 60%, 35% 0%, 50% 50%, 65% 0%, 80% 60%, 100% 40%, 100% 100%)',
  };
  return shapes[shape] || 'circle(50%)';
};

const LevelBadge = ({ level = 1, size = 'medium', showTitle = true }) => {
  const config = LEVEL_CONFIG[Math.min(Math.max(level, 1), 10)] || LEVEL_CONFIG[1];
  const auraStyle = getAuraStyle(config.aura, config.color, config.glowColor);

  const sizes = {
    small: { badge: 48, emoji: '1.5rem', title: '0.6rem', labelSize: '0.55rem' },
    medium: { badge: 80, emoji: '2.2rem', title: '0.8rem', labelSize: '0.65rem' },
    large: { badge: 120, emoji: '3rem', title: '1rem', labelSize: '0.75rem' },
  };
  const s = sizes[size] || sizes.medium;

  const tierLabels = { 1: 'IRON', 2: 'SILVER', 3: 'GOLD', 4: 'VOID' };

  return (
    <>
      <style>{CSS_ANIMATIONS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
        {/* Outer Glow Wrapper */}
        <div style={{
          width: s.badge,
          height: s.badge,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...auraStyle,
        }}>
          {/* Gradient Border Layer */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: config.shape === 'shield' || config.shape === 'crown' ? '8px' : '50%',
            background: config.borderGrad,
            clipPath: getShapeClipPath(config.shape),
            padding: '2px',
          }} />
          {/* Inner Badge Body */}
          <div style={{
            position: 'absolute',
            inset: '3px',
            borderRadius: config.shape === 'shield' || config.shape === 'crown' ? '6px' : '50%',
            background: config.bgGrad,
            clipPath: getShapeClipPath(config.shape),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            fontSize: s.emoji,
          }}>
            {config.emoji}
          </div>
        </div>

        {showTitle && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: s.labelSize, fontWeight: 800, color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>
              {tierLabels[config.tier]} TIER
            </div>
            <div style={{ fontSize: s.title, fontWeight: 700, color: config.color, letterSpacing: '0.5px' }}>
              {config.title}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export { LEVEL_CONFIG };
export default LevelBadge;
