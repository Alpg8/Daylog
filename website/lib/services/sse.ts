/**
 * Server-Sent Events (SSE) subscriber registry.
 *
 * Lives in the Node.js module cache so the same Map is shared across all
 * request handlers within a single server process.
 * For multi-instance deployments, replace with a pub-sub layer (Redis, etc.).
 */

type SSEHandler = (data: object) => void;

const subscribers = new Map<string, Set<SSEHandler>>();

/**
 * Register a handler for SSE events directed at `userId`.
 * Returns an unsubscribe function that MUST be called on stream close.
 */
export function subscribeSSE(userId: string, handler: SSEHandler): () => void {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  subscribers.get(userId)!.add(handler);

  return () => {
    const set = subscribers.get(userId);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) subscribers.delete(userId);
  };
}

/**
 * Push a JSON event to all active SSE connections for `userId`.
 */
export function publishSSE(userId: string, data: object): void {
  const set = subscribers.get(userId);
  if (!set || set.size === 0) return;
  for (const handler of set) {
    try {
      handler(data);
    } catch {
      // Handler cleanup is the subscriber's responsibility
    }
  }
}
