import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, addClass, removeClass } from '../../utils/dom';

interface FindReplaceOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
}

export class FindReplacePlugin implements Plugin {
  name = 'findreplace';
  private editor!: Editor;
  private dialog: HTMLElement | null = null;
  private currentMatch: number = 0;
  private matches: Range[] = [];
  private options: FindReplaceOptions = {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false
  };

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).showFindReplaceDialog = this.showFindReplaceDialog.bind(this);
    
    // Register commands
    this.editor.commands.register('findReplace', {
      execute: () => this.showFindReplaceDialog()
    });
    
    // Register keyboard shortcuts
    this.registerShortcuts();
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    this.closeDialog();
    this.clearHighlights();
  }

  private registerShortcuts(): void {
    // Ctrl+F for find
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const selection = window.getSelection();
        if (selection && this.editor.contentElement.contains(selection.anchorNode)) {
          e.preventDefault();
          this.showFindReplaceDialog();
        }
      }
      
      // Ctrl+H for replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        const selection = window.getSelection();
        if (selection && this.editor.contentElement.contains(selection.anchorNode)) {
          e.preventDefault();
          this.showFindReplaceDialog(true);
        }
      }
    });
  }

  private showFindReplaceDialog(showReplace: boolean = false): void {
    if (this.dialog) {
      this.closeDialog();
      return;
    }

    const dialog = createElement('div', {
      className: 'xeditor-find-replace-dialog'
    });

    // Find section
    const findSection = createElement('div', {
      className: 'xeditor-find-section'
    });

    const findInput = createElement('input', {
      type: 'text',
      className: 'xeditor-find-input',
      placeholder: 'Find...'
    }) as HTMLInputElement;

    const matchInfo = createElement('span', {
      className: 'xeditor-match-info'
    }, ['0 of 0']);

    const prevBtn = createElement('button', {
      className: 'xeditor-find-btn',
      title: 'Previous match'
    }, ['◀']);

    const nextBtn = createElement('button', {
      className: 'xeditor-find-btn',
      title: 'Next match'
    }, ['▶']);

    findSection.appendChild(findInput);
    findSection.appendChild(matchInfo);
    findSection.appendChild(prevBtn);
    findSection.appendChild(nextBtn);

    // Replace section
    const replaceSection = createElement('div', {
      className: 'xeditor-replace-section',
      style: showReplace ? '' : 'display: none'
    });

    const replaceInput = createElement('input', {
      type: 'text',
      className: 'xeditor-replace-input',
      placeholder: 'Replace with...'
    }) as HTMLInputElement;

    const replaceBtn = createElement('button', {
      className: 'xeditor-replace-btn'
    }, ['Replace']);

    const replaceAllBtn = createElement('button', {
      className: 'xeditor-replace-all-btn'
    }, ['Replace All']);

    replaceSection.appendChild(replaceInput);
    replaceSection.appendChild(replaceBtn);
    replaceSection.appendChild(replaceAllBtn);

    // Options section
    const optionsSection = createElement('div', {
      className: 'xeditor-find-options'
    });

    const caseSensitive = this.createCheckbox('Case sensitive', 'caseSensitive');
    const wholeWord = this.createCheckbox('Whole word', 'wholeWord');
    const useRegex = this.createCheckbox('Use regex', 'useRegex');

    optionsSection.appendChild(caseSensitive);
    optionsSection.appendChild(wholeWord);
    optionsSection.appendChild(useRegex);

    // Toggle button
    const toggleBtn = createElement('button', {
      className: 'xeditor-toggle-replace',
      title: showReplace ? 'Hide replace' : 'Show replace'
    }, [showReplace ? '−' : '+']);

    // Close button
    const closeBtn = createElement('button', {
      className: 'xeditor-find-close'
    }, ['×']);

    // Event handlers
    findInput.addEventListener('input', () => {
      this.find(findInput.value);
      this.updateMatchInfo(matchInfo);
    });

    prevBtn.addEventListener('click', () => {
      this.findPrevious();
      this.updateMatchInfo(matchInfo);
    });

    nextBtn.addEventListener('click', () => {
      this.findNext();
      this.updateMatchInfo(matchInfo);
    });

    replaceBtn.addEventListener('click', () => {
      this.replace(replaceInput.value);
      this.find(findInput.value);
      this.updateMatchInfo(matchInfo);
    });

    replaceAllBtn.addEventListener('click', () => {
      const count = this.replaceAll(findInput.value, replaceInput.value);
      alert(`Replaced ${count} occurrences`);
      this.closeDialog();
    });

    toggleBtn.addEventListener('click', () => {
      const isVisible = replaceSection.style.display !== 'none';
      replaceSection.style.display = isVisible ? 'none' : 'flex';
      toggleBtn.textContent = isVisible ? '+' : '−';
    });

    closeBtn.addEventListener('click', () => {
      this.closeDialog();
    });

    // Assemble dialog
    dialog.appendChild(toggleBtn);
    dialog.appendChild(findSection);
    dialog.appendChild(replaceSection);
    dialog.appendChild(optionsSection);
    dialog.appendChild(closeBtn);

    // Position dialog
    const toolbar = this.editor.toolbar?.element;
    if (toolbar) {
      toolbar.parentNode?.insertBefore(dialog, toolbar.nextSibling);
    } else {
      this.editor.wrapper.insertBefore(dialog, this.editor.contentElement);
    }

    this.dialog = dialog;
    findInput.focus();

    // Select current word if any
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      findInput.value = selection.toString();
      this.find(findInput.value);
      this.updateMatchInfo(matchInfo);
    }
  }

  private createCheckbox(label: string, option: keyof FindReplaceOptions): HTMLElement {
    const container = createElement('label', {
      className: 'xeditor-find-option'
    });

    const checkbox = createElement('input', {
      type: 'checkbox',
      checked: this.options[option] ? 'checked' : ''
    }) as HTMLInputElement;

    checkbox.addEventListener('change', () => {
      this.options[option] = checkbox.checked;
      const findInput = this.dialog?.querySelector('.xeditor-find-input') as HTMLInputElement;
      if (findInput?.value) {
        this.find(findInput.value);
        const matchInfo = this.dialog?.querySelector('.xeditor-match-info');
        if (matchInfo) this.updateMatchInfo(matchInfo as HTMLElement);
      }
    });

    container.appendChild(checkbox);
    container.appendChild(document.createTextNode(' ' + label));

    return container;
  }

  private find(searchText: string): void {
    this.clearHighlights();
    this.matches = [];
    this.currentMatch = 0;

    if (!searchText) return;

    const content = this.editor.contentElement;
    // const text = content.textContent || '';

    // Build search pattern
    let pattern: RegExp;
    if (this.options.useRegex) {
      try {
        pattern = new RegExp(searchText, this.options.caseSensitive ? 'g' : 'gi');
      } catch (e) {
        return; // Invalid regex
      }
    } else {
      let escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (this.options.wholeWord) {
        escapedText = `\\b${escapedText}\\b`;
      }
      pattern = new RegExp(escapedText, this.options.caseSensitive ? 'g' : 'gi');
    }

    // Find all matches
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode()) !== null) {
      const textNode = node as Text;
      const nodeText = textNode.textContent || '';
      let match;

      while ((match = pattern.exec(nodeText)) !== null) {
        const range = document.createRange();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);
        this.matches.push(range);
      }
    }

    // Highlight matches
    this.highlightMatches();

    // Go to first match
    if (this.matches.length > 0) {
      this.scrollToMatch(0);
    }
  }

  private findNext(): void {
    if (this.matches.length === 0) return;
    
    this.currentMatch = (this.currentMatch + 1) % this.matches.length;
    this.scrollToMatch(this.currentMatch);
  }

  private findPrevious(): void {
    if (this.matches.length === 0) return;
    
    this.currentMatch = this.currentMatch - 1;
    if (this.currentMatch < 0) {
      this.currentMatch = this.matches.length - 1;
    }
    this.scrollToMatch(this.currentMatch);
  }

  private replace(replaceText: string): void {
    if (this.matches.length === 0 || !this.matches[this.currentMatch]) return;

    const range = this.matches[this.currentMatch];
    range.deleteContents();
    range.insertNode(document.createTextNode(replaceText));
    
    this.editor.history.record();
  }

  private replaceAll(searchText: string, replaceText: string): number {
    if (!searchText) return 0;

    this.clearHighlights();
    
    const content = this.editor.contentElement.innerHTML;
    let pattern: RegExp;
    
    if (this.options.useRegex) {
      try {
        pattern = new RegExp(searchText, this.options.caseSensitive ? 'g' : 'gi');
      } catch (e) {
        return 0;
      }
    } else {
      let escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (this.options.wholeWord) {
        escapedText = `\\b${escapedText}\\b`;
      }
      pattern = new RegExp(escapedText, this.options.caseSensitive ? 'g' : 'gi');
    }

    const newContent = content.replace(pattern, replaceText);
    const count = (content.match(pattern) || []).length;
    
    if (count > 0) {
      this.editor.setContent(newContent);
      this.editor.history.record();
    }

    return count;
  }

  private highlightMatches(): void {
    this.matches.forEach((range, index) => {
      const span = createElement('span', {
        className: index === this.currentMatch ? 
          'xeditor-find-highlight xeditor-find-current' : 
          'xeditor-find-highlight'
      });
      
      try {
        range.surroundContents(span);
      } catch (e) {
        // Handle cases where range spans multiple elements
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
    });
  }

  private clearHighlights(): void {
    const highlights = this.editor.contentElement.querySelectorAll('.xeditor-find-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      while (highlight.firstChild) {
        parent?.insertBefore(highlight.firstChild, highlight);
      }
      parent?.removeChild(highlight);
    });
  }

  private scrollToMatch(index: number): void {
    const highlights = this.editor.contentElement.querySelectorAll('.xeditor-find-highlight');
    
    // Remove current class from all
    highlights.forEach(h => removeClass(h as HTMLElement, 'xeditor-find-current'));
    
    // Add current class to active match
    if (highlights[index]) {
      addClass(highlights[index] as HTMLElement, 'xeditor-find-current');
      highlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private updateMatchInfo(element: HTMLElement): void {
    if (this.matches.length === 0) {
      element.textContent = '0 of 0';
    } else {
      element.textContent = `${this.currentMatch + 1} of ${this.matches.length}`;
    }
  }

  private closeDialog(): void {
    if (this.dialog) {
      this.dialog.remove();
      this.dialog = null;
    }
    this.clearHighlights();
    this.matches = [];
    this.currentMatch = 0;
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-find-replace-dialog {
        position: relative;
        background-color: white;
        border: 1px solid var(--xeditor-border);
        border-radius: 4px;
        padding: 12px;
        margin: 10px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .xeditor-find-section,
      .xeditor-replace-section {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .xeditor-find-input,
      .xeditor-replace-input {
        flex: 1;
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .xeditor-find-input:focus,
      .xeditor-replace-input:focus {
        outline: none;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-match-info {
        font-size: 12px;
        color: #666;
        min-width: 60px;
        text-align: center;
      }
      
      .xeditor-find-btn,
      .xeditor-replace-btn,
      .xeditor-replace-all-btn {
        padding: 6px 12px;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-find-btn:hover,
      .xeditor-replace-btn:hover,
      .xeditor-replace-all-btn:hover {
        background-color: #e0e0e0;
      }
      
      .xeditor-toggle-replace {
        position: absolute;
        left: -30px;
        top: 12px;
        width: 24px;
        height: 24px;
        border: 1px solid #ddd;
        background-color: white;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .xeditor-find-close {
        position: absolute;
        right: 8px;
        top: 8px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
      }
      
      .xeditor-find-options {
        display: flex;
        gap: 20px;
        font-size: 13px;
      }
      
      .xeditor-find-option {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      .xeditor-find-highlight {
        background-color: #ffeb3b;
      }
      
      .xeditor-find-current {
        background-color: #ff9800;
      }
      
      /* Dark theme */
      [data-theme="dark"] .xeditor-find-replace-dialog {
        background-color: #343a40;
        border-color: #495057;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-find-input,
      [data-theme="dark"] .xeditor-replace-input {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-find-btn,
      [data-theme="dark"] .xeditor-replace-btn,
      [data-theme="dark"] .xeditor-replace-all-btn {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
    `;
    
    document.head.appendChild(style);
  }
}