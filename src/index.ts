import { isEmbedded } from './bridge/EmbedDetection.js';
import { PostMessageBridge } from './bridge/PostMessageBridge.js';
import { AvatarLifecycle } from './core/AvatarLifecycle.js';
import { AVATAR_DEFAULTS } from './types/index.js';
import type { AvatarConfig, AvatarSpawnPayload } from './types/index.js';

/**
 * BlackBox Avatar — Entry Point
 *
 * Embedded (iframe): waits for avatar_spawn postMessage from World.
 * Standalone (dev): boots immediately with default config + test VRM.
 */
async function boot(): Promise<void> {
  const container = document.getElementById('avatar-container');
  const canvas = document.getElementById('avatar-canvas') as HTMLCanvasElement;

  if (!container || !canvas) {
    throw new Error('Missing #avatar-container or #avatar-canvas elements');
  }

  const bridge = new PostMessageBridge();
  const lifecycle = new AvatarLifecycle(container, canvas);
  lifecycle.setPostMessageBridge(bridge);

  const launchAvatar = async (config: AvatarConfig): Promise<void> => {
    try {
      await lifecycle.spawn(config);
      bridge.sendReady();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Avatar] Fatal:', msg);
      bridge.sendError(msg);
    }
  };

  if (isEmbedded()) {
    bridge.onSpawn(async (payload: AvatarSpawnPayload) => {
      try {
        const config: AvatarConfig = {
          label: payload.label ?? 'Avatar',
          modelPath: payload.modelPath ?? AVATAR_DEFAULTS.modelPath,
          showSidebar: true,
        };
        await launchAvatar(config);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[Avatar] Payload error:', msg);
        bridge.sendError(msg);
      }
    });
    console.log('[Avatar] Embedded mode — waiting for spawn payload...');
  } else {
    console.log('[Avatar] Standalone mode — booting with defaults');
    await launchAvatar({ ...AVATAR_DEFAULTS });
  }
}

window.onerror = (_msg, _src, _line, _col, error): void => {
  console.error('[Avatar] Unhandled error:', error);
};

boot().catch((error) => {
  console.error('[Avatar] Boot failed:', error);
});
