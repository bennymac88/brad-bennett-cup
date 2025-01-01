import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entryId, paid } = body;
    
    const history = await kv.get('history') as any[];
    const updatedHistory = history.map(entry =>
      entry.id === entryId ? { ...entry, paid } : entry
    );
    
    await kv.set('history', updatedHistory);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
  }
}