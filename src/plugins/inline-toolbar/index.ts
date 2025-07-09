import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';
import { icons } from '../../ui/icons';

interface InlineToolbarConfig {
  items?: string[];
  offset?: { x: number; y: number };
  showDelay?: number;
}

export class InlineToolbarPlugin implements Plugin {
  name = 'inline-toolbar';
  private editor!: Editor;
  private config: InlineToolbarConfig;
  private toolbarElement!: HTMLElement;
  private isVisible = false;
  private hideTimeout?: NodeJS.Timeout;
  private showTimeout?: NodeJS.Timeout;
  
  private defaultItems = [
    'bold', 'italic', 'underline', 'strikethrough', '|',
    'link', 'textColor', '|',
    'heading'
  ];

  toolbar: ToolbarItem[] = [];

  constructor(config: InlineToolbarConfig = {}) {
    this.config = {
      items: config.items || this.defaultItems,
      offset: config.offset || { x: 0, y: -10 },
      showDelay: config.showDelay || 200
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    this.createToolbar();
    this.setupEventListeners();
    this.addStyles();
  }

  destroy(): void {
    this.hideToolbar();
    if (this.toolbarElement && this.toolbarElement.parentNode) {
      this.toolbarElement.remove();
    }
    document.removeEventListener('selectionchange', this.handleSelectionChange);
  }

  private createToolbar(): void {
    this.toolbarElement = createElement('div', {
      className: 'xeditor-inline-toolbar',
      role: 'toolbar',
      'aria-label': 'Inline formatting toolbar'
    });

    // Add toolbar items
    this.config.items!.forEach(itemName => {
      if (itemName === '|') {
        const separator = createElement('div', {
          className: 'xeditor-inline-toolbar__separator'
        });
        this.toolbarElement.appendChild(separator);
      } else {
        const button = this.createToolbarButton(itemName);
        if (button) {
          this.toolbarElement.appendChild(button);
        }
      }
    });

    // Add to body
    document.body.appendChild(this.toolbarElement);
  }

  private createToolbarButton(itemName: string): HTMLElement | null {
    const buttonConfig = this.getButtonConfig(itemName);
    if (!buttonConfig) return null;

    const button = createElement('button', {
      className: 'xeditor-inline-toolbar__button',
      type: 'button',
      title: buttonConfig.tooltip,
      'aria-label': buttonConfig.tooltip,
      'data-command': itemName
    });

    if (buttonConfig.icon) {
      button.innerHTML = buttonConfig.icon;
    } else if (buttonConfig.text) {
      button.textContent = buttonConfig.text;
    }

    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (buttonConfig.onClick) {
        buttonConfig.onClick();
      } else if (buttonConfig.command) {
        this.editor.execCommand(buttonConfig.command);
      }
      
      // Keep toolbar visible after command
      this.updatePosition();
    });

