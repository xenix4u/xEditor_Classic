import { Plugin, Editor, VersionHistoryConfig, VersionHistoryStorage, Version, VersionDiff } from '../../types';

// Default localStorage implementation
class LocalStorageVersionHistory implements VersionHistoryStorage {
  private storageKey = 'xeditor-versions';

  async save(version: Version): Promise<void> {
    try {
      const versions = await this.loadAll();
      versions.push(version);
      localStorage.setItem(this.storageKey, JSON.stringify(versions));
    } catch (error) {
      throw new Error(`Failed to save version: ${error}`);
    }
  }

  async load(id: string): Promise<Version | null> {
    try {
      const versions = await this.loadAll();
      const version = versions.find(v => v.id === id);
      return version || null;
    } catch (error) {
      console.error('Failed to load version:', error);
      return null;
    }
  }

  async loadAll(): Promise<Version[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const versions = JSON.parse(data);
      // Convert timestamp strings back to Date objects
      return versions.map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load versions:', error);
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const versions = await this.loadAll();
      const filtered = versions.filter(v => v.id !== id);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (error) {
      throw new Error(`Failed to delete version: ${error}`);
    }
  }

  async deleteAll(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      throw new Error(`Failed to delete all versions: ${error}`);
    }
  }
}

class VersionHistoryPluginImpl implements Plugin {
  name = 'version-history';
  private editor: Editor | null = null;
  private config: VersionHistoryConfig;
  private storage: VersionHistoryStorage;
  private panel: HTMLElement | null = null;
  private isPanelOpen = false;
  private autoSaveInterval: number | null = null;

  constructor(config?: Partial<VersionHistoryConfig>) {
    this.config = {
      enabled: true,
      maxVersions: 50,
      autoSaveVersions: true,
      autoSaveInterval: 300000, // 5 minutes
      ...config
    };
    
    this.storage = this.config.storageBackend || new LocalStorageVersionHistory();
  }

  init(editor: Editor): void {
    this.editor = editor;

    // Add toolbar button
    if (editor.toolbar) {
      editor.toolbar.addItem({
        name: 'version-history',
        icon: this.getHistoryIcon(),
        tooltip: 'Version History',
        onClick: () => this.togglePanel()
      });
    }

    // Track content changes
    editor.on('change', () => {
      // Content tracking handled by getContent() when needed
    });

    // Start auto-save versions if enabled
    if (this.config.autoSaveVersions) {
      this.startAutoSaveVersions();
    }

    // Create version history panel
    this.createPanel();
  }

  destroy(): void {
    this.stopAutoSaveVersions();
    if (this.panel) {
      this.panel.remove();
    }
  }

  private createPanel(): void {
    if (!this.editor) return;

    this.panel = document.createElement('div');
    this.panel.className = 'xeditor-version-history-panel';
    this.panel.style.cssText = `
      position: absolute;
      top: 40px;
      right: 0;
      width: 350px;
      height: calc(100% - 40px);
      background: white;
      border-left: 1px solid #ddd;
      box-shadow: -2px 0 5px rgba(0,0,0,0.1);
      display: none;
      flex-direction: column;
      z-index: 1000;
    `;

    // Panel header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 15px;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 16px;">Version History</h3>
      <button class="xeditor-close-btn" style="
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">&times;</button>
    `;

    // Panel controls
    const controls = document.createElement('div');
    controls.style.cssText = `
      padding: 10px 15px;
      border-bottom: 1px solid #ddd;
      display: flex;
      gap: 10px;
    `;
    controls.innerHTML = `
      <button class="xeditor-save-version-btn" style="
        padding: 6px 12px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 13px;
      ">Save Version</button>
      <button class="xeditor-clear-all-btn" style="
        padding: 6px 12px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 13px;
      ">Clear All</button>
    `;

    // Version list container
    const listContainer = document.createElement('div');
    listContainer.className = 'xeditor-version-list';
    listContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    `;

    this.panel.appendChild(header);
    this.panel.appendChild(controls);
    this.panel.appendChild(listContainer);
    this.editor.wrapper.appendChild(this.panel);

    // Event listeners
    header.querySelector('.xeditor-close-btn')?.addEventListener('click', () => {
      this.togglePanel();
    });

    controls.querySelector('.xeditor-save-version-btn')?.addEventListener('click', () => {
      this.showSaveVersionDialog();
    });

    controls.querySelector('.xeditor-clear-all-btn')?.addEventListener('click', () => {
      this.clearAllVersions();
    });
  }

