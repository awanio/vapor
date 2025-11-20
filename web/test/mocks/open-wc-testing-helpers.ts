import { html as litHtml, render } from 'lit';
import type { TemplateResult } from 'lit';
import { LitElement } from 'lit';

export const html = litHtml;

export async function fixture<T extends HTMLElement>(template: TemplateResult): Promise<T> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(template, container);
  const element = container.firstElementChild as T;
  if (element instanceof LitElement) {
    await element.updateComplete;
  }
  return element;
}
