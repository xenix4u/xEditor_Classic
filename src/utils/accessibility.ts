/**
 * Accessibility utilities for xEditor
 */

import { Editor } from '../types';

export class AccessibilityManager {
  private liveRegion: HTMLElement;
  
  constructor() {
    this.liveRegion = this.createLiveRegion();
  }
  
  /**
   * Initialize accessibility features for the editor
   */
  init(editor: Editor): void {
    
    // Add skip links
    this.addSkipLinks(editor.wrapper);
    
    // Enhance focus indicators
    this.enhanceFocusIndicators();
    
    // Setup toolbar navigation if toolbar exists
    if (editor.toolbar) {
      this.setupToolbarNavigation(editor.toolbar.element);
    }
    
    // Add content ID for skip links
    editor.contentElement.id = 'xeditor-content';
    
    // Monitor content changes for heading hierarchy
    editor.on('change', () => {
      this.ensureHeadingHierarchy(editor.contentElement);
    });
    
    // Announce editor state changes
    editor.on('focus', () => {
      this.announce('Editor focused. Press Tab to navigate toolbar.');
    });
    
    editor.on('blur', () => {
      this.announce('Editor blurred.');
    });
    
    // Announce command executions
    editor.on('commandExecuted', (command: string) => {
      const announcements: Record<string, string> = {
        bold: 'Bold toggled',
        italic: 'Italic toggled',
        underline: 'Underline toggled',
        undo: 'Undo performed',
        redo: 'Redo performed',
        insertOrderedList: 'Ordered list inserted',
        insertUnorderedList: 'Unordered list inserted',
        insertImage: 'Image inserted',
        createLink: 'Link created'
      };
      
      if (announcements[command]) {
        this.announce(announcements[command]);
      }
    });
  }
  
  /**
   * Create an ARIA live region for screen reader announcements
   */
  private createLiveRegion(): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'xeditor-sr-only';
    region.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(region);
    return region;
  }
  
  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 1000);
  }
  
  /**
   * Add ARIA attributes to toolbar items
   */
  enhanceToolbarItem(element: HTMLElement, options: {
    label: string;
    pressed?: boolean;
    hasPopup?: boolean;
    expanded?: boolean;
    shortcut?: string;
  }): void {
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', options.label);
    
    if (options.pressed !== undefined) {
      element.setAttribute('aria-pressed', String(options.pressed));
    }
    
    if (options.hasPopup) {
      element.setAttribute('aria-haspopup', 'true');
    }
    
    if (options.expanded !== undefined) {
      element.setAttribute('aria-expanded', String(options.expanded));
    }
    
    if (options.shortcut) {
      const description = `${options.label}. Keyboard shortcut: ${options.shortcut}`;
      element.setAttribute('aria-label', description);
    }
  }
  
  /**
   * Set up keyboard navigation for toolbar
   */
  setupToolbarNavigation(toolbar: HTMLElement): void {
    const items = toolbar.querySelectorAll('.xeditor-toolbar__item');
    
    // Add tabindex to toolbar items
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    
    // Handle arrow key navigation
    toolbar.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        
        const currentIndex = Array.from(items).findIndex(item => 
          item === document.activeElement
        );
        
        let nextIndex: number;
        if (e.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % items.length;
        } else {
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = items.length - 1;
        }
        
        // Update tabindex
        items[currentIndex]?.setAttribute('tabindex', '-1');
        items[nextIndex]?.setAttribute('tabindex', '0');
        
        // Focus next item
        (items[nextIndex] as HTMLElement)?.focus();
      }
    });
  }
  
  /**
   * Add skip links for keyboard navigation
   */
  addSkipLinks(container: HTMLElement): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#xeditor-content';
    skipLink.className = 'xeditor-skip-link';
    skipLink.textContent = 'Skip to editor content';
    skipLink.style.cssText = `
      position: absolute;
      left: -10000px;
      top: 10px;
      z-index: 999;
      padding: 8px;
      background-color: #000;
      color: #fff;
      text-decoration: none;
    `;
    
    // Show on focus
    skipLink.addEventListener('focus', () => {
      skipLink.style.left = '10px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.left = '-10000px';
    });
    
    container.parentNode?.insertBefore(skipLink, container);
  }
  
  /**
   * Ensure proper heading hierarchy
   */
  ensureHeadingHierarchy(content: HTMLElement): void {
    const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      
      // Check for skipped heading levels
      if (level > lastLevel + 1 && lastLevel !== 0) {
        console.warn(`Heading hierarchy issue: h${level} follows h${lastLevel}`);
        this.announce(`Warning: Heading hierarchy may be incorrect`);
      }
      
      lastLevel = level;
    });
  }
  
  /**
   * Add focus indicators
   */
  enhanceFocusIndicators(): void {
    const style = document.createElement('style');
    style.textContent = `
      .xeditor-wrapper *:focus {
        outline: 2px solid var(--xeditor-primary);
        outline-offset: 2px;
      }
      
      .xeditor-wrapper *:focus:not(:focus-visible) {
        outline: none;
      }
      
      .xeditor-wrapper *:focus-visible {
        outline: 2px solid var(--xeditor-primary);
        outline-offset: 2px;
      }
      
      @media (prefers-reduced-motion: reduce) {
        .xeditor-wrapper * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      @media (prefers-contrast: high) {
        .xeditor-wrapper {
          --xeditor-border: #000;
          --xeditor-primary: #0066cc;
        }
        
        .xeditor-toolbar__item {
          border: 1px solid #000;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Clean up
   */
  destroy(): void {
    this.liveRegion.remove();
  }
}

/**
 * Get accessible name for an element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent || '';
  }
  
  // Check title
  const title = element.getAttribute('title');
  if (title) return title;
  
  // Use text content as fallback
  return element.textContent || '';
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches;
}