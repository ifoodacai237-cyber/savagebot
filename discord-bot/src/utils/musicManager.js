import { spawn } from 'child_process';
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

// ─── Detecta se é URL ─────────────────────────────────────────────────────────
export function isUrl(str) {
  return /^https?:\/\//i.test(str);
}

// ─── Detecta plataforma e monta a query para yt-dlp ──────────────────────────
export function resolveQuery(input) {
  if (/youtube\.com|youtu\.be/i.test(input)) {
    return { query: input, platform: 'youtube', isSearch: false };
  }
  if (/soundcloud\.com/i.test(input)) {
    return { query: input, platform: 'soundcloud', isSearch: false };
  }
  if (/spotify\.com/i.test(input)) {
    return { query: input, platform: 'spotify', isSearch: false };
  }
  // Texto → busca no YouTube
  return { query: `ytsearch1:${input}`, platform: 'youtube', isSearch: true };
}

// ─── Helper: roda yt-dlp com timeout ─────────────────────────────────────────
function runYtdlp(args, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      return reject(new Error(`yt-dlp não encontrado: ${e.message}`));
    }

    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('error', err => {
      clearTimeout(timer);
      reject(new Error(`yt-dlp spawn error: ${err.message}`));
    });

    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr.trim() || `yt-dlp saiu com código ${code}`));
      }
    });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      reject(new Error('yt-dlp timeout — YouTube pode estar bloqueando este IP'));
    }, timeoutMs);
  });
}

// ─── Args base para YouTube (tv_embedded bypassa rate-limit em servers) ───────
function youtubeArgs() {
  return [
    '--extractor-args', 'youtube:player_client=tv_embedded,ios',
    '--no-check-certificates',
    '--socket-timeout', '15',
  ];
}

// ─── Busca informações da música via yt-dlp ──────────────────────────────────
export async function getTrackInfo(rawQuery) {
  const { query, platform } = resolveQuery(rawQuery);

  const ytdlpQuery = platform === 'spotify'
    ? await resolveSpotifyToYouTube(rawQuery)
    : query;

  const args = [
    '--no-playlist',
    '--print', '%(title)s\n%(duration)s\n%(uploader)s\n%(thumbnail)s\n%(webpage_url)s',
    '--no-warnings',
  ];

  if (platform === 'youtube' || platform === 'spotify') {
    args.push(...youtubeArgs());
    args.push('--format', 'bestaudio[ext=m4a]/bestaudio/best');
  } else {
    args.push('--format', 'bestaudio/best');
    args.push('--socket-timeout', '15');
  }

  args.push(ytdlpQuery);

  const stdout = await runYtdlp(args, 30_000);
  const lines     = stdout.trim().split('\n');
  const title     = lines[0] || 'Música desconhecida';
  const rawDur    = parseInt(lines[1], 10) || 0;
  const uploader  = lines[2] || 'Desconhecido';
  const thumbnail = lines[3] || null;
  const url       = lines[4] || rawQuery;

  const minutes  = Math.floor(rawDur / 60);
  const seconds  = String(rawDur % 60).padStart(2, '0');
  const duration = rawDur > 0 ? `${minutes}:${seconds}` : 'Desconhecido';

  return { title, duration, uploader, thumbnail, url, platform };
}

// ─── Resolve link Spotify → busca no YouTube ─────────────────────────────────
async function resolveSpotifyToYouTube(spotifyUrl) {
  try {
    const out = await runYtdlp([
      '--no-download',
      '--print', '%(track)s %(artist)s',
      '--no-warnings',
      '--socket-timeout', '10',
      spotifyUrl,
    ], 20_000);
    const trackName = out.trim();
    if (trackName && trackName !== 'NA NA') {
      return `ytsearch1:${trackName}`;
    }
  } catch {}
  return `ytsearch1:${spotifyUrl}`;
}

// ─── Stream: yt-dlp → ffmpeg → Discord ───────────────────────────────────────
function spawnMusicStream(url, platform) {
  const ytdlpArgs = [
    '--no-playlist',
    '--no-warnings',
    '-o', '-',
    '--socket-timeout', '15',
  ];

  if (platform === 'youtube' || platform === 'spotify') {
    ytdlpArgs.push(...youtubeArgs());
    ytdlpArgs.push('--format', 'bestaudio[ext=m4a]/bestaudio/best');
  } else {
    ytdlpArgs.push('--format', 'bestaudio/best');
  }

  ytdlpArgs.push(url);

  const ytdlp = spawn('yt-dlp', ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

  ytdlp.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (msg && !msg.includes('[download]') && !msg.includes('[info]')) {
      console.error('[MUSIC yt-dlp]', msg.slice(0, 200));
    }
  });

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-c:a',   'libopus',
    '-b:a',   '128k',
    '-ar',    '48000',
    '-ac',    '2',
    '-f',     'ogg',
    'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpeg.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (msg) console.error('[MUSIC FFmpeg]', msg.slice(0, 200));
  });

  ytdlp.stdout.pipe(ffmpeg.stdin);
  ytdlp.on('close', () => { try { ffmpeg.stdin.end(); } catch {} });

  return { ytdlp, ffmpeg };
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

    const { ytdlp, ffmpeg } = spawnMusicStream(url, info.platform);
    this._procs = { ytdlp, ffmpeg };

    ffmpeg.on('close', code => {
      if (code !== 0 && !this._stopped) {
        console.log(`[MUSIC] FFmpeg saiu (${code})`);
      }
    });

    ffmpeg.stdout.on('error', () => {});

    const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus });
    this.player.play(resource);
    console.log('[MUSIC] Tocando:', info.title);
    return true;
  }

  pause() {
    if (!this.paused) { this.player.pause(); this.paused = true; }
  }

  resume() {
    if (this.paused) { this.player.unpause(); this.paused = false; }
  }

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
      else {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed)
          try { connection.destroy(); } catch {}
      }
    }
  });

  const session = new MusicSession({ connection, guildId: guild.id });
  musicSessions.set(guild.id, session);
  return session;
}
