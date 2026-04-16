/**
 * PostMessageBridge — Parent tool (World) ↔ Avatar communication.
 * Depends on: nothing (browser postMessage API)
 * Depended on by: AvatarLifecycle (auth handoff, spawn commands)
 *
 * Incoming: { type: 'auth', userId, username } — NEXUS session credentials
 * Incoming: { type: 'avatar_spawn', payload: AvatarSpawnPayload }
 * Outgoing: avatar_ready, avatar_close, avatar_error, appearance_updated
 */
import type { AvatarSpawnPayload } from '../types/index.js';

type SpawnCallback = (payload: AvatarSpawnPayload) => void;

/** Auth credentials received from World */
export interface AuthCredentials {
  userId: string;
  username?: string;
}

type AuthCallback = (credentials: AuthCredentials) => void;

export class PostMessageBridge {
  private allowedOrigin: string | null;
  private spawnCallback: SpawnCallback | null = null;
  private authCallback: AuthCallback | null = null;
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

      if (data.type === 'auth' && this.authCallback && data.userId) {
        this.authCallback({
          userId: data.userId as string,
          username: (data.username as string) || undefined,
        });
      }

      if (data.type === 'avatar_spawn' && this.spawnCallback && data.payload) {
        this.spawnCallback(data.payload as AvatarSpawnPayload);
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  /** Register callback for auth credentials from World */
  onAuth(callback: AuthCallback): void {
    this.authCallback = callback;
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

  sendAppearanceUpdated(): void {
    window.parent.postMessage({ type: 'appearance_updated', source: 'avatar' }, '*');
  }

  sendError(error: string): void {
    window.parent.postMessage({ type: 'avatar_error', source: 'avatar', error }, '*');
  }

  dispose(): void {
    window.removeEventListener('message', this.messageHandler);
    this.spawnCallback = null;
    this.authCallback = null;
  }
}
