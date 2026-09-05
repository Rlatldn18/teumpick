import { Capacitor, registerPlugin } from '@capacitor/core';
const Vault = registerPlugin<{
  get(): Promise<{ value?: string }>;
  set(options: { value: string }): Promise<void>;
  clear(): Promise<void>;
}>('SessionVault');
let token = '';
export const native = () => Capacitor.isNativePlatform();
export async function restoreSession() {
  if (native()) {
    try {
      token = (await Vault.get()).value ?? '';
    } catch {
      token = '';
    }
  }
}
export async function saveSession(value?: string) {
  if (!native()) return;
  token = value ?? '';
  if (token) await Vault.set({ value: token });
  else await Vault.clear();
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const base = native()
    ? 'https://platform-pick-sindorim.szmt-36.chatgpt.site'
    : '';
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 20000);
  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (native()) {
      headers['X-Teumpick-Client'] = 'android';
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${base}/api/mobile/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      credentials: native() ? 'omit' : 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const result = (await response.json()) as T & { error?: string };
    if (!response.ok)
      throw new ApiError(
        result.error ?? '요청을 처리하지 못했어요.',
        response.status,
      );
    return result;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      '서버에 연결할 수 없어요. 네트워크 상태를 확인하고 다시 시도해 주세요.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