    return button;
  }

  private getButtonConfig(name: string): any {
    const configs: Record<string, any> = {
      bold: {
        icon: icons.bold,
        tooltip: 'Bold (Ctrl+B)',
        command: 'bold'
      },
      italic: {
        icon: icons.italic,
        tooltip: 'Italic (Ctrl+I)',
        command: 'italic'
      },
      underline: {
        icon: icons.underline,
        tooltip: 'Underline (Ctrl+U)',
        command: 'underline'
      },
      strikethrough: {
        icon: icons.strikethrough,
        tooltip: 'Strikethrough',
        command: 'strikethrough'
      },
      link: {
        icon: icons.link,
        tooltip: 'Insert Link',
        onClick: () => {
          const url = prompt('Enter URL:', 'https://');
          if (url) {
            this.editor.execCommand('createLink', url);
          }
        }
      },
      textColor: {
        icon: icons.textColor,
        tooltip: 'Text Color',
        onClick: () => {
          const colorPlugin = this.editor.plugins.get('color');
          if (colorPlugin && typeof (colorPlugin as any).showTextColorPicker === 'function') {
            (colorPlugin as any).showTextColorPicker();
          }
        }
      },
      heading: {
        text: 'H',
        tooltip: 'Heading',
        onClick: () => {
          this.showHeadingMenu();
        }
      }
    };

    return configs[name];
  }

  private showHeadingMenu(): void {
    const menu = createElement('div', {
      className: 'xeditor-inline-toolbar__menu'
    });

    for (let i = 1; i <= 6; i++) {
      const item = createElement('button', {
        className: 'xeditor-inline-toolbar__menu-item',
        type: 'button'
      });
      item.textContent = `Heading ${i}`;
      item.addEventListener('click', () => {
        this.editor.execCommand('formatBlock', `h${i}`);
        menu.remove();
      });
      menu.appendChild(item);
    }

    const rect = this.toolbarElement.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    
    document.body.appendChild(menu);
    
    // Remove menu on click outside
    setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
          document.removeEventListener('click', handleClickOutside);
        }
      };
      document.addEventListener('click', handleClickOutside);
    }, 0);
  }

  private setupEventListeners(): void {
    // Use bound function to maintain context
    this.handleSelectionChange = this.handleSelectionChange.bind(this);
    document.addEventListener('selectionchange', this.handleSelectionChange);
    
    // Hide on click outside
    document.addEventListener('mousedown', (e) => {
      if (this.isVisible && 
          !this.toolbarElement.contains(e.target as Node) && 
          !this.editor.contentElement.contains(e.target as Node)) {
        this.hideToolbar();
      }
    });

    // Hide on escape
    this.editor.contentElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hideToolbar();
      }
    });
  }

  private handleSelectionChange(): void {
    // Clear any existing timeouts
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    // Check if selection is within editor
    if (!this.editor.contentElement.contains(range.commonAncestorContainer)) {
      this.hideToolbar();
      return;
    }

    if (text.length > 0 && !range.collapsed) {
      // Show toolbar after delay
      this.showTimeout = setTimeout(() => {
        this.showToolbar();
        this.updatePosition();
      }, this.config.showDelay);
    } else {
      this.hideToolbar();
    }
  }

  private showToolbar(): void {
    if (this.isVisible) return;
    
    this.toolbarElement.style.display = 'flex';
    this.toolbarElement.classList.add('xeditor-inline-toolbar--visible');
    this.isVisible = true;
    
    // Update button states
    this.updateButtonStates();
  }

  private hideToolbar(): void {
    if (!this.isVisible) return;
    
    this.toolbarElement.classList.remove('xeditor-inline-toolbar--visible');
    this.isVisible = false;
    
    setTimeout(() => {
      if (!this.isVisible) {
        this.toolbarElement.style.display = 'none';
      }
    }, 200);
  }

  private updatePosition(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Calculate position
    const toolbarRect = this.toolbarElement.getBoundingClientRect();
    const left = rect.left + (rect.width - toolbarRect.width) / 2 + window.scrollX;
    const top = rect.top - toolbarRect.height + window.scrollY + this.config.offset!.y;
    
    // Keep toolbar within viewport
    const adjustedLeft = Math.max(10, Math.min(left, window.innerWidth - toolbarRect.width - 10));
    const adjustedTop = Math.max(10, top);
    
    this.toolbarElement.style.left = `${adjustedLeft}px`;
    this.toolbarElement.style.top = `${adjustedTop}px`;
  }

  private updateButtonStates(): void {
    const buttons = this.toolbarElement.querySelectorAll('[data-command]');
    buttons.forEach(button => {
      const command = button.getAttribute('data-command');
      if (command && this.editor.queryCommandState(command)) {
        button.classList.add('xeditor-inline-toolbar__button--active');
      } else {
        button.classList.remove('xeditor-inline-toolbar__button--active');
      }
    });
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-inline-toolbar {
        position: absolute;
        display: none;
        background: #333;
        border-radius: 4px;
        padding: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        opacity: 0;
        transform: translateY(-5px);
        transition: opacity 0.2s, transform 0.2s;
        flex-direction: row;
        align-items: center;
        gap: 2px;
      }
      
      .xeditor-inline-toolbar--visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      .xeditor-inline-toolbar::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid #333;
      }
      
      .xeditor-inline-toolbar__button {
        background: none;
        border: none;
        color: #fff;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 3px;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
      }
      
      .xeditor-inline-toolbar__button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .xeditor-inline-toolbar__button--active {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .xeditor-inline-toolbar__button svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
      
      .xeditor-inline-toolbar__separator {
        width: 1px;
        height: 20px;
        background-color: rgba(255, 255, 255, 0.3);
        margin: 0 4px;
      }
      
      .xeditor-inline-toolbar__menu {
        position: absolute;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 4px;
        z-index: 10002;
      }
      
      .xeditor-inline-toolbar__menu-item {
        display: block;
        width: 100%;
        padding: 8px 12px;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.2s;
        border-radius: 3px;
      }
      
      .xeditor-inline-toolbar__menu-item:hover {
        background-color: #f0f0f0;
      }
    `;
    
    document.head.appendChild(style);
  }
}