import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface QuickInsertItem {
  label: string;
  icon?: string;
  keywords?: string[];
  action: () => void;
  category?: string;
}

interface QuickInsertConfig {
  trigger?: string;
  items?: QuickInsertItem[];
  maxItems?: number;
}

export class QuickInsertPlugin implements Plugin {
  name = 'quick-insert';
  private editor!: Editor;
  private config: QuickInsertConfig;
  private menu?: HTMLElement;
  private isVisible = false;
  private triggerPosition?: { left: number; top: number };
  private selectedIndex = 0;
  private filteredItems: QuickInsertItem[] = [];
  private searchQuery = '';

  toolbar: ToolbarItem[] = [];

  constructor(config: QuickInsertConfig = {}) {
    this.config = {
      trigger: config.trigger || '/',
      maxItems: config.maxItems || 10,
      items: config.items || this.getDefaultItems(),
      ...config
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    this.setupEventListeners();
    this.addStyles();
  }

  destroy(): void {
    this.hideMenu();
    this.editor.contentElement.removeEventListener('keydown', this.handleKeyDown);
    this.editor.contentElement.removeEventListener('keyup', this.handleKeyUp);
  }

  private getDefaultItems(): QuickInsertItem[] {
    return [
      {
        label: 'Heading 1',
        icon: 'H1',
        keywords: ['h1', 'heading', 'title'],
        category: 'Basic',
        action: () => {
          this.editor.execCommand('formatBlock', 'h1');
        }
      },
      {
        label: 'Heading 2',
        icon: 'H2',
        keywords: ['h2', 'heading', 'subtitle'],
        category: 'Basic',
        action: () => {
          this.editor.execCommand('formatBlock', 'h2');
        }
      },
      {
        label: 'Heading 3',
        icon: 'H3',
        keywords: ['h3', 'heading'],
        category: 'Basic',
        action: () => {
          this.editor.execCommand('formatBlock', 'h3');
        }
      },
      {
        label: 'Paragraph',
        icon: '¶',
        keywords: ['p', 'paragraph', 'text'],
        category: 'Basic',
        action: () => {
          this.editor.execCommand('formatBlock', 'p');
        }
      },
      {
        label: 'Bullet List',
        icon: '•',
        keywords: ['ul', 'list', 'bullet', 'unordered'],
        category: 'Lists',
        action: () => {
          this.editor.execCommand('insertUnorderedList');
        }
      },
      {
        label: 'Numbered List',
        icon: '1.',
        keywords: ['ol', 'list', 'numbered', 'ordered'],
        category: 'Lists',
        action: () => {
          this.editor.execCommand('insertOrderedList');
        }
      },
      {
        label: 'Checklist',
        icon: '☑',
        keywords: ['todo', 'task', 'checkbox', 'checklist'],
        category: 'Lists',
        action: () => {
          const checklistPlugin = this.editor.plugins.get('checklist');
          if (checklistPlugin && typeof (checklistPlugin as any).insertChecklist === 'function') {
            (checklistPlugin as any).insertChecklist();
          }
        }
      },
      {
        label: 'Blockquote',
        icon: '"',
        keywords: ['quote', 'blockquote', 'citation'],
        category: 'Basic',
        action: () => {
          this.editor.execCommand('formatBlock', 'blockquote');
        }
      },
      {
        label: 'Code Block',
        icon: '</>',
        keywords: ['code', 'pre', 'snippet', 'programming'],
        category: 'Code',
        action: () => {
          const codePlugin = this.editor.plugins.get('codeblock');
          if (codePlugin && typeof (codePlugin as any).showCodeBlockDialog === 'function') {
            (codePlugin as any).showCodeBlockDialog();
          }
        }
      },
      {
        label: 'Horizontal Rule',
        icon: '—',
        keywords: ['hr', 'line', 'divider', 'separator'],
        category: 'Basic',
        action: () => {
          this.editor.execCommand('insertHorizontalRule');
        }
      },
      {
        label: 'Image',
        icon: '🖼️',
        keywords: ['img', 'picture', 'photo', 'media'],
        category: 'Media',
        action: () => {
          const imagePlugin = this.editor.plugins.get('image');
          if (imagePlugin && typeof (imagePlugin as any).showImageDialog === 'function') {
            (imagePlugin as any).showImageDialog();
          }
        }
      },
      {
        label: 'Video',
        icon: '🎥',
        keywords: ['video', 'movie', 'media', 'mp4'],
        category: 'Media',
        action: () => {
          const videoPlugin = this.editor.plugins.get('video');
          if (videoPlugin && typeof (videoPlugin as any).showVideoDialog === 'function') {
            (videoPlugin as any).showVideoDialog();
          }
        }
      },
      {
        label: 'Table',
        icon: '⊞',
        keywords: ['table', 'grid', 'rows', 'columns'],
        category: 'Advanced',
        action: () => {
          const tablePlugin = this.editor.plugins.get('table');
          if (tablePlugin && typeof (tablePlugin as any).showTableDialog === 'function') {
            (tablePlugin as any).showTableDialog();
          }
        }
      },
      {
        label: 'Link',
        icon: '🔗',
        keywords: ['link', 'url', 'href', 'anchor'],
        category: 'Basic',
        action: () => {
          const linkPlugin = this.editor.plugins.get('link');
          if (linkPlugin && typeof (linkPlugin as any).showLinkDialog === 'function') {
            (linkPlugin as any).showLinkDialog();
          }
        }
      },
      {
        label: 'Emoji',
        icon: '😀',
        keywords: ['emoji', 'emoticon', 'smiley', 'face'],
        category: 'Insert',
        action: () => {
          const emojiPlugin = this.editor.plugins.get('emoji');
          if (emojiPlugin && typeof (emojiPlugin as any).showEmojiPicker === 'function') {
            (emojiPlugin as any).showEmojiPicker();
          }
        }
      },
      {
        label: 'Special Character',
        icon: 'Ω',
        keywords: ['special', 'symbol', 'character', 'omega'],
        category: 'Insert',
        action: () => {
          const specialCharsPlugin = this.editor.plugins.get('special-chars');
          if (specialCharsPlugin && typeof (specialCharsPlugin as any).showCharPicker === 'function') {
            (specialCharsPlugin as any).showCharPicker();
          }
        }
      }
    ];
  }

  private setupEventListeners(): void {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    this.editor.contentElement.addEventListener('keydown', this.handleKeyDown);
    this.editor.contentElement.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.isVisible) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectPrevious();
          break;
        case 'Enter':
          e.preventDefault();
          this.executeSelected();
          break;
        case 'Escape':
          e.preventDefault();
          this.hideMenu();
          break;
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const textBeforeCursor = this.getTextBeforeCursor(range);

    // Check if trigger was typed
    if (e.key === this.config.trigger && !this.isVisible) {
      const rect = range.getBoundingClientRect();
      this.triggerPosition = {
        left: rect.left,
        top: rect.bottom
      };
      this.showMenu();
      this.searchQuery = '';
      this.filterItems('');
    } else if (this.isVisible) {
      // Check if still in trigger mode
      const triggerMatch = textBeforeCursor.match(new RegExp(`\\${this.config.trigger}([^\\s]*)$`));
      
      if (triggerMatch) {
        this.searchQuery = triggerMatch[1];
        this.filterItems(this.searchQuery);
      } else {
        // User typed space or moved cursor away
        this.hideMenu();
      }
    }
  }

