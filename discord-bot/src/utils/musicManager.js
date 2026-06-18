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

// ─── Busca informações da música via yt-dlp ──────────────────────────────────
export async function getTrackInfo(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [
      '--no-playlist',
      '--print', '%(title)s\n%(duration)s\n%(uploader)s\n%(thumbnail)s',
      '--no-warnings',
      url,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || 'yt-dlp falhou'));
        return;
      }
      const lines     = stdout.trim().split('\n');
      const title     = lines[0] || 'Música desconhecida';
      const rawDur    = parseInt(lines[1], 10) || 0;
      const uploader  = lines[2] || 'Desconhecido';
      const thumbnail = lines[3] || null;

      const minutes = Math.floor(rawDur / 60);
      const seconds = String(rawDur % 60).padStart(2, '0');
      const duration = rawDur > 0 ? `${minutes}:${seconds}` : 'Desconhecido';

      resolve({ title, duration, uploader, thumbnail, url });
    });
  });
}

// ─── Cria stream FFmpeg a partir da URL via yt-dlp ───────────────────────────
function spawnMusicStream(url) {
  const ytdlp = spawn('yt-dlp', [
    '--no-playlist',
    '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
    '--no-warnings',
    '-o', '-',
    url,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  ytdlp.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (msg && !msg.includes('[download]')) console.error('[MUSIC yt-dlp]', msg.slice(0, 200));
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

    const { ytdlp, ffmpeg } = spawnMusicStream(url);
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
