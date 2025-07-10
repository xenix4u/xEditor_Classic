/**
 * Icon Management Plugin for xEditor
 * Provides proper icons and tooltips for toolbar items
 */

import { Plugin } from '../../types';

export class IconsPlugin implements Plugin {
  name = 'icons';
  private editor: any;

  // Icon definitions with proper Unicode symbols and tooltips
  private icons: { [key: string]: { icon: string; tooltip: string } } = {
    // Basic formatting
    'bold': { icon: '𝐁', tooltip: 'Bold (Ctrl+B)' },
    'italic': { icon: '𝐼', tooltip: 'Italic (Ctrl+I)' },
    'underline': { icon: '𝐔', tooltip: 'Underline (Ctrl+U)' },
    'strikethrough': { icon: '𝐒', tooltip: 'Strikethrough' },
    
    // Text alignment
    'alignLeft': { icon: '⫸', tooltip: 'Align Left' },
    'alignCenter': { icon: '⫹', tooltip: 'Align Center' },
    'alignRight': { icon: '⫷', tooltip: 'Align Right' },
    'alignJustify': { icon: '⫼', tooltip: 'Justify' },
    
    // Indentation
    'indent': { icon: '⇥', tooltip: 'Increase Indent' },
    'outdent': { icon: '⇤', tooltip: 'Decrease Indent' },
    
    // Lists
    'orderedList': { icon: '1.', tooltip: 'Numbered List' },
    'unorderedList': { icon: '•', tooltip: 'Bullet List' },
    'checklist': { icon: '☑', tooltip: 'Checklist' },
    
    // Headings
    'heading': { icon: 'H', tooltip: 'Heading' },
    'h1': { icon: 'H₁', tooltip: 'Heading 1' },
    'h2': { icon: 'H₂', tooltip: 'Heading 2' },
    'h3': { icon: 'H₃', tooltip: 'Heading 3' },
    'paragraph': { icon: '¶', tooltip: 'Paragraph' },
    
    // Media
    'image': { icon: '🖼️', tooltip: 'Insert Image' },
    'video': { icon: '🎥', tooltip: 'Insert Video' },
    'link': { icon: '🔗', tooltip: 'Insert Link' },
    'table': { icon: '⊞', tooltip: 'Insert Table' },
    
    // Code
    'codeBlock': { icon: '</>', tooltip: 'Code Block' },
    'code': { icon: '⟨⟩', tooltip: 'Inline Code' },
    'source': { icon: '📄', tooltip: 'Source Code' },
    
    // Colors
    'textColor': { icon: '🎨', tooltip: 'Text Color' },
    'backgroundColor': { icon: '🖍️', tooltip: 'Background Color' },
    'highlight': { icon: '🖊️', tooltip: 'Highlight' },
    
    // Font
    'fontFamily': { icon: 'Aa', tooltip: 'Font Family' },
    'fontSize': { icon: '⌘', tooltip: 'Font Size' },
    
    // Actions
    'undo': { icon: '↶', tooltip: 'Undo (Ctrl+Z)' },
    'redo': { icon: '↷', tooltip: 'Redo (Ctrl+Y)' },
    'clear': { icon: '🗑️', tooltip: 'Clear Formatting' },
    
    // Special
    'emoji': { icon: '😀', tooltip: 'Insert Emoji' },
    'specialChars': { icon: '℧', tooltip: 'Special Characters' },
    'quote': { icon: '❝', tooltip: 'Quote' },
    'hr': { icon: '—', tooltip: 'Horizontal Rule' },
    
    // Tools
    'findReplace': { icon: '🔍', tooltip: 'Find & Replace' },
    'print': { icon: '🖨️', tooltip: 'Print' },
    'fullscreen': { icon: '⛶', tooltip: 'Full Screen' },
    'settings': { icon: '⚙️', tooltip: 'Settings' },
    
    // Statistics
    'wordCount': { icon: '📊', tooltip: 'Word Count' },
    'charCount': { icon: '📈', tooltip: 'Character Count' },
    
    // Comments and tracking
    'comments': { icon: '💬', tooltip: 'Comments' },
    'trackChanges': { icon: '📝', tooltip: 'Track Changes' },
    'versions': { icon: '📋', tooltip: 'Version History' },
    
    // File operations
    'save': { icon: '💾', tooltip: 'Save' },
    'export': { icon: '📤', tooltip: 'Export' },
    'import': { icon: '📥', tooltip: 'Import' },
    
    // Mobile
    'mobile': { icon: '📱', tooltip: 'Mobile View' },
    'touch': { icon: '👆', tooltip: 'Touch Mode' }
  };