  private getTextBeforeCursor(range: Range): string {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    if (container.nodeType === Node.TEXT_NODE) {
      return container.textContent?.substring(0, offset) || '';
    }
    
    return '';
  }

  private showMenu(): void {
    if (!this.menu) {
      this.menu = this.createMenu();
      document.body.appendChild(this.menu);
    }

    this.isVisible = true;
    this.menu.style.display = 'block';
    this.updateMenuPosition();
  }

  private hideMenu(): void {
    if (this.menu) {
      this.menu.style.display = 'none';
    }
    this.isVisible = false;
    this.selectedIndex = 0;
    this.searchQuery = '';
  }

  private createMenu(): HTMLElement {
    const menu = createElement('div', {
      className: 'xeditor-quickinsert-menu'
    });

    return menu;
  }

  private updateMenuPosition(): void {
    if (!this.menu || !this.triggerPosition) return;

    const menuRect = this.menu.getBoundingClientRect();
    let left = this.triggerPosition.left;
    let top = this.triggerPosition.top + 5;

    // Keep menu within viewport
    if (left + menuRect.width > window.innerWidth) {
      left = window.innerWidth - menuRect.width - 10;
    }

    if (top + menuRect.height > window.innerHeight) {
      top = this.triggerPosition.top - menuRect.height - 25;
    }

    this.menu.style.left = `${left}px`;
    this.menu.style.top = `${top}px`;
  }

  private filterItems(query: string): void {
    query = query.toLowerCase();
    
    if (!query) {
      this.filteredItems = [...this.config.items!];
    } else {
      this.filteredItems = this.config.items!.filter(item => {
        const labelMatch = item.label.toLowerCase().includes(query);
        const keywordMatch = item.keywords?.some(k => k.toLowerCase().includes(query));
        const categoryMatch = item.category?.toLowerCase().includes(query);
        
        return labelMatch || keywordMatch || categoryMatch;
      });
    }

    // Limit items
    this.filteredItems = this.filteredItems.slice(0, this.config.maxItems);
    
    // Reset selection
    this.selectedIndex = 0;
    
    // Render items
    this.renderItems();
  }

