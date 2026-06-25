import "server-only";

export const REDIS_CACHE_READ_TIMEOUT_MS = 500;
export const REDIS_CACHE_WRITE_TIMEOUT_MS = 500;
export const REDIS_SIGNALS_TIMEOUT_MS = 500;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  onTimeout?: () => void,
): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        setTimeout(() => {
          onTimeout?.();
          resolve(fallback);
        }, ms);
      }),
    ]);
  } catch {
    return fallback;
  }
}
