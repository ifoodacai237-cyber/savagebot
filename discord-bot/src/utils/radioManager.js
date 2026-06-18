import { spawn } from 'child_process';
import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} from '@discordjs/voice';

// ─── Playlists — SomaFM (streams diretos, 200 OK, sem auth) ──────────────────
// SomaFM é rádio pública gratuita, streams estáveis e acessíveis de qualquer server.

export const PLAYLISTS = {
  lofi: {
    emoji: '🌙',
    name: 'Lo-Fi / Groove',
    streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
    color: 0x5865F2,
    genre: 'Lo-Fi / Ambient',
  },
  deephouse: {
    emoji: '🎧',
    name: 'Deep House',
    streamUrl: 'https://ice2.somafm.com/deepspaceone-128-mp3',
    color: 0x00D4FF,
    genre: 'Deep / Ambient Electronic',
  },
  hiphop: {
    emoji: '🎤',
    name: 'Hip Hop / Rap',
    streamUrl: 'https://ice6.somafm.com/illstreet-128-mp3',
    color: 0x9B59B6,
    genre: 'Hip Hop / Rap',
  },
  eletro: {
    emoji: '⚡',
    name: 'Eletrônica / EDM',
    streamUrl: 'https://ice2.somafm.com/beatblender-128-mp3',
    color: 0x00D4FF,
    genre: 'EDM / Eletrônica',
  },
  pop: {
    emoji: '🎵',
    name: 'Pop Hits',
    streamUrl: 'https://ice2.somafm.com/poptron-128-mp3',
    color: 0xFEE75C,
    genre: 'Pop',
  },
  indie: {
    emoji: '🎸',
    name: 'Indie / Alternative',
    streamUrl: 'https://ice2.somafm.com/indiepop-128-mp3',
    color: 0x2ECC71,
    genre: 'Indie / Alternative',
  },
  soul: {
    emoji: '🖤',
    name: 'R&B / Soul',
    streamUrl: 'https://ice2.somafm.com/lush-128-mp3',
    color: 0x8E44AD,
    genre: 'R&B / Soul / Lush',
  },
  metal: {
    emoji: '🤘',
    name: 'Metal / Rock',
    streamUrl: 'https://ice2.somafm.com/metal-128-mp3',
    color: 0x2C3E50,
    genre: 'Metal / Rock',
  },
  jazz: {
    emoji: '🎷',
    name: 'Jazz / Blues',
    streamUrl: 'https://ice2.somafm.com/sonicuniverse-128-mp3',
    color: 0xF39C12,
    genre: 'Jazz / Blues / Fusion',
  },
  chill: {
    emoji: '🌊',
    name: 'Chill / Relaxante',
    streamUrl: 'https://ice2.somafm.com/fluid-128-mp3',
    color: 0x27AE60,
    genre: 'Chill / Relaxante',
  },
  funk: {
    emoji: '🎉',
    name: 'Dance / Funk',
    streamUrl: 'https://ice2.somafm.com/dronezone-128-mp3',
    color: 0xE67E22,
    genre: 'Ambient / Drone',
  },
  reggae: {
    emoji: '🌴',
    name: 'Reggae / Roots',
    streamUrl: 'https://ice2.somafm.com/reggae-128-mp3',
    color: 0x27AE60,
    genre: 'Reggae',
  },
};

// ─── Spawn FFmpeg para stream de rádio ────────────────────────────────────────