  private renderItems(): void {
    if (!this.menu) return;

    this.menu.innerHTML = '';

    if (this.filteredItems.length === 0) {
      const empty = createElement('div', {
        className: 'xeditor-quickinsert-empty'
      }, ['No matching items']);
      this.menu.appendChild(empty);
      return;
    }

    // Group by category
    const groups = this.groupByCategory(this.filteredItems);

    Object.entries(groups).forEach(([category, items]) => {
      if (category !== 'undefined') {
        const categoryHeader = createElement('div', {
          className: 'xeditor-quickinsert-category'
        }, [category]);
        this.menu!.appendChild(categoryHeader);
      }

      items.forEach((item) => {
        const globalIndex = this.filteredItems.indexOf(item);
        const itemElement = this.createMenuItem(item, globalIndex === this.selectedIndex);
        this.menu!.appendChild(itemElement);
      });
    });

    this.updateMenuPosition();
  }

  private groupByCategory(items: QuickInsertItem[]): Record<string, QuickInsertItem[]> {
    return items.reduce((groups, item) => {
      const category = item.category || 'undefined';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, QuickInsertItem[]>);
  }

  private createMenuItem(item: QuickInsertItem, isSelected: boolean): HTMLElement {
    const menuItem = createElement('div', {
      className: `xeditor-quickinsert-item ${isSelected ? 'selected' : ''}`
    });

    const icon = createElement('span', {
      className: 'xeditor-quickinsert-icon'
    }, [item.icon || '']);

    const label = createElement('span', {
      className: 'xeditor-quickinsert-label'
    }, [item.label]);

    menuItem.appendChild(icon);
    menuItem.appendChild(label);

    menuItem.addEventListener('click', () => {
      this.executeItem(item);
    });

    return menuItem;
  }

  private selectNext(): void {
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
    this.renderItems();
  }

  private selectPrevious(): void {
    this.selectedIndex = this.selectedIndex === 0 ? 
      this.filteredItems.length - 1 : 
      this.selectedIndex - 1;
    this.renderItems();
  }

  private executeSelected(): void {
    if (this.filteredItems[this.selectedIndex]) {
      this.executeItem(this.filteredItems[this.selectedIndex]);
    }
  }

  private executeItem(item: QuickInsertItem): void {
    // Remove the trigger text
    this.removeTriggerText();
    
    // Execute the action
    item.action();
    
    // Hide menu
    this.hideMenu();
  }

  private removeTriggerText(): void {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    
    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent || '';
      const triggerLength = this.config.trigger!.length + this.searchQuery.length;
      const newText = text.substring(0, range.startOffset - triggerLength);
      
      container.textContent = newText;
      
      // Reset cursor position
      range.setStart(container, newText.length);
      range.setEnd(container, newText.length);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-quickinsert-menu {
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 10001;
        display: none;
      }
      
      .xeditor-quickinsert-category {
        padding: 8px 12px 4px;
        font-size: 12px;
        font-weight: 600;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .xeditor-quickinsert-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .xeditor-quickinsert-item:hover,
      .xeditor-quickinsert-item.selected {
        background-color: #f0f0f0;
      }
      
      .xeditor-quickinsert-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        font-size: 16px;
        color: #666;
      }
      
      .xeditor-quickinsert-label {
        flex: 1;
        font-size: 14px;
      }
      
      .xeditor-quickinsert-empty {
        padding: 16px;
        text-align: center;
        color: #999;
        font-size: 14px;
      }
      
      /* Scrollbar styling */
      .xeditor-quickinsert-menu::-webkit-scrollbar {
        width: 6px;
      }
      
      .xeditor-quickinsert-menu::-webkit-scrollbar-track {
        background: #f0f0f0;
      }
      
      .xeditor-quickinsert-menu::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;
      }
      
      .xeditor-quickinsert-menu::-webkit-scrollbar-thumb:hover {
        background: #999;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-quickinsert-menu {
        background: #2d2d2d;
        border-color: #444;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-quickinsert-category {
        color: #aaa;
        border-color: #444;
      }
      
      [data-theme="dark"] .xeditor-quickinsert-item:hover,
      [data-theme="dark"] .xeditor-quickinsert-item.selected {
        background-color: #444;
      }
      
      [data-theme="dark"] .xeditor-quickinsert-icon {
        color: #aaa;
      }
      
      [data-theme="dark"] .xeditor-quickinsert-empty {
        color: #666;
      }
      
      [data-theme="dark"] .xeditor-quickinsert-menu::-webkit-scrollbar-track {
        background: #3d3d3d;
      }
      
      [data-theme="dark"] .xeditor-quickinsert-menu::-webkit-scrollbar-thumb {
        background: #555;
      }
      
      [data-theme="dark"] .xeditor-quickinsert-menu::-webkit-scrollbar-thumb:hover {
        background: #666;
      }
    `;
    
    document.head.appendChild(style);
  }
}