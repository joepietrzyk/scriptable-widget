// Scriptable has no native fetch. The openmeteo SDK needs fetch + arrayBuffer().
// Request.load() returns Data; Data.getBytes() → Uint8Array → .buffer satisfies that.

interface ScriptableHttpResponse {
  statusCode?: number;
}

type MinimalFetchResponse = {
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  json(): Promise<unknown>;
};
type MinimalFetch = (
  url: string,
  init?: Record<string, unknown>,
) => Promise<MinimalFetchResponse>;

(globalThis as typeof globalThis & { fetch: MinimalFetch }).fetch = async (
  url: string,
): Promise<MinimalFetchResponse> => {
  const req = new Request(url); // Scriptable's Request class
  req.timeoutInterval = 10;
  const data = await req.load();
  const resp = req.response as unknown as ScriptableHttpResponse;
  const status = resp.statusCode ?? 200;
  const bytes = new Uint8Array(data.getBytes());
  return {
    status,
    statusText: String(status),
    ok: status >= 200 && status < 300,
    arrayBuffer: () => Promise.resolve(bytes.buffer),
    json: () => Promise.resolve(JSON.parse(data.toRawString()) as unknown),
  };
};
