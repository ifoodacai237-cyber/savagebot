const REQUIRED_EMOJIS = [
  // ── Originais ──────────────────────────────────────────────────────────────
  { name: 'f_3bat',              sourceId: '1420292544255889451', animated: true  },
  { name: 'c_flymoney',          sourceId: '997485969303420978',  animated: false },
  // ── Moeda principal (usada em todo o bot) ───────────────────────────────────
  { name: 'emoji_1',             sourceId: '1516993823665033286', animated: true  },
  // ── Painel principal ────────────────────────────────────────────────────────
  { name: 'rx_bran',             sourceId: '1531143576556277780', animated: false },
  { name: 's7aaranha',           sourceId: '1527850818743697440', animated: false },
  // ── Economia (/daily, /work, /top) ──────────────────────────────────────────
  { name: 'futecoins',           sourceId: '1526801406378508358', animated: false },
  { name: 'calendario',          sourceId: '1526801404851781742', animated: false },
  { name: '4branco_estrela',     sourceId: '1526801408307761303', animated: false },
  { name: 'relogio',             sourceId: '1526801409595412644', animated: false },
  // ── Jogos (Mines / Blackjack) ────────────────────────────────────────────────
  { name: 'p_bom',               sourceId: '997485486803271720',  animated: false },
  { name: 'Diamante',            sourceId: '1482392803299430451', animated: true  },
  { name: '05_angels',           sourceId: '1510663251598512279', animated: true  },
  { name: 'dinheiro_kingbuxx',   sourceId: '1452430513519198281', animated: false },
  // ── Loja ────────────────────────────────────────────────────────────────────
  { name: 'carrinho',            sourceId: '1384004945820516432', animated: false },
  { name: '01_angels',           sourceId: '1507552059682197504', animated: false },
  { name: '01_angels_animated',  sourceId: '1508985653642395728', animated: true  },
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
