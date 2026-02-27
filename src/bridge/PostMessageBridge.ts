import type { AvatarSpawnPayload } from '../types/index.js';

type SpawnCallback = (payload: AvatarSpawnPayload) => void;

/**
 * PostMessage bridge for parent tool (World) ↔ Avatar communication.
 * Adapted from Glitch's PostMessageBridge.
 *
 * Incoming: { type: 'avatar_spawn', payload: AvatarSpawnPayload }
 * Outgoing: avatar_ready, avatar_close, avatar_error
 */
export class PostMessageBridge {
  private allowedOrigin: string | null;
  private spawnCallback: SpawnCallback | null = null;
  private messageHandler: (event: MessageEvent) => void;

  constructor(allowedOrigin?: string) {
    this.allowedOrigin = allowedOrigin ?? null;

    this.messageHandler = (event: MessageEvent): void => {
      if (this.allowedOrigin && event.origin !== this.allowedOrigin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
        return;
      }

      if (data.type === 'avatar_spawn' && this.spawnCallback && data.payload) {
        this.spawnCallback(data.payload as AvatarSpawnPayload);
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  onSpawn(callback: SpawnCallback): void {
    this.spawnCallback = callback;
  }

  sendReady(): void {
    window.parent.postMessage({ type: 'avatar_ready', source: 'avatar' }, '*');
  }

  sendClose(): void {
    window.parent.postMessage({ type: 'avatar_close', source: 'avatar' }, '*');
  }

  sendError(error: string): void {
    window.parent.postMessage({ type: 'avatar_error', source: 'avatar', error }, '*');
  }

  dispose(): void {
    window.removeEventListener('message', this.messageHandler);
    this.spawnCallback = null;
  }
}
