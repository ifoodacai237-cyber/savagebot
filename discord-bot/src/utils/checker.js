/**
 * checker.js — verifica disponibilidade de username no Discord
 *
 * Arquitetura: fila por token (TokenQueue)
 *   - Cada token tem sua própria fila sequencial
 *   - Workers enfileiram requisições; a fila drena uma por vez, com delay adaptativo
 *   - Isso elimina o burst simultâneo que causa cooldown de 60s
 *
 * Endpoints:
 *   Autenticado  → POST /api/v9/users/@me/pomelo-attempt        (por token, rate-limit alto)
 *   Não-autent.  → POST /api/v9/unique-username/username-attempt-unauthed (por IP, mais lento)
 */

const X_SUPER_PROPERTIES =
  'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0Ny4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQ3LjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM3MjA1MCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

const CHECK_URL_AUTHED   = 'https://discord.com/api/v9/users/@me/pomelo-attempt';
const CHECK_URL_UNAUTHED = 'https://discord.com/api/v9/unique-username/username-attempt-unauthed';

// Delay fixo entre requisições por token — NÃO adaptativo.
// O rate-limit do Discord é tratado dormindo o retry-after exato; sem compounding.
const INTER_REQUEST_MS     = 600;   // ms entre cada request num token (~1.6 req/s por token)
const TOKENLESS_INTER_MS   = 4_000; // ms entre requests tokenless (conservador)

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// ─── Requisição HTTP bruta ────────────────────────────────────────────────────

/**
 * @returns {{ status: number, body: object|null, retryAfter: number|null }}
 */
async function rawCheck(url, token, username) {
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: buildHeaders(token),
      body:    JSON.stringify({ username }),
    });

    const retryAfter = res.status === 429
      ? Math.min(parseFloat(res.headers.get('Retry-After') || '5'), 120)
      : null;

    const body = await res.json().catch(() => null);
    return { status: res.status, body, retryAfter };
  } catch (err) {
    console.error('[CHECKER] Erro de rede:', err.message);
    return { status: 0, body: null, retryAfter: null };
  }
}

/** Interpreta o body e retorna true/false/null */
function parseResult(status, body) {
  if (status === 200 && body && typeof body.taken === 'boolean') return !body.taken;

  if (status === 400 && body) {
    const errs = body?.errors?.username?._errors ?? [];
    if (errs.some(e => e.code === 'USERNAME_ALREADY_TAKEN')) return false;
    const raw = JSON.stringify(body);
    if (raw.includes('PASSWORD_DOES_NOT_MATCH')) return true;
    if (raw.includes('BASE_TYPE_BAD_LENGTH'))    return null;
  }

  return null;
}

// ─── TokenQueue — fila sequencial por token ────────────────────────────────────

class TokenQueue {
  constructor(tokenValue) {
    this.tokenValue = tokenValue;
    this.dead       = false;
    this._queue     = [];
    this._running   = false;
    this._total     = 0;
    this._ok        = 0;
  }

  /** Enfileira uma checagem e retorna Promise<boolean|null> */
  check(username) {
    return new Promise(resolve => {
      this._queue.push({ username, resolve });
      this._drain();
    });
  }

  _drain() {
    if (this._running || this._queue.length === 0 || this.dead) return;
    this._running = true;
    this._loop().catch(err => {
      console.error(`[TOKEN_QUEUE] Loop encerrado com erro:`, err.message);
      this._running = false;
    });
  }

  async _loop() {
    while (this._queue.length > 0) {
      const { username, resolve } = this._queue.shift();
      const result = await this._check(username);
      resolve(result);
      if (this._queue.length > 0) await sleep(INTER_REQUEST_MS);
    }
    this._running = false;
  }

