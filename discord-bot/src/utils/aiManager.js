import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const CHAT_MODEL = 'gpt-5.4';
const IMAGE_MODEL = 'gpt-image-1';
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
  if (!openai) throw new Error('A IA ainda não está configurada. Peça a um administrador para configurar a chave da OpenAI.');
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export async function askAI({ guildId, userId, prompt }) {
  ensureConfigured();
  const session = getSession(guildId, userId);
  pushHistory(session, 'user', prompt);

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    max_completion_tokens: 2048,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...session.history],
  });

  const answer = response.choices?.[0]?.message?.content?.trim() || 'Não consegui gerar uma resposta agora, tente novamente.';
  pushHistory(session, 'assistant', answer);
  return answer;
}

// ─── Geração de imagem ────────────────────────────────────────────────────────

export async function generateAIImage({ prompt, size = '1024x1024' }) {
  ensureConfigured();
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size,
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('A OpenAI não retornou nenhuma imagem.');
  return Buffer.from(b64, 'base64');
}

export function isAIConfigured() {
  return !!openai;
}
