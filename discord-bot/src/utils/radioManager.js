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

// ─── Playlists (internet radio streams — sem YouTube) ─────────────────────────

export const PLAYLISTS = {
  lofi: {
    emoji: '🌙',
    name: 'Lo-Fi Chill',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    color: 0x5865F2,
    genre: 'Lo-Fi / Estudo',
  },
  phonk: {
    emoji: '🔥',
    name: 'Phonk / Trap',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio18.mp3',
    color: 0xED4245,
    genre: 'Phonk / Trap',
  },
  trapbr: {
    emoji: '🇧🇷',
    name: 'Hip Hop BR',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio5.mp3',
    color: 0x2ECC71,
    genre: 'Hip Hop Nacional',
  },
  trapusa: {
    emoji: '🌎',
    name: 'Hip Hop USA',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio5.mp3',
    color: 0xE67E22,
    genre: 'Hip Hop Internacional',
  },
  black90s: {
    emoji: '🖤',
    name: 'R&B / Soul',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio6.mp3',
    color: 0x8E44AD,
    genre: 'R&B / Soul',
  },
  funk: {
    emoji: '🎉',
    name: 'Dance / Funk',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio1.mp3',
    color: 0xF39C12,
    genre: 'Dance / Funk',
  },
  pop: {
    emoji: '🎵',
    name: 'Pop Hits',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio2.mp3',
    color: 0xFEE75C,
    genre: 'Pop',
  },
  eletro: {
    emoji: '⚡',
    name: 'Eletrônica / EDM',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio1.mp3',
    color: 0x00D4FF,
    genre: 'EDM / Eletrônica',
  },
  rap: {
    emoji: '🎤',
    name: 'Rap / Hip Hop',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio5.mp3',
    color: 0x9B59B6,
    genre: 'Rap',
  },
  pagodao: {
    emoji: '🥁',
    name: 'Latino / Pagode',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio15.mp3',
    color: 0xC0392B,
    genre: 'Latino / Samba',
  },
  rock: {
    emoji: '🎸',
    name: 'Rock Clássico',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio7.mp3',
    color: 0x2C3E50,
    genre: 'Rock',
  },
  reggaeton: {
    emoji: '🌴',
    name: 'Reggaeton / Latino',
    streamUrl: 'https://streams.ilovemusic.de/iloveradio15.mp3',
    color: 0x27AE60,
    genre: 'Reggaeton',
  },
};

// ─── Spawn FFmpeg para stream de rádio ────────────────────────────────────────

function spawnRadioStream(url) {
  return spawn('ffmpeg', [
    '-loglevel', 'error',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-user_agent', 'Mozilla/5.0 (compatible; RadioBot/1.0)',
    '-i', url,
    '-vn',
    '-ar', '48000',
    '-ac', '2',
    '-f', 's16le',
    '-',
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

    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this._restarting && !this.paused) {
        console.log('[RADIO] Stream idle, restarting...');
        this._restart();
      }
    });

    this.player.on('error', err => {
      console.error('[RADIO] Player error:', err.message);
      if (!this._restarting) this._restart();
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
      const msg = d.toString();
      if (!msg.includes('size=') && !msg.includes('time=')) {
        console.log('[RADIO FFmpeg]', msg.trim().slice(0, 100));
      }
    });

    proc.on('close', (code) => {
      if (code !== 0 && code !== null && !this._restarting && !this.paused) {
        console.log('[RADIO] FFmpeg closed with code', code, '— restarting');
        this._restart();
      }
    });

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
    this._restarting = true;
    await new Promise(r => setTimeout(r, 2000));
    try {
      const resource = this._createResource();
      this.player.play(resource);
    } catch (err) {
      console.error('[RADIO] restart failed:', err.message);
    } finally {
      this._restarting = false;
    }
  }

  skip() {
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
    await new Promise(r => setTimeout(r, 500));
  }

  let connection;
  try {
    connection = joinVoiceChannel({
      channelId,
      guildId:        guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf:       true,
      selfMute:       false,
    });

    // Registra handler de desconexão ANTES de aguardar o estado Ready,
    // para que reconexões durante o próprio handshake sejam tratadas.
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Reconectou — ok
      } catch {
        // Falhou → para a sessão se ainda existir
        const sess = radioSessions.get(guild.id);
        if (sess) sess.stop();
      }
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  } catch (err) {
    console.error('[RADIO] Falha ao entrar no canal de voz:', err.message ?? err);
    try { connection?.destroy(); } catch {}
    return null;
  }

  const session = new RadioSession({ connection, playlistKey, guildId: guild.id });
  radioSessions.set(guild.id, session);
  return session;
}
