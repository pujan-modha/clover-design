export interface SkillInput {
  name: string;
  type: "string" | "integer" | "boolean" | "enum";
  label: string;
  options?: string[];
}

export interface SkillParameter {
  name: string;
  type: "hue" | "spacing" | "font-scale" | "opacity" | "number";
  label: string;
  min?: number;
  max?: number;
}

export interface SkillOutput {
  primary: string;
  secondary?: string[];
}

export interface Skill {
  id: string;
  name: string;
  mode: "prototype" | "deck" | "template" | "design-system";
  preview: "html" | "jsx" | "markdown";
  body: string;
  inputs: SkillInput[];
  parameters: SkillParameter[];
  outputs: SkillOutput;
  capabilities: string[];
}

/** Static skill registry — loaded at build time from /skills directory. */
const SKILL_REGISTRY: Record<string, Skill> = {
  "minimal-landing": {
    id: "minimal-landing",
    name: "Minimal Landing Page",
    mode: "prototype",
    preview: "html",
    body: `Generate a minimal, high-conversion landing page with:
- Asymmetric hero with large typography
- Social proof section (logos or testimonials)
- Feature grid with subtle hover states
- CTA section with clear value proposition
- Footer with minimal links

Design constraints:
- Use a single accent color derived from accentHue
- Density controls spacing (0.8 = airy, 1.5 = compact)
- No generic marketing copy — be specific and concrete
- Use CSS custom properties for all tokens`,
    inputs: [
      { name: "brandName", type: "string", label: "Brand Name" },
      { name: "tagline", type: "string", label: "Tagline" },
    ],
    parameters: [
      { name: "accentHue", type: "hue", label: "Accent Hue", min: 0, max: 360 },
      { name: "density", type: "spacing", label: "Density", min: 0.8, max: 1.5 },
    ],
    outputs: { primary: "index.html" },
    capabilities: ["html-generation", "css-variables", "responsive"],
  },
  "saas-dashboard": {
    id: "saas-dashboard",
    name: "SaaS Dashboard",
    mode: "prototype",
    preview: "html",
    body: `Generate a functional SaaS dashboard layout with:
- Collapsible sidebar navigation
- Header with search, notifications, and user avatar
- KPI cards with trend indicators
- Data table with sorting and pagination UI
- Activity feed or chart section
- Responsive grid that collapses on mobile

Design constraints:
- Use a neutral base with a single accent
- Card-based layout with subtle shadows
- Accessible color contrast
- Interactivity hints (hover states, focus rings)`,
    inputs: [
      { name: "appName", type: "string", label: "App Name" },
      { name: "primaryMetric", type: "string", label: "Primary Metric" },
    ],
    parameters: [
      { name: "accentHue", type: "hue", label: "Accent Hue", min: 0, max: 360 },
      { name: "sidebarWidth", type: "number", label: "Sidebar Width (px)", min: 200, max: 320 },
    ],
    outputs: { primary: "index.html" },
    capabilities: ["html-generation", "css-variables", "responsive", "data-viz"],
  },
  "portfolio-site": {
    id: "portfolio-site",
    name: "Creative Portfolio",
    mode: "prototype",
    preview: "html",
    body: `Generate a bold creative portfolio with:
- Full-bleed hero with large name/headline
- Project grid with hover reveals
- About section with typography hierarchy
- Contact form layout
- Smooth scroll behavior

Design constraints:
- Experimental typography (oversized headings)
- Asymmetric layouts
- Strong visual hierarchy
- Generous whitespace`,
    inputs: [
      { name: "name", type: "string", label: "Your Name" },
      { name: "role", type: "string", label: "Role / Title" },
    ],
    parameters: [
      { name: "accentHue", type: "hue", label: "Accent Hue", min: 0, max: 360 },
      { name: "fontScale", type: "font-scale", label: "Type Scale", min: 1.2, max: 1.618 },
    ],
    outputs: { primary: "index.html" },
    capabilities: ["html-generation", "css-variables", "responsive", "typography"],
  },
  "ecommerce-product": {
    id: "ecommerce-product",
    name: "E-commerce Product Page",
    mode: "prototype",
    preview: "html",
    body: `Generate a polished e-commerce product page with:
- Product image gallery (placeholder images)
- Price, variant selector, and Add to Cart button
- Product details tabs (description, specs, reviews)
- Related products grid
- Trust badges and shipping info

Design constraints:
- Clean, trustworthy aesthetic
- Clear CTAs with high contrast
- Mobile-first responsive layout
- Accessible form controls`,
    inputs: [
      { name: "productName", type: "string", label: "Product Name" },
      { name: "price", type: "string", label: "Price" },
    ],
    parameters: [
      { name: "accentHue", type: "hue", label: "Accent Hue", min: 0, max: 360 },
    ],
    outputs: { primary: "index.html" },
    capabilities: ["html-generation", "css-variables", "responsive", "forms"],
  },
  "design-system": {
    id: "design-system",
    name: "Design System Generator",
    mode: "design-system",
    preview: "html",
    body: `Generate a complete design system page showing:
- Color palette with hex values and usage rules
- Typography scale with font sizes and line heights
- Spacing scale with visual examples
- Component primitives (buttons, inputs, cards)
- Shadow and border-radius tokens

Output format:
- A single HTML file with embedded CSS
- CSS custom properties for all tokens
- Interactive swatches that show copy-to-clipboard`,
    inputs: [
      { name: "brandName", type: "string", label: "Brand Name" },
    ],
    parameters: [
      { name: "accentHue", type: "hue", label: "Accent Hue", min: 0, max: 360 },
      { name: "baseFontSize", type: "number", label: "Base Font Size (px)", min: 14, max: 18 },
    ],
    outputs: { primary: "design-system.html" },
    capabilities: ["html-generation", "css-variables", "tokens"],
  },
  "pitch-deck": {
    id: "pitch-deck",
    name: "Pitch Deck",
    mode: "deck",
    preview: "html",
    body: `Generate a slide-style pitch deck with:
- Title slide with company name and one-liner
- Problem / Solution slides
- Market opportunity with visual representation
- Business model slide
- Team slide layout
- Closing / CTA slide

Design constraints:
- Slide aspect ratio 16:9
- Large readable typography
- Minimal text per slide
- Strong visual hierarchy`,
    inputs: [
      { name: "companyName", type: "string", label: "Company Name" },
      { name: "oneLiner", type: "string", label: "One-liner" },
    ],
    parameters: [
      { name: "accentHue", type: "hue", label: "Accent Hue", min: 0, max: 360 },
      { name: "slides", type: "number", label: "Number of Slides", min: 5, max: 12 },
    ],
    outputs: { primary: "pitch-deck.html" },
    capabilities: ["html-generation", "css-variables", "presentation"],
  },
};

export function loadSkill(skillId: string): Skill | null {
  return SKILL_REGISTRY[skillId] ?? null;
}

export function loadAllSkills(): Skill[] {
  return Object.values(SKILL_REGISTRY);
}

export function formatSkillForPrompt(skill: Skill, inputValues?: Record<string, string>): string {
  let prompt = `# Skill: ${skill.name}\n\n${skill.body}\n`;

  if (skill.inputs.length > 0) {
    prompt += "\n## Provided Inputs\n";
    for (const input of skill.inputs) {
      const value = inputValues?.[input.name] ?? "(not provided)";
      prompt += `- ${input.label}: ${value}\n`;
    }
  }

  if (skill.parameters.length > 0) {
    prompt += "\n## Adjustable Parameters\n";
    for (const param of skill.parameters) {
      prompt += `- ${param.label} (${param.type})\n`;
    }
  }

  prompt += `\n## Output\nGenerate the primary output file: ${skill.outputs.primary}\n`;
  return prompt;
}
