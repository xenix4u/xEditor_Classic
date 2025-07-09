import { Toolbar, ToolbarConfig, ToolbarItem, Editor, DropdownItem } from '../types';
import { createElement, addClass, removeClass, hasClass, toggleClass } from '../utils/dom';
import { icons } from './icons';

export class ToolbarImpl implements Toolbar {
  element: HTMLElement;
  items: Map<string, ToolbarItem> = new Map();
  private editor: Editor;
  private config: ToolbarConfig;
  private itemElements: Map<string, HTMLElement> = new Map();
  private statusArea: HTMLElement | null = null;

  constructor(editor: Editor, config?: ToolbarConfig) {
    this.editor = editor;
    this.config = this.normalizeConfig(config);
    this.element = this.createElement();
    this.render();
  }

  private normalizeConfig(config?: ToolbarConfig): ToolbarConfig {
    const defaultItems = [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'fontFamily', 'fontSize', '|',
      'textColor', 'backgroundColor', '|',
      'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
      'orderedList', 'unorderedList', 'checklist', 'indent', 'outdent', '|',
      'heading', 'paragraph', 'blockquote', '|',
      'link', 'image', 'video', 'table', 'code', 'horizontalRule', '|',
      'emoji', 'specialChars', 'formElements', '|',
      'findReplace', 'undo', 'redo', '|',
      'comments', 'track-changes', '|',
      'markdown', 'statistics', 'sourceCode', 'fullscreen', 'print'
    ];

    return {
      items: config?.items || defaultItems,
      position: config?.position || 'top',
      sticky: config?.sticky !== false,
      groups: config?.groups
    };
  }

  private createElement(): HTMLElement {
    const toolbar = createElement('div', {
      className: 'xeditor-toolbar',
      role: 'toolbar',
      'aria-label': 'Editor toolbar'
    });

    if (this.config.position === 'floating') {
      addClass(toolbar, 'xeditor-toolbar--floating');
    }

    if (this.config.sticky) {
      addClass(toolbar, 'xeditor-toolbar--sticky');
    }

    return toolbar;
  }

