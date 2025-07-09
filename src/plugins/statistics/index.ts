import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface StatisticsConfig {
  showInStatusBar?: boolean;
  updateInterval?: number;
  countSpaces?: boolean;
  readingTime?: boolean;
  readingSpeed?: number; // words per minute
}

interface Statistics {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  sentences: number;
  readingTime?: string;
}

export class StatisticsPlugin implements Plugin {
  name = 'statistics';
  private editor!: Editor;
  private config: StatisticsConfig;
  private statusBar: HTMLElement | null = null;
  private dialog: HTMLElement | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private lastStats: Statistics = {
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    paragraphs: 0,
    sentences: 0
  };

  toolbar: ToolbarItem[] = [];

  constructor(config: StatisticsConfig = {}) {
    this.config = {
      showInStatusBar: config.showInStatusBar !== false,
      updateInterval: config.updateInterval || 1000,
      countSpaces: config.countSpaces !== false,
      readingTime: config.readingTime !== false,
      readingSpeed: config.readingSpeed || 200
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).showStatistics = this.showStatistics.bind(this);
    
    // Register commands
    this.editor.commands.register('showStatistics', {
      execute: () => this.showStatistics()
    });
    
    // Add styles
    this.addStyles();
    
    // Create status bar if configured
    if (this.config.showInStatusBar) {
      this.createStatusBar();
    }
    
    // Start monitoring
    this.startMonitoring();
    
    // Initial calculation with a small delay to ensure DOM is ready
    setTimeout(() => {
      this.updateStatistics();
    }, 50);
  }

  destroy(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    
    if (this.statusBar) {
      this.statusBar.remove();
    }
    
    if (this.dialog) {
      this.dialog.remove();
    }
  }

  private startMonitoring(): void {
    // Update statistics on content change
    this.editor.events.on('contentChange', () => {
      this.scheduleUpdate();
    });
    
    // Update statistics on selection change for selection stats
    this.editor.events.on('selectionChange', () => {
      this.scheduleUpdate();
    });
    
    // Also listen to direct input events for immediate feedback
    this.editor.contentElement.addEventListener('input', () => {
      this.scheduleUpdate();
    });
    
    // And keyup for better responsiveness
    this.editor.contentElement.addEventListener('keyup', () => {
      this.scheduleUpdate();
    });
  }

  private scheduleUpdate(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    
    this.updateTimer = setTimeout(() => {
      this.updateStatistics();
    }, 100); // Reduced delay for faster updates
  }

  private updateStatistics(): void {
    const content = this.editor.contentElement;
    const text = content.textContent || '';
    
    // Check if there's a selection
    const selection = window.getSelection();
    let selectedText = '';
    
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      selectedText = selection.toString();
    }
    
    // Calculate statistics for selected text or full content
    const targetText = selectedText || text;
    this.lastStats = this.calculateStatistics(targetText);
    
    // Update status bar
    if (this.statusBar) {
      this.updateStatusBar(selectedText ? 'selection' : 'document');
    }
    
