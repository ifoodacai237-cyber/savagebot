/**
 * questRunner.js — automação de Discord Quests via HTTP
 *
 * Baseado em: https://github.com/JhonSmurf/DiscordQuest-Orbs (command.txt)
 *
 * Suporte:
 *   WATCH_VIDEO / WATCH_VIDEO_ON_MOBILE → POST /quests/{id}/video-progress  ✅
 *   PLAY_ACTIVITY                        → POST /quests/{id}/heartbeat       ✅
 *   PLAY_ON_DESKTOP / STREAM_ON_DESKTOP  → requer webpack do client Discord  ❌
 */

const API = 'https://discord.com/api/v9';

const SUPPORTED = ['WATCH_VIDEO', 'WATCH_VIDEO_ON_MOBILE', 'PLAY_ACTIVITY'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────

function headers(token) {
  return {
    'Authorization':    token,
    'Content-Type':     'application/json',
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'X-Discord-Locale': 'en-US',
    'Origin':           'https://discord.com',
    'Referer':          'https://discord.com/channels/@me',
  };
}

async function discordGet(token, path) {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function discordPost(token, path, body) {
  const res = await fetch(`${API}${path}`, {
    method:  'POST',
    headers: headers(token),
    body:    JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  return { status: res.status, body: json };
}

// ─── Buscar quests ────────────────────────────────────────────────────────────

export async function fetchQuests(token) {
  const data = await discordGet(token, '/users/@me/quests');
  // Filtra: matriculado, não concluído, não expirado, tarefa suportada
  return (Array.isArray(data) ? data : []).filter(q => {
    if (!q.user_status?.enrolled_at)   return false;
    if (q.user_status?.completed_at)   return false;
    if (new Date(q.config.expires_at) < new Date()) return false;
    const tasks = Object.keys(q.config.task_config?.tasks ?? q.config.task_config_v2?.tasks ?? {});
    return tasks.some(t => SUPPORTED.includes(t));
  });
}

// ─── Completar WATCH_VIDEO ────────────────────────────────────────────────────

async function completeWatchVideo(token, quest, onProgress) {
  const taskConfig  = quest.config.task_config ?? quest.config.task_config_v2;
  const taskName    = ['WATCH_VIDEO', 'WATCH_VIDEO_ON_MOBILE'].find(t => taskConfig.tasks[t]);
  const secondsNeeded = taskConfig.tasks[taskName].target;
  let   secondsDone   = quest.user_status?.progress?.[taskName]?.value ?? 0;
  const SPEED = 7; // segundos por chunk (igual ao original)

  onProgress(`🎬 Assistindo vídeo... (${Math.ceil((secondsNeeded - secondsDone) / 60)} min restantes)`);

  while (secondsDone < secondsNeeded) {
    const chunk     = Math.min(SPEED, secondsNeeded - secondsDone);
    await sleep(chunk * 1000);

    const timestamp = secondsDone + SPEED + Math.random();
    const { status, body } = await discordPost(token, `/quests/${quest.id}/video-progress`, {
      timestamp: Math.min(secondsNeeded, timestamp),
    });

    if (status === 429) {
      const retry = body?.retry_after ?? 5;
      onProgress(`⏳ Rate limit — aguardando ${retry}s...`);
      await sleep(retry * 1000);
      continue;
    }

    secondsDone = Math.min(secondsNeeded, secondsDone + SPEED);

    const pct = Math.floor((secondsDone / secondsNeeded) * 100);
    onProgress(`🎬 Progresso: ${secondsDone}/${secondsNeeded}s (${pct}%)`);

    if (body.completed_at) break;
  }

  // Garantia final
  if (secondsDone < secondsNeeded) {
    await discordPost(token, `/quests/${quest.id}/video-progress`, { timestamp: secondsNeeded });
  }
}

// ─── Completar PLAY_ACTIVITY ──────────────────────────────────────────────────

async function completePlayActivity(token, quest, dmChannelId, onProgress) {
  const taskConfig    = quest.config.task_config ?? quest.config.task_config_v2;
  const secondsNeeded = taskConfig.tasks['PLAY_ACTIVITY'].target;
  const streamKey     = `call:${dmChannelId}:1`;

  onProgress(`🎮 Iniciando actividade... (${Math.ceil(secondsNeeded / 60)} min)`);

  let progress = quest.user_status?.progress?.PLAY_ACTIVITY?.value ?? 0;

  while (progress < secondsNeeded) {
    const { status, body } = await discordPost(token, `/quests/${quest.id}/heartbeat`, {
      stream_key: streamKey,
      terminal:   false,
    });

    if (status === 429) {
      const retry = body?.retry_after ?? 20;
      onProgress(`⏳ Rate limit — aguardando ${retry}s...`);
      await sleep(retry * 1000);
      continue;
    }

    progress = body?.progress?.PLAY_ACTIVITY?.value ?? progress;
    const pct = Math.floor((progress / secondsNeeded) * 100);
    onProgress(`🎮 Progresso: ${progress}/${secondsNeeded}s (${pct}%)`);

    await sleep(20_000);
  }

  // Terminal heartbeat
  await discordPost(token, `/quests/${quest.id}/heartbeat`, { stream_key: streamKey, terminal: true });
}

// ─── Runner principal ─────────────────────────────────────────────────────────

/**
 * Completa todas as quests suportadas do usuário.
 * @param {string} token          Token do usuário Discord
 * @param {string} dmChannelId    ID do canal DM (usado em PLAY_ACTIVITY)
 * @param {Function} onProgress   Callback(msg) chamado com atualizações de progresso
 * @returns {Promise<{completed: string[], skipped: string[], error: string|null}>}
 */
export async function runQuests(token, dmChannelId, onProgress) {
  const result = { completed: [], skipped: [], error: null };

  let quests;
  try {
    quests = await fetchQuests(token);
  } catch (err) {
    result.error = `Erro ao buscar quests: ${err.message}`;
    return result;
  }

  if (quests.length === 0) {
    result.error = 'Nenhuma quest ativa encontrada para completar.';
    return result;
  }

  onProgress(`📋 ${quests.length} quest(s) encontrada(s).`);

  for (const quest of quests) {
    const name      = quest.config.messages?.quest_name ?? quest.id;
    const taskConfig = quest.config.task_config ?? quest.config.task_config_v2;
    const taskName   = SUPPORTED.find(t => taskConfig.tasks[t] != null);

    onProgress(`\n▶ **${name}** — \`${taskName}\``);

    try {
      if (taskName === 'WATCH_VIDEO' || taskName === 'WATCH_VIDEO_ON_MOBILE') {
        await completeWatchVideo(token, quest, onProgress);
      } else if (taskName === 'PLAY_ACTIVITY') {
        await completePlayActivity(token, quest, dmChannelId, onProgress);
      }
      result.completed.push(name);
      onProgress(`✅ **${name}** concluída!`);
    } catch (err) {
      result.skipped.push(name);
      onProgress(`❌ **${name}** falhou: ${err.message}`);
    }
  }

  return result;
}
