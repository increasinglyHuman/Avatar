import type { SkinMaterialManager } from '../avatar/SkinMaterialManager.js';
import { ColorSlotWidget } from './ColorSlotWidget.js';
import {
  SKIN_PRESETS,
  EYE_PRESETS,
  LIP_PRESETS,
} from '../types/index.js';

const STYLE_ID = 'bb-avatar-skin-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.skin-tab { padding-top: 8px; }

.skin-section-header {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.3);
  padding: 12px 0 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.skin-section-header:first-child {
  border-top: none;
  padding-top: 4px;
}

/* Skin texture selector */
.skin-texture-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 6px 0 12px;
}
.skin-texture-card {
  aspect-ratio: 1;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.1s;
  background: rgba(255, 255, 255, 0.04);
}
.skin-texture-card:hover {
  border-color: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}
.skin-texture-card.active {
  border-color: rgba(255, 255, 255, 0.7);
}
.skin-texture-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.skin-texture-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
  padding: 2px 0;
}
`;
  document.head.appendChild(style);
}

/** Available upper body skin textures */
interface SkinTextureOption {
  id: string;
  label: string;
  path: string;
  thumbnail: string; // same as path for now
}

const UPPER_BODY_SKINS: SkinTextureOption[] = [
  {
    id: 'meshy-light-freckle',
    label: 'Light',
    path: 'assets/Meshy_AI_7ff094c01d8cd7f34cb63c3c053fa1451abb297629cca8bebb088645596e5b53.png',
    thumbnail: 'assets/Meshy_AI_7ff094c01d8cd7f34cb63c3c053fa1451abb297629cca8bebb088645596e5b53.png',
  },
  {
    id: 'meshy-medium',
    label: 'Medium',
    path: 'assets/Meshy_AI_0910b9a941bd520a6b49cf518e422664115f36bb27ababdcdbc0cfbfb60969cf.png',
    thumbnail: 'assets/Meshy_AI_0910b9a941bd520a6b49cf518e422664115f36bb27ababdcdbc0cfbfb60969cf.png',
  },
  {
    id: 'meshy-warm-freckle',
    label: 'Warm',
    path: 'assets/Meshy_AI_a05dca24f93cc23cad4fe4274c5a52a655fb5e35dcda8f2dc0d73007b379b4a7.png',
    thumbnail: 'assets/Meshy_AI_a05dca24f93cc23cad4fe4274c5a52a655fb5e35dcda8f2dc0d73007b379b4a7.png',
  },
  {
    id: 'meshy-freckle-heavy',
    label: 'Freckled',
    path: 'assets/Meshy_AI_d0e172066f8559e71745d7f0aa0c7f8dffc25380d9c111b2a4c7a9397b05db28.png',
    thumbnail: 'assets/Meshy_AI_d0e172066f8559e71745d7f0aa0c7f8dffc25380d9c111b2a4c7a9397b05db28.png',
  },
];

/**
 * Skin tab — skin texture selection, skin tint, eye color, nail color.
 */
export class SkinTab {
  private root: HTMLDivElement;
  private manager: SkinMaterialManager | null = null;
  private widgets: Map<string, ColorSlotWidget> = new Map();
  private activeSkinId: string | null = null;

  constructor(container: HTMLElement) {
    injectStyles();
    this.root = document.createElement('div');
    this.root.className = 'tab-content skin-tab';
    container.appendChild(this.root);
  }

  connectManager(manager: SkinMaterialManager): void {
    this.manager = manager;
    this.render();
  }

  show(): void {
    this.root.style.display = 'block';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    for (const w of this.widgets.values()) w.dispose();
    this.widgets.clear();
    this.root.remove();
    this.manager = null;
  }

  private render(): void {
    for (const w of this.widgets.values()) w.dispose();
    this.widgets.clear();
    this.root.innerHTML = '';

    // --- Upper Body Skin Textures ---
    const texHeader = document.createElement('div');
    texHeader.className = 'skin-section-header';
    texHeader.textContent = 'Upper Body Skin';
    this.root.appendChild(texHeader);

    const texGrid = document.createElement('div');
    texGrid.className = 'skin-texture-grid';

    for (const skin of UPPER_BODY_SKINS) {
      const card = document.createElement('div');
      card.className = 'skin-texture-card';
      card.dataset.skinId = skin.id;

      const img = document.createElement('img');
      img.src = skin.thumbnail;
      img.alt = skin.label;
      img.loading = 'lazy';
      card.appendChild(img);

      card.addEventListener('click', () => {
        if (!this.manager) return;
        this.manager.setUpperBodySkin(skin.path);
        this.activeSkinId = skin.id;
        this.updateActiveCard(texGrid);
      });

      texGrid.appendChild(card);

      const label = document.createElement('div');
      label.className = 'skin-texture-label';
      label.textContent = skin.label;
      texGrid.appendChild(label);
    }
    this.root.appendChild(texGrid);

    // --- Skin Tint ---
    const tintWidget = new ColorSlotWidget(this.root, {
      label: 'Skin Tint',
      presets: SKIN_PRESETS,
      initialColor: this.manager?.getSkinTint() ?? '#FFFFFF',
      hasIntensity: false,
      hasTint: false,
      onChange: async (hex) => {
        this.manager?.setSkinTint(hex);
        this.manager?.matchNailsToSkin();
      },
    });
    this.widgets.set('skinTint', tintWidget);

    // --- Eye Color ---
    const eyeWidget = new ColorSlotWidget(this.root, {
      label: 'Eye Color',
      presets: EYE_PRESETS,
      initialColor: '#7B3F00',
      hasIntensity: false,
      hasTint: false,
      onChange: async (hex) => {
        this.manager?.setEyeColor(hex);
      },
    });
    this.widgets.set('eyes', eyeWidget);

    // --- Lip Color (placeholder until we have head skins) ---
    const lipWidget = new ColorSlotWidget(this.root, {
      label: 'Lip Color',
      presets: LIP_PRESETS,
      initialColor: '#C08070',
      hasIntensity: false,
      hasTint: false,
      onChange: async () => {
        // Lip color requires head texture compositing — Phase 3
        console.log('[SkinTab] Lip color change (head compositor needed)');
      },
    });
    this.widgets.set('lips', lipWidget);

    // --- Nail Color ---
    const nailPresets = [
      { name: 'Natural', color: '#DDB8A0' },
      { name: 'Red', color: '#CC2020' },
      { name: 'Pink', color: '#E87898' },
      { name: 'Berry', color: '#803050' },
      { name: 'Black', color: '#1A1A1A' },
      { name: 'White', color: '#F0F0F0' },
    ];
    const nailWidget = new ColorSlotWidget(this.root, {
      label: 'Nail Color',
      presets: nailPresets,
      initialColor: '#DDB8A0',
      hasIntensity: false,
      hasTint: false,
      onChange: async (hex) => {
        this.manager?.setNailColor(hex);
      },
    });
    this.widgets.set('nails', nailWidget);
  }

  private updateActiveCard(grid: HTMLDivElement): void {
    const cards = grid.querySelectorAll<HTMLDivElement>('.skin-texture-card');
    for (const card of cards) {
      card.classList.toggle('active', card.dataset.skinId === this.activeSkinId);
    }
  }
}
