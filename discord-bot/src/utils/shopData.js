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
    imageUrl: '__local__fire.jpg',
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

// ── Discord CDN URL refresh ─────────────────────────────────────────────────
// URLs do Discord CDN expiram (parâmetro ?ex=HEX_TIMESTAMP).
// URLs antigas (sem ?ex) também são revogadas pelo Discord.
// Esta função renova via API oficial: POST /attachments/refresh-urls

function isDiscordAttachmentUrl(url) {
  return typeof url === 'string' && url.includes('cdn.discordapp.com/attachments/');
}

function isExpiredOrStale(url) {
  try {
    const ex = new URL(url).searchParams.get('ex');
    if (!ex) return true; // formato antigo sem expiração = provavelmente quebrado
    const expiryMs = parseInt(ex, 16) * 1000;
    return Date.now() > expiryMs - 5 * 60 * 1000; // renova se expira em <5 min
  } catch { return true; }
}

async function refreshDiscordUrl(url) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return url;
  try {
    const res = await fetch('https://discord.com/api/v10/attachments/refresh-urls', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attachment_urls: [url] }),
    });
    if (!res.ok) {
      console.warn(`[banner] refresh-urls HTTP ${res.status}`);
      return url;
    }
    const data = await res.json();
    return data.refreshed_urls?.[0]?.refreshed ?? url;
  } catch (e) {
    console.warn('[banner] refresh-urls erro:', e.message);
    return url;
  }
}

// ── Banner URL helpers ──────────────────────────────────────────────────────
// Always rebuild from the CURRENT domain so stale stored URLs never break.
function getBannerBaseUrl() {
  const domains = process.env.REPLIT_DOMAINS?.split(',').filter(Boolean);
  if (domains?.length) return `https://${domains[0]}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
  return null;
}

// Accepts:
//   - '__local__<filename>'  → file stored on our server
//   - '<filename>'           → bare filename stored by new criar-banner
//   - 'https://...'          → old full URL: extract filename, rebuild with current domain
//                              but only if it points to our own server
export function buildBannerUrl(stored) {
  if (!stored) return null;

  // New format: bare filename (no protocol, no __local__ prefix)
  if (!stored.startsWith('http') && !stored.startsWith('__local__')) {
    const base = getBannerBaseUrl();
    return base ? `${base}/api/public/banners/${stored}` : null;
  }

  // Static banners stored with __local__ prefix
  if (stored.startsWith('__local__')) {
    const filename = stored.replace('__local__', '');
    const base = getBannerBaseUrl();
    return base ? `${base}/api/public/banners/${filename}` : null;
  }

  // Old format: full URL — if it's our own server, extract filename and rebuild
  try {
    const url = new URL(stored);
    const isOwnServer = url.pathname.includes('/api/public/banners/');
    if (isOwnServer) {
      const filename = url.pathname.split('/').pop();
      const base = getBannerBaseUrl();
      return base ? `${base}/api/public/banners/${filename}` : stored;
    }
  } catch {}

  // External URL (Unsplash, Discord CDN, etc.) — use as-is
  return stored;
}

export function getBanner(key) {
  const b = BANNERS.find(b => b.key === key) ?? null;
  if (!b) return null;
  return { ...b, imageUrl: buildBannerUrl(b.imageUrl) };
}

export async function resolveBanner(key, guildId) {
  if (!key) return null;
  const staticB = getBanner(key);
  if (staticB) return staticB;
  if (!guildId) return null;
  try {
    const { default: prisma } = await import('../database/client.js');
    const custom = await prisma.customBanner.findFirst({ where: { key, guildId, active: true } });
    if (!custom) return null;

    let imageUrl = buildBannerUrl(custom.imageUrl);

    // Renova URLs do Discord CDN que expiraram ou usam formato antigo
    if (isDiscordAttachmentUrl(imageUrl) && isExpiredOrStale(imageUrl)) {
      const refreshed = await refreshDiscordUrl(imageUrl);
      if (refreshed && refreshed !== imageUrl) {
        // Salva URL renovada no BD para evitar chamada extra da próxima vez
        try {
          await prisma.customBanner.update({
            where: { id: custom.id },
            data:  { imageUrl: refreshed },
          });
        } catch {}
        imageUrl = refreshed;
        console.log(`[banner] URL renovada: ${custom.key}`);
      }
    }

    return {
      key:         custom.key,
      name:        custom.name,
      description: custom.description ?? '',
      price:       custom.price,
      imageUrl,
      gradient:    [custom.gradient1, custom.gradient2],
      emoji:       custom.emoji,
      isCustom:    true,
    };
  } catch (e) {
    console.error('[banner] resolveBanner erro:', e.message);
    return null;
  }
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
