import { Routes } from 'discord.js';

// ─── Converte uma URL de imagem em data URI base64 (formato exigido pela API) ─

async function urlToDataUri(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não consegui baixar essa imagem (HTTP ${res.status}).`);
  const contentType = res.headers.get('content-type') || 'image/png';
  if (!contentType.startsWith('image/')) throw new Error('O arquivo enviado não é uma imagem válida.');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > 10 * 1024 * 1024) throw new Error('A imagem precisa ter no máximo 10MB.');
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

// ─── Aplica ícone/banner/bio do bot especificamente para um servidor ──────────
// Usa o endpoint PATCH /guilds/{guild.id}/members/@me, que permite que bots
// tenham uma identidade visual (avatar, banner, bio) diferente em cada servidor.

export async function setGuildBotProfile(client, guildId, { avatarUrl, bannerUrl, bio, clearAvatar, clearBanner, clearBio } = {}) {
  const body = {};

  if (clearAvatar) body.avatar = null;
  else if (avatarUrl) body.avatar = await urlToDataUri(avatarUrl);

  if (clearBanner) body.banner = null;
  else if (bannerUrl) body.banner = await urlToDataUri(bannerUrl);

  if (clearBio) body.bio = '';
  else if (typeof bio === 'string') body.bio = bio;

  if (Object.keys(body).length === 0) return null;

  return client.rest.patch(Routes.guildMember(guildId, '@me'), { body });
}
