# Second Life / Phoenix / Firestorm Viewer: Appearance Editor & Outfits Manager

## Research Document for BlackBox Avatar

**Date:** 2026-02-26
**Purpose:** Document the UI/UX patterns of the Second Life appearance editing and outfit management systems (as implemented in Phoenix and Firestorm viewers) to inform the design of BlackBox Avatar's web-based character creator.

**Note:** This research is compiled from knowledge of the SL viewer codebase (open source under LGPL), Firestorm wiki documentation, and long-standing community documentation. The Phoenix Viewer was succeeded by the Firestorm Viewer, which carries forward the same core concepts with refinements.

---

## Table of Contents

1. [Appearance Editor Overview](#1-appearance-editor-overview)
2. [Tab Structure and Navigation](#2-tab-structure-and-navigation)
3. [Slider System for Body and Face Morphs](#3-slider-system-for-body-and-face-morphs)
4. [Clothing Layers System](#4-clothing-layers-system)
5. [Outfits Manager Overview](#5-outfits-manager-overview)
6. [Inventory System Integration](#6-inventory-system-integration)
7. [Wearing vs. Inventory Distinction](#7-wearing-vs-inventory-distinction)
8. [Key UX Patterns: What Works Well](#8-key-ux-patterns-what-works-well)
9. [Key UX Pain Points](#9-key-ux-pain-points)
10. [Lessons for BlackBox Avatar](#10-lessons-for-blackbox-avatar)

---

## 1. Appearance Editor Overview

### How to Access

In Second Life (and Firestorm/Phoenix), the Appearance Editor is opened by:
- Right-clicking your avatar and selecting **Edit Appearance** (or **Edit My Shape**)
- From the menu bar: **Avatar > Appearance**
- Keyboard shortcut: **Ctrl+Shift+A** (Firestorm)
- Clicking the **Outfit** button on the sidebar and then **Edit Appearance**

### Top-Level UI Layout

The Appearance Editor is a **docked panel** (not a popup dialog) that appears on the right side of the 3D viewport. This is a critical design decision -- the user can see their avatar updating in real-time in the main 3D viewport while adjusting sliders in the side panel. The panel is roughly 300-350 pixels wide and uses the full height of the window.

The general layout from top to bottom:

```
+---------------------------------------+
| [Back Arrow]  Editing Appearance      |
|---------------------------------------|
| [Avatar Preview / Turntable Camera]   |
| (viewport auto-zooms to relevant      |
|  body part when editing)              |
|---------------------------------------|
| WEARABLES LIST                        |
|  [Shape] [Skin] [Hair] [Eyes]         |
|  [Shirt] [Pants] [Jacket] ...        |
|  (each is a clickable item)           |
|---------------------------------------|
| SLIDER PANEL (for selected wearable)  |
|  [Tab: Body] [Tab: Head] [Tab: Eyes]  |
|  [Tab: Nose] [Tab: Mouth] [Tab: Chin] |
|  [Tab: Torso] [Tab: Legs]            |
|                                       |
|  Slider: Height ----[====]---- 80    |
|  Slider: Body Fat ---[==]---- 30     |
|  Slider: Torso Length [===]--- 65    |
|  ...                                  |
|---------------------------------------|
| [Save] [Save As] [Revert] [Cancel]   |
+---------------------------------------+
```

### Camera Behavior

When the user selects different body part categories, the 3D viewport camera **automatically zooms and pans** to focus on the relevant area:
- Selecting **Head** sliders zooms to the face
- Selecting **Torso** sliders zooms to the upper body
- Selecting **Legs** sliders zooms to the lower body
- Selecting **Eyes** zooms in close to the eye area

This is an extremely effective UX pattern. The user never has to manually orbit the camera to see what they are editing. Firestorm also allows the user to override this auto-focus by manually moving the camera, and it will return to auto-focus when a new category is selected.

---

## 2. Tab Structure and Navigation

### Primary Layer: Wearable Type Selection

The first level of navigation is selecting **which wearable** to edit. Second Life treats the avatar as a composition of distinct "wearable" items:

**Body Parts** (always exactly one of each worn):
1. **Shape** -- All body morph sliders (height, weight, face shape, etc.)
2. **Skin** -- Skin texture (diffuse map for body, head, lower body)
3. **Hair** -- Hair base texture and color (not the mesh hair, just the painted-on base)
4. **Eyes** -- Eye texture and iris color

**Clothing Layers** (zero or one of each type worn at a time in classic SL; multiple via outfits):
5. **Shirt**
6. **Pants**
7. **Shoes**
8. **Socks**
9. **Jacket**
10. **Gloves**
11. **Undershirt**
12. **Underpants**
13. **Skirt**
14. **Alpha** (invisibility mask layer, used to hide body parts under mesh clothing)
15. **Tattoo** (additive texture layer on the skin)
16. **Universal** (added later, full-body texture layer)
17. **Physics** (breast/belly/butt bounce parameters)

Each wearable type appears as a row in a scrollable list. Worn items show their name; empty slots show "Not Worn" in gray text. Clicking a wearable opens its specific editor.

### Secondary Layer: Category Tabs Within Shape

When editing **Shape** (the most complex wearable), a row of sub-tabs appears:

| Tab | Controls |
|-----|----------|
| **Body** | Height, Body Thickness, Body Fat, Neck Length, Neck Thickness, Shoulders, Arm Length, Hand Size, Torso Length, Love Handles, Belly Size, Leg Length, Leg Muscles, Foot Size, Hip Width |
| **Head** | Head Size, Head Stretch, Head Length, Face Shear, Forehead Angle, Brow Size, Upper Cheeks, Lower Cheeks, Jaw Shape, Jaw Angle, Chin Angle, Chin Depth, Chin-Neck |
| **Eyes** | Eye Size, Eye Width, Eye Spacing, Eye Depth, Eye Slant, Upper Eyelid Fold, Eye Bags, Inner Eye Corner, Outer Eye Corner |
| **Ears** | Ear Size, Ear Angle, Ear Tips (pointedness), Attached Earlobes |
| **Nose** | Nose Size, Nose Width, Nostril Width, Nose Tip Angle, Nose Tip Shape, Bridge Width, Nose Bridge, Upper Bridge, Lower Bridge, Nostril Division, Nose Thickness |
| **Mouth** | Lip Width, Lip Fullness, Lip Thickness, Lip Ratio, Mouth Position, Mouth Corner, Lip Cleft Depth, Lip Cleft |
| **Chin** | Chin Angle, Jaw Shape, Jaw Jut, Jaw Width, Chin Cleft, Chin Depth, Chin-Neck, Neck Thickness |
| **Torso** | Torso Muscles, Torso Length, Neck Length, Shoulders, Breast Size (female), Breast Buoyancy (female), Breast Cleavage (female), Love Handles, Belly Size |
| **Legs** | Leg Length, Leg Muscles, Hip Width, Hip Length, Butt Size, Saddle Bags, Knee Angle, Foot Size |

In Firestorm, these tabs appear as a **horizontal scrollable tab bar** directly under the wearable name. Each tab when selected replaces the slider panel content below.

### Clothing Layer Editor Tabs

When editing a clothing item (e.g., Shirt), the sub-panel shows:
- **Color/Tint** swatch (click to open color picker)
- **Fabric** texture (click to open texture picker from inventory)
- **Sliders** specific to that garment type (e.g., Sleeve Length, Collar Front, Collar Back, Shirt Bottom, Shirt Bottom Open for a Shirt)

---

## 3. Slider System for Body and Face Morphs

### Slider UI Pattern

Each slider in the SL appearance editor follows a consistent pattern:

```
[Label Text]        [descriptive left] ---[thumb]--- [descriptive right]
                                         ^current value
```

For example:
```
Height              Short --------[====]------------ Tall
Body Fat            Less ---------[==]-------------- More
Head Size           Small --------[=====]----------- Large
Nose Width          Narrow -------[===]------------- Broad
```

Key characteristics:

1. **Labeled Endpoints**: Every slider has descriptive labels on both ends (not just numeric values). "Short" to "Tall", "Narrow" to "Broad", "Less" to "More". This is significantly more user-friendly than showing 0-100.

2. **Range**: Internally all sliders map to 0-100 (or 0.0-1.0), but the UI abstracts this. Some Firestorm builds show the numeric value on hover or in a tooltip.

3. **Real-Time Preview**: As the user drags a slider, the 3D avatar updates in real time. There is no "apply" step -- the morph blending is continuous.

4. **Morph Target Implementation**: Under the hood, each slider corresponds to one or more **morph targets** (blend shapes) on the avatar mesh. The slider value is the blend weight. Some sliders control multiple morph targets simultaneously (e.g., "Body Fat" affects belly, love handles, thighs, and arms).

5. **Bidirectional Morphs**: Most SL sliders are bidirectional -- the center (50) is the default, and moving left or right applies opposite morphs. For example, "Nose Width" at 0 = narrow nose, at 50 = default, at 100 = wide nose. This is implemented as two morph targets: one for the "narrow" direction and one for the "wide" direction.

6. **Slider Grouping**: Sliders within each tab are arranged in a logical order, typically from "large/global" adjustments at the top to "fine/detail" adjustments at the bottom.

### Morph Count

The full SL avatar shape has approximately **150+ individual sliders** across all tabs, controlling roughly **200+ morph targets** on the mesh. This is one of the most comprehensive parametric avatar systems ever deployed at scale.

### Interaction Details

- **Click and drag**: Standard slider behavior
- **Click on track**: Jumps to that position
- **Scroll wheel**: Firestorm added scroll-wheel support for fine adjustments when hovering over a slider
- **Reset**: Right-click on a slider to reset it to default (50)
- **Numeric input**: Some Firestorm builds allow clicking the value to type an exact number

---

## 4. Clothing Layers System

### The Layer Compositing Model

Second Life's clothing system is a **texture compositing** system, not a mesh replacement system. This is a crucial distinction from modern avatar systems.

The avatar has three UV-mapped body regions:
1. **Upper Body** (head + torso + upper arms)
2. **Lower Body** (lower torso + legs + feet)
3. **Eyes** (iris texture)

Clothing "layers" are **texture overlays** painted onto these body regions, composited in a fixed stacking order from bottom to top:

```
COMPOSITING ORDER (bottom to top):
===================================
1. Skin texture (base layer, always present)
2. Tattoo layer (additive blend on skin)
3. Undershirt texture
4. Underpants texture
5. Shirt texture
6. Pants texture
7. Socks texture (lower body only)
8. Shoes texture (lower body only)
9. Gloves texture (upper body only)
10. Jacket texture (over everything)
11. Skirt texture (special geometry, not just a texture)
12. Alpha mask (makes body regions invisible)
```

### How Each Clothing Layer Works

Each clothing layer item contains:
- **A texture** (uploaded by the creator, RGBA where alpha controls coverage)
- **A color tint** (HSV adjustable, multiplied with the texture)
- **Fit sliders** specific to the garment type

For example, a **Shirt** has these sliders:
- Sleeve Length (short to long)
- Bottom (cropped to long)
- Collar Front (low to high)
- Collar Back (low to high)
- Open Front (closed to open)
- Chest/Breast fitting

These sliders do NOT deform mesh -- they control **which areas of the body the texture is painted onto**, essentially masking the texture's coverage area. "Sleeve Length = 0" means the shirt texture is only applied to the torso, not the arms. "Sleeve Length = 100" means it extends to the wrists.

### Mesh Clothing (Modern System)

Starting around 2012, mesh-based clothing overtook the layer system. Mesh clothing works differently:
- Clothing is a separate 3D mesh **attached** to the avatar
- Uses the **Alpha layer** to hide the body underneath (preventing clipping)
- Does NOT use the texture compositing system
- Multiple mesh attachments can be worn simultaneously
- Rigged mesh clothing deforms with the avatar's shape sliders (if designed correctly)

Most modern SL users use mesh clothing exclusively, but the layer system remains for:
- Tattoos
- Skin details
- Underwear layers visible under mesh
- Alpha masks (essential for mesh clothing)

### Implications for BlackBox Avatar

The SL layer compositing system is elegant for a texture-based avatar but is largely obsolete for modern 3D character creators that use mesh-based clothing. However, the **Alpha layer** concept (body part visibility masking) is directly relevant -- BlackBox Avatar already implements something similar with its cull-mesh system.

---

## 5. Outfits Manager Overview

### What Is an Outfit?

In SL/Firestorm, an **Outfit** is a saved snapshot of everything your avatar is wearing at a given moment:
- Shape, skin, hair, eyes (body parts)
- All clothing layers
- All mesh attachments
- Body physics settings

An outfit is stored as a **folder** in the user's inventory, inside a special top-level folder called **My Outfits**.

### Outfits Panel UI Layout

The Outfits panel (opened from the sidebar or Avatar > My Outfits) has this structure:

```
+----------------------------------------+
| MY OUTFITS                    [Gear]   |
|----------------------------------------|
| [Search: ___________________] [Filter] |
|----------------------------------------|
| OUTFIT LIST (folder tree or flat list) |
|                                        |
| > Casual Friday                        |
|   > Formal Dinner                      |
|   > Beach Day                          |
|   > Cyberpunk Look                     |
|   > Default Outfit                     |
|                                        |
|----------------------------------------|
| CURRENTLY WEARING                      |
|  Shape: My Custom Shape                |
|  Skin: Realistic Skin v3              |
|  Hair: Long Wavy                       |
|  Shirt: Blue Flannel                   |
|  Pants: Dark Jeans                     |
|  Shoes: Sneakers (mesh)               |
|  [+ 5 mesh attachments]               |
|----------------------------------------|
| [Wear] [Take Off] [Edit] [New Outfit] |
+----------------------------------------+
```

### Key Operations

**Save Current Outfit:**
1. Click **Save As** (or **New Outfit**)
2. Enter a name for the outfit
3. The system copies all currently worn items into a new folder under My Outfits
4. This creates **links** (shortcuts) to the actual inventory items, not copies

**Load/Wear an Outfit:**
1. Select an outfit from the list
2. Click **Wear** (or double-click)
3. The system performs a **Replace Outfit** operation:
   - Removes all currently worn clothing layers and attachments
   - Wears everything from the selected outfit folder
   - This is an atomic operation (all-or-nothing swap)

**Edit an Outfit:**
1. Select an outfit
2. Click **Edit Outfit** (or right-click > Edit)
3. Opens the outfit's folder showing all items
4. User can add/remove items from the outfit
5. Individual items can be worn/removed

**Additional Operations (right-click context menu):**
- **Rename** the outfit
- **Delete** the outfit (deletes the folder and links, not the actual items)
- **Replace Current Outfit** (same as Wear)
- **Add to Current Outfit** (wear items from this outfit ON TOP of current, no removal)
- **Copy to Inventory** (make actual copies of all items)

### Firestorm Enhancements Over Standard Viewer

Firestorm added several improvements to outfit management:

1. **Outfit thumbnails**: Automatically captured screenshot when saving an outfit, displayed as a thumbnail in the outfit list. This makes visual identification much faster than reading folder names.

2. **Outfit Tabs**: A tab at the top to switch between "My Outfits" (saved) and "Wearing" (current items).

3. **Outfit sorting**: Sort by name, date created, date last worn.

4. **Quick outfit switching**: A "Favorites" bar for frequently used outfits.

5. **Outfit gallery view**: Grid of thumbnails instead of a list (optional view mode).

6. **COF (Current Outfit Folder)**: A special system folder that always reflects what is currently worn. This is the "source of truth" for current appearance.

---

## 6. Inventory System Integration

### Inventory Structure

Second Life's inventory is a **hierarchical folder system**, much like a file system:

```
My Inventory/
  Animations/
  Body Parts/
    My Shape
    My Skin
    My Hair
    My Eyes
  Clothing/
    Shirts/
      Blue Flannel Shirt
      White T-Shirt
    Pants/
      Dark Jeans
      Cargo Pants
    Full Outfits/
      Party Look (folder)
        Shirt: Sequin Top
        Pants: Black Skinny
        ...
  Objects/
    Mesh Hair - Long Wavy
    Mesh Shoes - Sneakers
    HUD - Color Change v3
  My Outfits/
    Casual Friday/
      (links to items)
    Formal Dinner/
      (links to items)
  Textures/
  ...
```

### Relationship Between Inventory and Outfits

- **Inventory** is the full collection of all items the user owns
- **My Outfits** is a curated subset organized into named outfit folders
- Outfit folders contain **inventory links** (like symbolic links / shortcuts), not copies
- If the original item is deleted from inventory, the link breaks
- Worn items show a special "worn" indicator in inventory (bold text or a small icon)

### Wearing from Inventory

Users can also wear items directly from inventory without using the Outfits panel:
- Right-click any wearable item > **Wear** (replaces the item of that type)
- Right-click > **Add** (adds without removing other items)
- Drag and drop onto the avatar in the 3D viewport
- Double-click (default action is usually "Wear")

### Search and Filtering

Both inventory and outfits support:
- **Text search** across all item names
- **Type filtering** (show only clothing, or only body parts, etc.)
- **Recent items** tab showing recently acquired items
- **Worn items** filter to show only currently worn items
- Firestorm adds **worn items count** per folder

---

## 7. Wearing vs. Inventory Distinction

This is a nuanced but important UX concept in Second Life:

### "Wearing" State

An item can be in one of three states:
1. **In Inventory (Not Worn)** -- exists but not active
2. **Worn** -- actively part of the avatar's current appearance
3. **In Outfit Folder (Saved)** -- part of a saved outfit configuration (a link)

### Visual Indicators

| State | Inventory View | Outfit View |
|-------|---------------|-------------|
| Not Worn | Normal text, normal icon | N/A |
| Worn | **Bold text**, "(worn)" suffix, or colored icon | Checkmark |
| In Outfit | N/A | Listed in folder |

### Wear vs. Add

A critical distinction:
- **Wear** (Replace): Removes the currently worn item of the same type and replaces it. Wearing a shirt removes the current shirt.
- **Add**: Puts the item on without removing anything. Primarily used for mesh attachments (you can wear multiple mesh items at different attachment points).

### Take Off vs. Detach

- **Take Off**: Removes a clothing layer or body part (goes back to inventory)
- **Detach**: Removes a mesh attachment (goes back to inventory)
- Both return the item to inventory -- nothing is lost, just unworn

### The COF (Current Outfit Folder)

Internally, Second Life maintains a special system folder called the **Current Outfit Folder (COF)**. This is the definitive record of what the avatar is wearing. When you "wear" an item, a link to it is placed in the COF. When you "take off" an item, its link is removed from the COF. The COF is synced to the server and persists between sessions. When you log in, the COF is read and all items in it are applied to your avatar.

This is essentially a **state serialization** mechanism -- the COF is the "save file" for current appearance.

---

## 8. Key UX Patterns That Work Well

### 8.1 Real-Time Preview with Auto-Camera

The single most effective UX pattern in the SL appearance editor. Every slider change is immediately visible on the 3D avatar, and the camera automatically frames the relevant body region. This creates a tight feedback loop that makes exploration intuitive.

**Applicable to BlackBox Avatar:** Already partially implemented via Three.js viewport. Could enhance with auto-camera focus when selecting different body region sliders.

### 8.2 Descriptive Slider Labels

Using "Short <-> Tall" instead of "0 <-> 100" makes the interface accessible to non-technical users. The semantic labels communicate the effect without requiring the user to experiment.

**Applicable to BlackBox Avatar:** Highly recommended for any morph slider system.

### 8.3 Organized Hierarchy: Wearable > Category > Slider

The three-level navigation (select wearable type > select body region tab > adjust slider) prevents overwhelming the user with 150+ sliders at once. Showing only 8-15 sliders per tab keeps the panel manageable.

**Applicable to BlackBox Avatar:** Directly applicable. The current trait-group system is analogous but could be refined.

### 8.4 Outfit as Atomic Unit

Saving and loading complete outfits as a single operation is extremely user-friendly. Users think in terms of "looks" not individual items. The one-click outfit switch is the most-used feature.

**Applicable to BlackBox Avatar:** Essential for any character creator that supports customization.

### 8.5 Separation of Library vs. Active

The distinction between "everything I own" (inventory) and "what I'm wearing now" (COF) and "saved combinations" (outfits) maps well to how users think about clothing in real life.

**Applicable to BlackBox Avatar:** Map to: Asset Library > Current Character > Saved Characters/Presets.

### 8.6 Non-Destructive Editing with Revert

The ability to make changes and then "Revert" to the last saved state encourages experimentation. Users feel safe to explore because they can always go back.

**Applicable to BlackBox Avatar:** Implement undo/revert for the editing session.

### 8.7 Right-Click Context Menus

Providing Wear/Remove/Edit/Copy operations via right-click on any item gives power users quick access without cluttering the main UI.

### 8.8 Thumbnails for Outfits

Firestorm's outfit thumbnails are vastly superior to text-only lists. Visual recognition is faster and more enjoyable than reading names.

**Applicable to BlackBox Avatar:** The project already has a `thumbnailsGenerator.js` -- this should be leveraged for outfit/preset previews.

---

## 9. Key UX Pain Points

### 9.1 Overwhelming Slider Count

150+ sliders is powerful but intimidating. New users often don't know where to start and many sliders produce subtle changes that are hard to perceive. There is no guidance on which sliders matter most.

**Lesson for BlackBox Avatar:** Consider a tiered approach -- "Simple" mode with 15-20 key sliders, "Advanced" mode with full control. Or preset starting points (archetypes) that users can then refine.

### 9.2 Texture Layer System Is Opaque

The clothing layer compositing order is not visually explained anywhere in the UI. Users learn through trial and error that undershirts go under shirts. The concept of alpha layers to hide body parts under mesh clothing is a notorious source of confusion.

**Lesson for BlackBox Avatar:** If using any layering system, make the layer stack visible and interactive (drag to reorder, toggle visibility per layer).

### 9.3 Inventory Management at Scale

Long-time SL users accumulate tens of thousands of inventory items. The folder system becomes unwieldy at that scale. Search is essential but slow. Organizing items into outfits is tedious.

**Lesson for BlackBox Avatar:** Design the asset/preset system to stay manageable even with many saved items. Tags, search, and visual previews are essential.

### 9.4 No Undo for Wearing

If you accidentally "Replace Outfit" and lose your carefully assembled current look, there is no undo. The previous COF is just gone. This is a frequent source of user frustration.

**Lesson for BlackBox Avatar:** Always auto-save the current state before loading a new outfit/preset. Provide undo.

### 9.5 Naming Is the Only Organization

Outfits are organized solely by folder name. No tags, no categories, no seasons, no metadata. Users resort to naming conventions like "[Formal] Black Tie Gala" to create pseudo-categories.

**Lesson for BlackBox Avatar:** Support tags/categories for saved presets from the start.

### 9.6 Slow Baking/Upload

In SL, changing appearance requires "baking" the composited textures and uploading them to the server. This takes 5-30 seconds and the avatar appears blurry ("ruth" or "cloud") during the process. This creates a jarring interruption in the editing flow.

**Lesson for BlackBox Avatar:** Client-side rendering means this is not an issue, but any export/save operations should be async with progress indication.

### 9.7 Shape Not Transferable (In Standard SL)

In standard SL, shapes are "no-transfer" by default, meaning you cannot give your slider configuration to another user easily. You have to read off each slider value manually. This is intentional for the SL economy but terrible UX.

**Lesson for BlackBox Avatar:** Make it trivial to export/import/share character configurations. JSON serialization of all slider values is the obvious approach.

### 9.8 No Comparison/A-B Toggle

There is no way to quickly compare two shapes or outfits side by side, or toggle between "before" and "after" while editing.

**Lesson for BlackBox Avatar:** An A/B comparison feature would be a significant improvement over the SL paradigm.

---

## 10. Lessons for BlackBox Avatar

### 10.1 Architecture Mapping

| SL/Firestorm Concept | BlackBox Avatar Equivalent | Notes |
|----------------------|---------------------------|-------|
| Shape (morph sliders) | Morph Engine parameters | Direct mapping via MakeHuman-derived morph targets |
| Skin (texture) | Skin texture/material | Can be a texture picker or color system |
| Hair (texture layer) | Hair trait (VRM mesh) | BlackBox already uses mesh-based hair via traits |
| Eyes (texture) | Eye trait parameters | Iris color, texture, shape |
| Clothing layers | VRM mesh traits | Already implemented as trait groups |
| Alpha layer | Cull mesh system | Already in `cull-mesh.js` |
| Outfit (saved folder) | Character preset (JSON) | Serialize all trait selections + morph values |
| Inventory | Asset Library / Manifest | Manifest-driven asset system already exists |
| COF (Current Outfit) | Current character state in Zustand | Already exists in state management |
| Mesh attachments | VRM trait items | Already implemented |

### 10.2 Recommended UI Structure for Appearance Editor

Based on SL patterns, adapted for web:

```
SIDEBAR PANEL (right side, ~350px)
==================================

[Character Name] ............. [Save] [Revert]

BODY SHAPE
  Tabs: [Body] [Head] [Face] [Details]

  Body tab:
    Height      Short ----[====]---- Tall
    Build       Slim -----[===]----- Heavy
    Shoulders   Narrow ---[=====]--- Broad
    ...

  Head tab:
    Head Size   Small ----[====]---- Large
    ...

HAIR
  [Grid of hair options with thumbnails]
  Color: [color picker]

SKIN
  [Grid of skin options with thumbnails]

CLOTHING
  [Grid of tops]
  [Grid of bottoms]
  [Grid of shoes]
  [Grid of accessories]

SAVED LOOKS
  [Thumbnail grid of saved character presets]
  [Save Current] [Load] [Delete]
```

### 10.3 Priority Features to Implement

Ranked by impact-to-effort ratio:

1. **Real-time slider preview with auto-camera** -- the single most important feature
2. **Descriptive slider endpoints** -- "Short" to "Tall" not "0" to "100"
3. **Tiered complexity** -- Simple mode (key sliders only) and Advanced mode
4. **One-click outfit save/load** with auto-thumbnails
5. **JSON export/import** for sharing character configurations
6. **A/B comparison toggle** -- switch between before/after states
7. **Undo/Redo stack** for all appearance changes
8. **Tag-based organization** for saved presets
9. **Randomize button** (already exists) with per-category randomization
10. **Preset archetypes** as starting points (already partially in manifest system)

### 10.4 Slider Organization Recommendation

For a MakeHuman-derived system, organize morphs into these user-facing categories:

**Simple Mode (20 key sliders):**
- Height, Build, Age, Gender Blend
- Head Size, Face Width, Jaw Shape
- Eye Size, Eye Spacing, Nose Size
- Lip Fullness, Ear Size
- Shoulder Width, Chest, Waist, Hip Width
- Arm Length, Leg Length
- Muscle Definition, Body Fat

**Advanced Mode (all available morphs, tabbed):**
- Body: Height, proportions, musculature, fat distribution
- Head: Head shape, forehead, cheek bones, jaw
- Eyes: Size, spacing, depth, lids, brow ridge
- Nose: Bridge, width, tip, nostrils
- Mouth: Lip shape, width, thickness, corners
- Ears: Size, angle, shape, lobes
- Torso: Shoulders, chest, waist, belly
- Limbs: Arm and leg proportions, hands, feet

### 10.5 Clothing/Trait System Recommendation

Rather than SL's texture compositing layers, BlackBox Avatar should continue its mesh-based trait system but borrow these organizational patterns:

1. **Category tabs**: Separate traits into clear categories (Hair, Tops, Bottoms, Shoes, Accessories, Full Outfits)
2. **Thumbnail previews**: Show each trait option as a visual thumbnail, not just a name
3. **"Currently Wearing" summary**: A collapsible panel showing all currently applied traits
4. **Color customization per trait**: Each trait should support a color tint or material variant
5. **Layer visibility**: Show the layering order and allow toggling visibility per layer (borrow from Photoshop layers panel more than from SL)

### 10.6 Outfit/Preset System Recommendation

```
SAVED CHARACTERS
================
[Search: _______________] [Sort: Recent v]

[Tags: All | Fantasy | Modern | Sci-Fi | Custom]

+--------+  +--------+  +--------+
|        |  |        |  |        |
| [thumb]|  | [thumb]|  | [thumb]|
|        |  |        |  |        |
| Warrior|  | Casual |  | Cyborg |
| 2/26   |  | 2/25   |  | 2/24   |
+--------+  +--------+  +--------+

[Save Current As...] [Import JSON] [Export JSON]
```

Each saved character stores:
- All morph slider values
- All trait selections (hair, clothing, accessories)
- Color/material choices
- A thumbnail (auto-captured from current camera angle)
- User-assigned name and tags
- Timestamp

---

## Appendix A: SL Shape Slider Complete Reference

For reference, here is the comprehensive list of shape sliders available in the Second Life / Firestorm appearance editor. This represents the most battle-tested parametric avatar system in virtual world history (20+ years of iteration).

### Body

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Height | Short | Tall |
| Body Thickness | Body Thin | Body Thick |
| Body Fat | Less Body Fat | More Body Fat |
| Hover | Down | Up |

### Head

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Head Size | Small Head | Big Head |
| Head Stretch | Compressed | Stretched |
| Head Length | Flat Head | Long Head |
| Face Shear | Shear Right | Shear Left |
| Egg Head | Egg Head | Squash Head |
| Head Shape | More Round | More Square |
| Brow Size | Small Brow | Large Brow |
| Upper Cheeks | Thin Cheeks | Puffy Cheeks |
| Lower Cheeks | Narrow | Wide |

### Eyes

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Eye Size | Small | Large |
| Eye Width | Narrow | Wide |
| Eye Spacing | Close Together | Far Apart |
| Eye Depth | Sunken | Bug-Eyed |
| Eye Slant | Slanted Up | Slanted Down |
| Eyelid Fold | No Fold | Large Fold |
| Eye Bags | No Bags | Large Bags |
| Eyelid Opening | Tight | Wide Open |
| Inner Eye Corner | Corner Down | Corner Up |
| Outer Eye Corner | Corner Down | Corner Up |

### Ears

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Ear Size | Small | Large |
| Ear Angle | In | Out |
| Ear Tips | Flat | Pointed |
| Attached Earlobes | Unattached | Attached |

### Nose

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Nose Size | Small | Large |
| Nose Width | Narrow | Broad |
| Nostril Width | Narrow | Broad |
| Nose Tip Angle | Downturned | Upturned |
| Nose Tip Shape | Pointy | Bulbous |
| Bridge Width | Narrow | Broad |
| Upper Bridge | Low | High |
| Lower Bridge | Shallow | Deep |
| Nostril Division | High | Low |
| Nose Thickness | Thin Nose | Bulbous Nose |
| Nose Tip Length | Short | Long |
| Crooked Nose | Crooked to Left | Crooked to Right |

### Mouth

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Lip Width | Narrow | Wide |
| Lip Fullness | Less Full | More Full |
| Lip Thickness | Thin Lips | Fat Lips |
| Lip Ratio | More Upper Lip | More Lower Lip |
| Mouth Position | High | Low |
| Mouth Corner | Corner Down | Corner Up |
| Lip Cleft Depth | Shallow | Deep |
| Lip Cleft | Narrow | Wide |
| Shift Mouth | Shift Left | Shift Right |

### Chin

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Chin Angle | Chin Out | Chin In |
| Jaw Shape | Pointy | Square |
| Jaw Jut | No Jut | More Jut |
| Jaw Width | Narrow Jaw | Wide Jaw |
| Chin Cleft | Round Chin | Cleft Chin |
| Chin Depth | Shallow | Deep |
| Chin-Neck | Tight Chin | Double Chin |

### Torso

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Torso Muscles | Less Muscular | More Muscular |
| Torso Length | Short Torso | Long Torso |
| Neck Length | Short Neck | Long Neck |
| Neck Thickness | Skinny Neck | Thick Neck |
| Shoulders | Narrow | Broad |
| Breast Size* | Small | Large |
| Breast Buoyancy* | Saggy | Perky |
| Breast Cleavage* | Separate | Together |
| Arm Length | Short | Long |
| Hand Size | Small | Large |
| Love Handles | Less Love | More Love |
| Belly Size | Small | Big |

*Female avatar specific

### Legs

| Slider | Min Label | Max Label |
|--------|-----------|-----------|
| Leg Length | Short Legs | Long Legs |
| Leg Muscles | No Muscle | Muscular |
| Hip Width | Narrow Hips | Wide Hips |
| Hip Length | Short Hips | Long Hips |
| Butt Size | Flat Butt | Big Butt |
| Saddle Bags | No Saddle Bags | More Saddle Bags |
| Knee Angle | Knock Kneed | Bow Legged |
| Foot Size | Small | Big |

---

## Appendix B: Firestorm Outfits Panel Feature Summary

| Feature | Standard SL Viewer | Firestorm | Notes |
|---------|-------------------|-----------|-------|
| Outfit folders | Yes | Yes | Core feature |
| Outfit thumbnails | Limited | Full support | Auto-capture on save |
| Gallery view | No | Yes | Grid of thumbnails |
| Search outfits | Basic | Enhanced | Searches item names within outfits |
| Sort options | Name only | Name, date, recently worn | More flexible |
| Favorites bar | No | Yes | Quick access strip |
| Outfit links | Yes | Yes | Non-destructive references |
| Replace outfit | Yes | Yes | Atomic swap |
| Add to outfit | Yes | Yes | Additive wear |
| Multi-wearable | Limited | Enhanced | Wear multiple clothing layers of same type |
| COF management | Hidden | Accessible | Power user access to Current Outfit Folder |
| Outfit import/export | No | Partial | Via inventory XML |
| Right-click menu | Basic | Extended | More operations |

---

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **Baking** | Server-side compositing of texture layers into a single texture for the avatar |
| **COF** | Current Outfit Folder -- system folder representing what is currently worn |
| **Layer clothing** | Texture-based clothing painted onto the avatar body (legacy system) |
| **Mesh clothing** | Separate 3D mesh worn as an attachment over the avatar body (modern system) |
| **Morph target** | A stored vertex displacement applied with a weight to deform the base mesh |
| **Rigged mesh** | A mesh skinned to the avatar skeleton so it deforms with body shape |
| **Ruth** | The default/fallback female avatar shape in SL (used when appearance fails to load) |
| **Shape** | The complete set of morph slider values defining an avatar's body proportions |
| **Wearable** | Any item that can be worn on the avatar (body parts, clothing, attachments) |
| **Alpha mask/layer** | A special wearable that makes body regions invisible (used under mesh clothing) |
| **Attachment point** | A bone/joint on the skeleton where mesh objects can be attached |
| **Inventory link** | A reference/shortcut to an inventory item (like a symlink) |

---

*End of research document.*
