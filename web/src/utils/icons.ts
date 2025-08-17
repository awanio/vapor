/**
 * Icon utility functions for managing custom technology icons
 */

import { html, TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IconCategory = 'tech' | 'custom';

const ICON_SIZES: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

/**
 * Technology icons mapping
 * Maps common technology names to their icon filenames
 */
export const TECH_ICONS: Record<string, string> = {
  kubernetes: 'kubernetes.svg',
  k8s: 'kubernetes.svg',
  ansible: 'ansible.svg',
  helm: 'helm.svg',
  docker: 'docker.svg',
  terraform: 'terraform.svg',
  jenkins: 'jenkins.svg',
  gitlab: 'gitlab.svg',
  github: 'github.svg',
  aws: 'aws.svg',
  azure: 'azure.svg',
  gcp: 'google-cloud.svg',
  nginx: 'nginx.svg',
  apache: 'apache.svg',
  redis: 'redis.svg',
  postgresql: 'postgresql.svg',
  mysql: 'mysql.svg',
  mongodb: 'mongodb.svg',
  elasticsearch: 'elasticsearch.svg',
  prometheus: 'prometheus.svg',
  grafana: 'grafana.svg',
  vault: 'vault.svg',
  consul: 'consul.svg',
  nomad: 'nomad.svg',
  linux: 'linux.svg',
  ubuntu: 'ubuntu.svg',
  centos: 'centos.svg',
  debian: 'debian.svg',
  redhat: 'redhat.svg'
};

/**
 * Get the full path to an icon
 */
export function getIconPath(name: string, category: IconCategory = 'tech'): string {
  const filename = TECH_ICONS[name.toLowerCase()] || `${name.toLowerCase()}.svg`;
  return `/icons/${category}/${filename}`;
}

/**
 * Render an icon as an img element
 */
export function renderIcon(
  name: string,
  options: {
    size?: IconSize;
    category?: IconCategory;
    className?: string;
    alt?: string;
  } = {}
): TemplateResult {
  const {
    size = 'md',
    category = 'tech',
    className = '',
    alt = name
  } = options;

  const sizeClass = ICON_SIZES[size];
  const iconPath = getIconPath(name, category);
  
  return html`
    <img 
      src="${iconPath}" 
      alt="${alt}"
      class="${sizeClass} ${className}"
      loading="lazy"
    />
  `;
}

/**
 * Load and render an SVG icon inline (allows for color customization)
 */
export async function loadInlineIcon(
  name: string,
  category: IconCategory = 'tech'
): Promise<string> {
  try {
    const iconPath = getIconPath(name, category);
    const response = await fetch(iconPath);
    
    if (!response.ok) {
      console.warn(`Icon not found: ${iconPath}`);
      return '';
    }
    
    let svgText = await response.text();
    
    // Add currentColor to paths if not already colored
    // This allows the icon to inherit the text color
    if (!svgText.includes('fill=') || svgText.includes('fill="#')) {
      svgText = svgText.replace(/<path/g, '<path fill="currentColor"');
    }
    
    return svgText;
  } catch (error) {
    console.error(`Error loading icon ${name}:`, error);
    return '';
  }
}

/**
 * Render an inline SVG icon with color customization
 */
export async function renderInlineIcon(
  name: string,
  options: {
    size?: IconSize;
    category?: IconCategory;
    className?: string;
  } = {}
): Promise<TemplateResult> {
  const {
    size = 'md',
    category = 'tech',
    className = ''
  } = options;

  const sizeClass = ICON_SIZES[size];
  const svgContent = await loadInlineIcon(name, category);
  
  if (!svgContent) {
    // Fallback to img element if inline loading fails
    return renderIcon(name, { size, category, className });
  }
  
  // Wrap the SVG in a span with size classes
  return html`
    <span class="${sizeClass} inline-block ${className}">
      ${unsafeHTML(svgContent)}
    </span>
  `;
}

/**
 * Icon component for use in Lit templates
 * Example: ${icon('kubernetes', { size: 'lg' })}
 */
export const icon = renderIcon;

/**
 * Check if an icon exists
 */
export function hasIcon(name: string): boolean {
  return name.toLowerCase() in TECH_ICONS;
}

/**
 * Get a list of all available tech icons
 */
export function getAvailableIcons(): string[] {
  return Object.keys(TECH_ICONS);
}
