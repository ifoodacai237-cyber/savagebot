import { createWriteStream, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPTS_DIR = path.join(__dirname, '../../data/transcripts');

try { mkdirSync(TRANSCRIPTS_DIR, { recursive: true }); } catch {}

export async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();

  const rows = sorted.map(m => {
    const time = new Date(m.createdTimestamp).toLocaleString('pt-BR');
    const attachments = m.attachments.map(a => `<a href="${a.url}" target="_blank">[Anexo: ${a.name}]</a>`).join(' ');
    const embeds = m.embeds.length ? `<span class="embed">[${m.embeds.length} embed(s)]</span>` : '';
    const content = m.content
      ? m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : '<i style="opacity:.5">sem texto</i>';

    return `
      <div class="msg ${m.author.bot ? 'bot' : ''}">
        <img class="avatar" src="${m.author.displayAvatarURL({ size: 32 })}" alt="avatar">
        <div class="bubble">
          <span class="author">${m.author.tag}</span>
          <span class="time">${time}</span>
          <p>${content} ${attachments} ${embeds}</p>
        </div>
      </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Transcript — #${channel.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1e1f22; color: #dcddde; font-family: 'Segoe UI', sans-serif; padding: 24px; }
  h1 { color: #fff; font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid #3f4147; padding-bottom: 12px; }
  .msg { display: flex; gap: 12px; margin-bottom: 12px; }
  .msg.bot .bubble { background: #2b2d31; }
  .avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
  .bubble { background: #313338; border-radius: 8px; padding: 10px 14px; max-width: 820px; }
  .author { font-weight: 700; color: #5865f2; margin-right: 8px; }
  .time { font-size: .75rem; color: #72767d; }
  p { margin-top: 4px; line-height: 1.5; word-break: break-word; }
  a { color: #00aff4; }
  .embed { background: #5865f2; border-radius: 4px; padding: 2px 6px; font-size: .8rem; color: #fff; }
</style>
</head>
<body>
<h1>📋 Transcript — #${channel.name}</h1>
${rows}
</body>
</html>`;

  const filename = `ticket-${channel.id}-${Date.now()}.html`;
  const filepath = path.join(TRANSCRIPTS_DIR, filename);
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(filepath);
    stream.write(html);
    stream.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return filepath;
}
