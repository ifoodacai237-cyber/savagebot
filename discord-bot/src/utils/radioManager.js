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

// ─── Estações de Rádio ────────────────────────────────────────────────────────

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

// ─── FFmpeg: HTTP MP3 → OGG Opus (sem reencoding no Node.js) ─────────────────

function spawnRadioStream(url) {
  const proc = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-reconnect',                  '1',
    '-reconnect_streamed',         '1',
    '-reconnect_delay_max',        '10',
    '-reconnect_on_network_error', '1',
    '-reconnect_on_http_error',    '5xx,4xx',
    '-user_agent', 'Mozilla/5.0 (compatible; DiscordBot/1.0)',
    '-i', url,
    '-vn',
    '-c:a',   'libopus',
    '-b:a',   '128k',
    '-ar',    '48000',
    '-ac',    '2',
    '-f',     'ogg',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (msg) console.error('[RADIO FFmpeg]', msg.slice(0, 200));
  });

  return proc;
}

// ─── Sessão de Rádio ──────────────────────────────────────────────────────────

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
    this._stopped       = false;
    this._restarting    = false;
    this._restartCount  = 0;
    this._lastRestart   = 0;

    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this._stopped && !this.paused && !this._restarting) {
        console.log('[RADIO] Stream idle — reiniciando...');
        this._restart();
      }
    });

    this.player.on('error', err => {
      console.error('[RADIO] Player error:', err.message);
      if (!this._stopped && !this._restarting) this._restart();
    });
  }

  _killFFmpeg() {
    if (this._ffmpeg) {
      try { this._ffmpeg.kill('SIGKILL'); } catch {}
      this._ffmpeg = null;
    }
  }

  _createResource() {
    this._killFFmpeg();
    const proc = spawnRadioStream(this.playlist.streamUrl);
    this._ffmpeg = proc;

    proc.on('close', code => {
      if (code !== 0 && !this._stopped && !this._restarting) {
        console.log(`[RADIO] FFmpeg saiu (código ${code}) — reiniciando stream...`);
        this._restart();
      }
    });

    proc.stdout.on('error', () => {});

    return createAudioResource(proc.stdout, { inputType: StreamType.OggOpus });
  }

  async start() {
    try {
      const resource = this._createResource();
      this.player.play(resource);
      console.log('[RADIO] Rádio iniciada:', this.playlist.name);
      return true;
    } catch (err) {
      console.error('[RADIO] start() falhou:', err.message);
      return false;
    }
  }

  async _restart() {
    if (this._stopped || this._restarting) return;
    this._restarting = true;

    const now = Date.now();
    if (now - this._lastRestart > 60_000) this._restartCount = 0;
    this._lastRestart = now;
    this._restartCount++;

    if (this._restartCount > 8) {
      console.error('[RADIO] Muitas tentativas — encerrando sessão.');
      this.stop();
      return;
    }

    const delay = Math.min(2000 * this._restartCount, 15_000);
    console.log(`[RADIO] Restart ${this._restartCount}/8 em ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));

    if (this._stopped) return;

    try {
      const resource = this._createResource();
      this.player.play(resource);
      console.log('[RADIO] Stream reiniciado com sucesso.');
    } catch (err) {
      console.error('[RADIO] Restart falhou:', err.message);
    } finally {
      this._restarting = false;
    }
  }

  pause() {
    if (!this.paused) { this.player.pause(); this.paused = true; }
  }

  resume() {
    if (this.paused) { this.player.unpause(); this.paused = false; }
  }

  skip() {
    this._restartCount = 0;
    this._restart();
  }

  stop() {
    this._stopped    = true;
    this._restarting = true;
    try { this.player.stop(true); }  catch {}
    this._killFFmpeg();
    try { this.connection.destroy(); } catch {}
    radioSessions.delete(this.guildId);
    console.log('[RADIO] Sessão encerrada:', this.guildId);
  }

  get currentTrack() {
    return {
      title:    `📡 ${this.playlist.genre} — Ao Vivo`,
      duration: '🔴 LIVE',
      url:      this.playlist.streamUrl,
    };
  }
}

// ─── Mapa de sessões ──────────────────────────────────────────────────────────

export const radioSessions = new Map();

// ─── Factory: conecta ao canal e cria sessão ──────────────────────────────────

export async function createRadioSession({ guild, channelId, playlistKey }) {
  // Para sessão existente (se houver)
  const existing = radioSessions.get(guild.id);
  if (existing) {
    try { existing.stop(); } catch {}
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[RADIO] Conectando ao canal ${channelId}...`);

  // ── Cria a conexão de voz ───────────────────────────────────────────────────
  const connection = joinVoiceChannel({
    channelId,
    guildId:        guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf:       true,
    selfMute:       false,
  });

  // Log de todos os estados para diagnóstico
  connection.on('stateChange', (oldState, newState) => {
    console.log(`[RADIO] Conexão: ${oldState.status} → ${newState.status}`);
  });

  // ── Aguarda a conexão ficar Ready (SEM handler de Disconnected ainda) ────────
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 25_000);
    console.log('[RADIO] Conexão de voz estabelecida!');
  } catch (err) {
    console.error('[RADIO] Falhou ao conectar ao canal de voz:', err.message);
    try { connection.destroy(); } catch {}
    return null;
  }

  // ── Agora que está Ready, configura o handler de reconexão ───────────────────
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    console.log('[RADIO] Desconectado — tentando reconectar...');
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 6_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 6_000),
      ]);
      console.log('[RADIO] Reconexão em progresso...');
    } catch {
      console.error('[RADIO] Reconexão falhou — encerrando sessão.');
      if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
        try { connection.destroy(); } catch {}
      }
      const sess = radioSessions.get(guild.id);
      if (sess) {
        sess._stopped    = true;
        sess._restarting = true;
        sess._killFFmpeg?.();
        try { sess.player.stop(true); } catch {}
        radioSessions.delete(guild.id);
      }
    }
  });

  // ── Cria e armazena a sessão ─────────────────────────────────────────────────
  const session = new RadioSession({ connection, playlistKey, guildId: guild.id });
  radioSessions.set(guild.id, session);
  return session;
}