  private async refreshVersionList(): Promise<void> {
    if (!this.panel) return;

    const listContainer = this.panel.querySelector('.xeditor-version-list');
    if (!listContainer) return;

    const versions = await this.storage.loadAll();
    
    // Sort by timestamp descending
    versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply max versions limit
    if (versions.length > this.config.maxVersions!) {
      const toDelete = versions.slice(this.config.maxVersions!);
      for (const version of toDelete) {
        await this.storage.delete(version.id);
      }
      versions.splice(this.config.maxVersions!);
    }

    listContainer.innerHTML = '';

    if (versions.length === 0) {
      listContainer.innerHTML = '<p style="text-align: center; color: #666;">No versions saved</p>';
      return;
    }

    versions.forEach(version => {
      const versionItem = document.createElement('div');
      versionItem.className = 'xeditor-version-item';
      versionItem.style.cssText = `
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 3px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      
      versionItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 5px;">
              ${version.description || 'Version ' + version.id.substring(0, 8)}
            </div>
            <div style="font-size: 12px; color: #666;">
              ${this.formatDate(version.timestamp)} • ${this.formatSize(version.size)}
            </div>
            ${version.tags ? `<div style="margin-top: 5px;">${version.tags.map(tag => 
              `<span style="
                display: inline-block;
                padding: 2px 6px;
                background: #e0e0e0;
                border-radius: 3px;
                font-size: 11px;
                margin-right: 5px;
              ">${tag}</span>`
            ).join('')}</div>` : ''}
          </div>
          <div style="display: flex; gap: 5px;">
            <button class="xeditor-version-compare" data-id="${version.id}" style="
              padding: 4px 8px;
              background: #4CAF50;
              color: white;
              border: none;
              border-radius: 3px;
              font-size: 12px;
              cursor: pointer;
            ">Compare</button>
            <button class="xeditor-version-restore" data-id="${version.id}" style="
              padding: 4px 8px;
              background: #2196F3;
              color: white;
              border: none;
              border-radius: 3px;
              font-size: 12px;
              cursor: pointer;
            ">Restore</button>
            <button class="xeditor-version-delete" data-id="${version.id}" style="
              padding: 4px 8px;
              background: #f44336;
              color: white;
              border: none;
              border-radius: 3px;
              font-size: 12px;
              cursor: pointer;
            ">Delete</button>
          </div>
        </div>
      `;

      // Add hover effect
      versionItem.addEventListener('mouseenter', () => {
        versionItem.style.background = '#f5f5f5';
      });
      versionItem.addEventListener('mouseleave', () => {
        versionItem.style.background = 'white';
      });

      // Add event listeners
      const compareBtn = versionItem.querySelector('.xeditor-version-compare');
      const restoreBtn = versionItem.querySelector('.xeditor-version-restore');
      const deleteBtn = versionItem.querySelector('.xeditor-version-delete');

      compareBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.compareVersion(version.id);
      });

      restoreBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.restoreVersion(version.id);
      });

      deleteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteVersion(version.id);
      });

      listContainer.appendChild(versionItem);
    });
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return 'just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private togglePanel(): void {
    if (!this.panel) return;

    this.isPanelOpen = !this.isPanelOpen;
    this.panel.style.display = this.isPanelOpen ? 'flex' : 'none';

    if (this.isPanelOpen) {
      this.refreshVersionList();
    }
  }

  private showSaveVersionDialog(): void {
    const description = prompt('Enter a description for this version (optional):');
    const tags = prompt('Enter tags (comma-separated, optional):');
    
    this.saveVersion(description || undefined, tags ? tags.split(',').map(t => t.trim()) : undefined);
  }

  private async saveVersion(description?: string, tags?: string[]): Promise<void> {
    if (!this.editor) return;

    const content = this.editor.getContent();
    const version: Version = {
      id: this.generateId(),
      content,
      timestamp: new Date(),
      size: new TextEncoder().encode(content).length,
      description,
      tags
    };

    try {
      await this.storage.save(version);
      await this.refreshVersionList();
      
      this.editor.emit('version:saved', version);
      alert('Version saved successfully!');
    } catch (error) {
      console.error('Failed to save version:', error);
      alert('Failed to save version. Please try again.');
    }
  }

  private async restoreVersion(id: string): Promise<void> {
    if (!this.editor) return;

    const version = await this.storage.load(id);
    if (!version) {
      alert('Version not found!');
      return;
    }

    const confirm = window.confirm('Are you sure you want to restore this version? Current changes will be lost.');
    if (!confirm) return;

    this.editor.setContent(version.content);
    this.editor.emit('version:restored', version);
    
    this.togglePanel();
    alert('Version restored successfully!');
  }

  private async deleteVersion(id: string): Promise<void> {
    const confirm = window.confirm('Are you sure you want to delete this version?');
    if (!confirm) return;

    try {
      await this.storage.delete(id);
      await this.refreshVersionList();
      this.editor?.emit('version:deleted', { id });
    } catch (error) {
      console.error('Failed to delete version:', error);
      alert('Failed to delete version. Please try again.');
    }
  }

  private async clearAllVersions(): Promise<void> {
    const confirm = window.confirm('Are you sure you want to delete all versions? This cannot be undone.');
    if (!confirm) return;

    try {
      await this.storage.deleteAll();
      await this.refreshVersionList();
      this.editor?.emit('version:cleared');
      alert('All versions cleared successfully!');
    } catch (error) {
      console.error('Failed to clear versions:', error);
      alert('Failed to clear versions. Please try again.');
    }
  }

  private async compareVersion(id: string): Promise<void> {
    if (!this.editor) return;

    const version = await this.storage.load(id);
    if (!version) {
      alert('Version not found!');
      return;
    }

    const currentContent = this.editor.getContent();
    const diff = this.computeDiff(version.content, currentContent);
    
    this.showDiffDialog(version, diff);
  }

  private computeDiff(oldContent: string, newContent: string): VersionDiff {
    // Simple line-based diff
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    const maxLength = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i >= oldLines.length) {
        added.push(`Line ${i + 1}: ${newLines[i]}`);
      } else if (i >= newLines.length) {
        removed.push(`Line ${i + 1}: ${oldLines[i]}`);
      } else if (oldLines[i] !== newLines[i]) {
        modified.push(`Line ${i + 1}: ${oldLines[i]} → ${newLines[i]}`);
      }
    }

    return { added, removed, modified };
  }

  private showDiffDialog(version: Version, diff: VersionDiff): void {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 2000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

    dialog.innerHTML = `
      <h3 style="margin-top: 0;">Compare with ${version.description || 'Version ' + version.id.substring(0, 8)}</h3>
      <div style="margin-bottom: 15px;">
        <h4 style="color: #4CAF50;">Added (${diff.added.length})</h4>
        <pre style="background: #e8f5e9; padding: 10px; border-radius: 3px; overflow-x: auto;">
${diff.added.join('\n') || 'None'}</pre>
      </div>
      <div style="margin-bottom: 15px;">
        <h4 style="color: #f44336;">Removed (${diff.removed.length})</h4>
        <pre style="background: #ffebee; padding: 10px; border-radius: 3px; overflow-x: auto;">
${diff.removed.join('\n') || 'None'}</pre>
      </div>
      <div style="margin-bottom: 15px;">
        <h4 style="color: #FF9800;">Modified (${diff.modified.length})</h4>
        <pre style="background: #fff3e0; padding: 10px; border-radius: 3px; overflow-x: auto;">
${diff.modified.join('\n') || 'None'}</pre>
      </div>
      <button style="
        padding: 8px 16px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
      " onclick="this.parentElement.remove()">Close</button>
    `;

    document.body.appendChild(dialog);
  }

  private startAutoSaveVersions(): void {
    if (this.autoSaveInterval) return;

    this.autoSaveInterval = window.setInterval(() => {
      this.saveVersion('Auto-saved version', ['auto']);
    }, this.config.autoSaveInterval!);
  }

  private stopAutoSaveVersions(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private getHistoryIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>`;
  }

  commands = {
    saveVersion: {
      execute: () => this.showSaveVersionDialog()
    },
    toggleVersionHistory: {
      execute: () => this.togglePanel()
    }
  };
}

// Export the class directly for the plugins index
export class VersionHistoryPlugin extends VersionHistoryPluginImpl {}

// Export factory function
export default function createVersionHistoryPlugin(config?: Partial<VersionHistoryConfig>): Plugin {
  return new VersionHistoryPlugin(config);
}