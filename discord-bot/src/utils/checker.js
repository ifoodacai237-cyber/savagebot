/**
 * checker.js — verifica disponibilidade de username no Discord
 *
 * Baseado em yutomiwana/discord-username-sniper:
 *  - Endpoint: POST /unique-username/username-attempt-unauthed
 *  - Headers completos de browser real (Chrome 147)
 *  - X-Super-Properties atualizado (Chrome 147, build 372050)
 *  - Token de usuário no Authorization (bypass anti-bot)
 *  - Rotação automática de tokens com cooldown por rate-limit
 */

// X-Super-Properties direto do config.json do repo (Chrome 147, build 372050)
const X_SUPER_PROPERTIES =
  'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0Ny4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQ3LjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM3MjA1MCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

const CHECK_URL =
  'https://discord.com/api/v9/unique-username/username-attempt-unauthed';

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
  const now = Date.now();
  const available = getTokens().filter(t => t.sleepUntil <= now);
  if (!available.length) return null;
  return available.reduce((a, b) => (a.sleepUntil <= b.sleepUntil ? a : b));
}

// ─── Headers completos (yutomiwana/discord-username-sniper) ───────────────────

function buildHeaders(token) {
  const h = {
    'Content-Type':        'application/json',
    'User-Agent':          USER_AGENT,
    'Accept':              '*/*',
    'Accept-Language':     'en-US,en;q=0.9',
    'X-Super-Properties':  X_SUPER_PROPERTIES,
    'X-Discord-Locale':    'en-US',
    'Referer':             'https://discord.com/channels/@me',
    'Origin':              'https://discord.com',
    'Sec-Fetch-Dest':      'empty',
    'Sec-Fetch-Mode':      'cors',
    'Sec-Fetch-Site':      'same-origin',
    'Priority':            'u=1, i',
    'Sec-Ch-Ua':           '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    'Sec-Ch-Ua-Mobile':    '?0',
    'Sec-Ch-Ua-Platform':  '"Windows"',
    'X-Debug-Options':     'bugReporterEnabled',
  };

  if (token) h['Authorization'] = token;
  return h;
}

// ─── Checagem principal ───────────────────────────────────────────────────────

export async function isAvailable(username) {
  const tokens = getTokens();

  // Escolhe token disponível (ou null se não tiver)
  const token = tokens.length ? pickToken() : null;

  // Se todos em cooldown, aguarda o menor
  if (tokens.length && !token) {
    const wait = Math.min(...tokens.map(t => t.sleepUntil)) - Date.now();
    if (wait > 0) await sleep(Math.min(wait, 30_000));
    return isAvailable(username);
  }

  try {
    const res = await fetch(CHECK_URL, {
      method:  'POST',
      headers: buildHeaders(token?.value ?? null),
      body:    JSON.stringify({ username }),
    });

    // Rate limit
    if (res.status === 429) {
      const retry = parseFloat(res.headers.get('Retry-After') || '5');
      if (token) {
        token.sleepUntil = Date.now() + (retry + 1) * 1_000;
        console.warn(`[CHECKER] Rate limit — token em cooldown por ${retry}s.`);
        return isAvailable(username); // tenta com outro token
      }
      await sleep(retry * 1_000);
      return null;
    }

    const body = await res.json();

    // 200 — campo taken retornado diretamente
    if (res.status === 200 && typeof body.taken === 'boolean') {
      return !body.taken;
    }

    // 400 — erros de validação do Discord
    if (res.status === 400) {
      const errs = body?.errors?.username?._errors ?? [];
      if (errs.some(e => e.code === 'USERNAME_ALREADY_TAKEN')) return false;

      const raw = JSON.stringify(body);
      if (raw.includes('PASSWORD_DOES_NOT_MATCH')) return true;
      if (raw.includes('BASE_TYPE_BAD_LENGTH'))    return null;
    }

    // 401 — token inválido, desativa do pool
    if (res.status === 401 && token) {
      console.warn('[CHECKER] Token inválido/expirado, removido do pool.');
      token.sleepUntil = Date.now() + 999_999_999;
      return isAvailable(username);
    }

    return null;
  } catch (err) {
    console.error('[CHECKER] Erro de rede:', err.message);
    return null;
  }
}
