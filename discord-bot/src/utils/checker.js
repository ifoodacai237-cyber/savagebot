/**
 * checker.js — verifica disponibilidade de username no Discord
 *
 * Endpoints:
 *   Autenticado  → POST /api/v9/users/@me/pomelo-attempt        (token obrigatório, rate-limit muito maior)
 *   Não-autent.  → POST /api/v9/unique-username/username-attempt-unauthed (sem token, rate-limit por IP)
 *
 * Lógica:
 *   - Se há tokens disponíveis, usa o endpoint autenticado (muito mais eficiente)
 *   - Se todos os tokens estão em cooldown ou mortos, cai em modo tokenless
 *   - 401 → token removido permanentemente do pool
 *   - 429 → token em cooldown por retry_after (máx 60s), depois tenta outro
 */

const X_SUPER_PROPERTIES =
  'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0Ny4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQ3LjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM3MjA1MCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

// Endpoints — conforme github.com/chemix444/discord-username-scraper
const CHECK_URL_AUTHED   = 'https://discord.com/api/v9/users/@me/pomelo-attempt';
const CHECK_URL_UNAUTHED = 'https://discord.com/api/v9/unique-username/username-attempt-unauthed';

const MAX_COOLDOWN_MS      = 60_000; // máximo que um token fica em cooldown (1 min)
const TOKENLESS_COOLDOWN_MS = 5_000; // cooldown de 429 em modo sem token

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Pool de tokens ────────────────────────────────────────────────────────────

function loadTokens() {
  const raw = process.env.DISCORD_USER_TOKENS ?? '';
  const tokens = raw
    .split(/[\n,]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(value => ({ value, sleepUntil: 0, dead: false }));
  console.log(`[CHECKER] Pool carregado: ${tokens.length} token(s). Endpoint: ${tokens.length ? 'autenticado (pomelo-attempt)' : 'não-autenticado'}`);
  return tokens;
}

let _tokens = null;

function getTokens() {
  if (!_tokens) _tokens = loadTokens();
  return _tokens;
}

/** Retorna o token disponível com menor tempo de espera, ou null se nenhum disponível agora. */
function pickToken() {
  const now = Date.now();
  const alive = getTokens().filter(t => !t.dead);
  if (!alive.length) return null;
  const available = alive.filter(t => t.sleepUntil <= now);
  if (!available.length) return null;
  return available.reduce((a, b) => (a.sleepUntil <= b.sleepUntil ? a : b));
}

/** Quanto tempo até o próximo token estar disponível (ms). 0 se já tem algum. */
function nextTokenAvailableIn() {
  const alive = getTokens().filter(t => !t.dead);
  if (!alive.length) return 0;
  const now = Date.now();
  const soonest = Math.min(...alive.map(t => t.sleepUntil));
  return Math.max(0, soonest - now);
}

// ─── Headers ──────────────────────────────────────────────────────────────────

function buildHeaders(token = null) {
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

/**
 * Verifica se um username está disponível.
 * - Com token → usa endpoint autenticado (pomelo-attempt) — rate-limit muito maior
 * - Sem token → usa endpoint não-autenticado — rate-limit por IP
 * @returns {Promise<boolean|null>} true=disponível, false=tomado, null=erro/inválido
 */
export async function isAvailable(username) {
  const tokens = getTokens();
  const liveTokens = tokens.filter(t => !t.dead);

  // Escolhe token: se todos em cooldown, espera o menor (máx 5s) ou usa tokenless
  let token = liveTokens.length ? pickToken() : null;

  if (liveTokens.length && !token) {
    const wait = nextTokenAvailableIn();
    if (wait <= 5_000) {
      await sleep(wait);
      token = pickToken();
    }
    // Cooldown longo (>5s): usa tokenless agora
  }

  // Com token → endpoint autenticado (muito melhor rate-limit)
  // Sem token → endpoint público não-autenticado
  const checkUrl = token ? CHECK_URL_AUTHED : CHECK_URL_UNAUTHED;

  try {
    const res = await fetch(checkUrl, {
      method:  'POST',
      headers: buildHeaders(token?.value ?? null),
      body:    JSON.stringify({ username }),
    });

    // ── Rate limit ────────────────────────────────────────────────────────────
    if (res.status === 429) {
      let retry = parseFloat(res.headers.get('Retry-After') || '5');
      retry = Math.min(retry, 60);

      if (token) {
        token.sleepUntil = Date.now() + (retry + 0.5) * 1_000;
        console.warn(`[CHECKER] 429 — token em cooldown por ${retry}s. Tentando outro...`);
        const next = pickToken();
        if (next && next !== token) {
          token = next;
          return isAvailable(username);
        }
        await sleep(Math.min(retry * 1_000, TOKENLESS_COOLDOWN_MS));
        return isAvailable(username);
      } else {
        console.warn(`[CHECKER] 429 tokenless — aguardando ${retry}s.`);
        await sleep(retry * 1_000);
        return null;
      }
    }

    const body = await res.json().catch(() => null);
    if (!body) return null;

    // ── 200 → campo taken ─────────────────────────────────────────────────────
    if (res.status === 200 && typeof body.taken === 'boolean') {
      return !body.taken;
    }

    // ── 400 → validação do Discord ────────────────────────────────────────────
    if (res.status === 400) {
      const errs = body?.errors?.username?._errors ?? [];
      if (errs.some(e => e.code === 'USERNAME_ALREADY_TAKEN')) return false;

      const raw = JSON.stringify(body);
      if (raw.includes('PASSWORD_DOES_NOT_MATCH')) return true;
      if (raw.includes('BASE_TYPE_BAD_LENGTH'))    return null;
      console.warn(`[CHECKER] 400 desconhecido para "${username}":`, raw.slice(0, 200));
      return null;
    }

    // ── 401 → token inválido, remove permanentemente ──────────────────────────
    if (res.status === 401 && token) {
      token.dead = true;
      const remaining = tokens.filter(t => !t.dead).length;
      console.warn(`[CHECKER] 401 — token inválido removido. Restam ${remaining} token(s) vivo(s).`);
      return isAvailable(username);
    }

    console.warn(`[CHECKER] Status inesperado ${res.status} para "${username}".`);
    return null;

  } catch (err) {
    console.error('[CHECKER] Erro de rede:', err.message);
    await sleep(2_000);
    return null;
  }
}

/** Retorna status do pool para diagnóstico (/monitor status) */
export function getTokenPoolStatus() {
  const tokens = getTokens();
  const dead    = tokens.filter(t => t.dead).length;
  const cooling = tokens.filter(t => !t.dead && t.sleepUntil > Date.now()).length;
  const ready   = tokens.filter(t => !t.dead && t.sleepUntil <= Date.now()).length;
  return { total: tokens.length, dead, cooling, ready };
}
