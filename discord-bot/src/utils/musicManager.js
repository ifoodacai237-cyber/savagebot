import { spawn } from 'child_process';
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

// ─── Sessões de música por servidor ──────────────────────────────────────────
export const musicSessions = new Map();

export function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

// ─── SoundCloud: inicializa client_id automaticamente ────────────────────────
let _scReady = false;
async function ensureSoundCloud() {
  if (_scReady) return;
  try {
    const id = await playdl.getFreeClientID();
    await playdl.setToken({ soundcloud: { client_id: id } });
    _scReady = true;
    console.log('[MUSIC] SoundCloud client_id obtido com sucesso.');
  } catch (err) {
    console.error('[MUSIC] Falha ao obter client_id do SoundCloud:', err.message);
    throw new Error('Não foi possível conectar ao SoundCloud. Tente novamente em instantes.');
  }
}

// ─── Detecta plataforma ───────────────────────────────────────────────────────
export function resolveQuery(input) {
  if (/youtube\.com|youtu\.be/i.test(input))  return { platform: 'youtube',    isSearch: false };
  if (/soundcloud\.com/i.test(input))          return { platform: 'soundcloud', isSearch: false };
  if (/spotify\.com/i.test(input))             return { platform: 'spotify',    isSearch: false };
  return { platform: 'search', isSearch: true };
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

// ─── Extrai título via YouTube oEmbed (sem auth) ──────────────────────────────
async function youtubeTitleFromOembed(url) {
  try {
    const data = await fetchJson(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      8000,
    );
    return data?.title ?? null;
  } catch {
    return null;
  }
}

// ─── Extrai título via Spotify oEmbed ────────────────────────────────────────
async function spotifyTitleFromOembed(url) {
  try {
    const data = await fetchJson(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      8000,
    );
    return data?.title ?? null;
  } catch {
    return null;
  }
}

// ─── Busca no SoundCloud ──────────────────────────────────────────────────────
async function searchSoundCloud(query) {
  await ensureSoundCloud();
  const results = await playdl.search(query, {
    source: { soundcloud: 'tracks' },
    limit: 1,
  });
  if (!results || results.length === 0) throw new Error('Nenhum resultado encontrado no SoundCloud para: ' + query);
  return results[0];
}

// ─── Stream via play-dl ───────────────────────────────────────────────────────
async function playdlStream(url) {
  await ensureSoundCloud();
  return playdl.stream(url, { quality: 2 });
}

// ─── Formato de duração ───────────────────────────────────────────────────────
function formatDuration(secs) {
  if (!secs || secs <= 0) return 'Desconhecido';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ─── getTrackInfo: resolve qualquer query para info da faixa ─────────────────
export async function getTrackInfo(rawQuery) {
  const { platform, isSearch } = resolveQuery(rawQuery);

  // 1. Pesquisa de texto → SoundCloud
  if (isSearch) {
    const sc = await searchSoundCloud(rawQuery);
    return {
      title:    sc.name,
      duration: formatDuration(sc.durationInMs ? Math.round(sc.durationInMs / 1000) : 0),
      uploader: sc.user?.name ?? 'SoundCloud',
      thumbnail: sc.thumbnail ?? null,
      url:      sc.permalink,
      platform: 'soundcloud',
    };
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
      url:      info.permalink,
      platform: 'soundcloud',
    };
  }

  // 3. Link do YouTube → oEmbed para título → busca no SoundCloud
  if (platform === 'youtube') {
    const title = await youtubeTitleFromOembed(rawQuery);
    if (title) {
      const sc = await searchSoundCloud(title);
      return {
        title:    sc.name,
        duration: formatDuration(sc.durationInMs ? Math.round(sc.durationInMs / 1000) : 0),
        uploader: sc.user?.name ?? 'SoundCloud',
        thumbnail: sc.thumbnail ?? null,
        url:      sc.permalink,
        platform: 'soundcloud',
      };
    }
    throw new Error('Não foi possível carregar este vídeo do YouTube. Tente pesquisar pelo nome da música.');
  }

  // 4. Link do Spotify → oEmbed para título → busca no SoundCloud
  if (platform === 'spotify') {
    const title = await spotifyTitleFromOembed(rawQuery);
    if (!title) throw new Error('Link do Spotify inválido ou privado.');
    const sc = await searchSoundCloud(title);
    return {
      title:    sc.name,
      duration: formatDuration(sc.durationInMs ? Math.round(sc.durationInMs / 1000) : 0),
      uploader: sc.user?.name ?? 'SoundCloud',
      thumbnail: sc.thumbnail ?? null,
      url:      sc.permalink,
      platform: 'soundcloud',
    };
  }

  throw new Error('Formato não suportado.');
}

// ─── Constrói o AudioResource ─────────────────────────────────────────────────
async function buildAudioResource(url, platform) {
  if (platform === 'soundcloud') {
    const { stream, type } = await playdlStream(url);
    return createAudioResource(stream, { inputType: type });
  }
  // fallback: yt-dlp + ffmpeg
  return buildYtdlpResource(url);
}

// ─── Fallback yt-dlp → ffmpeg ─────────────────────────────────────────────────
function buildYtdlpResource(url) {
  const ytdlp = spawn('yt-dlp', [
    '--no-playlist', '--no-warnings', '-o', '-',
    '--socket-timeout', '15',
    '--extractor-args', 'youtube:player_client=tv_embedded,ios',
    '--format', 'bestaudio/best',
    url,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  ytdlp.stderr.on('data', d => {
    const m = d.toString().trim();
    if (m && !m.includes('[download]') && !m.includes('[info]'))
      console.error('[MUSIC yt-dlp]', m.slice(0, 200));
  });
  ytdlp.on('error', err => console.error('[MUSIC yt-dlp spawn]', err.message));

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error', '-i', 'pipe:0', '-vn',
    '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-f', 'ogg', 'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpeg.stderr.on('data', d => console.error('[MUSIC FFmpeg]', d.toString().trim().slice(0, 200)));
  ffmpeg.stdout.on('error', () => {});

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ytdlp.on('close', () => { try { ffmpeg.stdin.end(); } catch {} });

  return createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus });
}

// ─── Classe de sessão de música ───────────────────────────────────────────────
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
      if (!this._stopped) this._finalize();
    });

    this.player.on('error', err => {
      console.error('[MUSIC] Player error:', err.message);
      this._finalize();
    });
  }

  _finalize() {
    console.log('[MUSIC] Reprodução encerrada.');
    musicSessions.delete(this.guildId);
  }

  async play(url, info) {
    this.trackInfo = info;
    try {
      const resource = await buildAudioResource(url, info.platform);
      this.player.play(resource);
      console.log('[MUSIC] Tocando:', info.title);
      return true;
    } catch (err) {
      console.error('[MUSIC] buildAudioResource falhou:', err.message);
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

// ─── Factory: conecta ao canal e cria sessão ─────────────────────────────────
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
    console.error('[MUSIC] Falhou ao conectar:', err.message);
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
