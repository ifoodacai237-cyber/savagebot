export const BANNERS = [
  {
    key: 'galaxy',
    name: '🌌 Galáxia Roxa',
    description: 'Nebulosas e estrelas em tons de roxo profundo. Um fundo cósmico deslumbrante.',
    price: 2500,
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=80',
    gradient: ['#1a0533', '#4a1a8a'],
    emoji: '🌌',
  },
  {
    key: 'neon',
    name: '🏙️ Cidade Neon',
    description: 'Skyline cyberpunk iluminada por luzes neon vibrantes na noite.',
    price: 3000,
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1200&q=80',
    gradient: ['#0a0a1a', '#1a0040'],
    emoji: '🏙️',
  },
  {
    key: 'ocean',
    name: '🌊 Oceano Profundo',
    description: 'As profundezas do mar em azul intenso, calmo e misterioso.',
    price: 2000,
    imageUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&q=80',
    gradient: ['#001433', '#0033aa'],
    emoji: '🌊',
  },
  {
    key: 'sakura',
    name: '🌸 Sakura',
    description: 'Flores de cerejeira japonesas dançando ao vento da primavera.',
    price: 1800,
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1200&q=80',
    gradient: ['#4a0020', '#cc4488'],
    emoji: '🌸',
  },
  {
    key: 'aurora',
    name: '✨ Aurora Boreal',
    description: 'As luzes dançantes e hipnotizantes do Ártico iluminando o céu.',
    price: 4000,
    imageUrl: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80',
    gradient: ['#001a0a', '#003322'],
    emoji: '✨',
  },
  {
    key: 'fire',
    name: '🔥 Chamas',
    description: 'Fundo de chamas vibrantes e intensas em tons de laranja e vermelho.',
    price: 2200,
    imageUrl: 'https://images.unsplash.com/photo-1531140523065-f5059fca6b0c?w=1200&q=80',
    gradient: ['#2a0a00', '#aa3300'],
    emoji: '🔥',
  },
  {
    key: 'forest',
    name: '🌲 Floresta Mágica',
    description: 'Uma floresta encantada com raios de luz suave entre as árvores antigas.',
    price: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
    gradient: ['#0a1a0a', '#1a3a1a'],
    emoji: '🌲',
  },
  {
    key: 'sunset',
    name: '🌅 Pôr do Sol',
    description: 'Cores quentes e vibrantes de um pôr do sol perfeito sobre o horizonte.',
    price: 1800,
    imageUrl: 'https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=1200&q=80',
    gradient: ['#1a0a00', '#aa5500'],
    emoji: '🌅',
  },
];

export function getBanner(key) {
  return BANNERS.find(b => b.key === key) ?? null;
}

export const RING_PRESETS = [
  { key: 'roxo',      label: 'Roxo',       emoji: '🟣', c1: '#c084fc', c2: '#7c3aed' },
  { key: 'azul',      label: 'Azul',       emoji: '🔵', c1: '#60a5fa', c2: '#2563eb' },
  { key: 'verde',     label: 'Verde',      emoji: '🟢', c1: '#4ade80', c2: '#16a34a' },
  { key: 'vermelho',  label: 'Vermelho',   emoji: '🔴', c1: '#f87171', c2: '#dc2626' },
  { key: 'rosa',      label: 'Rosa',       emoji: '🩷', c1: '#f9a8d4', c2: '#ec4899' },
  { key: 'dourado',   label: 'Dourado',    emoji: '🟡', c1: '#fde68a', c2: '#d97706' },
  { key: 'ciano',     label: 'Ciano',      emoji: '🩵', c1: '#67e8f9', c2: '#0891b2' },
  { key: 'branco',    label: 'Branco',     emoji: '⚪', c1: '#f8fafc', c2: '#94a3b8' },
  { key: 'arco_iris', label: 'Arco-íris',  emoji: '🌈', c1: '#f472b6', c2: '#3b82f6' },
  { key: 'preto',     label: 'Preto',      emoji: '⚫', c1: '#6b7280', c2: '#111827' },
];

export function getRing(key) {
  return RING_PRESETS.find(r => r.key === key) ?? null;
}

export function getRingColors(activeRing) {
  if (!activeRing) return { c1: '#c084fc', c2: '#7c3aed' };
  if (activeRing.startsWith('#')) return { c1: activeRing, c2: activeRing };
  const preset = getRing(activeRing);
  return preset ? { c1: preset.c1, c2: preset.c2 } : { c1: '#c084fc', c2: '#7c3aed' };
}
