import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from '@discordjs/voice';
import play from 'play-dl';

export const PLAYLISTS = {
  lofi: {
    emoji: '🌙',
    name: 'Lo-Fi Chill',
    query: 'lofi hip hop chill study beats playlist',
    color: 0x5865F2,
  },
  phonk: {
    emoji: '🔥',
    name: 'Phonk',
    query: 'phonk aggressive drift music mix 2024',
    color: 0xED4245,
  },
  trapbr: {
    emoji: '🇧🇷',
    name: 'Trap BR',
    query: 'trap brasileiro 2024 funk trap nacional',
    color: 0x2ECC71,
  },
  trapusa: {
    emoji: '🌎',
    name: 'Trap USA',
    query: 'trap music usa hip hop 2024 mix',
    color: 0xE67E22,
  },
  black90s: {
    emoji: '🖤',
    name: 'Black 90s/2000s',
    query: 'rnb hip hop 90s 2000s classic hits mix',
    color: 0x8E44AD,
  },
  funk: {
    emoji: '🎉',
    name: 'Funk Nacional',
    query: 'funk carioca brasileiro hits 2024',
    color: 0xF39C12,
  },
  pop: {
    emoji: '🎵',
    name: 'Pop Nacional',
    query: 'pop brasileiro hits 2024',
    color: 0xFEE75C,
  },
  eletro: {
    emoji: '⚡',
    name: 'Eletrônica / EDM',
    query: 'electronic dance music edm mix 2024',
    color: 0x00D4FF,
  },
  rap: {
    emoji: '🎤',
    name: 'Rap Nacional',
    query: 'rap nacional brasileiro 2024 melhores',
    color: 0x9B59B6,
  },
  pagodao: {
    emoji: '🥁',
    name: 'Pagodão / Boteco',
    query: 'pagode samba brasil 2024 boteco',
    color: 0xC0392B,
  },
  rock: {
    emoji: '🎸',
    name: 'Rock Clássico',
    query: 'classic rock hits 70s 80s 90s mix',
    color: 0x2C3E50,
  },
  reggaeton: {
    emoji: '🌴',
    name: 'Reggaeton / Latino',
    query: 'reggaeton latino hits 2024 mix',
    color: 0x27AE60,
  },
};

export class RadioSession {
  constructor({ connection, playlistKey, guildId }) {
    this.connection     = connection;
    this.playlistKey    = playlistKey;
    this.playlist       = PLAYLISTS[playlistKey];
    this.guildId        = guildId;
    this.queue          = [];
    this.currentIndex   = 0;
    this.paused         = false;
    this.player         = createAudioPlayer();
    this.controlMessage = null;
    this._loadingNext   = false;

    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (!this._loadingNext) this._advance();
    });

    this.player.on('error', err => {
      console.error('[RADIO] Player error:', err.message);
      if (!this._loadingNext) this._advance();
    });
  }

  async loadQueue() {
    try {
      const results = await play.search(this.playlist.query, {
        source: { youtube: 'video' },
        limit: 10,
      });
      this.queue = results
        .filter(v => v.url && v.durationInSec > 0 && v.durationInSec < 600)
        .map(v => ({ title: v.title ?? 'Desconhecido', url: v.url, duration: v.durationRaw ?? '?' }));
      if (!this.queue.length) throw new Error('Nenhum resultado válido');
    } catch (err) {
      console.error('[RADIO] Erro ao carregar fila:', err.message);
      this.queue = [];
    }
  }

  async start() {
    await this.loadQueue();
    if (!this.queue.length) return false;
    await this._playIndex(0);
    return true;
  }

  async _advance() {
    this._loadingNext = true;
    try {
      const next = (this.currentIndex + 1) % this.queue.length;
      if (next === 0) await this.loadQueue();
      if (this.queue.length) await this._playIndex(next);
    } catch (err) {
      console.error('[RADIO] Advance error:', err.message);
    } finally {
      this._loadingNext = false;
    }
  }

  async _playIndex(index) {
    if (!this.queue[index]) return;
    this.currentIndex = index;
    try {
      const src = await play.stream(this.queue[index].url, { quality: 2 });
      const res = createAudioResource(src.stream, { inputType: src.type });
      this.player.play(res);
    } catch (err) {
      console.error(`[RADIO] Erro ao tocar ${this.queue[index]?.url}:`, err.message);
      const next = (index + 1) % this.queue.length;
      if (next !== index) {
        this.currentIndex = next;
        await this._playIndex(next);
      }
    }
  }

  async skip() {
    this._loadingNext = true;
    try {
      const next = (this.currentIndex + 1) % this.queue.length;
      if (next === 0) await this.loadQueue();
      if (this.queue.length) await this._playIndex(next);
    } finally {
      this._loadingNext = false;
    }
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
    try { this.player.stop(true); } catch {}
    try { this.connection.destroy(); } catch {}
    radioSessions.delete(this.guildId);
  }

  get currentTrack() {
    return this.queue[this.currentIndex] ?? null;
  }
}

export const radioSessions = new Map();

export async function createRadioSession({ guild, channelId, playlistKey }) {
  const existing = radioSessions.get(guild.id);
  if (existing) {
    try { existing.stop(); } catch {}
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
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (err) {
    console.error('[RADIO] Falha ao entrar no canal:', err.message);
    try { connection?.destroy(); } catch {}
    return null;
  }

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      const sess = radioSessions.get(guild.id);
      if (sess) sess.stop();
    }
  });

  const session = new RadioSession({ connection, playlistKey, guildId: guild.id });
  radioSessions.set(guild.id, session);
  return session;
}
