/**
 * NexusInventoryAdapter — Thin Socket.IO client for NEXUS inventory operations.
 * Depends on: socket.io-client, SavedShape (schema)
 * Depended on by: ShapeStore (bidirectional sync), AvatarLifecycle (init)
 *
 * Handles: connect, user_register, inventory_sync, upsert_bodypart, wear_exclusive.
 * Follows the same event signatures as World's NexusInventoryService.
 * See docs/NEXUS-INTEGRATION-SPEC.md for the full contract.
 */
import { io, Socket } from 'socket.io-client';
import type { SavedShape } from '../avatar/ShapeStore.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Inventory item as returned by NEXUS (camelCase, post-mapping) */
export interface NexusInventoryItem {
  id: string;
  name: string;
  assetType: string;
  assetSubtype: string | null;
  isWorn: boolean;
  isFavorite: boolean;
  properties: Record<string, unknown>;
  createdAt?: string;
  modifiedAt?: string;
}

/** Full inventory sync response */
interface InventorySyncResponse {
  items: NexusInventoryItem[];
  folders: unknown[];
  libraryItems: NexusInventoryItem[];
  libraryFolders: unknown[];
}

/** Response from an inventory action */
interface ActionResponse {
  action: string;
  item?: NexusInventoryItem;
  itemId?: string;
  unworn?: string[];
  count?: number;
  error?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'registered';

type StateChangeCallback = (state: ConnectionState) => void;
type SyncCallback = (shapes: NexusInventoryItem[]) => void;

const REQUEST_TIMEOUT_MS = 8000;
const NEXUS_URL = 'https://poqpoq.com';
const NEXUS_PATH = '/nexus/socket.io';

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class NexusInventoryAdapter {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private state: ConnectionState = 'disconnected';
  private onStateChange: StateChangeCallback | null = null;
  private onShapeSync: SyncCallback | null = null;

  /** Register callback for connection state changes */
  onConnectionStateChange(cb: StateChangeCallback): void {
    this.onStateChange = cb;
  }

  /** Register callback for when shapes are synced from NEXUS */
  onShapesReceived(cb: SyncCallback): void {
    this.onShapeSync = cb;
  }

  getState(): ConnectionState {
    return this.state;
  }

  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Connect to NEXUS and register the user session.
   * Call this when userId is received from World via postMessage.
   */
  async connect(userId: string, displayName?: string): Promise<boolean> {
    if (this.socket?.connected) {
      console.warn('[NexusAdapter] Already connected');
      return true;
    }

    this.userId = userId;
    this.setState('connecting');

    return new Promise((resolve) => {
      this.socket = io(NEXUS_URL, {
        path: NEXUS_PATH,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        console.log('[NexusAdapter] Socket connected');
        this.setState('connected');
        // Register user session (same pattern as World client)
        this.socket!.emit('user_register', {
          username: userId,
          displayName: displayName || userId,
          clientInfo: {
            app: 'avatar-editor',
            version: typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0',
          },
        });
      });

      this.socket.on('user_registered', (data: { userId: string }) => {
        console.log(`[NexusAdapter] Registered as ${data.userId}`);
        this.setState('registered');
        resolve(true);
        // Auto-sync inventory on registration
        this.syncInventory();
      });

      this.socket.on('registration_failed', (data: { error: string }) => {
        console.error('[NexusAdapter] Registration failed:', data.error);
        this.setState('disconnected');
        resolve(false);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(`[NexusAdapter] Disconnected: ${reason}`);
        this.setState('disconnected');
      });

      this.socket.on('connect_error', (err: Error) => {
        console.warn('[NexusAdapter] Connection error:', err.message);
        this.setState('disconnected');
        resolve(false);
      });

      // Inventory responses
      this.socket.on('inventory_full', (data: InventorySyncResponse) => {
        this.handleInventoryFull(data);
      });

      this.socket.on('inventory_error', (data: { error: string }) => {
        console.error('[NexusAdapter] Inventory error:', data.error);
      });
    });
  }

  /** Request full inventory sync from NEXUS */
  syncInventory(): void {
    if (!this.socket || this.state !== 'registered') return;
    this.socket.emit('inventory_sync', { userId: this.userId });
    console.log('[NexusAdapter] Inventory sync requested');
  }

  /**
   * Create or update a shape in NEXUS inventory.
   * Returns the NEXUS item (with server-assigned UUID on create).
   */
  async upsertShape(shape: SavedShape, nexusItemId: string | null = null): Promise<NexusInventoryItem | null> {
    return this.sendAction('upsert_bodypart', nexusItemId ?? undefined, {
      name: shape.name,
      assetSubtype: 'shape',
      properties: {
        version: shape.version,
        skeleton_type: shape.skeletonType,
        gender: shape.gender,
        params: shape.params,
        param_count: shape.paramCount,
      },
    });
  }

  /** Wear a shape exclusively (unwears all other shapes) */
  async wearShape(itemId: string): Promise<ActionResponse | null> {
    return this.sendAction('wear_exclusive', itemId, {
      exclusiveSubtype: 'shape',
    }) as Promise<ActionResponse | null>;
  }

  /** Delete an item (soft delete) */
  async deleteItem(itemId: string): Promise<boolean> {
    const result = await this.sendAction('delete', itemId);
    return result !== null;
  }

  /** Rename an item */
  async renameItem(itemId: string, newName: string): Promise<NexusInventoryItem | null> {
    return this.sendAction('rename', itemId, { name: newName });
  }

  /** Toggle favorite on an item */
  async toggleFavorite(itemId: string): Promise<NexusInventoryItem | null> {
    return this.sendAction('favorite', itemId);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.setState('disconnected');
  }

  dispose(): void {
    this.disconnect();
    this.onStateChange = null;
    this.onShapeSync = null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }

  private handleInventoryFull(data: InventorySyncResponse): void {
    // Filter for shape items only (Avatar only cares about bodyparts and clothing)
    const shapes = data.items.filter(
      (item) => item.assetType === 'bodypart' && item.assetSubtype === 'shape',
    );
    console.log(`[NexusAdapter] Inventory synced: ${data.items.length} items, ${shapes.length} shapes`);
    this.onShapeSync?.(shapes);
  }

  private sendAction(
    action: string,
    itemId?: string,
    data?: Record<string, unknown>,
  ): Promise<NexusInventoryItem | null> {
    return new Promise((resolve) => {
      if (!this.socket || this.state !== 'registered') {
        console.warn(`[NexusAdapter] Cannot send action '${action}' — not registered`);
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => {
        console.warn(`[NexusAdapter] Action '${action}' timed out`);
        resolve(null);
      }, REQUEST_TIMEOUT_MS);

      this.socket.emit(
        'inventory_action',
        { action, itemId: itemId ?? null, data: data ?? {} },
        (response: ActionResponse) => {
          clearTimeout(timeout);
          if (response?.error) {
            console.error(`[NexusAdapter] Action '${action}' failed:`, response.error);
            resolve(null);
          } else {
            resolve(response?.item ?? null);
          }
        },
      );
    });
  }
}
