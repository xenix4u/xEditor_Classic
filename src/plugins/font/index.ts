import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface FontOptions {
  fonts?: { name: string; value: string }[];
  sizes?: { name: string; value: string }[];
}

export class FontPlugin implements Plugin {
  name = 'font';
  private editor!: Editor;
  private options: FontOptions;
  
  private defaultFonts = [
    { name: 'Default', value: 'inherit' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Arial Black', value: '"Arial Black", sans-serif' },
    { name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
    { name: 'Courier New', value: '"Courier New", monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Lucida Console', value: '"Lucida Console", monospace' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' }
  ];
  
  private defaultSizes = [
    { name: '8px', value: '8px' },
    { name: '10px', value: '10px' },
    { name: '12px', value: '12px' },
    { name: '14px', value: '14px' },
    { name: '16px', value: '16px' },
    { name: '18px', value: '18px' },
    { name: '24px', value: '24px' },
    { name: '30px', value: '30px' },
    { name: '36px', value: '36px' },
    { name: '48px', value: '48px' },
    { name: '60px', value: '60px' },
    { name: '72px', value: '72px' }
  ];

  constructor(options: FontOptions = {}) {
    this.options = {
      fonts: options.fonts || this.defaultFonts,
      sizes: options.sizes || this.defaultSizes
    };
  }

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Register commands
    editor.commands.register('fontName', {
      execute: (font: string) => this.setFontFamily(font)
    });
    
    editor.commands.register('fontSize', {
      execute: (size: string) => this.setFontSize(size)
    });
    
    // Add styles
    this.addStyles();
  }
  
  destroy(): void {
    // Cleanup if needed
  }
  
  getFontDropdownItems(): any[] {
    return this.options.fonts!.map(font => ({
      text: font.name,
      value: font.value,
      style: `font-family: ${font.value}`,
      onClick: () => this.setFontFamily(font.value)
    }));
  }
  
  getSizeDropdownItems(): any[] {
    return this.options.sizes!.map(size => ({
      text: size.name,
      value: size.value,
      style: `font-size: ${size.value}`,
      onClick: () => this.setFontSize(size.value)
    }));
  }
  
  private setFontFamily(font: string): void {
    this.editor.selection.save();
    
    if (font === 'inherit') {
      // Remove font family
      this.removeFormatting('font-family');
    } else {
      // Apply font family
      this.applyFormatting('font-family', font);
    }
    
    this.editor.selection.restore();
    this.editor.history.record();
  }
  
  private setFontSize(size: string): void {
    this.editor.selection.save();
    
    // Apply font size
    this.applyFormatting('font-size', size);
    
    this.editor.selection.restore();
    this.editor.history.record();
  }
  
  private applyFormatting(property: string, value: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // If selection is collapsed, we need to insert a new element
    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.setProperty(property, value);
      span.innerHTML = '&#8203;'; // Zero-width space
      range.insertNode(span);
      
      // Move cursor inside the span
      range.selectNodeContents(span);
      range.collapse(false);
    } else {
      // For selected text, wrap in span
      try {
        const span = document.createElement('span');
        span.style.setProperty(property, value);
        
        // Extract contents and wrap
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
        
        // Select the newly inserted span
        range.selectNodeContents(span);
      } catch (e) {
        // Fallback: use document.execCommand with a temporary wrapper
        const tempId = 'temp-' + Date.now();
        document.execCommand('insertHTML', false, `<span id="${tempId}">${selection.toString()}</span>`);
        
        const tempSpan = document.getElementById(tempId);
        if (tempSpan) {
          tempSpan.style.setProperty(property, value);
          tempSpan.removeAttribute('id');
        }
      }
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  private removeFormatting(property: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find all spans within the selection
    const walker = document.createTreeWalker(
      container.nodeType === Node.TEXT_NODE ? container.parentNode! : container,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeName === 'SPAN' && (node as HTMLElement).style.getPropertyValue(property)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    const spans: HTMLElement[] = [];
    let node;
    while (node = walker.nextNode()) {
      spans.push(node as HTMLElement);
    }
    
    // Remove the property from found spans
    spans.forEach(span => {
      span.style.removeProperty(property);
      
      // If span has no more styles, unwrap it
      if (!span.getAttribute('style') || span.style.length === 0) {
        const parent = span.parentNode;
        while (span.firstChild) {
          parent?.insertBefore(span.firstChild, span);
        }
        parent?.removeChild(span);
      }
    });
  }
  
  getCurrentFont(): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 'inherit';
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? 
                   container.parentElement : container as HTMLElement;
    
    if (element) {
      const computedStyle = window.getComputedStyle(element);
      return computedStyle.fontFamily;
    }
    
    return 'inherit';
  }
  
  getCurrentSize(): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '16px';
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? 
                   container.parentElement : container as HTMLElement;
    
    if (element) {
      const computedStyle = window.getComputedStyle(element);
      return computedStyle.fontSize;
    }
    
    return '16px';
  }
  
  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      /* Font family dropdown styles */
      .xeditor-toolbar__dropdown-item[style*="font-family"] {
        padding: 10px 12px;
        min-width: 200px;
      }
      
      /* Font size dropdown styles */
      .xeditor-toolbar__dropdown-item[style*="font-size"] {
        min-width: 100px;
      }
      
      /* Ensure text formatting is preserved */
      .xeditor-content span[style*="font-family"],
      .xeditor-content span[style*="font-size"] {
        display: inline;
      }
    `;
    
    document.head.appendChild(style);
  }
}

export default FontPlugin;