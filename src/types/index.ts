export type AvatarState = 'idle' | 'loading' | 'running' | 'disposed';

export interface AvatarConfig {
  label: string;
  modelPath: string;
  showSidebar: boolean;
}

export interface AvatarSpawnPayload {
  modelPath?: string;
  label?: string;
  manifest?: Record<string, unknown>;
}

export const AVATAR_DEFAULTS: AvatarConfig = {
  label: 'Avatar Dev',
  modelPath: 'assets/nude-feminine.vrm',
  showSidebar: true,
};
