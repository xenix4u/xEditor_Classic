import { Editor } from '../types';

export interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  handler: () => void;
}

export class KeyboardManager {
  private editor: Editor;
  private shortcuts: Map<string, ShortcutHandler> = new Map();
  private enabled: boolean = true;

  constructor(editor: Editor) {
    this.editor = editor;
    this.init();
  }

  private init(): void {
    // Register default shortcuts
    this.registerDefaults();
    
    // Add keyboard event listener
    this.editor.contentElement.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  registerShortcut(shortcut: ShortcutHandler): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  unregisterShortcut(shortcut: ShortcutHandler): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  getShortcuts(): ShortcutHandler[] {
    return Array.from(this.shortcuts.values());
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    
    const shortcut = this.findShortcut(e);
    if (shortcut) {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        shortcut.handler();
      } catch (error) {
        console.error('Shortcut handler error:', error);
      }
    }
  }

  private findShortcut(e: KeyboardEvent): ShortcutHandler | undefined {
    const key = this.getEventKey(e);
    return this.shortcuts.get(key);
  }

  private getShortcutKey(shortcut: ShortcutHandler): string {
    const parts: string[] = [];
    
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.meta) parts.push('meta');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    
    return parts.join('+');
  }

  private getEventKey(e: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (e.ctrlKey) parts.push('ctrl');
    if (e.metaKey) parts.push('meta');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.toLowerCase());
    
    return parts.join('+');
  }

  private registerDefaults(): void {
    // Formatting shortcuts
    this.registerShortcut({
      key: 'b',
      ctrl: true,
      description: 'Bold',
      handler: () => this.editor.execCommand('bold')
    });

    this.registerShortcut({
      key: 'i',
      ctrl: true,
      description: 'Italic',
      handler: () => this.editor.execCommand('italic')
    });

    this.registerShortcut({
      key: 'u',
      ctrl: true,
      description: 'Underline',
      handler: () => this.editor.execCommand('underline')
    });

    // List shortcuts
    this.registerShortcut({
      key: 'l',
      ctrl: true,
      shift: true,
      description: 'Bullet List',
      handler: () => this.editor.execCommand('insertUnorderedList')
    });

    this.registerShortcut({
      key: 'o',
      ctrl: true,
      shift: true,
      description: 'Numbered List',
      handler: () => this.editor.execCommand('insertOrderedList')
    });

    // Heading shortcuts
    this.registerShortcut({
      key: '1',
      ctrl: true,
      alt: true,
      description: 'Heading 1',
      handler: () => this.editor.execCommand('formatBlock', 'h1')
    });

    this.registerShortcut({
      key: '2',
      ctrl: true,
      alt: true,
      description: 'Heading 2',
      handler: () => this.editor.execCommand('formatBlock', 'h2')
    });

    this.registerShortcut({
      key: '3',
      ctrl: true,
      alt: true,
      description: 'Heading 3',
      handler: () => this.editor.execCommand('formatBlock', 'h3')
    });

    this.registerShortcut({
      key: '0',
      ctrl: true,
      alt: true,
      description: 'Normal Text',
      handler: () => this.editor.execCommand('formatBlock', 'p')
    });

    // Link shortcut
    this.registerShortcut({
      key: 'k',
      ctrl: true,
      description: 'Insert Link',
      handler: () => {
        const linkPlugin = this.editor.plugins.get('link');
        if (linkPlugin && typeof (linkPlugin as any).showLinkDialog === 'function') {
          (linkPlugin as any).showLinkDialog();
        }
      }
    });

    // Alignment shortcuts
    this.registerShortcut({
      key: 'l',
      ctrl: true,
      alt: true,
      description: 'Align Left',
      handler: () => this.editor.execCommand('justifyLeft')
    });

    this.registerShortcut({
      key: 'e',
      ctrl: true,
      alt: true,
      description: 'Align Center',
      handler: () => this.editor.execCommand('justifyCenter')
    });

    this.registerShortcut({
      key: 'r',
      ctrl: true,
      alt: true,
      description: 'Align Right',
      handler: () => this.editor.execCommand('justifyRight')
    });

    this.registerShortcut({
      key: 'j',
      ctrl: true,
      alt: true,
      description: 'Justify',
      handler: () => this.editor.execCommand('justifyFull')
    });

    // Indent/Outdent
    this.registerShortcut({
      key: ']',
      ctrl: true,
      description: 'Indent',
      handler: () => this.editor.execCommand('indent')
    });

    this.registerShortcut({
      key: '[',
      ctrl: true,
      description: 'Outdent',
      handler: () => this.editor.execCommand('outdent')
    });

    // Quote
    this.registerShortcut({
      key: 'q',
      ctrl: true,
      shift: true,
      description: 'Quote',
      handler: () => this.editor.execCommand('formatBlock', 'blockquote')
    });

    // Clear formatting
    this.registerShortcut({
      key: '\\',
      ctrl: true,
      description: 'Clear Formatting',
      handler: () => this.editor.execCommand('removeFormat')
    });

    // Save (custom event)
    this.registerShortcut({
      key: 's',
      ctrl: true,
      description: 'Save',
      handler: () => {
        this.editor.emit('save', this.editor.getContent());
      }
    });

    // Select all
    this.registerShortcut({
      key: 'a',
      ctrl: true,
      description: 'Select All',
      handler: () => this.editor.execCommand('selectAll')
    });

    // Fullscreen
    this.registerShortcut({
      key: 'Enter',
      ctrl: true,
      shift: true,
      description: 'Toggle Fullscreen',
      handler: () => {
        const fullscreenPlugin = this.editor.plugins.get('fullscreen');
        if (fullscreenPlugin && typeof (fullscreenPlugin as any).toggleFullscreen === 'function') {
          (fullscreenPlugin as any).toggleFullscreen();
        }
      }
    });

    // Source code
    this.registerShortcut({
      key: 'h',
      ctrl: true,
      shift: true,
      description: 'Toggle HTML Source',
      handler: () => {
        const sourcePlugin = this.editor.plugins.get('source');
        if (sourcePlugin && typeof (sourcePlugin as any).toggleSource === 'function') {
          (sourcePlugin as any).toggleSource();
        }
      }
    });

    // Print
    this.registerShortcut({
      key: 'p',
      ctrl: true,
      shift: true,
      description: 'Print',
      handler: () => this.editor.execCommand('print')
    });

    // Table
    this.registerShortcut({
      key: 't',
      ctrl: true,
      shift: true,
      description: 'Insert Table',
      handler: () => {
        const tablePlugin = this.editor.plugins.get('table');
        if (tablePlugin && typeof (tablePlugin as any).showTableDialog === 'function') {
          (tablePlugin as any).showTableDialog();
        }
      }
    });

    // Platform-specific shortcuts (Mac support)
    if (navigator.platform.indexOf('Mac') > -1) {
      // Replace Ctrl with Cmd for Mac
      this.shortcuts.forEach((shortcut, key) => {
        if (shortcut.ctrl && !shortcut.meta) {
          this.shortcuts.delete(key);
          shortcut.meta = true;
          shortcut.ctrl = false;
          const newKey = this.getShortcutKey(shortcut);
          this.shortcuts.set(newKey, shortcut);
        }
      });
    }
  }

  // Show keyboard shortcuts help
  showHelp(): void {
    const shortcuts = this.getShortcuts();
    const isMac = navigator.platform.indexOf('Mac') > -1;
    
    const helpContent = shortcuts
      .sort((a, b) => a.description.localeCompare(b.description))
      .map(s => {
        const keys: string[] = [];
        if (s.ctrl) keys.push(isMac ? 'Cmd' : 'Ctrl');
        if (s.meta && !isMac) keys.push('Meta');
        if (s.alt) keys.push('Alt');
        if (s.shift) keys.push('Shift');
        keys.push(s.key.toUpperCase());
        
        return `${s.description}: ${keys.join('+')}`;
      })
      .join('\n');
    
    alert('Keyboard Shortcuts:\n\n' + helpContent);
  }
}