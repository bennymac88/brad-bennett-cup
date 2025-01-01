import { kv } from '@vercel/kv';

export async function getBets() {
  const players = await kv.get('players');
  const history = await kv.get('history');
  return { players, history };
}

export async function saveBets(players: any, history: any) {
  await kv.set('players', players);
  await kv.set('history', history);
  return { success: true };
}

export async function updatePaymentStatus(entryId: number, paid: boolean) {
  const history = await kv.get('history') as any[];
  const updatedHistory = history.map(entry =>
    entry.id === entryId ? { ...entry, paid } : entry
  );
  await kv.set('history', updatedHistory);
  return { success: true };
}