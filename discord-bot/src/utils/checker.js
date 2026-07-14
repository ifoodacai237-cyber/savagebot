/**
 * checker.js — verifica disponibilidade de username no Discord
 *
 * Usa POST /users/@me/pomelo-attempt com tokens de usuário,
 * seguindo a abordagem do repositório y0f/discord-user-checker.
 *
 * Tokens configurados via secret DISCORD_USER_TOKENS (separados por vírgula ou linha).
 */

const ENDPOINT   = 'https://discord.com/api/v9/users/@me/pomelo-attempt';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const X_SUPER_PROPERTIES = Buffer.from(JSON.stringify({
  os:                 'Windows',
  browser:            'Chrome',
  device:             '',
  system_locale:      'en-US',
  browser_user_agent: USER_AGENT,
  browser_version:    '120.0.0.0',
  os_version:         '10',
  referrer:           '',
  referring_domain:   '',
})).toString('base64');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Pool de tokens ───────────────────────────────────────────────────────────

function loadTokens() {
  const raw = process.env.DISCORD_USER_TOKENS ?? '';
  return raw
    .split(/[\n,]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(value => ({ value, sleepUntil: 0 }));
}

let _tokens = null;

function getTokens() {
  if (!_tokens) _tokens = loadTokens();
  return _tokens;
}

function pickToken() {
  const tokens  = getTokens();
  const now     = Date.now();
  const available = tokens.filter(t => t.sleepUntil <= now);
  if (!available.length) return null;
  // Round-robin simples: pega o que tem o menor sleepUntil
  return available.reduce((a, b) => (a.sleepUntil <= b.sleepUntil ? a : b));
}

// ─── Checagem ─────────────────────────────────────────────────────────────────

export async function isAvailable(username) {
  const tokens = getTokens();
  if (!tokens.length) {
    console.error('[CHECKER] Nenhum token configurado em DISCORD_USER_TOKENS.');
    return null;
  }

  const token = pickToken();
  if (!token) {
    // Todos os tokens em cooldown — aguarda o menor cooldown
    const wait = Math.min(...getTokens().map(t => t.sleepUntil)) - Date.now();
    if (wait > 0) await sleep(wait);
    return isAvailable(username);
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'authority':           'discord.com',
        'accept':              '*/*',
        'accept-language':     'en-US,en;q=0.9',
        'content-type':        'application/json',
        'origin':              'https://discord.com',
        'referer':             'https://discord.com/channels/@me',
        'user-agent':          USER_AGENT,
        'x-super-properties':  X_SUPER_PROPERTIES,
        'authorization':       token.value,
      },
      body: JSON.stringify({ username }),
    });

    // Rate limit
    if (res.status === 429) {
      const retry = Number(res.headers.get('Retry-After') || 5);
      token.sleepUntil = Date.now() + (retry + 0.5) * 1_000;
      console.warn(`[CHECKER] Rate limited — aguardando ${retry}s no token.`);
      return isAvailable(username); // tenta com outro token
    }

    const body = await res.json();

    // 200 com taken
    if (res.status === 200 && typeof body.taken === 'boolean') {
      return !body.taken;
    }

    // 400 com erros de validação
    if (res.status === 400) {
      const errs = body?.errors?.username?._errors ?? [];
      if (errs.some(e => e.code === 'USERNAME_ALREADY_TAKEN')) return false;

      const raw = JSON.stringify(body);
      if (raw.includes('PASSWORD_DOES_NOT_MATCH')) return true; // username livre
      if (raw.includes('BASE_TYPE_BAD_LENGTH'))     return null; // comprimento inválido
    }

    // 401 — token inválido, remove do pool
    if (res.status === 401) {
      console.warn(`[CHECKER] Token inválido/expirado, removendo do pool.`);
      token.sleepUntil = Date.now() + 999_999_999;
      return null;
    }

    return null;
  } catch (err) {
    console.error('[CHECKER] Erro de rede:', err.message);
    return null;
  }
}