  init(editor: any) {
    this.editor = editor;
    this.updateToolbarIcons();
    this.addIconStyles();
    
    return {};
  }

  private updateToolbarIcons() {
    // Wait for toolbar to be ready
    setTimeout(() => {
      const toolbar = this.editor.wrapper.querySelector('.xeditor-toolbar');
      if (!toolbar) return;

      // Update all toolbar items
      const items = toolbar.querySelectorAll('.xeditor-toolbar__item');
      items.forEach((item: Element) => {
        const itemElement = item as HTMLElement;
        const command = itemElement.dataset.command;
        
        if (command && this.icons[command]) {
          const iconData = this.icons[command];
          
          // Update icon
          const iconElement = itemElement.querySelector('.xeditor-toolbar__icon');
          if (iconElement) {
            iconElement.textContent = iconData.icon;
          } else {
            // Create icon element if it doesn't exist
            const newIcon = document.createElement('span');
            newIcon.className = 'xeditor-toolbar__icon';
            newIcon.textContent = iconData.icon;
            itemElement.insertBefore(newIcon, itemElement.firstChild);
          }
          
          // Update tooltip
          itemElement.title = iconData.tooltip;
          itemElement.setAttribute('aria-label', iconData.tooltip);
        }
      });

      // Fix separator duplicates
      this.fixSeparatorDuplicates(toolbar);
    }, 100);
  }

  private fixSeparatorDuplicates(toolbar: Element) {
    const separators = toolbar.querySelectorAll('.xeditor-toolbar__separator');
    let lastWasSeparator = false;
    
    separators.forEach((separator: Element) => {
      const separatorElement = separator as HTMLElement;
      
      // Hide consecutive separators
      if (lastWasSeparator) {
        separatorElement.style.display = 'none';
      } else {
        separatorElement.style.display = '';
      }
      
      // Check if next sibling is also a separator
      const nextSibling = separatorElement.nextElementSibling;
      lastWasSeparator = !!(nextSibling && nextSibling.classList.contains('xeditor-toolbar__separator'));
    });
    
    // Hide separators at the beginning or end
    const firstChild = toolbar.firstElementChild;
    const lastChild = toolbar.lastElementChild;
    
    if (firstChild && firstChild.classList.contains('xeditor-toolbar__separator')) {
      (firstChild as HTMLElement).style.display = 'none';
    }
    
    if (lastChild && lastChild.classList.contains('xeditor-toolbar__separator')) {
      (lastChild as HTMLElement).style.display = 'none';
    }
  }

  private addIconStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .xeditor-toolbar__icon {
        font-size: 16px;
        line-height: 1;
        display: inline-block;
        min-width: 16px;
        text-align: center;
      }
      
      .xeditor-toolbar__item {
        position: relative;
        transition: all 0.2s ease;
      }
      
      .xeditor-toolbar__item:hover::after {
        content: attr(title);
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        opacity: 0;
        animation: tooltip-show 0.2s ease forwards;
      }
      
      @keyframes tooltip-show {
        from { opacity: 0; transform: translateX(-50%) translateY(-5px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      
      .xeditor-toolbar__separator {
        width: 1px;
        height: 24px;
        background: #ddd;
        margin: 0 4px;
        display: inline-block;
        vertical-align: middle;
      }
      
      .xeditor-toolbar__separator + .xeditor-toolbar__separator {
        display: none !important;
      }
      
      /* Fix icon alignment */
      .xeditor-toolbar__item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        padding: 4px;
        margin: 2px;
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }
      
      .xeditor-toolbar__item:hover {
        background: #f0f0f0;
        border-color: #ccc;
      }
      
      .xeditor-toolbar__item.active {
        background: #e6f3ff;
        border-color: #007bff;
        color: #007bff;
      }
    `;
    document.head.appendChild(style);
  }

  // Get icon for a command
  getIcon(command: string): string {
    return this.icons[command]?.icon || command;
  }

  // Get tooltip for a command
  getTooltip(command: string): string {
    return this.icons[command]?.tooltip || command;
  }

  // Add custom icon
  addIcon(command: string, icon: string, tooltip: string) {
    this.icons[command] = { icon, tooltip };
    this.updateToolbarIcons();
  }

  // Update existing icon
  updateIcon(command: string, icon?: string, tooltip?: string) {
    if (this.icons[command]) {
      if (icon) this.icons[command].icon = icon;
      if (tooltip) this.icons[command].tooltip = tooltip;
      this.updateToolbarIcons();
    }
  }

  destroy() {
    // Clean up styles
    const style = document.querySelector('style[data-plugin="icons"]');
    if (style) {
      style.remove();
    }
  }
}