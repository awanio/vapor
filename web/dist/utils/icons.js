import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
const ICON_SIZES = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
};
export const TECH_ICONS = {
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
export function getIconPath(name, category = 'tech') {
    const filename = TECH_ICONS[name.toLowerCase()] || `${name.toLowerCase()}.svg`;
    return `/icons/${category}/${filename}`;
}
export function renderIcon(name, options = {}) {
    const { size = 'md', category = 'tech', className = '', alt = name } = options;
    const sizeClass = ICON_SIZES[size];
    const iconPath = getIconPath(name, category);
    return html `
    <img 
      src="${iconPath}" 
      alt="${alt}"
      class="${sizeClass} ${className}"
      loading="lazy"
    />
  `;
}
export async function loadInlineIcon(name, category = 'tech') {
    try {
        const iconPath = getIconPath(name, category);
        const response = await fetch(iconPath);
        if (!response.ok) {
            console.warn(`Icon not found: ${iconPath}`);
            return '';
        }
        let svgText = await response.text();
        if (!svgText.includes('fill=') || svgText.includes('fill="#')) {
            svgText = svgText.replace(/<path/g, '<path fill="currentColor"');
        }
        return svgText;
    }
    catch (error) {
        console.error(`Error loading icon ${name}:`, error);
        return '';
    }
}
export async function renderInlineIcon(name, options = {}) {
    const { size = 'md', category = 'tech', className = '' } = options;
    const sizeClass = ICON_SIZES[size];
    const svgContent = await loadInlineIcon(name, category);
    if (!svgContent) {
        return renderIcon(name, { size, category, className });
    }
    return html `
    <span class="${sizeClass} inline-block ${className}">
      ${unsafeHTML(svgContent)}
    </span>
  `;
}
export const icon = renderIcon;
export function hasIcon(name) {
    return name.toLowerCase() in TECH_ICONS;
}
export function getAvailableIcons() {
    return Object.keys(TECH_ICONS);
}
//# sourceMappingURL=icons.js.map