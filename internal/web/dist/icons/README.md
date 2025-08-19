# Custom Icons Directory

This directory contains custom SVG icons for technologies not available in standard icon libraries.

## Directory Structure

```
public/icons/
├── README.md           # This file
├── tech/              # Technology-specific icons
│   ├── kubernetes.svg
│   ├── ansible.svg
│   ├── helm.svg
│   ├── docker.svg
│   ├── terraform.svg
│   └── ...
└── custom/            # Other custom icons
    └── ...
```

## Usage in Components

### In Lit Components
```typescript
// Direct URL reference
html`<img src="/icons/tech/kubernetes.svg" alt="Kubernetes" class="w-6 h-6" />`

// Or as a background image
html`<div class="icon" style="background-image: url('/icons/tech/ansible.svg')"></div>`
```

### Inline SVG (for color customization)
```typescript
// You can also fetch and inline the SVG for better control
const response = await fetch('/icons/tech/helm.svg');
const svgText = await response.text();
// Then use unsafeHTML directive if needed
```

## Icon Sources

Recommended sources for technology icons:
- **Simple Icons**: https://simpleicons.org/ (Has Kubernetes, Ansible, Helm, Docker, etc.)
- **Devicon**: https://devicon.dev/ (Developer and technology icons)
- **VectorLogoZone**: https://www.vectorlogo.zone/ (Brand logos in SVG)
- **Official Sources**: Many projects provide official SVG logos in their brand guidelines

## Adding New Icons

1. Download the SVG file from a reputable source
2. Optimize the SVG (remove unnecessary attributes, minimize file size)
3. Place it in the appropriate subdirectory (`tech/` or `custom/`)
4. Ensure the SVG has proper viewBox attributes for scaling
5. Consider adding `fill="currentColor"` to paths for color theming

## Icon Guidelines

- **Format**: Use SVG format exclusively
- **Size**: Optimize SVGs to be under 5KB when possible
- **Naming**: Use lowercase with hyphens (e.g., `kubernetes.svg`, `ansible-tower.svg`)
- **Colors**: Consider using `currentColor` for monochrome icons to support theming
- **ViewBox**: Ensure all SVGs have a proper viewBox for responsive scaling
