# Fulcral Brand Assets

## Files in this package

### SVG Marks
| File | Use |
|------|-----|
| `fulcral-mark-dark.svg` | Full mark (52×56) for dark backgrounds — hero, dark sections |
| `fulcral-mark-light.svg` | Full mark (52×56) for light backgrounds — cards, light sections |
| `fulcral-mark-nav-dark.svg` | Nav-size mark (18×20) for dark nav bar |
| `fulcral-mark-nav-light.svg` | Nav-size mark (18×20) for light nav bar |
| `fulcral-favicon.svg` | Favicon (32×32) with background rect — simplified for legibility |
| `fulcral-wordmark-dark.svg` | Horizontal lockup with wordmark — dark |
| `fulcral-wordmark-light.svg` | Horizontal lockup with wordmark — light |

### CSS
| File | Use |
|------|-----|
| `fulcral-tokens.css` | All brand tokens — colours, type, spacing, radius, shadows |

---

## Colour Palette

| Name | Hex | Use |
|------|-----|-----|
| Primary navy | `#17355F` | Primary brand, buttons (dark bg), nav bg |
| Deep navy | `#102345` | Deep backgrounds, high-contrast text |
| Secondary blue | `#3D73B1` | CTAs, links, active states, mark stroke |
| Tertiary teal | `#6EA79F` | Accent, pivot dot in mark, highlight |
| Surface 1 | `#FBFCFE` | Page background |
| Surface 2 | `#EFF3F8` | Card / section background |
| Surface 3 | `#D7DFEB` | Borders, dividers |
| Muted | `#526684` | Secondary copy, nav links |

---

## Type System

| Role | Font | Use |
|------|------|-----|
| Display | Georgia, Times New Roman, serif | Hero headings, large statements |
| UI / Body | Inter, Arial, Helvetica, sans-serif | All body copy, buttons, labels, nav |
| Mono | Geist Mono, Courier New, monospace | Tags, technical labels, code, section labels |

---

## Mark Notes

- The **pivot dot** is always `#6EA79F` (teal) — this is the one place the teal accent appears in the mark and should not be changed
- The **arm echo** (short horizontal stroke extending right from pivot) can be omitted at small sizes below 24px rendered
- The **wordmark** uses Georgia — if Georgia is not available in the rendering context, Times New Roman is the correct fallback
- **Favicon** includes a background rect (`#102345`) — remove this if the browser/platform supplies its own background

---

## Recommended placement in Next.js project

```
/public
  /brand
    fulcral-mark-dark.svg
    fulcral-mark-light.svg
    fulcral-mark-nav-dark.svg
    fulcral-mark-nav-light.svg
    fulcral-favicon.svg
    fulcral-wordmark-dark.svg
    fulcral-wordmark-light.svg

/styles
  fulcral-tokens.css   ← import in globals.css
```

Import tokens in `globals.css`:
```css
@import './fulcral-tokens.css';
```

Use in components:
```jsx
<img src="/brand/fulcral-mark-nav-dark.svg" alt="Fulcral" width={18} height={20} />
```

Or inline as React components for colour control:
```jsx
// Copy SVG path content directly into a React component
// to allow dynamic colour overrides via props
```