  render(): void {
    this.element.innerHTML = '';
    this.itemElements.clear();

    // Create a container for toolbar items
    const itemsContainer = createElement('div', {
      className: 'xeditor-toolbar__items'
    });
    itemsContainer.style.cssText = 'display: flex; align-items: center; flex: 1;';

    const items = this.config.items || [];
    
    items.forEach(item => {
      if (typeof item === 'string') {
        if (item === '|') {
          itemsContainer.appendChild(this.createSeparator());
        } else {
          const toolbarItem = this.getDefaultItem(item);
          if (toolbarItem) {
            const element = this.createItemElement(toolbarItem);
            this.items.set(toolbarItem.name, toolbarItem);
            this.itemElements.set(toolbarItem.name, element);
            itemsContainer.appendChild(element);
          }
        }
      } else {
        const element = this.createItemElement(item);
        this.items.set(item.name, item);
        this.itemElements.set(item.name, element);
        itemsContainer.appendChild(element);
      }
    });

    // Create status area for autosave and other status indicators
    this.statusArea = createElement('div', {
      className: 'xeditor-toolbar__status'
    });
    this.statusArea.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 10px;
      font-size: 12px;
      color: #666;
    `;

    // Add items container and status area to toolbar
    this.element.appendChild(itemsContainer);
    this.element.appendChild(this.statusArea);

    // Listen for autosave events to update status
    this.setupAutoSaveStatusListener();

    this.updateState();
  }

  addItem(item: ToolbarItem): void {
    this.items.set(item.name, item);
    const element = this.createItemElement(item);
    this.itemElements.set(item.name, element);
    
    // Add to items container instead of directly to toolbar
    const itemsContainer = this.element.querySelector('.xeditor-toolbar__items');
    if (itemsContainer) {
      itemsContainer.appendChild(element);
    } else {
      this.element.appendChild(element);
    }
  }

  removeItem(name: string): void {
    const element = this.itemElements.get(name);
    if (element) {
      element.remove();
      this.itemElements.delete(name);
      this.items.delete(name);
    }
  }

  updateState(): void {
    this.items.forEach((item, name) => {
      const element = this.itemElements.get(name);
      if (!element) return;

      const isActive = item.active ? item.active() : 
                      (item.command ? this.editor.queryCommandState(item.command) : false);
      
      const isEnabled = item.enabled ? item.enabled() : 
                       (item.command ? this.editor.commands.canExecute(item.command) : true);

      toggleClass(element, 'xeditor-toolbar__item--active', isActive);
      toggleClass(element, 'xeditor-toolbar__item--disabled', !isEnabled);
      
      if (!isEnabled) {
        element.setAttribute('disabled', 'true');
      } else {
        element.removeAttribute('disabled');
      }
    });
  }

  show(): void {
    removeClass(this.element, 'xeditor-toolbar--hidden');
  }

  hide(): void {
    addClass(this.element, 'xeditor-toolbar--hidden');
  }

  private createItemElement(item: ToolbarItem): HTMLElement {
    if (item.dropdown) {
      return this.createDropdownElement(item);
    }

    const button = createElement('button', {
      className: 'xeditor-toolbar__item',
      type: 'button',
      title: item.tooltip || item.name,
      'aria-label': item.tooltip || item.name
    });

    if (item.icon) {
      const icon = createElement('span', {
        className: 'xeditor-toolbar__icon',
        innerHTML: item.icon
      });
      button.appendChild(icon);
    }

    if (item.text) {
      const text = createElement('span', {
        className: 'xeditor-toolbar__text'
      }, [item.text]);
      button.appendChild(text);
    }

    // Prevent focus loss when clicking toolbar buttons
    button.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent focus loss and selection changes
    });
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.onClick) {
        item.onClick();
      } else if (item.command) {
        this.editor.execCommand(item.command);
      }
    });

    return button;
  }

  private createDropdownElement(item: ToolbarItem): HTMLElement {
    const container = createElement('div', {
      className: 'xeditor-toolbar__dropdown'
    });

    const trigger = createElement('button', {
      className: 'xeditor-toolbar__item xeditor-toolbar__dropdown-trigger',
      type: 'button',
      title: item.tooltip || item.name,
      'aria-label': item.tooltip || item.name,
      'aria-haspopup': 'true',
      'aria-expanded': 'false'
    });

    if (item.icon) {
      const icon = createElement('span', {
        className: 'xeditor-toolbar__icon',
        innerHTML: item.icon
      });
      trigger.appendChild(icon);
    }

    if (item.text) {
      const text = createElement('span', {
        className: 'xeditor-toolbar__text'
      }, [item.text]);
      trigger.appendChild(text);
    }

    const arrow = createElement('span', {
      className: 'xeditor-toolbar__dropdown-arrow',
      innerHTML: icons.dropdownArrow
    });
    trigger.appendChild(arrow);

    const menu = createElement('div', {
      className: 'xeditor-toolbar__dropdown-menu',
      role: 'menu'
    });

    item.dropdown!.forEach(dropdownItem => {
      const menuItem = this.createDropdownItem(dropdownItem, item);
      menu.appendChild(menuItem);
    });

    // Prevent focus loss when clicking dropdown trigger
    trigger.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    
    trigger.addEventListener('click', () => {
      const isOpen = hasClass(container, 'xeditor-toolbar__dropdown--open');
      
      document.querySelectorAll('.xeditor-toolbar__dropdown--open').forEach(el => {
        removeClass(el, 'xeditor-toolbar__dropdown--open');
      });

      if (!isOpen) {
        addClass(container, 'xeditor-toolbar__dropdown--open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target as Node)) {
        removeClass(container, 'xeditor-toolbar__dropdown--open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    container.appendChild(trigger);
    container.appendChild(menu);

    return container;
  }

  private createDropdownItem(item: DropdownItem, parent: ToolbarItem): HTMLElement {
    const menuItem = createElement('button', {
      className: 'xeditor-toolbar__dropdown-item',
      type: 'button',
      role: 'menuitem'
    });

    // Apply style if provided (for font family/size previews)
    if (item.style) {
      menuItem.setAttribute('style', item.style);
    }

    if (item.icon) {
      const icon = createElement('span', {
        className: 'xeditor-toolbar__icon',
        innerHTML: item.icon
      });
      menuItem.appendChild(icon);
    }

    const text = createElement('span', {
      className: 'xeditor-toolbar__text'
    }, [item.text]);
    menuItem.appendChild(text);

    // Prevent focus loss when clicking dropdown items
    menuItem.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
    
    menuItem.addEventListener('click', () => {
      if (item.onClick) {
        item.onClick();
      } else if (parent.command) {
        this.editor.execCommand(parent.command, item.value);
      }
    });

    return menuItem;
  }

  private createSeparator(): HTMLElement {
    return createElement('div', {
      className: 'xeditor-toolbar__separator',
      role: 'separator'
    });
  }

  private getDefaultItem(name: string): ToolbarItem | null {
    // Get font plugin for dynamic dropdown items
    const fontPlugin = this.editor.plugins.get('font');
    
    const defaultItems: Record<string, ToolbarItem> = {
      bold: {
        name: 'bold',
        icon: icons.bold,
        tooltip: 'Bold (Ctrl+B)',
        command: 'bold'
      },
      italic: {
        name: 'italic',
        icon: icons.italic,
        tooltip: 'Italic (Ctrl+I)',
        command: 'italic'
      },
      underline: {
        name: 'underline',
        icon: icons.underline,
        tooltip: 'Underline (Ctrl+U)',
        command: 'underline'
      },
      strikethrough: {
        name: 'strikethrough',
        icon: icons.strikethrough,
        tooltip: 'Strikethrough',
        command: 'strikethrough'
      },
      heading: {
        name: 'heading',
        icon: icons.heading,
        tooltip: 'Heading',
        dropdown: [
          { text: 'Heading 1', value: 'h1' },
          { text: 'Heading 2', value: 'h2' },
          { text: 'Heading 3', value: 'h3' },
          { text: 'Heading 4', value: 'h4' },
          { text: 'Heading 5', value: 'h5' },
          { text: 'Heading 6', value: 'h6' }
        ],
        command: 'formatBlock'
      },
      paragraph: {
        name: 'paragraph',
        icon: icons.paragraph,
        tooltip: 'Paragraph',
        command: 'formatBlock',
        onClick: () => this.editor.execCommand('formatBlock', 'p')
      },
      orderedList: {
        name: 'orderedList',
        icon: icons.orderedList,
        tooltip: 'Ordered List',
        command: 'insertOrderedList'
      },
      unorderedList: {
        name: 'unorderedList',
        icon: icons.unorderedList,
        tooltip: 'Unordered List',
        command: 'insertUnorderedList'
      },
      link: {
        name: 'link',
        icon: icons.link,
        tooltip: 'Insert Link',
        onClick: () => {
          const linkPlugin = this.editor.plugins.get('link');
          if (linkPlugin && typeof (linkPlugin as any).showLinkDialog === 'function') {
            (linkPlugin as any).showLinkDialog();
          } else {
            // Fallback to prompt
            const url = prompt('Enter URL:');
            if (url) {
              this.editor.execCommand('createLink', url);
            }
          }
        }
      },
      image: {
        name: 'image',
        icon: icons.image,
        tooltip: 'Insert Image',
        onClick: () => {
          // This will be handled by the image plugin
          const imagePlugin = this.editor.plugins.get('image');
          if (imagePlugin && typeof (imagePlugin as any).showImageDialog === 'function') {
            (imagePlugin as any).showImageDialog();
          }
        }
      },
      code: {
        name: 'code',
        icon: icons.code,
        tooltip: 'Code Block',
        onClick: () => {
          const codeBlockPlugin = this.editor.plugins.get('codeblock');
          if (codeBlockPlugin && typeof (codeBlockPlugin as any).showCodeBlockDialog === 'function') {
            (codeBlockPlugin as any).showCodeBlockDialog();
          }
        }
      },
      blockquote: {
        name: 'blockquote',
        icon: icons.blockquote,
        tooltip: 'Blockquote',
        command: 'formatBlock',
        onClick: () => this.editor.execCommand('formatBlock', 'blockquote')
      },
      fontFamily: {
        name: 'fontFamily',
        text: 'Font',
        tooltip: 'Font Family',
        dropdown: fontPlugin ? (fontPlugin as any).getFontDropdownItems() : [],
        command: 'fontName'
      },
      fontSize: {
        name: 'fontSize',
        text: '16px',
        tooltip: 'Font Size',
        dropdown: fontPlugin ? (fontPlugin as any).getSizeDropdownItems() : [],
        command: 'fontSize'
      },
      textColor: {
        name: 'textColor',
        icon: icons.textColor,
        tooltip: 'Text Color',
        onClick: () => {
          const colorPlugin = this.editor.plugins.get('color');
          if (colorPlugin && typeof (colorPlugin as any).showTextColorPicker === 'function') {
            (colorPlugin as any).showTextColorPicker();
          }
        }
      },
      backgroundColor: {
        name: 'backgroundColor',
        icon: icons.backgroundColor,
        tooltip: 'Background Color',
        onClick: () => {
          const colorPlugin = this.editor.plugins.get('color');
          if (colorPlugin && typeof (colorPlugin as any).showBackgroundColorPicker === 'function') {
            (colorPlugin as any).showBackgroundColorPicker();
          }
        }
      },
      undo: {
        name: 'undo',
        icon: icons.undo,
        tooltip: 'Undo (Ctrl+Z)',
        command: 'undo'
      },
      redo: {
        name: 'redo',
        icon: icons.redo,
        tooltip: 'Redo (Ctrl+Y)',
        command: 'redo'
      },
      alignLeft: {
        name: 'alignLeft',
        icon: icons.alignLeft,
        tooltip: 'Align Left',
        command: 'justifyLeft'
      },
      alignCenter: {
        name: 'alignCenter',
        icon: icons.alignCenter,
        tooltip: 'Align Center',
        command: 'justifyCenter'
      },
      alignRight: {
        name: 'alignRight',
        icon: icons.alignRight,
        tooltip: 'Align Right',
        command: 'justifyRight'
      },
      alignJustify: {
        name: 'alignJustify',
        icon: icons.alignJustify,
        tooltip: 'Justify',
        command: 'justifyFull'
      },
      indent: {
        name: 'indent',
        icon: icons.indent,
        tooltip: 'Indent',
        command: 'indent'
      },
      outdent: {
        name: 'outdent',
        icon: icons.outdent,
        tooltip: 'Outdent',
        command: 'outdent'
      },
      horizontalRule: {
        name: 'horizontalRule',
        icon: icons.horizontalRule,
        tooltip: 'Insert Horizontal Line',
        command: 'insertHorizontalRule'
      },
      fullscreen: {
        name: 'fullscreen',
        icon: icons.fullscreen,
        tooltip: 'Fullscreen',
        onClick: () => {
          // Will be handled by fullscreen plugin
          const fullscreenPlugin = this.editor.plugins.get('fullscreen');
          if (fullscreenPlugin && typeof (fullscreenPlugin as any).toggleFullscreen === 'function') {
            (fullscreenPlugin as any).toggleFullscreen();
          }
        }
      },
      print: {
        name: 'print',
        icon: icons.print,
        tooltip: 'Print',
        command: 'print'
      },
      sourceCode: {
        name: 'sourceCode',
        icon: icons.sourceCode,
        tooltip: 'HTML Source Code',
        onClick: () => {
          const sourcePlugin = this.editor.plugins.get('source');
          if (sourcePlugin && typeof (sourcePlugin as any).toggleSource === 'function') {
            (sourcePlugin as any).toggleSource();
          }
        }
      },
      table: {
        name: 'table',
        icon: icons.table,
        tooltip: 'Insert Table',
        onClick: () => {
          const tablePlugin = this.editor.plugins.get('table');
          if (tablePlugin && typeof (tablePlugin as any).showTableDialog === 'function') {
            (tablePlugin as any).showTableDialog();
          }
        }
      },
      findReplace: {
        name: 'findReplace',
        icon: icons.search,
        tooltip: 'Find & Replace (Ctrl+F)',
        onClick: () => {
          const findReplacePlugin = this.editor.plugins.get('findreplace');
          if (findReplacePlugin && typeof (findReplacePlugin as any).showFindReplaceDialog === 'function') {
            (findReplacePlugin as any).showFindReplaceDialog();
          }
        }
      },
      video: {
        name: 'video',
        icon: icons.video,
        tooltip: 'Insert Video',
        onClick: () => {
          const videoPlugin = this.editor.plugins.get('video');
          if (videoPlugin && typeof (videoPlugin as any).showVideoDialog === 'function') {
            (videoPlugin as any).showVideoDialog();
          }
        }
      },
      checklist: {
        name: 'checklist',
        icon: icons.checklist,
        tooltip: 'Checklist',
        command: 'insertChecklist'
      },
      statistics: {
        name: 'statistics',
        icon: icons.statistics,
        tooltip: 'Document Statistics',
        onClick: () => {
          const statisticsPlugin = this.editor.plugins.get('statistics');
          if (statisticsPlugin && typeof (statisticsPlugin as any).showStatistics === 'function') {
            (statisticsPlugin as any).showStatistics();
          }
        }
      },
      markdown: {
        name: 'markdown',
        icon: icons.markdown || 'MD',
        tooltip: 'Markdown Import/Export',
        dropdown: [
          {
            text: 'Export as Markdown',
            icon: '⬇',
            onClick: () => {
              const markdownPlugin = this.editor.plugins.get('markdown');
              if (markdownPlugin && typeof (markdownPlugin as any).showExportDialog === 'function') {
                (markdownPlugin as any).showExportDialog();
              }
            }
          },
          {
            text: 'Import from Markdown',
            icon: '⬆',
            onClick: () => {
              const markdownPlugin = this.editor.plugins.get('markdown');
              if (markdownPlugin && typeof (markdownPlugin as any).showImportDialog === 'function') {
                (markdownPlugin as any).showImportDialog();
              }
            }
          }
        ]
      },
      emoji: {
        name: 'emoji',
        icon: '😀',
        tooltip: 'Insert Emoji',
        onClick: () => {
          const emojiPlugin = this.editor.plugins.get('emoji');
          if (emojiPlugin && typeof (emojiPlugin as any).showEmojiPicker === 'function') {
            (emojiPlugin as any).showEmojiPicker();
          }
        }
      },
      specialChars: {
        name: 'specialChars',
        icon: 'Ω',
        tooltip: 'Insert Special Character',
        onClick: () => {
          const specialCharsPlugin = this.editor.plugins.get('special-chars');
          if (specialCharsPlugin && typeof (specialCharsPlugin as any).showCharPicker === 'function') {
            (specialCharsPlugin as any).showCharPicker();
          }
        }
      },
      fileManager: {
        name: 'fileManager',
        icon: '📁',
        tooltip: 'File Manager',
        onClick: () => {
          const fileManagerPlugin = this.editor.plugins.get('file-manager');
          if (fileManagerPlugin && typeof (fileManagerPlugin as any).showFileManager === 'function') {
            (fileManagerPlugin as any).showFileManager();
          }
        }
      },
      formElements: {
        name: 'formElements',
        icon: '📝',
        tooltip: 'Insert Form Element',
        onClick: () => {
          const formElementsPlugin = this.editor.plugins.get('form-elements');
          if (formElementsPlugin && typeof (formElementsPlugin as any).showFormElementsDialog === 'function') {
            (formElementsPlugin as any).showFormElementsDialog();
          }
        }
      }
    };

    return defaultItems[name] || null;
  }

  private setupAutoSaveStatusListener(): void {
    if (!this.statusArea) return;

    // Listen for autosave events
    this.editor.on('autosave', (data: any) => {
      this.updateAutoSaveStatus('saved', data.timestamp);
    });

    this.editor.on('autosave:error', () => {
      this.updateAutoSaveStatus('error');
    });

    this.editor.on('autosave:restore', () => {
      this.updateAutoSaveStatus('restored');
    });

    // Listen for version history events
    this.editor.on('version:saved', () => {
      this.updateVersionStatus('saved');
    });

    this.editor.on('version:restored', () => {
      this.updateVersionStatus('restored');
    });
  }

  private updateAutoSaveStatus(status: 'saved' | 'error' | 'restored', timestamp?: Date): void {
    if (!this.statusArea) return;

    let autoSaveIndicator = this.statusArea.querySelector('.xeditor-autosave-status');
    if (!autoSaveIndicator) {
      autoSaveIndicator = createElement('span', {
        className: 'xeditor-autosave-status'
      });
      (autoSaveIndicator as HTMLElement).style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
      `;
      this.statusArea.appendChild(autoSaveIndicator);
    }

