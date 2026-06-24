const REQUIRED_EMOJIS = [
  { name: 'f_3bat',     sourceId: '1420292544255889451', animated: true  },
  { name: 'c_flymoney', sourceId: '997485969303420978',  animated: false },
];

const cache = new Map();

function cdnUrl(id, animated) {
  return `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
}

function fmt(emoji) {
  return emoji.animated
    ? `<a:${emoji.name}:${emoji.id}>`
    : `<:${emoji.name}:${emoji.id}>`;
}

export async function initEmojis(client) {
  try {
    const existing = await client.application.emojis.fetch();

    for (const def of REQUIRED_EMOJIS) {
      const found = existing.find(e => e.name === def.name);

      if (found) {
        cache.set(def.name, fmt(found));
        continue;
      }

      try {
        const url  = cdnUrl(def.sourceId, def.animated);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf  = Buffer.from(await resp.arrayBuffer());
        const ext  = def.animated ? 'gif' : 'png';
        const b64  = `data:image/${ext};base64,${buf.toString('base64')}`;

        const created = await client.application.emojis.create({ name: def.name, attachment: b64 });
        cache.set(def.name, fmt(created));
        console.log(`✅ Emoji registrado na aplicação: ${def.name}`);
      } catch (err) {
        console.warn(`⚠️  Falha ao registrar emoji ${def.name}:`, err.message);
        cache.set(def.name, `<${def.animated ? 'a' : ''}:${def.name}:${def.sourceId}>`);
      }
    }
  } catch (err) {
    console.warn('⚠️  Falha ao inicializar application emojis:', err.message);
    for (const def of REQUIRED_EMOJIS) {
      cache.set(def.name, `<${def.animated ? 'a' : ''}:${def.name}:${def.sourceId}>`);
    }
  }
}

export function getEmoji(name) {
  return cache.get(name) ?? `:${name}:`;
}
