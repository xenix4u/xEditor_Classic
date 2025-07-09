import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface CharLimitConfig {
  maxChars?: number;
  maxWords?: number;
  hardLimit?: boolean;
  countSpaces?: boolean;
  showCounter?: boolean;
  counterPosition?: 'bottom' | 'top';
  warnThreshold?: number; // Percentage (e.g., 80 for 80%)
}

export class CharLimitPlugin implements Plugin {
  name = 'char-limit';
  private editor!: Editor;
  private config: CharLimitConfig;
  private counter?: HTMLElement;
  private warningShown = false;

  toolbar: ToolbarItem[] = [];

  constructor(config: CharLimitConfig = {}) {
    this.config = {
      hardLimit: config.hardLimit !== false,
      countSpaces: config.countSpaces !== false,
      showCounter: config.showCounter !== false,
      counterPosition: config.counterPosition || 'bottom',
      warnThreshold: config.warnThreshold || 80,
      ...config
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    if (this.config.showCounter) {
      this.createCounter();
    }
    
    this.setupEventListeners();
    this.addStyles();
    
    // Initial count
    this.updateCount();
  }

  destroy(): void {
    if (this.counter) {
      this.counter.remove();
    }
  }

  private createCounter(): void {
    this.counter = createElement('div', {
      className: 'xeditor-char-counter'
    });
    
    if (this.config.counterPosition === 'top') {
      this.editor.wrapper.insertBefore(this.counter, this.editor.toolbar?.element || this.editor.contentElement);
    } else {
      this.editor.wrapper.appendChild(this.counter);
    }
  }

  private setupEventListeners(): void {
    // Update count on input
    this.editor.on('change', () => {
      this.updateCount();
    });
    
    // Prevent input if hard limit is reached
    if (this.config.hardLimit) {
      this.editor.contentElement.addEventListener('beforeinput', (e: InputEvent) => {
        if (this.isLimitExceeded() && !this.isDeleteOperation(e)) {
          e.preventDefault();
          this.showLimitWarning();
        }
      });
      
      // Handle paste events
      this.editor.contentElement.addEventListener('paste', (e: ClipboardEvent) => {
        if (this.isLimitExceeded()) {
          e.preventDefault();
          this.showLimitWarning();
          return;
        }
        
        // Check if paste would exceed limit
        const pasteText = e.clipboardData?.getData('text/plain') || '';
        const currentCount = this.getCurrentCount();
        const pasteCount = this.config.maxWords ? 
          this.countWords(pasteText) : 
          this.countCharacters(pasteText);
        
        if (this.wouldExceedLimit(currentCount.count + pasteCount)) {
          e.preventDefault();
          
          // Trim paste content to fit
          const allowedCount = this.getAllowedCount() - currentCount.count;
          if (allowedCount > 0) {
            const trimmedText = this.config.maxWords ?
              this.trimToWordCount(pasteText, allowedCount) :
              this.trimToCharCount(pasteText, allowedCount);
            
            document.execCommand('insertText', false, trimmedText);
          }
          
          this.showLimitWarning();
        }
      });
    }
  }

  private updateCount(): void {
    const count = this.getCurrentCount();
    const limit = this.getAllowedCount();
    
    if (this.counter) {
      const percentage = limit > 0 ? Math.round((count.count / limit) * 100) : 0;
      
      let text = '';
      if (this.config.maxWords) {
        text = `Words: ${count.words}`;
        if (limit > 0) text += ` / ${limit}`;
      } else if (this.config.maxChars) {
        text = `Characters: ${count.chars}`;
        if (limit > 0) text += ` / ${limit}`;
      } else {
        text = `Words: ${count.words} | Characters: ${count.chars}`;
      }
      
      this.counter.textContent = text;
      
      // Update counter styling based on threshold
      this.counter.classList.remove('xeditor-char-counter--warning', 'xeditor-char-counter--exceeded');
      
      if (limit > 0) {
        if (percentage >= 100) {
          this.counter.classList.add('xeditor-char-counter--exceeded');
        } else if (percentage >= this.config.warnThreshold!) {
          this.counter.classList.add('xeditor-char-counter--warning');
        }
      }
    }
    
    // Emit event
    this.editor.emit('charLimitUpdate', count);
  }

  private getCurrentCount(): { chars: number; words: number; count: number } {
    const text = this.getPlainText();
    const chars = this.countCharacters(text);
    const words = this.countWords(text);
    
    return {
      chars,
      words,
      count: this.config.maxWords ? words : chars
    };
  }

  private getPlainText(): string {
    const content = this.editor.getContent();
    const div = document.createElement('div');
    div.innerHTML = content;
    return div.textContent || '';
  }

  private countCharacters(text: string): number {
    if (!this.config.countSpaces) {
      text = text.replace(/\s/g, '');
    }
    return text.length;
  }

  private countWords(text: string): number {
    text = text.trim();
    if (!text) return 0;
    
    // Split by whitespace and filter out empty strings
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private getAllowedCount(): number {
    return this.config.maxWords || this.config.maxChars || 0;
  }

  private isLimitExceeded(): boolean {
    const count = this.getCurrentCount();
    const limit = this.getAllowedCount();
    return limit > 0 && count.count >= limit;
  }

  private wouldExceedLimit(newCount: number): boolean {
    const limit = this.getAllowedCount();
    return limit > 0 && newCount > limit;
  }

  private isDeleteOperation(event: InputEvent): boolean {
    return event.inputType === 'deleteContentBackward' || 
           event.inputType === 'deleteContentForward' ||
           event.inputType === 'deleteByCut' ||
           event.inputType === 'deleteByDrag';
  }

  private trimToWordCount(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/);
    return words.slice(0, maxWords).join(' ');
  }

  private trimToCharCount(text: string, maxChars: number): string {
    if (!this.config.countSpaces) {
      // Complex trimming when not counting spaces
      let result = '';
      let charCount = 0;
      
      for (let i = 0; i < text.length && charCount < maxChars; i++) {
        result += text[i];
        if (text[i] !== ' ') {
          charCount++;
        }
      }
      
      return result;
    }
    
    return text.substring(0, maxChars);
  }

  private showLimitWarning(): void {
    if (this.warningShown) return;
    
    this.warningShown = true;
    
    const warning = createElement('div', {
      className: 'xeditor-char-limit-warning'
    });
    
    const limitType = this.config.maxWords ? 'word' : 'character';
    const limit = this.getAllowedCount();
    warning.textContent = `You have reached the ${limit} ${limitType} limit.`;
    
    document.body.appendChild(warning);
    
    // Position near cursor
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      warning.style.left = `${rect.left}px`;
      warning.style.top = `${rect.top - warning.offsetHeight - 10}px`;
    }
    
    // Remove after delay
    setTimeout(() => {
      warning.remove();
      this.warningShown = false;
    }, 3000);
  }

