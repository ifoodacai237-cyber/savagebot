/**
 * checker.js — verifica disponibilidade de username no Discord
 */

const DISCORD_API = 'https://discord.com/api/v10';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function isAvailable(username) {
  try {
    const res = await fetch(`${DISCORD_API}/unique-username/username-attempt-unauthed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (res.status === 429) {
      const retry = Number(res.headers.get('Retry-After') || 5);
      await sleep(retry * 1_000);
      return null;
    }

    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.taken === 'boolean') return !data.taken;
    return null;
  } catch {
    return null;
  }
}
