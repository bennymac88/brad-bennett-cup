import { createClient } from '@vercel/kv';

// Create KV client
export const kv = createClient({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!
});