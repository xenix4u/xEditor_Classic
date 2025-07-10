import { Selection } from '../types';
import { saveSelection, restoreSelection } from '../utils/dom';

export class SelectionManager implements Selection {
  private savedRange: Range | null = null;
  private editor: HTMLElement;

  constructor(editor: HTMLElement) {
    this.editor = editor;
  }

  get range(): Range | null {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (this.isInEditor(range)) {
        return range;
      }
    }
    return null;
  }

  get text(): string {
    const selection = window.getSelection();
    return selection ? selection.toString() : '';
  }

  get container(): Node | null {
    const range = this.range;
    if (!range) return null;
    
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode || container;
    }
    
    return container;
  }

  save(): void {
    this.savedRange = saveSelection();
  }

  restore(): void {
    if (this.savedRange) {
      restoreSelection(this.savedRange);
      this.editor.focus();
    }
  }

  clear(): void {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }

  selectAll(): void {
    const range = document.createRange();
    range.selectNodeContents(this.editor);
    
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  collapse(toStart: boolean = false): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selection.collapseToStart();
      if (!toStart) {
        selection.collapseToEnd();
      }
    }
  }

  expandToWord(): void {
    const range = this.range;
    if (!range) return;
    
    const text = range.startContainer.textContent || '';
    let start = range.startOffset;
    let end = range.endOffset;
    
    while (start > 0 && !/\s/.test(text[start - 1])) {
      start--;
    }
    
    while (end < text.length && !/\s/.test(text[end])) {
      end++;
    }
    
    range.setStart(range.startContainer, start);
    range.setEnd(range.endContainer, end);
  }

  getSelectedNodes(): Node[] {
    const range = this.range;
    if (!range) return [];
    
    const nodes: Node[] = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ALL,
      {
        acceptNode: (node) => {
          const nodeRange = document.createRange();
          nodeRange.selectNode(node);
          
          if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0 ||
              range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node: Node | null;
    while ((node = walker.nextNode()) !== null) {
      nodes.push(node);
    }
    
    return nodes;
  }

  isCollapsed(): boolean {
    const range = this.range;
    return range ? range.collapsed : true;
  }

  isInEditor(range?: Range): boolean {
    const checkRange = range || this.range;
    if (!checkRange) return false;
    
    let node: Node | null = checkRange.commonAncestorContainer;
    while (node && node !== document.body) {
      if (node === this.editor) return true;
      node = node.parentNode;
    }
    
    return false;
  }

  getRect(): DOMRect | null {
    const range = this.range;
    if (!range) return null;
    
    return range.getBoundingClientRect();
  }

  insertNode(node: Node): void {
    const range = this.range;
    if (!range) return;
    
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  surroundContents(element: HTMLElement): void {
    const range = this.range;
    if (!range || range.collapsed) return;
    
    try {
      range.surroundContents(element);
    } catch (e) {
      element.appendChild(range.extractContents());
      range.insertNode(element);
    }
  }
}