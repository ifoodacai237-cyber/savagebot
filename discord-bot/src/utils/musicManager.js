import playdl from 'play-dl';
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

// ─── Sessões de música por servidor ──────────────────────────────────────────
export const musicSessions = new Map();

export function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

// ─── Detecta plataforma ───────────────────────────────────────────────────────
export function resolveQuery(input) {
  if (/youtube\.com|youtu\.be/i.test(input))  return { platform: 'youtube',    isSearch: false };
  if (/soundcloud\.com/i.test(input))          return { platform: 'soundcloud', isSearch: false };
  if (/spotify\.com/i.test(input))             return { platform: 'spotify',    isSearch: false };
  return { platform: 'search', isSearch: true };
}

// ─── Formato de duração ───────────────────────────────────────────────────────
function formatDuration(secs) {
  if (!secs || secs <= 0) return 'Desconhecido';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ─── SoundCloud: inicializa client_id automaticamente ────────────────────────
let _scReady = false;

async function ensureSoundCloud() {
  if (_scReady) return;
  const id = await playdl.getFreeClientID();
  await playdl.setToken({ soundcloud: { client_id: id } });
  _scReady = true;
  console.log('[MUSIC] SoundCloud client_id inicializado.');
}

// ─── Fetch JSON com timeout ───────────────────────────────────────────────────
async function fetchJson(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

// ─── Extrai título de YouTube via oEmbed (sem auth, sem bloqueio de IP) ──────
async function youtubeTitleFromOembed(url) {
  try {
    const d = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    return d?.title ?? null;
  } catch { return null; }
}

// ─── Extrai título de Spotify via oEmbed ─────────────────────────────────────
async function spotifyTitleFromOembed(url) {
  try {
    const d = await fetchJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    return d?.title ?? null;
  } catch { return null; }
}

// ─── Busca no SoundCloud via play-dl ─────────────────────────────────────────
async function searchSoundCloud(query) {
  await ensureSoundCloud();
  const results = await playdl.search(query, {
    source: { soundcloud: 'tracks' },
    limit: 1,
  });
  if (!results || results.length === 0) throw new Error('Nenhum resultado no SoundCloud para: ' + query);
  return results[0];
}

// ─── getTrackInfo: resolve qualquer query → info da faixa ────────────────────
export async function getTrackInfo(rawQuery) {
  const { platform, isSearch } = resolveQuery(rawQuery);

  // 1. Texto livre → busca no SoundCloud
  if (isSearch) {
    const sc = await searchSoundCloud(rawQuery);
    return scToInfo(sc);
  }

  // 2. Link do SoundCloud direto
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

  // 3. Link do YouTube → título via oEmbed → SoundCloud
  if (platform === 'youtube') {
    const title = await youtubeTitleFromOembed(rawQuery);
    if (!title) throw new Error('Não foi possível carregar este vídeo do YouTube. Tente pesquisar pelo nome da música.');
    const sc = await searchSoundCloud(title);
    return scToInfo(sc);
  }

  // 4. Link do Spotify → título via oEmbed → SoundCloud
  if (platform === 'spotify') {
    const title = await spotifyTitleFromOembed(rawQuery);
    if (!title) throw new Error('Link do Spotify inválido ou privado.');
    const sc = await searchSoundCloud(title);
    return scToInfo(sc);
  }

  throw new Error('Formato não suportado.');
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

// ─── Stream via yt-dlp → ffmpeg (funciona com SoundCloud no Railway) ──────────
// SoundCloud NÃO bloqueia IPs de servidor. yt-dlp suporta SoundCloud nativamente.
function buildAudioResource(url) {
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
      console.error('[MUSIC yt-dlp]', line.slice(0, 200));
  });
  ytdlp.on('error', err => console.error('[MUSIC yt-dlp spawn]', err.message));

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
    if (line) console.error('[MUSIC ffmpeg]', line.slice(0, 200));
  });
  ffmpeg.stdout.on('error', () => {});
  ffmpeg.stdin.on('error', () => {});

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ytdlp.on('close', code => {
    if (code !== 0 && code !== null) console.error('[MUSIC yt-dlp] saiu com código', code);
    try { ffmpeg.stdin.end(); } catch {}
  });

  return createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus });
}

// ─── Classe de sessão ─────────────────────────────────────────────────────────
export class MusicSession {
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
        console.log('[MUSIC] Reprodução encerrada (idle).');
        musicSessions.delete(this.guildId);
      }
    });

    this.player.on('error', err => {
      console.error('[MUSIC] Player error:', err.message);
      musicSessions.delete(this.guildId);
    });
  }

  async play(url, info) {
    this.trackInfo = info;
    try {
      const resource = buildAudioResource(url);
      this.player.play(resource);
      console.log('[MUSIC] Tocando:', info.title, '|', info.url);
      return true;
    } catch (err) {
      console.error('[MUSIC] play() falhou:', err.message);
      return false;
    }
  }

  pause()  { if (!this.paused) { this.player.pause();   this.paused = true;  } }
  resume() { if (this.paused)  { this.player.unpause(); this.paused = false; } }

  stop() {
    this._stopped = true;
    try { this.player.stop(true); } catch {}
    try { this.connection.destroy(); } catch {}
    musicSessions.delete(this.guildId);
    console.log('[MUSIC] Sessão encerrada:', this.guildId);
  }
}

// ─── Factory: conecta ao canal de voz e cria sessão ──────────────────────────
export async function createMusicSession({ guild, channelId }) {
  const existing = musicSessions.get(guild.id);
  if (existing) {
    existing._stopped = true;
    try { existing.player.stop(true); } catch {}
    musicSessions.delete(guild.id);
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
    console.error('[MUSIC] Falhou ao conectar ao canal:', err.message);
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
      const sess = musicSessions.get(guild.id);
      if (sess) sess.stop();
      else { try { connection.destroy(); } catch {} }
    }
  });

  const session = new MusicSession({ connection, guildId: guild.id });
  musicSessions.set(guild.id, session);
  return session;
}
