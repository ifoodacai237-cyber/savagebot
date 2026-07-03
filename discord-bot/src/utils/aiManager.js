// Pollinations AI — gratuito, sem API key, suporta texto e imagem

const TEXT_API = 'https://text.pollinations.ai/';
const IMAGE_API = 'https://image.pollinations.ai/prompt/';

const MAX_HISTORY = 12;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

// ─── Sessões de conversa ────────────────────────────────────────────────────

const sessions = new Map();

function sessionKey(guildId, userId) {
  return `${guildId ?? 'dm'}:${userId}`;
}

function getSession(guildId, userId) {
  const key = sessionKey(guildId, userId);
  const now = Date.now();
  let session = sessions.get(key);
  if (session && now - session.lastUsed > SESSION_TTL_MS) {
    sessions.delete(key);
    session = null;
  }
  if (!session) {
    session = { history: [] };
    sessions.set(key, session);
  }
  session.lastUsed = now;
  return session;
}

export function resetSession(guildId, userId) {
  sessions.delete(sessionKey(guildId, userId));
}

function pushHistory(session, role, content) {
  session.history.push({ role, content });
  if (session.history.length > MAX_HISTORY) {
    session.history.splice(0, session.history.length - MAX_HISTORY);
  }
}

const SYSTEM_PROMPT =
  'Você é a IA do Fallen Bot, um assistente de Discord simpático, direto e útil. ' +
  'Responda em português do Brasil por padrão, seja conciso mas completo, e use formatação Markdown do Discord quando ajudar ' +
  '(negrito, listas, blocos de código). Se o usuário pedir para desenhar, gerar ou criar uma imagem, você não gera a imagem ' +
  'diretamente pelo chat — apenas responda normalmente ao pedido, pois a geração de imagem é tratada separadamente pelo sistema.';

// ─── Chat via Pollinations Text ─────────────────────────────────────────────

export async function askAI({ guildId, userId, prompt }) {
  const session = getSession(guildId, userId);
  pushHistory(session, 'user', prompt);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...session.history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  let answer;
  try {
    const res = await fetch(TEXT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Pollinations texto retornou ${res.status}`);
    answer = (await res.text()).trim();
    if (!answer) throw new Error('Resposta vazia da Pollinations');
  } finally {
    clearTimeout(timer);
  }

  pushHistory(session, 'assistant', answer);
  return answer;
}

// ─── Geração de imagem via Pollinations Image ────────────────────────────────

export async function generateAIImage({ prompt }) {
  const encoded = encodeURIComponent(prompt);
  const url = `${IMAGE_API}${encoded}?width=1024&height=1024&nologo=true&model=flux&seed=${Math.floor(Math.random() * 99999)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Pollinations imagem retornou ${res.status}`);

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      const text = await res.text();
      throw new Error(`Resposta inesperada: ${text.slice(0, 200)}`);
    }

    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

// Sempre configurado — não precisa de API key
export function isAIConfigured() {
  return true;
}
