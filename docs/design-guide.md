# ProgressKit — Design Rules

> **Single context reference for all design decisions.**
> Keep this file open alongside any component or layout work.

---

## Philosophy

The interface is an **intelligent operating environment for understanding application data** — not a flashy dashboard with AI features bolted on.

### Feel
`intelligent` · `calm` · `technical` · `premium` · `focused` · `spatial` · `slightly futuristic`

### Avoid
- Neon cyberpunk overload
- Excessive or decorative gradients
- Saturated rainbow palettes
- Playful startup colors
- Harsh pure blacks

### Reference points
Modern AI workspaces · Advanced developer tools · Design systems · Operating environments

---

## Background Colors

| Role | Hex | Usage |
|---|---|---|
| Primary Workspace | `#0B0D12` | Infinite canvas, main app background. Never pure black. |
| Secondary | `#11141B` | Sidebars, floating panels, modal surfaces |
| Elevated Surface | `#171B23` | Cards, floating schema nodes, AI response blocks |
| Hover Surface | `#1D2330` | — |
| Active Surface | `#252C3B` | — |

---

## Canvas & Grid

| Role | Value | Note |
|---|---|---|
| Grid Dots | `rgba(255,255,255,0.08)` | Subtle — should barely exist |
| Canvas Glow Overlay | `rgba(59,130,246,0.04)` | Very faint atmospheric blue |

---

## Border System

| State | Value |
|---|---|
| Default | `rgba(255,255,255,0.08)` |
| Hover | `rgba(255,255,255,0.14)` |
| Active | `rgba(96,165,250,0.45)` |

---

## Text Colors

| Role | Hex |
|---|---|
| Primary | `#F5F7FA` |
| Secondary | `#A8B3C7` |
| Muted | `#6B7280` |
| Disabled | `#4B5563` |

---

## Accent Colors

> Use accents sparingly. The UI stays mostly monochromatic with controlled intelligent highlights.

### Primary Accent — AI Blue
Used for active AI states, highlights, focused nodes, selected connections, buttons.

```
Color: #5EA2FF
Glow:  rgba(94,162,255,0.35)
```

### Secondary Accent — Violet Intelligence
Used for AI-generated suggestions, generated metrics, advanced workflows.

```
Color: #9B8CFF
Glow:  rgba(155,140,255,0.28)
```

### Semantic Accents

| Role | Hex | Usage |
|---|---|---|
| Success | `#3DD9A5` | Validated queries, successful generation, connected database |
| Warning | `#F6C760` | — |
| Error | `#FF6B81` | — |

---

## Node & Card Styling

### Schema Node

```css
background: linear-gradient(180deg, #171B23 0%, #131720 100%);
border: 1px solid rgba(255,255,255,0.08);
```

### Active Schema Node

```css
border-color: #5EA2FF;
box-shadow: 0 0 24px rgba(94,162,255,0.18);
```

---

## Relation Lines

| State | Value |
|---|---|
| Default | `rgba(255,255,255,0.12)` |
| Hover | `rgba(94,162,255,0.55)` |
| AI Traversal | Gradient `#5EA2FF → #9B8CFF` with animated glow pulse |

---

## AI State Colors

| State | Color | Effect |
|---|---|---|
| Thinking | `#5EA2FF` | Soft pulsing glow |
| Generating | `#9B8CFF` | — |
| Validating | `#F6C760` | — |
| Complete | `#3DD9A5` | — |
| Failed | `#FF6B81` | — |

---

## Buttons

### Primary

```css
background: #5EA2FF;
color: #FFFFFF;

/* Hover */
background: #78B4FF;
```

### Secondary

```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);

/* Hover */
background: rgba(255,255,255,0.08);
```

---

## Shadows

> Avoid heavy black shadows. Use atmospheric shadows.

| Role | Value |
|---|---|
| Card Shadow | `0 10px 30px rgba(0,0,0,0.28)` |
| Floating Glow | `0 0 40px rgba(94,162,255,0.08)` |

---

## Gradients

> Use **very** carefully. Most UI stays restrained.

### AI Gradient

```css
background: linear-gradient(135deg, #5EA2FF 0%, #9B8CFF 100%);
```

Allowed only for: special states · hero interactions · traversal effects · AI generation.  
**Never** use everywhere.

---

## Motion & Animation Rules

### Animations should
- Explain state transitions
- Guide user focus
- Communicate AI activity

### Animations must never
- Flash aggressively
- Use rainbow color cycling
- Overuse glowing neon effects

### Target feeling
`calm` · `intelligent` · `spatial` · `trustworthy`

### Not
Gaming UI · Crypto dashboard · Sci-fi movie prop

---

## Quick Reference — Color Tokens

```css
/* Backgrounds */
--bg-workspace:   #0B0D12;
--bg-secondary:   #11141B;
--bg-surface:     #171B23;
--bg-hover:       #1D2330;
--bg-active:      #252C3B;

/* Text */
--text-primary:   #F5F7FA;
--text-secondary: #A8B3C7;
--text-muted:     #6B7280;
--text-disabled:  #4B5563;

/* Accents */
--accent-blue:    #5EA2FF;
--accent-violet:  #9B8CFF;
--accent-success: #3DD9A5;
--accent-warning: #F6C760;
--accent-error:   #FF6B81;

/* Borders */
--border-default: rgba(255,255,255,0.08);
--border-hover:   rgba(255,255,255,0.14);
--border-active:  rgba(96,165,250,0.45);

/* Glows */
--glow-blue:      rgba(94,162,255,0.35);
--glow-violet:    rgba(155,140,255,0.28);
--glow-float:     rgba(94,162,255,0.08);

/* Shadows */
--shadow-card:    0 10px 30px rgba(0,0,0,0.28);
--shadow-float:   0 0 40px rgba(94,162,255,0.08);
--shadow-node:    0 0 24px rgba(94,162,255,0.18);

/* Gradients */
--gradient-node:  linear-gradient(180deg, #171B23 0%, #131720 100%);
--gradient-ai:    linear-gradient(135deg, #5EA2FF 0%, #9B8CFF 100%);

/* Canvas */
--canvas-grid:    rgba(255,255,255,0.08);
--canvas-glow:    rgba(59,130,246,0.04);
```