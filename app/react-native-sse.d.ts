declare module "react-native-sse" {
  export interface EventSourceEvent {
    type: string;
    data?: string;
    url?: string;
    lastEventId?: string | null;
  }

  export interface EventSourceOptions {
    method?: string;
    timeout?: number;
    timeoutBeforeConnection?: number;
    withCredentials?: boolean;
    headers?: Record<string, string>;
    body?: string;
    debug?: boolean;
    pollingInterval?: number;
    lineEndingCharacter?: string | null;
  }

  export default class EventSource {
    constructor(url: string, options?: EventSourceOptions);
    addEventListener(type: string, listener: (event: EventSourceEvent) => void): void;
    removeEventListener(type: string, listener: (event: EventSourceEvent) => void): void;
    removeAllEventListeners(type?: string): void;
    close(): void;
  }
}