function spawnRadioStream(url) {
  return spawn('ffmpeg', [
    '-loglevel', 'warning',
    '-reconnect',            '1',
    '-reconnect_streamed',   '1',
    '-reconnect_delay_max',  '5',
    '-reconnect_on_network_error', '1',
    '-user_agent', 'Mozilla/5.0 (compatible; RadioBot/1.0)',
    '-i', url,
    '-vn',
    '-ar', '48000',
    '-ac', '2',
    '-f', 's16le',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
}

// ─── Sessão de rádio ──────────────────────────────────────────────────────────

export class RadioSession {
  constructor({ connection, playlistKey, guildId }) {
    this.connection     = connection;
    this.playlistKey    = playlistKey;
    this.playlist       = PLAYLISTS[playlistKey];
    this.guildId        = guildId;
    this.paused         = false;
    this.player         = createAudioPlayer();
    this.controlMessage = null;
    this._ffmpeg        = null;
    this._restarting    = false;
    this._restartCount  = 0;
    this._lastRestartAt = 0;
    this._stopped       = false;

    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this._restarting && !this.paused && !this._stopped) {
        console.log('[RADIO] Stream idle, restarting...');
        this._restart();
      }
    });

    this.player.on('error', err => {
      console.error('[RADIO] Player error:', err.message);
      if (!this._restarting && !this._stopped) this._restart();
    });
  }

  _createResource() {
    if (this._ffmpeg) {
      try { this._ffmpeg.kill('SIGKILL'); } catch {}
      this._ffmpeg = null;
    }
    const proc = spawnRadioStream(this.playlist.streamUrl);
    this._ffmpeg = proc;

    proc.stderr.on('data', d => {
      const msg = d.toString().trim();
      if (msg && !msg.includes('size=') && !msg.includes('time=') && !msg.includes('speed=')) {
        console.log('[RADIO FFmpeg]', msg.slice(0, 120));
      }
    });

    proc.on('close', (code) => {
      console.log(`[RADIO] FFmpeg encerrou com código ${code}`);
      if (code !== 0 && code !== null && !this._restarting && !this.paused && !this._stopped) {
        this._restart();
      }
    });

    proc.stdout.on('error', () => {});

    return createAudioResource(proc.stdout, { inputType: StreamType.Raw });
  }

  async start() {
    try {
      const resource = this._createResource();
      this.player.play(resource);
      return true;
    } catch (err) {
      console.error('[RADIO] start() failed:', err.message);
      return false;
    }
  }

  async _restart() {
    if (this._stopped) return;
    this._restarting = true;

    const now = Date.now();
    if (now - this._lastRestartAt > 60_000) this._restartCount = 0;
    this._lastRestartAt = now;
    this._restartCount++;

    if (this._restartCount > 10) {
      console.error('[RADIO] Muitas tentativas consecutivas — parando sessão.');
      this.stop();
      return;
    }

    const delay = Math.min(1500 * this._restartCount, 12_000);
    console.log(`[RADIO] Tentativa ${this._restartCount}/10, aguardando ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));

    if (this._stopped) return;

    try {
      const resource = this._createResource();
      this.player.play(resource);
      console.log('[RADIO] Stream reiniciado com sucesso.');
    } catch (err) {
      console.error('[RADIO] restart failed:', err.message);
    } finally {
      this._restarting = false;
    }
  }

  skip() {
    this._restartCount = 0;
    this._restart();
  }

  pause() {
    this.player.pause();
    this.paused = true;
  }

  resume() {
    this.player.unpause();
    this.paused = false;
  }

  stop() {
    this._stopped    = true;
    this._restarting = true;
    try { this.player.stop(true); } catch {}
    try { if (this._ffmpeg) this._ffmpeg.kill('SIGKILL'); } catch {}
    try { this.connection.destroy(); } catch {}
    radioSessions.delete(this.guildId);
  }

  get currentTrack() {
    return {
      title:    `📡 ${this.playlist.genre} — Ao Vivo`,
      duration: '🔴 LIVE',
      url:      this.playlist.streamUrl,
    };
  }
}

// ─── Mapa de sessões e factory ────────────────────────────────────────────────

export const radioSessions = new Map();

export async function createRadioSession({ guild, channelId, playlistKey }) {
  const existing = radioSessions.get(guild.id);
  if (existing) {
    try { existing.stop(); } catch {}
    await new Promise(r => setTimeout(r, 800));
  }

  let connection;
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      connection = joinVoiceChannel({
        channelId,
        guildId:        guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf:       true,
        selfMute:       false,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      console.log(`[RADIO] Conectado ao canal (tentativa ${attempt}/${MAX_ATTEMPTS})`);
      break;
    } catch (err) {
      console.error(`[RADIO] Tentativa ${attempt}/${MAX_ATTEMPTS} falhou:`, err.message ?? err);
      try { connection?.destroy(); } catch {}
      connection = undefined;

      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        return null;
      }
    }
  }

  // Handler de reconexão — tolerante a instabilidades momentâneas
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 8_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 8_000),
      ]);
      console.log('[RADIO] Reconectando...');
    } catch {
      if (connection.state.status === VoiceConnectionStatus.Destroyed) return;
      try { connection.destroy(); } catch {}
      const sess = radioSessions.get(guild.id);
      if (sess) {
        sess._stopped = true;
        sess._restarting = true;
        try { if (sess._ffmpeg) sess._ffmpeg.kill('SIGKILL'); } catch {}
        try { sess.player.stop(true); } catch {}
        radioSessions.delete(guild.id);
      }
    }
  });

  const session = new RadioSession({ connection, playlistKey, guildId: guild.id });
  radioSessions.set(guild.id, session);
  return session;
}
