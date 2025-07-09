import DOMPurify from 'dompurify';

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'strong', 'em', 'u', 's', 'sub', 'sup',
  'a', 'img', 'video', 'audio', 'iframe',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'figure', 'figcaption'
];

const DEFAULT_ALLOWED_ATTRIBUTES = {
  '*': ['class', 'id', 'style', 'data-*'],
  'a': ['href', 'target', 'rel', 'title'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'video': ['src', 'controls', 'width', 'height', 'poster'],
  'audio': ['src', 'controls'],
  'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
  'td': ['colspan', 'rowspan'],
  'th': ['colspan', 'rowspan']
};

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  allowDataUri?: boolean;
}

export function sanitizeHTML(
  html: string,
  options: SanitizeOptions = {}
): string {
  const config: any = {
    ALLOWED_TAGS: options.allowedTags || DEFAULT_ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: true,
    ALLOW_UNKNOWN_PROTOCOLS: false
  };

  const allowedAttributes = options.allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES;
  Object.entries(allowedAttributes).forEach(([tag, attrs]) => {
    attrs.forEach(attr => {
      if (tag === '*') {
        config.ALLOWED_ATTR.push(attr);
      } else {
        config.ALLOWED_ATTR.push(`${tag}:${attr}`);
      }
    });
  });

  if (options.allowedSchemes) {
    config.ALLOWED_URI_REGEXP = new RegExp(
      `^(${options.allowedSchemes.join('|')}):`,
      'i'
    );
  }

  if (options.allowDataUri) {
    config.ADD_DATA_URI_TAGS = ['img', 'video', 'audio'];
  }

  return DOMPurify.sanitize(html, config) as unknown as string;
}

export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function unescapeHTML(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

export function stripHTML(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

export function isValidURL(url: string): boolean {
  try {
    const parsedURL = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedURL.protocol);
  } catch {
    return false;
  }
}

export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  url = url.trim();
  
  if (url.startsWith('javascript:') || url.startsWith('data:')) {
    return '';
  }
  
  if (!url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
    url = 'https://' + url;
  }
  
  return isValidURL(url) ? url : '';
}