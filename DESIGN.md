---
version: alpha
name: DesignForge
description: Warm editorial minimalism with premium material finishes. Inspired by Claude's brand identity.
colors:
  parchment: "#f8f7f4"
  terracotta: "#c96442"
  sidebar: "#1a1917"
  ink: "#2a2927"
  stone: "#8a8884"
  linen: "#f0eeea"
  cream: "#fdfcfa"
typography:
  display:
    fontFamily: "Fraunces"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DM Sans"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
spacing:
  xs: 4
  sm: 8
  md: 16
  lg: 24
  xl: 32
  xxl: 48
borderRadius:
  sm: 6
  md: 10
  lg: 16
  xl: 24
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "#FFFFFF"
    rounded: "{borderRadius.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#b05535"
  card:
    backgroundColor: "{colors.cream}"
    borderColor: "rgba(138,136,132,0.2)"
    rounded: "{borderRadius.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.parchment}"
    borderColor: "rgba(138,136,132,0.2)"
    rounded: "{borderRadius.sm}"
    padding: "10px 14px"
---

## Overview

DesignForge's visual identity is built on warm editorial minimalism. The aesthetic draws from premium print design — think Kinfolk magazine meets Swiss modernism. Every surface, shadow, and transition is intentional.

## Colors

- **Parchment (#f8f7f4):** Primary background. Warm, inviting, never clinical.
- **Terracotta (#c96442):** The sole accent. Used for primary actions, active states, and key highlights. Saturation is deliberately restrained.
- **Sidebar (#1a1917):** Deep charcoal for dark mode panels and high-contrast sections.
- **Ink (#2a2927):** Primary text color. Near-black with warmth.
- **Stone (#8a8884):** Secondary text, metadata, descriptions.
- **Linen (#f0eeea):** Subtle background variations, hover states.
- **Cream (#fdfcfa):** Card surfaces, elevated containers.

## Typography

- **Display (Fraunces):** Used for headlines and hero text. Track-tight, weight-driven hierarchy. The serif adds editorial authority without feeling old-fashioned.
- **Body (DM Sans):** Neutral, highly readable sans-serif for all UI text. Relaxed leading for comfortable reading.
- **Mono (JetBrains Mono):** Code snippets, technical metadata, timestamps. Not used for body copy.

## Layout Principles

- 8px base grid unit
- Generous whitespace — elements breathe
- Max-width containers at 1280px for content
- Three-panel workspace: chat (320px) | canvas (flex) | tweaks (optional right)
- Mobile-first collapse: sidebar becomes bottom sheet, canvas stacks vertically

## Motion

- 200ms ease-out for panel transitions
- 300ms staggered fade-in for generation sequences
- 150ms for hover states
- No bouncy or playful animations — movement is precise and purposeful
