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

// ─── Detecta plataforma ───────────────────────────────────────────────────────
export function resolveQuery(input) {
  if (/youtube\.com|youtu\.be/i.test(input))  return { platform: 'youtube',    isSearch: false };
  if (/soundcloud\.com/i.test(input))          return { platform: 'soundcloud', isSearch: false };
  if (/spotify\.com/i.test(input))             return { platform: 'spotify',    isSearch: false };
  return { platform: 'search', isSearch: true };
}

// ─── Fetch simples com timeout ────────────────────────────────────────────────
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

// ─── Extrai título de um link do YouTube via oEmbed (sem auth, sem bloqueio) ──
async function youtubeTitleFromOembed(url) {
  try {
    const data = await fetchJson(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      8_000,
    );
    return data?.title ?? null;
  } catch {
    return null;
  }
}

// ─── Extrai título de link Spotify via oEmbed ─────────────────────────────────
async function spotifyTitleFromOembed(url) {
  try {
    const data = await fetchJson(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
      8_000,
    );
    return data?.title ?? null;
  } catch {
    return null;
  }
}

// ─── Busca no SoundCloud via play-dl (funciona em qualquer IP de servidor) ───
async function searchSoundCloud(query, limit = 1) {
  const results = await playdl.search(query, {
    source: { soundcloud: 'tracks' },
    limit,
  });
  if (!results || results.length === 0) throw new Error('Nenhum resultado no SoundCloud.');
  return results[0];
}

// ─── Stream via play-dl (SoundCloud ou YouTube direto) ───────────────────────
async function playdlStream(url) {
  const info = await playdl.stream(url, { quality: 2 });
  return info; // { stream, type }
}

// ─── getTrackInfo: resolve qualquer query → info da faixa ────────────────────
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

  // 2. Link do SoundCloud direto → play-dl info
  if (platform === 'soundcloud') {
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

  // 3. Link do YouTube → tenta play-dl direto; se falhar, busca título no SoundCloud
  if (platform === 'youtube') {
    try {
      const ytInfo = await Promise.race([
        playdl.video_info(rawQuery),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15_000)),
      ]);
      const details = ytInfo?.video_details;
      if (details) {
        return {
          title:    details.title ?? 'Música do YouTube',
          duration: formatDuration(details.durationInSec ?? 0),
          uploader: details.channel?.name ?? 'YouTube',
          thumbnail: details.thumbnails?.[0]?.url ?? null,
          url:      details.url ?? rawQuery,
          platform: 'youtube',
        };
      }
    } catch {
      // YouTube bloqueou o IP — extrai o título via oEmbed e busca no SoundCloud
    }

    const title = await youtubeTitleFromOembed(rawQuery);
    if (title) {
      const sc = await searchSoundCloud(title);
      return {
        title:    `${title} (via SoundCloud)`,
        duration: formatDuration(sc.durationInMs ? Math.round(sc.durationInMs / 1000) : 0),
        uploader: sc.user?.name ?? 'SoundCloud',
        thumbnail: sc.thumbnail ?? null,
        url:      sc.permalink,
        platform: 'soundcloud',
      };
    }

    throw new Error('Não foi possível carregar este vídeo do YouTube. Tente pesquisar pelo nome.');
  }

  // 4. Link do Spotify → extrai título via oEmbed e busca no SoundCloud
  if (platform === 'spotify') {
    const title = await spotifyTitleFromOembed(rawQuery);
    if (!title) throw new Error('Link do Spotify inválido ou privado.');
    const sc = await searchSoundCloud(title);
    return {
      title:    `${title} (via SoundCloud)`,
      duration: formatDuration(sc.durationInMs ? Math.round(sc.durationInMs / 1000) : 0),
      uploader: sc.user?.name ?? 'SoundCloud',
      thumbnail: sc.thumbnail ?? null,
      url:      sc.permalink,
      platform: 'soundcloud',
    };
  }

  throw new Error('Formato não suportado.');
}

// ─── Cria o stream de áudio dependendo da plataforma ──────────────────────────
async function buildAudioResource(url, platform) {
  if (platform === 'soundcloud') {
    const { stream, type } = await playdlStream(url);
    return createAudioResource(stream, { inputType: type });
  }

  if (platform === 'youtube') {
    // Tenta play-dl; fallback para yt-dlp + ffmpeg
    try {
      const { stream, type } = await Promise.race([
        playdlStream(url),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15_000)),
      ]);
      return createAudioResource(stream, { inputType: type });
    } catch {
      // fallback: yt-dlp → ffmpeg
      return buildYtdlpResource(url, platform);
    }
  }

  // fallback geral
  return buildYtdlpResource(url, platform);
}

// ─── Fallback: yt-dlp → ffmpeg (para quando play-dl falha) ──────────────────
function buildYtdlpResource(url, platform) {
  const ytdlpArgs = [
    '--no-playlist', '--no-warnings', '-o', '-',
    '--socket-timeout', '15',
    '--extractor-args', 'youtube:player_client=tv_embedded,ios',
    '--format', 'bestaudio/best',
    url,
  ];

  const ytdlp = spawn('yt-dlp', ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  ytdlp.stderr.on('data', d => {
    const m = d.toString().trim();
    if (m && !m.includes('[download]') && !m.includes('[info]'))
      console.error('[MUSIC yt-dlp]', m.slice(0, 200));
  });

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error', '-i', 'pipe:0', '-vn',
    '-c:a', 'libopus', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-f', 'ogg', 'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpeg.stderr.on('data', d => {
    const m = d.toString().trim();
    if (m) console.error('[MUSIC FFmpeg]', m.slice(0, 200));
  });

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ytdlp.on('close', () => { try { ffmpeg.stdin.end(); } catch {} });
  ffmpeg.stdout.on('error', () => {});

  return createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus });
}

// ─── Formato de duração ───────────────────────────────────────────────────────
function formatDuration(secs) {
  if (!secs || secs <= 0) return 'Desconhecido';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
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
    this._procs         = null;
    this._stopped       = false;

    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this._stopped) {
        console.log('[MUSIC] Reprodução encerrada (idle).');
        this._cleanup();
      }
    });

    this.player.on('error', err => {
      console.error('[MUSIC] Player error:', err.message);
      this._cleanup();
    });
  }

  _cleanup() {
    if (this._procs) {
      try { this._procs.ytdlp.kill('SIGKILL'); } catch {}
      try { this._procs.ffmpeg.kill('SIGKILL'); } catch {}
      this._procs = null;
    }
  }

  async play(url, info) {
    this._cleanup();
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
    this._cleanup();
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
    existing._cleanup();
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
      else if (connection.state.status !== VoiceConnectionStatus.Destroyed)
        try { connection.destroy(); } catch {}
    }
  });

  const session = new MusicSession({ connection, guildId: guild.id });
  musicSessions.set(guild.id, session);
  return session;
}
