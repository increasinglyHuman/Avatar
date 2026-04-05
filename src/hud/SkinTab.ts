import type { SkinMaterialManager } from '../avatar/SkinMaterialManager.js';
import { ColorSlotWidget } from './ColorSlotWidget.js';
import {
  SKIN_PRESETS,
  EYE_PRESETS,
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
    id: 'upper-light-freckle',
    label: 'Light',
    path: 'assets/upper-drafts/Meshy_AI_7ff094c01d8cd7f34cb63c3c053fa1451abb297629cca8bebb088645596e5b53.png',
    thumbnail: 'assets/upper-drafts/Meshy_AI_7ff094c01d8cd7f34cb63c3c053fa1451abb297629cca8bebb088645596e5b53.png',
  },
  {
    id: 'upper-medium',
    label: 'Medium',
    path: 'assets/upper-drafts/Meshy_AI_0910b9a941bd520a6b49cf518e422664115f36bb27ababdcdbc0cfbfb60969cf.png',
    thumbnail: 'assets/upper-drafts/Meshy_AI_0910b9a941bd520a6b49cf518e422664115f36bb27ababdcdbc0cfbfb60969cf.png',
  },
  {
    id: 'upper-warm-freckle',
    label: 'Warm',
    path: 'assets/upper-drafts/Meshy_AI_a05dca24f93cc23cad4fe4274c5a52a655fb5e35dcda8f2dc0d73007b379b4a7.png',
    thumbnail: 'assets/upper-drafts/Meshy_AI_a05dca24f93cc23cad4fe4274c5a52a655fb5e35dcda8f2dc0d73007b379b4a7.png',
  },
  {
    id: 'upper-freckle-heavy',
    label: 'Freckled',
    path: 'assets/upper-drafts/Meshy_AI_d0e172066f8559e71745d7f0aa0c7f8dffc25380d9c111b2a4c7a9397b05db28.png',
    thumbnail: 'assets/upper-drafts/Meshy_AI_d0e172066f8559e71745d7f0aa0c7f8dffc25380d9c111b2a4c7a9397b05db28.png',
  },
];

const LOWER_BODY_SKINS: SkinTextureOption[] = [
  {
    id: 'lower-a',
    label: 'A',
    path: 'assets/lower-drafts/Meshy_AI_25d9530f74e58599f6769becb04f080d20857ba3fb9c9200a1e832cd6bf1e5c8.png',
    thumbnail: 'assets/lower-drafts/Meshy_AI_25d9530f74e58599f6769becb04f080d20857ba3fb9c9200a1e832cd6bf1e5c8.png',
  },
  {
    id: 'lower-b',
    label: 'B',
    path: 'assets/lower-drafts/Meshy_AI_2832e9e9519bb32075f68d622fa83e6858d53700ae1b7890069fa9363727045f.png',
    thumbnail: 'assets/lower-drafts/Meshy_AI_2832e9e9519bb32075f68d622fa83e6858d53700ae1b7890069fa9363727045f.png',
  },
  {
    id: 'lower-c',
    label: 'C',
    path: 'assets/lower-drafts/Meshy_AI_2dc2ba19eddd8070992c96a487764098beaf84a65e561587e029707754cf742a.png',
    thumbnail: 'assets/lower-drafts/Meshy_AI_2dc2ba19eddd8070992c96a487764098beaf84a65e561587e029707754cf742a.png',
  },
  {
    id: 'lower-d',
    label: 'D',
    path: 'assets/lower-drafts/Meshy_AI_31b2e2c7d00de32abad8132abf24fd956da8837eb92891ecc60fb90f28d7ec95.png',
    thumbnail: 'assets/lower-drafts/Meshy_AI_31b2e2c7d00de32abad8132abf24fd956da8837eb92891ecc60fb90f28d7ec95.png',
  },
];

const HEAD_SKINS: SkinTextureOption[] = [
  {
    id: 'head-a',
    label: 'A',
    path: 'assets/heads-draft/Meshy_AI_28042f146d33a8c30f645237dd22915285521711b6a51dba93a150de64ae0b9e.png',
    thumbnail: 'assets/heads-draft/Meshy_AI_28042f146d33a8c30f645237dd22915285521711b6a51dba93a150de64ae0b9e.png',
  },
  {
    id: 'head-b',
    label: 'B',
    path: 'assets/heads-draft/Meshy_AI_383919de2b9b4d8835ae4a5acaf975d6a677fca4872a1636251acbce762425e6.png',
    thumbnail: 'assets/heads-draft/Meshy_AI_383919de2b9b4d8835ae4a5acaf975d6a677fca4872a1636251acbce762425e6.png',
  },
  {
    id: 'head-c',
    label: 'C',
    path: 'assets/heads-draft/Meshy_AI_48cbaaf5d7107602ce272e1b2aaa259bf9a58f8c42cc949a828c0139b04528c0.png',
    thumbnail: 'assets/heads-draft/Meshy_AI_48cbaaf5d7107602ce272e1b2aaa259bf9a58f8c42cc949a828c0139b04528c0.png',
  },
  {
    id: 'head-d',
    label: 'D',
    path: 'assets/heads-draft/Meshy_AI_54894f791dbb5f38af48c7bdf3480b9679c71dd3d61a78aacad18c995d7ba171.png',
    thumbnail: 'assets/heads-draft/Meshy_AI_54894f791dbb5f38af48c7bdf3480b9679c71dd3d61a78aacad18c995d7ba171.png',
  },
];

/**
 * Skin tab — skin texture selection, skin tint, eye color, nail color.
 */
export class SkinTab {
  private root: HTMLDivElement;
  private manager: SkinMaterialManager | null = null;
  private widgets: Map<string, ColorSlotWidget> = new Map();
  private activeSelections: Map<string, string> = new Map(); // channel → skinId

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

    // --- Skin Texture Grids (upper, lower, head) ---
    this.renderTextureSection('Upper Body', 'upper', UPPER_BODY_SKINS, (path) => {
      this.manager?.setUpperBodySkin(path);
    });

    this.renderTextureSection('Lower Body', 'lower', LOWER_BODY_SKINS, (path) => {
      this.manager?.setLowerBodySkin(path);
    });

    this.renderTextureSection('Head', 'head', HEAD_SKINS, (path) => {
      this.manager?.setHeadSkin(path);
    });

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

  private renderTextureSection(
    title: string,
    channel: string,
    skins: SkinTextureOption[],
    onSelect: (path: string) => void,
  ): void {
    const header = document.createElement('div');
    header.className = 'skin-section-header';
    header.textContent = title;
    this.root.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'skin-texture-grid';

    for (const skin of skins) {
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
        onSelect(skin.path);
        this.activeSelections.set(channel, skin.id);
        this.updateActiveCards(grid, channel);
      });

      grid.appendChild(card);
    }
    this.root.appendChild(grid);
  }

  private updateActiveCards(grid: HTMLDivElement, channel: string): void {
    const activeId = this.activeSelections.get(channel);
    const cards = grid.querySelectorAll<HTMLDivElement>('.skin-texture-card');
    for (const card of cards) {
      card.classList.toggle('active', card.dataset.skinId === activeId);
    }
  }
}
