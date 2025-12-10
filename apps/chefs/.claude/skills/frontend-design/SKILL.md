---
name: frontend-design
description: Guidelines for creating distinctive, high-quality frontend UI. Use when building or modifying React components, pages, or visual elements.
---

# Frontend Design Guidelines

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc.
- **Constraints**: Technical requirements (framework, performance, accessibility)
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

CRITICAL: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

## Frontend Aesthetics

### Typography
Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font.

**Never use**: Inter, Roboto, Arial, Open Sans, Lato, system fonts

**Preferred**: JetBrains Mono, Fira Code, Space Grotesk, Playfair Display, Crimson Pro, IBM Plex, Bricolage Grotesque, Newsreader

**Sizing**: Extreme weights (100/200 vs 800/900). Size jumps of 3x+, not 1.5x.

IMPORTANT: Vary fonts between projects. Never converge on common choices across generations.

### Color & Theme
- Commit to a cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes

### Motion
- Prioritize CSS-only solutions
- Use Motion library for React when available
- Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions
- Use scroll-triggering and hover states that surprise

### Spatial Composition
- Unexpected layouts
- Asymmetry and overlap
- Diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

### Backgrounds & Visual Details
Create atmosphere and depth rather than defaulting to solid colors:
- Gradient meshes
- Noise textures
- Geometric patterns
- Layered transparencies
- Dramatic shadows
- Decorative borders
- Custom cursors
- Grain overlays

## Avoid

NEVER use generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Cliched color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

## Implementation

Match implementation complexity to the aesthetic vision:
- **Maximalist designs**: Elaborate code with extensive animations and effects
- **Minimalist designs**: Restraint, precision, careful attention to spacing, typography, and subtle details

Elegance comes from executing the vision well. Code must be production-grade and functional.

No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. Interpret creatively and make unexpected choices that feel genuinely designed for the context.