import Groq from 'groq-sdk';

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const CHAT_MODEL = 'llama-3.3-70b-versatile';
const MAX_HISTORY = 12; // mensagens (user+assistant) mantidas por sessão
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de inatividade

// ─── Sessões de conversa (memória curta por usuário+canal) ────────────────────

const sessions = new Map(); // key: `${guildId}:${userId}` → { history: [], lastUsed }

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

function ensureConfigured() {
  if (!groq) throw new Error('A IA ainda não está configurada. Peça a um administrador para configurar a chave do Groq.');
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export async function askAI({ guildId, userId, prompt }) {
  ensureConfigured();
  const session = getSession(guildId, userId);
  pushHistory(session, 'user', prompt);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...session.history.map(msg => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })),
  ];

  const completion = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    max_tokens: 1024,
  });

  const answer = completion.choices?.[0]?.message?.content?.trim() || 'Não consegui gerar uma resposta agora, tente novamente.';
  pushHistory(session, 'assistant', answer);
  return answer;
}

// ─── Geração de imagem via Pollinations AI (gratuito, sem API key) ───────────

export async function generateAIImage({ prompt }) {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true`;

  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Pollinations retornou ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function isAIConfigured() {
  return !!groq;
}
