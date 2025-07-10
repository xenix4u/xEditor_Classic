import { HistoryManager } from '../types';
import { debounce } from '../utils/events';

interface HistoryState {
  content: string;
  selection: {
    start: number;
    end: number;
  };
  timestamp: number;
}

export class HistoryManagerImpl implements HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex: number = -1;
  private maxSize: number = 100;
  private editor: HTMLElement;
  private isRestoring: boolean = false;
  private lastRecordTime: number = 0;
  private minRecordInterval: number = 500; // Minimum time between records
  private recordTimer: ReturnType<typeof setTimeout> | null = null;
  private lastContent: string = '';

  constructor(editor: HTMLElement, maxSize: number = 100) {
    this.editor = editor;
    this.maxSize = maxSize;
    // Initial state will be recorded after a delay
    setTimeout(() => this.recordImmediate(), 100);
  }

  undo(): void {
    if (!this.canUndo()) {
      // Cannot undo - no history available
      return;
    }
    
    // Undo operation
    this.currentIndex--;
    this.restore(this.history[this.currentIndex]);
  }

  redo(): void {
    if (!this.canRedo()) {
      // Cannot redo - no future history
      return;
    }
    
    // Redo operation
    this.currentIndex++;
    this.restore(this.history[this.currentIndex]);
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  record = debounce((): void => {
    if (this.isRestoring) {
      // Skip record - currently restoring
      return;
    }
    
    const now = Date.now();
    if (now - this.lastRecordTime < this.minRecordInterval) {
      // Skip record - too soon after last record
      return;
    }
    
    const state = this.captureState();
    
    // Check if content actually changed
    if (this.currentIndex >= 0) {
      const lastState = this.history[this.currentIndex];
      if (lastState.content === state.content) {
        // Skip record - content unchanged
        return;
      }
    }
    
    // Remove any redo history when new changes are made
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
      // Removed redo history
    }
    
    this.history.push(state);
    this.lastRecordTime = now;
    
    if (this.history.length > this.maxSize) {
      this.history.shift();
      // Removed oldest entry - max size reached
    } else {
      this.currentIndex++;
    }
    
    // Recorded state
  }, 500);

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.lastRecordTime = 0;
    this.lastContent = '';
    if (this.recordTimer) {
      clearTimeout(this.recordTimer);
      this.recordTimer = null;
    }
    // Cleared history
    setTimeout(() => this.recordImmediate(), 100);
  }
  
  // Force immediate record without debounce
  recordImmediate(): void {
    if (this.isRestoring) {
      // Skip immediate record - currently restoring
      return;
    }
    
    const state = this.captureState();
    
    // Check if content changed
    if (state.content === this.lastContent) {
      // Skip immediate record - content unchanged
      return;
    }
    
    if (this.currentIndex >= 0) {
      const lastState = this.history[this.currentIndex];
      if (lastState.content === state.content) {
        // Skip immediate record - same as current state
        return;
      }
    }
    
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
      // Removed redo history (immediate)
    }
    
    this.history.push(state);
    this.lastRecordTime = Date.now();
    this.lastContent = state.content;
    
    if (this.history.length > this.maxSize) {
      this.history.shift();
      // Removed oldest entry (immediate) - max size reached
    } else {
      this.currentIndex++;
    }
    
    // Immediate record complete
  }

  getHistory(): readonly HistoryState[] {
    return this.history;
  }

  private captureState(): HistoryState {
    const content = this.editor.innerHTML;
    const selection = window.getSelection();
    let start = 0;
    let end = 0;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preRange = range.cloneRange();
      preRange.selectNodeContents(this.editor);
      preRange.setEnd(range.startContainer, range.startOffset);
      start = preRange.toString().length;
      
      preRange.setEnd(range.endContainer, range.endOffset);
      end = preRange.toString().length;
    }
    
    return {
      content,
      selection: { start, end },
      timestamp: Date.now()
    };
  }

  private restore(state: HistoryState): void {
    this.isRestoring = true;
    console.log(`[History] Restoring state from timestamp: ${new Date(state.timestamp).toISOString()}`);
    
    this.editor.innerHTML = state.content;
    this.lastContent = state.content;
    
    this.restoreSelection(state.selection);
    
    // Don't trigger input event during restore to avoid recording
    this.editor.dispatchEvent(new Event('restored', { bubbles: true }));
    
    setTimeout(() => {
      this.isRestoring = false;
      console.log('[History] Restore completed');
    }, 150);
  }

  private restoreSelection(selection: { start: number; end: number }): void {
    const range = document.createRange();
    const textNodes = this.getTextNodes(this.editor);
    
    let currentOffset = 0;
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;
    
    for (const node of textNodes) {
      const nodeLength = node.textContent?.length || 0;
      const nodeEndOffset = currentOffset + nodeLength;
      
      if (!startNode && selection.start >= currentOffset && selection.start <= nodeEndOffset) {
        startNode = node;
        startOffset = selection.start - currentOffset;
      }
      
      if (!endNode && selection.end >= currentOffset && selection.end <= nodeEndOffset) {
        endNode = node;
        endOffset = selection.end - currentOffset;
      }
      
      if (startNode && endNode) break;
      
      currentOffset = nodeEndOffset;
    }
    
    if (startNode && endNode) {
      try {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch (e) {
        console.error('Failed to restore selection:', e);
      }
    }
  }

  private getTextNodes(node: Node): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode: Node | null;
    while ((currentNode = walker.nextNode()) !== null) {
      textNodes.push(currentNode as Text);
    }
    
    return textNodes;
  }
}