  getCharCount(): number {
    return this.getCurrentCount().chars;
  }

  getWordCount(): number {
    return this.getCurrentCount().words;
  }

  getRemainingChars(): number {
    if (!this.config.maxChars) return -1;
    return Math.max(0, this.config.maxChars - this.getCharCount());
  }

  getRemainingWords(): number {
    if (!this.config.maxWords) return -1;
    return Math.max(0, this.config.maxWords - this.getWordCount());
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-char-counter {
        padding: 8px 12px;
        font-size: 12px;
        color: #666;
        background-color: #f8f9fa;
        border-top: 1px solid #dee2e6;
        text-align: right;
      }
      
      .xeditor-char-counter--warning {
        color: #ff9800;
        background-color: #fff3cd;
      }
      
      .xeditor-char-counter--exceeded {
        color: #f44336;
        background-color: #ffebee;
      }
      
      .xeditor-char-limit-warning {
        position: fixed;
        background-color: #f44336;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: xeditor-warning-shake 0.3s ease-in-out;
      }
      
      @keyframes xeditor-warning-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-char-counter {
        background-color: #343a40;
        color: #adb5bd;
        border-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-char-counter--warning {
        background-color: #5a4a00;
        color: #ffc107;
      }
      
      [data-theme="dark"] .xeditor-char-counter--exceeded {
        background-color: #5a1e1e;
        color: #ff5252;
      }
    `;
    
    document.head.appendChild(style);
  }
}