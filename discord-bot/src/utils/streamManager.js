import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} from '@discordjs/voice';
import { spawn } from 'child_process';

// ─── Sessões de transmissão por servidor ─────────────────────────────────────
export const streamSessions = new Map();

// ─── Formato de duração ───────────────────────────────────────────────────────
function formatDuration(secs) {
  if (!secs || secs <= 0) return 'Desconhecido';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = String(secs % 60).padStart(2, '0');
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m${s}s` : `${m}:${s}`;
}

// ─── Detecta tipo da query ────────────────────────────────────────────────────
export function resolveStreamQuery(input) {
  if (/youtube\.com|youtu\.be/i.test(input))  return { platform: 'youtube',  isSearch: false };
  if (/soundcloud\.com/i.test(input))          return { platform: 'soundcloud', isSearch: false };
  if (/spotify\.com/i.test(input))             return { platform: 'spotify',  isSearch: false };
  if (/^https?:\/\//i.test(input))             return { platform: 'direct',   isSearch: false };
  return { platform: 'youtube', isSearch: true };
}

// ─── Busca/resolve info via yt-dlp (não bloqueia Railway) ────────────────────
export async function getStreamTrackInfo(rawQuery) {
  const { isSearch } = resolveStreamQuery(rawQuery);

  const args = [
    '--no-warnings',
    '--skip-download',
    '--print', '%(title)s\n%(uploader)s\n%(duration)s\n%(thumbnail)s\n%(webpage_url)s',
    '--no-playlist',
    '--socket-timeout', '20',
  ];

  if (isSearch) {
    // Pesquisa no YouTube — pega o primeiro resultado
    args.push(`ytsearch1:${rawQuery}`);
  } else {
    args.push(rawQuery);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';

    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });

    const timeout = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      reject(new Error('Tempo limite atingido ao buscar informações. Tente novamente.'));
    }, 30_000);

    proc.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) {
        const errMsg = err.toLowerCase();
        if (errMsg.includes('private')) return reject(new Error('Vídeo privado ou indisponível.'));
        if (errMsg.includes('age')) return reject(new Error('Conteúdo com restrição de idade.'));
        if (errMsg.includes('not available')) return reject(new Error('Conteúdo não disponível na sua região.'));
        return reject(new Error(`Não foi possível carregar o conteúdo. (código ${code})`));
      }

      const lines = out.trim().split('\n');
      if (lines.length < 5) return reject(new Error('Nenhum resultado encontrado para esta busca.'));

      const [title, uploader, durationRaw, thumbnail, url] = lines;
      const duration = formatDuration(parseInt(durationRaw, 10));

      resolve({ title, uploader, duration, thumbnail, url, platform: 'youtube' });
    });
  });
}

// ─── Stream via yt-dlp → ffmpeg (áudio no canal de voz) ─────────────────────
// Discord bots transmitem ÁUDIO via @discordjs/voice.
// Para vídeo no Go Live, seria necessário uma conta de usuário (selfbot),
// o que viola os Termos de Serviço do Discord.
function buildStreamResource(url) {
  const ytdlp = spawn('yt-dlp', [
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '20',
    '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
    '--retries', '5',
    '--fragment-retries', '5',
    '--extractor-retries', '3',
    '-o', '-',
    url,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  ytdlp.stderr.on('data', chunk => {
    const line = chunk.toString().trim();
    if (line && !line.startsWith('[download]') && !line.startsWith('[youtube]') && !line.startsWith('[info]'))
      console.error('[STREAM yt-dlp]', line.slice(0, 200));
  });
  ytdlp.on('error', err => console.error('[STREAM yt-dlp spawn]', err.message));

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-f', 'ogg',
    'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpeg.stderr.on('data', chunk => {
    const line = chunk.toString().trim();
    if (line) console.error('[STREAM ffmpeg]', line.slice(0, 200));
  });
  ffmpeg.stdout.on('error', () => {});
  ffmpeg.stdin.on('error', () => {});

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ytdlp.on('close', code => {
    if (code !== 0 && code !== null) console.error('[STREAM yt-dlp] saiu com código', code);
    try { ffmpeg.stdin.end(); } catch {}
  });

  return createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus });
}

// ─── Classe de sessão ─────────────────────────────────────────────────────────
export class StreamSession {
  constructor({ connection, guildId }) {
    this.connection     = connection;
    this.guildId        = guildId;
    this.paused         = false;
    this.player         = createAudioPlayer();
    this.controlMessage = null;
    this.trackInfo      = null;
    this._stopped       = false;
    this._ytdlp         = null;
    this._ffmpeg        = null;

    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this._stopped) {
        console.log('[STREAM] Reprodução encerrada (idle).');
        streamSessions.delete(this.guildId);
      }
    });

    this.player.on('error', err => {
      console.error('[STREAM] Player error:', err.message);
      streamSessions.delete(this.guildId);
    });
  }

  async play(url, info) {
    this.trackInfo = info;
    try {
      const resource = buildStreamResource(url);
      this.player.play(resource);
      console.log('[STREAM] Transmitindo:', info.title, '|', url);
      return true;
    } catch (err) {
      console.error('[STREAM] play() falhou:', err.message);
      return false;
    }
  }

  pause()  { if (!this.paused) { this.player.pause();   this.paused = true;  } }
  resume() { if (this.paused)  { this.player.unpause(); this.paused = false; } }

  stop() {
    this._stopped = true;
    try { this.player.stop(true); } catch {}
    try { this.connection.destroy(); } catch {}
    streamSessions.delete(this.guildId);
    console.log('[STREAM] Sessão encerrada:', this.guildId);
  }
}

// ─── Factory: conecta ao canal de voz e cria sessão ──────────────────────────
export async function createStreamSession({ guild, channelId }) {
  const existing = streamSessions.get(guild.id);
  if (existing) {
    existing._stopped = true;
    try { existing.player.stop(true); } catch {}
    streamSessions.delete(guild.id);
  }

  const anyConn = getVoiceConnection(guild.id);
  if (anyConn) {
    try { anyConn.destroy(); } catch {}
    await new Promise(r => setTimeout(r, 600));
  }

  const connection = joinVoiceChannel({
    channelId,
    guildId:        guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf:       true,
    selfMute:       false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 25_000);
  } catch (err) {
    console.error('[STREAM] Falhou ao conectar ao canal:', err.message);
    try { connection.destroy(); } catch {}
    return null;
  }

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      const sess = streamSessions.get(guild.id);
      if (sess) sess.stop();
      else { try { connection.destroy(); } catch {} }
    }
  });

  const session = new StreamSession({ connection, guildId: guild.id });
  streamSessions.set(guild.id, session);
  return session;
}