  async _check(username) {
    this._total++;
    const { status, body, retryAfter } = await rawCheck(CHECK_URL_AUTHED, this.tokenValue, username);

    if (status === 429) {
      // Espera exatamente o retry-after do Discord e retoma na velocidade normal — sem compounding.
      const wait = retryAfter ?? 5;
      console.warn(`[CHECKER:token] 429 — aguardando ${wait}s`);
      await sleep(wait * 1_000);
      return this._check(username);
    }

    if (status === 401) {
      this.dead = true;
      const remaining = _queues.filter(q => !q.dead).length;
      console.warn(`[CHECKER:token] 401 — token morto. Motivo do Discord: ${JSON.stringify(body)}. Restam ${remaining} vivo(s).`);
      return null;
    }

    if (status === 0) {
      await sleep(2_000);
      return null;
    }

    const r = parseResult(status, body);
    if (r !== null) this._ok++;
    return r;
  }

  get stats() {
    return { dead: this.dead, queueLen: this._queue.length, total: this._total, ok: this._ok };
  }
}

// ─── Fila tokenless ───────────────────────────────────────────────────────────

class TokenlessQueue {
  constructor() {
    this._queue   = [];
    this._running = false;
  }

  check(username) {
    return new Promise(resolve => {
      this._queue.push({ username, resolve });
      this._drain();
    });
  }

  _drain() {
    if (this._running || this._queue.length === 0) return;
    this._running = true;
    this._loop().catch(() => { this._running = false; });
  }

  async _loop() {
    while (this._queue.length > 0) {
      const { username, resolve } = this._queue.shift();
      resolve(await this._check(username));
      if (this._queue.length > 0) await sleep(TOKENLESS_INTER_MS);
    }
    this._running = false;
  }

  async _check(username) {
    const { status, body, retryAfter } = await rawCheck(CHECK_URL_UNAUTHED, null, username);
    if (status === 429) {
      const wait = retryAfter ?? 30;
      console.warn(`[CHECKER:tokenless] 429 — aguardando ${wait}s`);
      await sleep(wait * 1_000);
      return this._check(username);
    }
    if (status === 0) { await sleep(3_000); return null; }
    return parseResult(status, body);
  }
}

// ─── Inicialização do pool ────────────────────────────────────────────────────

let _queues          = null;
let _tokenlessQueue  = null;
let _rrIndex         = 0;

function initPool() {
  const raw = process.env.DISCORD_USER_TOKENS ?? '';
  const tokens = raw
    .split(/[\n,]+/)
    .map(t => t.trim())
    .filter(Boolean);

  _queues         = tokens.map(t => new TokenQueue(t));
  _tokenlessQueue = new TokenlessQueue();

  const mode = tokens.length ? `autenticado (pomelo-attempt) — ${tokens.length} token(s)` : 'não-autenticado';
  console.log(`[CHECKER] Pool iniciado: ${mode}`);
}

function getPool() {
  if (!_queues) initPool();
  return _queues;
}

/** Escolhe a fila de token com menor fila de espera (round-robin com balanceamento). */
function pickQueue() {
  const alive = getPool().filter(q => !q.dead);
  if (!alive.length) return null;
  // Escolhe a que tem menor fila
  return alive.reduce((a, b) => a._queue.length <= b._queue.length ? a : b);
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Verifica se um username está disponível.
 * @returns {Promise<boolean|null>} true=disponível, false=tomado, null=erro/inválido
 */
export async function isAvailable(username) {
  getPool(); // garante inicialização
  const q = pickQueue();
  if (q) return q.check(username);
  // Sem tokens vivos → tokenless
  return _tokenlessQueue.check(username);
}

/** Status do pool para /monitor */
export function getTokenPoolStatus() {
  const pool = getPool();
  return {
    total:    pool.length,
    dead:     pool.filter(q => q.dead).length,
    alive:    pool.filter(q => !q.dead).length,
    queues:   pool.map((q, i) => ({ i, ...q.stats })),
    tokenless: { delay: _tokenlessQueue?.delay, queueLen: _tokenlessQueue?._queue.length ?? 0 },
  };
}
