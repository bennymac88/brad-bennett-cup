declare module '@vercel/kv' {
    export interface KvClient {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<void>;
    }

    export function createClient(config: {
        url: string;
        token: string;
    }): KvClient;
}