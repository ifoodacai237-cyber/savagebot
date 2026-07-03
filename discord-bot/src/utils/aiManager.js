import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const CHAT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
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
  if (!genAI) throw new Error('A IA ainda não está configurada. Peça a um administrador para configurar a chave do Gemini.');
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export async function askAI({ guildId, userId, prompt }) {
  ensureConfigured();
  const session = getSession(guildId, userId);
  pushHistory(session, 'user', prompt);

  const model = genAI.getGenerativeModel({ model: CHAT_MODEL, systemInstruction: SYSTEM_PROMPT });

  const contents = session.history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const result = await model.generateContent({ contents });
  const answer = result.response?.text()?.trim() || 'Não consegui gerar uma resposta agora, tente novamente.';
  pushHistory(session, 'assistant', answer);
  return answer;
}

// ─── Geração de imagem ────────────────────────────────────────────────────────

export async function generateAIImage({ prompt }) {
  ensureConfigured();
  const model = genAI.getGenerativeModel({ model: IMAGE_MODEL });

  const result = await model.generateContent(prompt);
  const parts = result.response?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(p => p.inlineData?.data);

  if (!imagePart) throw new Error('O Gemini não retornou nenhuma imagem.');
  return Buffer.from(imagePart.inlineData.data, 'base64');
}

export function isAIConfigured() {
  return !!genAI;
}