    // Update dialog if open
    if (this.dialog) {
      this.updateDialog(selectedText ? 'selection' : 'document');
    }
  }

  private calculateStatistics(text: string): Statistics {
    // Remove extra whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Count words
    const words = cleanText ? cleanText.split(/\s+/).length : 0;
    
    // Count characters
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    
    // Count paragraphs (blocks of text separated by double line breaks)
    const paragraphs = cleanText ? cleanText.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
    
    // Count sentences (simple approach)
    const sentences = cleanText ? cleanText.split(/[.!?]+/).filter(s => s.trim()).length : 0;
    
    // Calculate reading time
    let readingTime: string | undefined;
    if (this.config.readingTime && words > 0) {
      const minutes = Math.ceil(words / (this.config.readingSpeed || 200));
      if (minutes === 1) {
        readingTime = '1 minute';
      } else if (minutes < 60) {
        readingTime = `${minutes} minutes`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
          readingTime = `${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
          readingTime = `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
        }
      }
    }
    
    return {
      words,
      characters,
      charactersNoSpaces,
      paragraphs,
      sentences,
      readingTime
    };
  }

  private createStatusBar(): void {
    this.statusBar = createElement('div', {
      className: 'xeditor-status-bar'
    });
    
    this.updateStatusBar('document');
    
    // Add click handler to show full statistics
    this.statusBar.addEventListener('click', () => {
      this.showStatistics();
    });
    
    // Insert after editor content
    this.editor.wrapper.appendChild(this.statusBar);
  }

  private updateStatusBar(type: 'document' | 'selection'): void {
    if (!this.statusBar) return;
    
    const stats = this.lastStats;
    const prefix = type === 'selection' ? 'Selection: ' : '';
    
    this.statusBar.innerHTML = `
      <span class="xeditor-status-item">${prefix}${stats.words} words</span>
      <span class="xeditor-status-separator">|</span>
      <span class="xeditor-status-item">${stats.characters} characters</span>
      ${stats.readingTime ? `
        <span class="xeditor-status-separator">|</span>
        <span class="xeditor-status-item">${stats.readingTime} read</span>
      ` : ''}
    `;
  }

  private showStatistics(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
      return;
    }
    
    // Update statistics before showing
    this.updateStatistics();
    
    const overlay = createElement('div', {
      className: 'xeditor-statistics-overlay'
    });
    
    const dialog = createElement('div', {
      className: 'xeditor-statistics-dialog'
    });
    
    const title = createElement('h3', {}, ['Document Statistics']);
    
    const closeBtn = createElement('button', {
      className: 'xeditor-statistics-close',
      type: 'button'
    }, ['×']);
    
    closeBtn.addEventListener('click', () => {
      overlay.remove();
      this.dialog = null;
    });
    
    const content = createElement('div', {
      className: 'xeditor-statistics-content'
    });
    
    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(content);
    overlay.appendChild(dialog);
    
    this.dialog = overlay;
    this.updateDialog('document');
    
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.dialog = null;
      }
    });
    
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        overlay.remove();
        this.dialog = null;
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  private updateDialog(type: 'document' | 'selection'): void {
    if (!this.dialog) return;
    
    const content = this.dialog.querySelector('.xeditor-statistics-content');
    if (!content) return;
    
    const stats = this.lastStats;
    const selection = window.getSelection();
    const hasSelection = selection && !selection.isCollapsed;
    
    content.innerHTML = `
      <div class="xeditor-statistics-section">
        <h4>${type === 'selection' ? 'Selection' : 'Document'} Statistics</h4>
        <table class="xeditor-statistics-table">
          <tr>
            <td>Words:</td>
            <td><strong>${stats.words.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Characters (with spaces):</td>
            <td><strong>${stats.characters.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Characters (no spaces):</td>
            <td><strong>${stats.charactersNoSpaces.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Paragraphs:</td>
            <td><strong>${stats.paragraphs.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Sentences:</td>
            <td><strong>${stats.sentences.toLocaleString()}</strong></td>
          </tr>
          ${stats.readingTime ? `
          <tr>
            <td>Reading time:</td>
            <td><strong>${stats.readingTime}</strong></td>
          </tr>
          ` : ''}
          ${stats.words > 0 ? `
          <tr>
            <td>Average word length:</td>
            <td><strong>${(stats.charactersNoSpaces / stats.words).toFixed(1)} characters</strong></td>
          </tr>
          ` : ''}
          ${stats.sentences > 0 ? `
          <tr>
            <td>Average sentence length:</td>
            <td><strong>${(stats.words / stats.sentences).toFixed(1)} words</strong></td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${hasSelection && type === 'selection' ? `
        <div class="xeditor-statistics-actions">
          <button class="xeditor-statistics-btn" onclick="this.closest('.xeditor-statistics-content').dispatchEvent(new CustomEvent('showDocument'))">
            Show Document Statistics
          </button>
        </div>
      ` : ''}
      
      ${!hasSelection && type === 'document' ? `
        <div class="xeditor-statistics-info">
          <p>Tip: Select text to see statistics for the selection only.</p>
        </div>
      ` : ''}
    `;
    
    // Handle show document button
    content.addEventListener('showDocument', () => {
      this.updateDialog('document');
    });
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      /* Status bar */
      .xeditor-status-bar {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        background-color: var(--xeditor-toolbar-bg);
        border-top: 1px solid var(--xeditor-border);
        font-size: 12px;
        color: var(--xeditor-text);
        cursor: pointer;
        user-select: none;
      }
      
      .xeditor-status-bar:hover {
        background-color: var(--xeditor-active);
      }
      
      .xeditor-status-item {
        margin: 0 8px;
      }
      
      .xeditor-status-separator {
        color: var(--xeditor-border);
      }
      
      /* Statistics dialog */
      .xeditor-statistics-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .xeditor-statistics-dialog {
        position: relative;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
      }
      
      .xeditor-statistics-dialog h3 {
        margin: 0;
        padding: 20px;
        border-bottom: 1px solid #eee;
      }
      
      .xeditor-statistics-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .xeditor-statistics-close:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-statistics-content {
        padding: 20px;
      }
      
      .xeditor-statistics-section {
        margin-bottom: 20px;
      }
      
      .xeditor-statistics-section h4 {
        margin: 0 0 15px 0;
        color: #333;
      }
      
      .xeditor-statistics-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .xeditor-statistics-table td {
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .xeditor-statistics-table td:first-child {
        color: #666;
        width: 60%;
      }
      
      .xeditor-statistics-table td:last-child {
        text-align: right;
      }
      
      .xeditor-statistics-table tr:last-child td {
        border-bottom: none;
      }
      
      .xeditor-statistics-actions {
        margin-top: 20px;
        text-align: center;
      }
      
      .xeditor-statistics-btn {
        padding: 8px 16px;
        background-color: var(--xeditor-primary);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-statistics-btn:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      .xeditor-statistics-info {
        margin-top: 20px;
        padding: 12px;
        background-color: #f8f9fa;
        border-radius: 4px;
        font-size: 13px;
        color: #666;
        text-align: center;
      }
      
      .xeditor-statistics-info p {
        margin: 0;
      }
      
      /* Dark theme */
      [data-theme="dark"] .xeditor-statistics-dialog {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-statistics-dialog h3 {
        border-bottom-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-statistics-section h4 {
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-statistics-table td {
        border-bottom-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-statistics-table td:first-child {
        color: #adb5bd;
      }
      
      [data-theme="dark"] .xeditor-statistics-info {
        background-color: #495057;
        color: #adb5bd;
      }
      
      [data-theme="dark"] .xeditor-statistics-close:hover {
        background-color: #495057;
      }
      
      /* Responsive */
      @media (max-width: 600px) {
        .xeditor-statistics-dialog {
          width: 95vw;
          margin: 10px;
        }
        
        .xeditor-statistics-table {
          font-size: 14px;
        }
        
        .xeditor-statistics-table td {
          padding: 6px 0;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}