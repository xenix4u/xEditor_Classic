import { Plugin, Editor, Change, TrackChangesConfig } from '../../types';
import { createElement } from '../../utils/dom';

class TrackChangesPluginImpl implements Plugin {
  name = 'trackChanges';
  private editor: Editor | null = null;
  config: TrackChangesConfig;
  private changes: Map<string, Change> = new Map();
  isTracking: boolean = false;
  private changesList: HTMLElement | null = null;
  private mutationObserver: MutationObserver | null = null;
  private authorColors: Map<string, string> = new Map();
  private colorIndex = 0;
  private colors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#d35400'
  ];

  constructor(config?: Partial<TrackChangesConfig>) {
    this.config = {
      enabled: false,
      currentUser: 'Anonymous',
      showAuthors: true,
      showTimestamps: true,
      ...config
    };

    // Initialize author colors
    if (this.config.authorColors) {
      Object.entries(this.config.authorColors).forEach(([author, color]) => {
        this.authorColors.set(author, color);
      });
    }
  }

  init(editor: Editor): void {
    this.editor = editor;

    this.addToolbarItems();
    this.createChangesList();
    this.addStyles();

    if (this.config.enabled) {
      this.startTracking();
    }
  }

  destroy(): void {
    this.stopTracking();
    if (this.changesList) {
      this.changesList.remove();
    }
    this.removeAllChangeMarks();
  }

  private addToolbarItems(): void {
    if (!this.editor || !this.editor.toolbar) return;

    this.editor.toolbar.addItem({
      name: 'track-changes',
      icon: this.getTrackChangesIcon(),
      tooltip: 'Track Changes',
      active: () => this.isTracking,
      onClick: () => this.toggleTracking()
    });

    this.editor.toolbar.addItem({
      name: 'track-changes-list',
      icon: this.getChangesListIcon(),
      tooltip: 'Show Changes',
      active: () => this.changesList?.style.display === 'block',
      onClick: () => this.toggleChangesList()
    });

    this.editor.toolbar.addItem({
      name: 'accept-all-changes',
      icon: this.getAcceptAllIcon(),
      tooltip: 'Accept All Changes',
      enabled: () => this.changes.size > 0,
      onClick: () => this.acceptAllChanges()
    });

    this.editor.toolbar.addItem({
      name: 'reject-all-changes',
      icon: this.getRejectAllIcon(),
      tooltip: 'Reject All Changes',
      enabled: () => this.changes.size > 0,
      onClick: () => this.rejectAllChanges()
    });
  }

  private createChangesList(): void {
    if (!this.editor) return;

    this.changesList = createElement('div', {
      className: 'xeditor-changes-list'
    });

    this.changesList.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: 350px;
      height: 100%;
      background: #f9f9f9;
      border-left: 1px solid #ddd;
      overflow-y: auto;
      display: none;
      z-index: 1000;
    `;

    const header = createElement('div', {
      className: 'xeditor-changes-header'
    });
    header.style.cssText = `
      padding: 15px;
      background: #fff;
      border-bottom: 1px solid #ddd;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>Changes</span>
      <button class="xeditor-changes-close" style="background: none; border: none; cursor: pointer; font-size: 20px;">&times;</button>
    `;

    const content = createElement('div', {
      className: 'xeditor-changes-content'
    });
    content.style.cssText = 'padding: 15px;';

    this.changesList.appendChild(header);
    this.changesList.appendChild(content);

    this.editor.wrapper.appendChild(this.changesList);

    // Close button
    header.querySelector('.xeditor-changes-close')?.addEventListener('click', () => {
      this.toggleChangesList();
    });
  }

  private startTracking(): void {
    if (!this.editor || this.isTracking) return;

    this.isTracking = true;

    // Create mutation observer to track changes
    this.mutationObserver = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.mutationObserver.observe(this.editor.contentElement, {
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });

    // Override paste handler
    this.editor.contentElement.addEventListener('paste', this.handlePaste);

    // Track selection deletions
    this.editor.contentElement.addEventListener('keydown', this.handleKeydown);

    this.editor.emit('trackchanges:start');
  }

  private stopTracking(): void {
    if (!this.isTracking) return;

    this.isTracking = false;

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.editor) {
      this.editor.contentElement.removeEventListener('paste', this.handlePaste);
      this.editor.contentElement.removeEventListener('keydown', this.handleKeydown);
      this.editor.emit('trackchanges:stop');
    }
  }

  private handleMutations(mutations: MutationRecord[]): void {
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData') {
        this.handleTextChange(mutation);
      } else if (mutation.type === 'childList') {
        this.handleNodeChange(mutation);
      }
    });

    this.updateChangesList();
  }

  private handleTextChange(mutation: MutationRecord): void {
    if (!mutation.target.parentNode) return;

    const oldValue = mutation.oldValue || '';
    const newValue = mutation.target.textContent || '';

    if (oldValue === newValue) return;

    // Find what changed
    const { deletedText, insertedText, position } = this.diffText(oldValue, newValue);

    if (deletedText) {
      this.createChange('delete', deletedText, mutation.target, position);
    }

    if (insertedText) {
      this.createChange('insert', insertedText, mutation.target, position + deletedText.length);
    }
  }

  private handleNodeChange(mutation: MutationRecord): void {
    // Handle removed nodes
    mutation.removedNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
        const text = node.textContent || '';
        if (text.trim()) {
          this.createChange('delete', text, mutation.target, 0);
        }
      }
    });

    // Handle added nodes
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
        // Skip if it's a change mark we added
        if (node instanceof HTMLElement && 
            (node.classList.contains('xeditor-insert') || 
             node.classList.contains('xeditor-delete'))) {
          return;
        }

        const text = node.textContent || '';
        if (text.trim()) {
          this.createChange('insert', text, mutation.target, 0);
        }
      }
    });
  }

  private handlePaste = (e: ClipboardEvent): void => {
    if (!this.isTracking) return;

    e.preventDefault();

    const text = e.clipboardData?.getData('text/plain') || '';
    if (text) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Delete selected content first
        if (!range.collapsed) {
          const selectedText = range.toString();
          this.createChange('delete', selectedText, range.commonAncestorContainer, range.startOffset);
          range.deleteContents();
        }

        // Insert new content
        this.createChange('insert', text, range.startContainer, range.startOffset);
        
        // Actually insert the text
        const textNode = document.createTextNode(text);
        const mark = this.createChangeMark('insert');
        mark.appendChild(textNode);
        range.insertNode(mark);
        
        // Move cursor after inserted text
        range.setStartAfter(mark);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  private handleKeydown = (e: KeyboardEvent): void => {
    if (!this.isTracking) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        if (!range.collapsed) {
          e.preventDefault();
          const selectedText = range.toString();
          this.createChange('delete', selectedText, range.commonAncestorContainer, range.startOffset);
          
          // Wrap in delete mark instead of actually deleting
          const mark = this.createChangeMark('delete');
          try {
            range.surroundContents(mark);
          } catch {
            // If surroundContents fails, use alternative method
            const contents = range.extractContents();
            mark.appendChild(contents);
            range.insertNode(mark);
          }
          
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  };

  private diffText(oldText: string, newText: string): { deletedText: string; insertedText: string; position: number } {
    // Simple diff algorithm - find first difference
    let position = 0;
    while (position < oldText.length && position < newText.length && oldText[position] === newText[position]) {
      position++;
    }

    // Find end of difference
    let oldEnd = oldText.length;
    let newEnd = newText.length;
    while (oldEnd > position && newEnd > position && oldText[oldEnd - 1] === newText[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }

    const deletedText = oldText.substring(position, oldEnd);
    const insertedText = newText.substring(position, newEnd);

    return { deletedText, insertedText, position };
  }

  private createChange(type: 'insert' | 'delete', content: string, node: Node, offset: number): void {
    const change: Change = {
      id: this.generateId(),
      type,
      author: this.config.currentUser || 'Anonymous',
      timestamp: new Date(),
      content,
      range: this.serializeRange(node, offset, content.length),
      accepted: false,
      rejected: false
    };

    this.changes.set(change.id, change);

    if (this.config.onChangeAdd) {
      this.config.onChangeAdd(change);
    }

    this.editor?.emit('trackchanges:add', change);
  }

  private createChangeMark(type: 'insert' | 'delete', _content?: string): HTMLElement {
    const mark = createElement('span', {
      className: `xeditor-${type}`,
      'data-change-id': this.generateId(),
      'data-author': this.config.currentUser || 'Anonymous',
      'data-timestamp': new Date().toISOString()
    });

    const author = this.config.currentUser || 'Anonymous';
    const color = this.getAuthorColor(author);

    if (type === 'insert') {
      mark.style.cssText = `
        background-color: ${color}33;
        border-bottom: 2px solid ${color};
        padding: 0 2px;
      `;
    } else {
      mark.style.cssText = `
        text-decoration: line-through;
        color: ${color};
        background-color: ${color}1a;
      `;
    }

    if (this.config.showAuthors || this.config.showTimestamps) {
      mark.title = this.getChangeTooltip(type, author, new Date());
    }

    return mark;
  }

  private getAuthorColor(author: string): string {
    if (!this.authorColors.has(author)) {
      const color = this.colors[this.colorIndex % this.colors.length];
      this.authorColors.set(author, color);
      this.colorIndex++;
    }
    return this.authorColors.get(author)!;
  }

  private getChangeTooltip(type: string, author: string, timestamp: Date): string {
    const parts = [];
    
    if (this.config.showAuthors) {
      parts.push(`${type === 'insert' ? 'Added' : 'Deleted'} by ${author}`);
    }
    
    if (this.config.showTimestamps) {
      parts.push(this.formatDate(timestamp));
    }
    
    return parts.join(' - ');
  }

  private serializeRange(node: Node, offset: number, length: number): Change['range'] {
    const path = this.getNodePath(node);
    return {
      startOffset: offset,
      endOffset: offset + length,
      startPath: path,
      endPath: path
    };
  }

  private getNodePath(node: Node): number[] {
    const path: number[] = [];
    let current = node;
    
    while (current && current !== this.editor?.contentElement) {
      const parent = current.parentNode;
      if (parent) {
        const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
        path.unshift(index);
      }
      current = parent as Node;
    }
    
    return path;
  }

  private updateChangesList(): void {
    if (!this.changesList) return;

    const content = this.changesList.querySelector('.xeditor-changes-content');
    if (!content) return;

    content.innerHTML = '';

    if (this.changes.size === 0) {
      content.innerHTML = '<p style="color: #666; text-align: center;">No changes</p>';
      return;
    }

    // Group changes by author
    const changesByAuthor = new Map<string, Change[]>();
    this.changes.forEach(change => {
      const author = change.author;
      if (!changesByAuthor.has(author)) {
        changesByAuthor.set(author, []);
      }
      changesByAuthor.get(author)!.push(change);
    });

    changesByAuthor.forEach((changes, author) => {
      const authorSection = createElement('div', {
        className: 'xeditor-changes-author'
      });
      authorSection.style.cssText = 'margin-bottom: 20px;';

      const authorHeader = createElement('div');
      authorHeader.style.cssText = `
        font-weight: bold;
        margin-bottom: 10px;
        color: ${this.getAuthorColor(author)};
      `;
      authorHeader.textContent = author;

      authorSection.appendChild(authorHeader);

      changes.forEach(change => {
        const changeEl = this.createChangeElement(change);
        authorSection.appendChild(changeEl);
      });

      content.appendChild(authorSection);
    });
  }

  private createChangeElement(change: Change): HTMLElement {
    const container = createElement('div', {
      className: 'xeditor-change'
    });
    
    container.style.cssText = `
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
      font-size: 14px;
    `;

    const typeLabel = createElement('span');
    typeLabel.style.cssText = `
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      margin-right: 10px;
      ${change.type === 'insert' ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}
    `;
    typeLabel.textContent = change.type.toUpperCase();

    const content = createElement('div');
    content.style.cssText = `
      margin: 5px 0;
      padding: 5px;
      background: #f8f9fa;
      border-left: 3px solid ${this.getAuthorColor(change.author)};
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-word;
    `;
    content.textContent = change.content || '';

    const timestamp = createElement('div');
    timestamp.style.cssText = 'font-size: 11px; color: #666; margin-top: 5px;';
    timestamp.textContent = this.formatDate(change.timestamp);

    const actions = createElement('div');
    actions.style.cssText = 'margin-top: 10px;';

    const acceptBtn = createElement('button', {}, ['Accept']) as HTMLButtonElement;
    acceptBtn.style.cssText = `
      background: #28a745;
      color: white;
      border: none;
      padding: 3px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-right: 10px;
    `;
    acceptBtn.addEventListener('click', () => this.acceptChange(change.id));

    const rejectBtn = createElement('button', {}, ['Reject']) as HTMLButtonElement;
    rejectBtn.style.cssText = `
      background: #dc3545;
      color: white;
      border: none;
      padding: 3px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    rejectBtn.addEventListener('click', () => this.rejectChange(change.id));

    actions.appendChild(acceptBtn);
    actions.appendChild(rejectBtn);

    container.appendChild(typeLabel);
    container.appendChild(content);
    container.appendChild(timestamp);
    container.appendChild(actions);

    return container;
  }

  private acceptChange(changeId: string): void {
    const change = this.changes.get(changeId);
    if (!change || !this.editor) return;

    // Find and process the change mark in the editor
    const mark = this.editor.contentElement.querySelector(`[data-change-id="${changeId}"]`);
    if (mark) {
      if (change.type === 'insert') {
        // Keep the text but remove the marking
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent?.insertBefore(mark.firstChild, mark);
        }
        parent?.removeChild(mark);
      } else if (change.type === 'delete') {
        // Remove the deleted text
        mark.remove();
      }
    }

    change.accepted = true;
    this.changes.delete(changeId);
    this.updateChangesList();

    if (this.config.onChangeAccept) {
      this.config.onChangeAccept(changeId);
    }

    this.editor.emit('trackchanges:accept', changeId);
  }

  private rejectChange(changeId: string): void {
    const change = this.changes.get(changeId);
    if (!change || !this.editor) return;

    // Find and process the change mark in the editor
    const mark = this.editor.contentElement.querySelector(`[data-change-id="${changeId}"]`);
    if (mark) {
      if (change.type === 'insert') {
        // Remove the inserted text
        mark.remove();
      } else if (change.type === 'delete') {
        // Restore the deleted text
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent?.insertBefore(mark.firstChild, mark);
        }
        parent?.removeChild(mark);
      }
    }

    change.rejected = true;
    this.changes.delete(changeId);
    this.updateChangesList();

    if (this.config.onChangeReject) {
      this.config.onChangeReject(changeId);
    }

    this.editor.emit('trackchanges:reject', changeId);
  }

  private acceptAllChanges(): void {
    if (!confirm('Accept all changes?')) return;

    const changeIds = Array.from(this.changes.keys());
    changeIds.forEach(id => this.acceptChange(id));
  }

  private rejectAllChanges(): void {
    if (!confirm('Reject all changes?')) return;

    const changeIds = Array.from(this.changes.keys());
    changeIds.forEach(id => this.rejectChange(id));
  }

  private toggleTracking(): void {
    if (this.isTracking) {
      this.stopTracking();
    } else {
      this.startTracking();
    }

    if (this.editor && this.editor.toolbar) {
      this.editor.toolbar.updateState();
    }
  }

  private toggleChangesList(): void {
    if (!this.changesList) return;
    
    const isVisible = this.changesList.style.display === 'block';
    this.changesList.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      this.updateChangesList();
    }

    if (this.editor && this.editor.toolbar) {
      this.editor.toolbar.updateState();
    }
  }

  private removeAllChangeMarks(): void {
    if (!this.editor) return;

    const marks = this.editor.contentElement.querySelectorAll('.xeditor-insert, .xeditor-delete');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent?.insertBefore(mark.firstChild, mark);
      }
      parent?.removeChild(mark);
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleString();
  }

  private generateId(): string {
    return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-insert {
        position: relative;
      }
      
      .xeditor-insert:hover::after {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        left: 0;
        background: #333;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        pointer-events: none;
      }
      
      .xeditor-delete {
        position: relative;
      }
      
      .xeditor-delete:hover::after {
        content: attr(title);
        position: absolute;
        bottom: 100%;
        left: 0;
        background: #333;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        pointer-events: none;
      }
      
      .xeditor-changes-list {
        transition: transform 0.3s ease;
      }
      
      .xeditor-change:hover {
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      
      .xeditor-change button:hover {
        opacity: 0.9;
      }
    `;
    document.head.appendChild(style);
  }

  private getTrackChangesIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>`;
  }

  private getChangesListIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>`;
  }

  private getAcceptAllIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>`;
  }

  private getRejectAllIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
      <line x1="18" y1="9" x2="12" y2="15"/>
      <line x1="12" y1="9" x2="18" y2="15"/>
    </svg>`;
  }

  commands = {
    toggleTracking: {
      execute: () => this.toggleTracking()
    },
    toggleChangesList: {
      execute: () => this.toggleChangesList()
    },
    acceptAllChanges: {
      execute: () => this.acceptAllChanges(),
      canExecute: () => this.changes.size > 0
    },
    rejectAllChanges: {
      execute: () => this.rejectAllChanges(),
      canExecute: () => this.changes.size > 0
    }
  };

  shortcuts = {
    'Ctrl+Shift+E': 'toggleTracking',
    'Cmd+Shift+E': 'toggleTracking'
  };
}

// Export the class directly for the plugins index
export class TrackChangesPlugin extends TrackChangesPluginImpl {}

// Export factory function
export default function createTrackChangesPlugin(config?: Partial<TrackChangesConfig>): Plugin {
  return new TrackChangesPlugin(config);
}