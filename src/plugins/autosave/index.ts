import { Plugin, Editor, AutoSaveConfig, AutoSaveStorage, AutoSaveStatus } from '../../types';

// Default localStorage implementation
class LocalStorageBackend implements AutoSaveStorage {
  async save(key: string, content: string): Promise<void> {
    try {
      localStorage.setItem(key, content);
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  }

  async load(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to delete from localStorage: ${error}`);
    }
  }
}

class AutoSavePluginImpl implements Plugin {
  name = 'autosave';
  private editor: Editor | null = null;
  private config: AutoSaveConfig;
  private storage: AutoSaveStorage;
  private autoSaveInterval: number | null = null;
  private _status: AutoSaveStatus = { state: 'idle' };
  private statusElement: HTMLElement | null = null;
  
  // Getter for status to avoid unused variable warning
  public get status(): AutoSaveStatus {
    return this._status;
  }
  private lastSaveTimeElement: HTMLElement | null = null;
  private storageKey: string = 'xeditor-autosave';
  private isDirty: boolean = false;

  constructor(config?: Partial<AutoSaveConfig>) {
    this.config = {
      enabled: true,
      interval: 30000, // 30 seconds
      showStatus: true,
      showLastSaveTime: true,
      ...config
    };
    
    this.storage = this.config.storageBackend || new LocalStorageBackend();
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Set storage key based on editor container ID or generate one
    const containerId = typeof editor.config.container === 'string' 
      ? editor.config.container 
      : editor.container.id || 'default';
    this.storageKey = `xeditor-autosave-${containerId}`;

    // Load saved content on init
    this.loadContent();

    // Start auto-save if enabled
    if (this.config.enabled) {
      this.startAutoSave();
    }

    // Track content changes
    editor.on('change', () => {
      this.isDirty = true;
    });

    // Save on blur
    editor.on('blur', () => {
      if (this.isDirty && this.config.enabled) {
        this.save();
      }
    });

    // Add toolbar items
    this.addToolbarItems();

    // Create status elements
    this.createStatusElements();
  }

  destroy(): void {
    this.stopAutoSave();
    if (this.statusElement) {
      this.statusElement.remove();
    }
    if (this.lastSaveTimeElement) {
      this.lastSaveTimeElement.remove();
    }
  }

  private addToolbarItems(): void {
    if (!this.editor || !this.editor.toolbar) return;

    // Manual save button
    this.editor.toolbar.addItem({
      name: 'save',
      icon: this.getSaveIcon(),
      tooltip: 'Save (Ctrl+S)',
      onClick: () => this.save()
    });

    // Auto-save toggle
    this.editor.toolbar.addItem({
      name: 'autosave-toggle',
      icon: this.getAutoSaveIcon(),
      tooltip: this.config.enabled ? 'Disable auto-save' : 'Enable auto-save',
      active: () => this.config.enabled,
      onClick: () => this.toggleAutoSave()
    });
  }

  private createStatusElements(): void {
    if (!this.editor) return;

    const wrapper = this.editor.wrapper;
    
    if (this.config.showStatus) {
      this.statusElement = document.createElement('div');
      this.statusElement.className = 'xeditor-autosave-status';
      this.statusElement.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 3px;
        font-size: 12px;
        display: none;
        z-index: 1000;
      `;
      wrapper.appendChild(this.statusElement);
    }

    if (this.config.showLastSaveTime) {
      this.lastSaveTimeElement = document.createElement('div');
      this.lastSaveTimeElement.className = 'xeditor-autosave-time';
      this.lastSaveTimeElement.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 10px;
        padding: 4px 8px;
        color: #666;
        font-size: 11px;
        z-index: 1000;
      `;
      wrapper.appendChild(this.lastSaveTimeElement);
    }
  }

  private updateStatus(status: AutoSaveStatus): void {
    this._status = status;
    
    if (this.statusElement) {
      switch (status.state) {
        case 'saving':
          this.statusElement.textContent = 'Saving...';
          this.statusElement.style.background = 'rgba(33, 150, 243, 0.8)';
          this.statusElement.style.display = 'block';
          break;
        case 'saved':
          this.statusElement.textContent = 'Saved';
          this.statusElement.style.background = 'rgba(76, 175, 80, 0.8)';
          this.statusElement.style.display = 'block';
          setTimeout(() => {
            if (this.statusElement) {
              this.statusElement.style.display = 'none';
            }
          }, 2000);
          break;
        case 'error':
          this.statusElement.textContent = `Error: ${status.error?.message || 'Unknown error'}`;
          this.statusElement.style.background = 'rgba(244, 67, 54, 0.8)';
          this.statusElement.style.display = 'block';
          break;
        default:
          this.statusElement.style.display = 'none';
      }
    }

    if (this.lastSaveTimeElement && status.lastSaveTime) {
      this.lastSaveTimeElement.textContent = `Last saved: ${this.formatTime(status.lastSaveTime)}`;
    }
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleString();
    }
  }

  private async save(): Promise<void> {
    if (!this.editor || !this.isDirty) return;

    this.updateStatus({ state: 'saving' });

    try {
      const content = this.editor.getContent();
      await this.storage.save(this.storageKey, content);
      
      this.isDirty = false;
      this.updateStatus({
        state: 'saved',
        lastSaveTime: new Date()
      });
      
      this.editor.emit('autosave', { content, timestamp: new Date() });
    } catch (error) {
      this.updateStatus({
        state: 'error',
        error: error instanceof Error ? error : new Error('Unknown error')
      });
      
      this.editor.emit('autosave:error', error);
    }
  }

  private async loadContent(): Promise<void> {
    if (!this.editor) return;

    try {
      const content = await this.storage.load(this.storageKey);
      if (content !== null && content !== this.editor.getContent()) {
        const shouldLoad = confirm('Found auto-saved content. Do you want to restore it?');
        if (shouldLoad) {
          this.editor.setContent(content);
          this.editor.emit('autosave:restore', { content });
        }
      }
    } catch (error) {
      console.error('Failed to load auto-saved content:', error);
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveInterval) return;

    this.autoSaveInterval = window.setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, this.config.interval);
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  private toggleAutoSave(): void {
    this.config.enabled = !this.config.enabled;
    
    if (this.config.enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }

    // Update toolbar button
    if (this.editor && this.editor.toolbar) {
      this.editor.toolbar.updateState();
    }
  }

  private getSaveIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>`;
  }

  private getAutoSaveIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
      <circle cx="18" cy="18" r="3" fill="currentColor"/>
    </svg>`;
  }

  commands = {
    save: {
      execute: () => this.save(),
      canExecute: () => this.config.enabled
    },
    toggleAutoSave: {
      execute: () => this.toggleAutoSave()
    }
  };

  shortcuts = {
    'Ctrl+S': 'save',
    'Cmd+S': 'save'
  };
}

// Export the class directly for the plugins index
export class AutoSavePlugin extends AutoSavePluginImpl {}

// Export factory function
export default function createAutoSavePlugin(config?: Partial<AutoSaveConfig>): Plugin {
  return new AutoSavePlugin(config);
}