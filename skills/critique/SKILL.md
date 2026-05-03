---
name: critique
description: |
  Run a 5-dimension expert design review on any HTML artifact.
  Philosophy / Visual hierarchy / Detail / Functionality / Innovation,
  each scored 0–10. Outputs a radar chart + Keep / Fix / Quick-wins.
triggers:
  - "critique"
  - "design review"
  - "design audit"
  - "5-dim review"
  - "audit my design"
---

# Critique Skill · 5 维度专家评审

Produce a single-file HTML "design review report" that scores any artifact across 5 dimensions.

## The 5 dimensions

### 1. Philosophy consistency · 哲学一致性
Does the artifact pick a clear direction and stick to it?

**0–4** Three styles fighting. **5–6** One direction but half drift.
**7–8** Coherent, occasional drift. **9–10** Every element argues for the same thesis.

### 2. Visual hierarchy · 视觉层级
Can a stranger figure out what to read first, second, third?

**0–4** Everything shouts. **5–6** Hierarchy works on hero only.
**7–8** Clear tiers. **9–10** Eye moves with zero friction.

### 3. Detail execution · 细节执行
Alignment, leading, kerning, image framing, edge-case spacing.

**0–4** Visible tape and string. **5–6** Most pages clean.
**7–8** Polished, expert finds 2–3 misses. **9–10** Magazine-grade.

### 4. Functionality · 功能性
Does it work for its intended use? Click targets, nav, readability, mobile.

**0–4** Visually fine but doesn't work. **5–6** Core flow works.
**7–8** Robust. **9–10** Defensively engineered.

### 5. Innovation · 创新性
Does this push past the median? One element that makes people lean in?

**0–4** Generic AI-slop. **5–6** Competent and unmemorable.
**7–8** One memorable moment. **9–10** Multiple moves you'd steal.

## Workflow

1. **Acquire** — read the artifact HTML
2. **Score with evidence** — 30–80 words per dimension citing specific elements
3. **Build action lists** — Keep / Fix / Quick-wins
4. **Emit report HTML** — radar chart (SVG), 5 cards, action lists

## Hard rules

- **5 scores, every time** — no partial reports
- **Evidence per score** — no "feels off"
- **Don't grade-inflate** — mean above 8 is suspicious
- **Single-file HTML only** — inline everything
- **Radar chart is mandatory**