    switch (status) {
      case 'saved':
        autoSaveIndicator.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span style="color: #4CAF50;">Saved</span>
        `;
        if (timestamp) {
          setTimeout(() => {
            autoSaveIndicator!.innerHTML = `
              <span style="color: #666;">Last saved: ${this.formatTime(timestamp)}</span>
            `;
          }, 2000);
        }
        break;
      case 'error':
        autoSaveIndicator.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span style="color: #f44336;">Save failed</span>
        `;
        break;
      case 'restored':
        autoSaveIndicator.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10"></path>
          </svg>
          <span style="color: #2196F3;">Restored</span>
        `;
        setTimeout(() => {
          autoSaveIndicator!.innerHTML = '';
        }, 3000);
        break;
    }
  }

  private updateVersionStatus(status: 'saved' | 'restored'): void {
    if (!this.statusArea) return;

    let versionIndicator = this.statusArea.querySelector('.xeditor-version-status');
    if (!versionIndicator) {
      versionIndicator = createElement('span', {
        className: 'xeditor-version-status'
      });
      (versionIndicator as HTMLElement).style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
      `;
      this.statusArea.appendChild(versionIndicator);
    }

    switch (status) {
      case 'saved':
        versionIndicator.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
            <path d="M12 2v10m0 0l-3-3m3 3l3-3"></path>
            <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"></path>
          </svg>
          <span style="color: #4CAF50;">Version saved</span>
        `;
        setTimeout(() => {
          versionIndicator!.innerHTML = '';
        }, 3000);
        break;
      case 'restored':
        versionIndicator.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2">
            <path d="M12 2v10m0 0l-3-3m3 3l3-3"></path>
            <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"></path>
          </svg>
          <span style="color: #2196F3;">Version restored</span>
        `;
        setTimeout(() => {
          versionIndicator!.innerHTML = '';
        }, 3000);
        break;
    }
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
}