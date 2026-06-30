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
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

// ─── Detecta plataforma ───────────────────────────────────────────────────────
export function resolveStreamQuery(input) {
  if (/youtube\.com|youtu\.be/i.test(input))  return { platform: 'youtube',    isSearch: false };
  if (/soundcloud\.com/i.test(input))          return { platform: 'soundcloud', isSearch: false };
  if (/spotify\.com/i.test(input))             return { platform: 'spotify',    isSearch: false };
  return { platform: 'search', isSearch: true };
}

// ─── Extrai título de YouTube via oEmbed ─────────────────────────────────────
async function youtubeTitleFromOembed(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: ctrl.signal }
    );
    clearTimeout(t);
    if (!r.ok) return null;
    const d = await r.json();
    return d?.title ?? null;
  } catch { return null; }
}

// ─── Busca no SoundCloud via play-dl ─────────────────────────────────────────
let _scReady = false;
let playdl = null;

async function ensureSoundCloud() {
  if (!playdl) {
    const mod = await import('play-dl');
    playdl = mod.default;
  }
  if (_scReady) return;
  const id = await playdl.getFreeClientID();
  await playdl.setToken({ soundcloud: { client_id: id } });
  _scReady = true;
}

async function searchSoundCloud(query) {
  await ensureSoundCloud();
  const results = await playdl.search(query, {
    source: { soundcloud: 'tracks' },
    limit: 1,
  });
  if (!results || results.length === 0) throw new Error('Sem resultados para: ' + query);
  return results[0];
}

function scToInfo(sc) {
  return {
    title:    sc.name,
    duration: formatDuration(sc.durationInMs ? Math.round(sc.durationInMs / 1000) : 0),
    uploader: sc.user?.name ?? 'SoundCloud',
    thumbnail: sc.thumbnail ?? null,
    url:      sc.permalink,
    platform: 'soundcloud',
  };
}

// ─── Resolve query → info da faixa ───────────────────────────────────────────
export async function getStreamTrackInfo(rawQuery) {
  const { platform, isSearch } = resolveStreamQuery(rawQuery);

  if (isSearch) {
    const sc = await searchSoundCloud(rawQuery);
    return scToInfo(sc);
  }

  if (platform === 'soundcloud') {
    await ensureSoundCloud();
    const info = await playdl.soundcloud(rawQuery);
    return {
      title:    info.name,
      duration: formatDuration(info.durationInMs ? Math.round(info.durationInMs / 1000) : 0),
      uploader: info.user?.name ?? 'SoundCloud',
      thumbnail: info.thumbnail ?? null,
      url:      rawQuery,
      platform: 'soundcloud',
    };
  }

  if (platform === 'youtube') {
    const title = await youtubeTitleFromOembed(rawQuery);
    if (!title) throw new Error('Não foi possível carregar este vídeo do YouTube. Tente pesquisar pelo nome.');
    const sc = await searchSoundCloud(title);
    return scToInfo(sc);
  }

  if (platform === 'spotify') {
    try {
      const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(rawQuery)}`);
      const d = await r.json();
      if (!d?.title) throw new Error('Link do Spotify inválido ou privado.');
      const sc = await searchSoundCloud(d.title);
      return scToInfo(sc);
    } catch (e) { throw new Error('Link do Spotify inválido ou privado.'); }
  }

  throw new Error('Formato não suportado.');
}

// ─── Stream via yt-dlp → ffmpeg ───────────────────────────────────────────────
function buildStreamResource(url) {
  const ytdlp = spawn('yt-dlp', [
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '20',
    '--format', 'bestaudio/best',
    '-o', '-',
    url,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  ytdlp.stderr.on('data', chunk => {
    const line = chunk.toString().trim();
    if (line && !line.startsWith('[download]') && !line.startsWith('[soundcloud]'))
      console.error('[STREAM yt-dlp]', line.slice(0, 200));
  });
  ytdlp.on('error', err => console.error('[STREAM yt-dlp spawn]', err.message));

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
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
      console.log('[STREAM] Transmitindo:', info.title, '|', info.url);
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
