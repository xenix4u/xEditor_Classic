import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';
import Prism from 'prismjs';

// Import Prism theme and languages
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';

interface CodeBlockOptions {
  languages?: { name: string; value: string }[];
  defaultLanguage?: string;
}

export class CodeBlockPlugin implements Plugin {
  name = 'codeblock';
  private editor!: Editor;
  private options: CodeBlockOptions;
  private mutationObserver?: MutationObserver;
  
  private defaultLanguages = [
    { name: 'Plain Text', value: 'plaintext' },
    { name: 'JavaScript', value: 'javascript' },
    { name: 'TypeScript', value: 'typescript' },
    { name: 'HTML', value: 'markup' },
    { name: 'CSS', value: 'css' },
    { name: 'Python', value: 'python' },
    { name: 'Java', value: 'java' },
    { name: 'C#', value: 'csharp' },
    { name: 'C++', value: 'cpp' },
    { name: 'PHP', value: 'php' },
    { name: 'Ruby', value: 'ruby' },
    { name: 'Go', value: 'go' },
    { name: 'Rust', value: 'rust' },
    { name: 'SQL', value: 'sql' },
    { name: 'JSON', value: 'json' },
    { name: 'XML', value: 'xml' },
    { name: 'YAML', value: 'yaml' },
    { name: 'Bash', value: 'bash' }
  ];

  constructor(options: CodeBlockOptions = {}) {
    this.options = {
      languages: options.languages || this.defaultLanguages,
      defaultLanguage: options.defaultLanguage || 'javascript'
    };
  }

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make showCodeBlockDialog available
    (this as any).showCodeBlockDialog = this.showCodeBlockDialog.bind(this);
    
    // Register commands
    editor.commands.register('insertCodeBlock', {
      execute: (language?: string) => this.insertCodeBlock(language)
    });
    
    // Handle keyboard shortcuts
    editor.contentElement.addEventListener('keydown', this.handleKeyDown);
    
    // Setup syntax highlighting observer
    this.setupSyntaxHighlighting();
    
    // Add styles
    this.addStyles();
  }
  
  destroy(): void {
    this.editor.contentElement.removeEventListener('keydown', this.handleKeyDown);
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }
  
  private setupSyntaxHighlighting(): void {
    // Highlight existing code blocks
    this.highlightAllCodeBlocks();
    
    // Setup mutation observer to highlight new code blocks
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.tagName === 'PRE' && element.classList.contains('xeditor-codeblock')) {
              const code = element.querySelector('code');
              if (code) {
                this.highlightCode(code);
              }
            }
          }
        });
      });
    });
    
    this.mutationObserver.observe(this.editor.contentElement, {
      childList: true,
      subtree: true
    });
  }
  
  private highlightAllCodeBlocks(): void {
    const codeBlocks = this.editor.contentElement.querySelectorAll('.xeditor-codeblock code');
    codeBlocks.forEach(code => {
      this.highlightCode(code as HTMLElement);
    });
  }
  
  private highlightCode(codeElement: HTMLElement): void {
    // Get the language
    const className = codeElement.className;
    const language = className.match(/language-(\w+)/)?.[1] || 'plaintext';
    
    // Store the original text
    const text = codeElement.textContent || '';
    
    // Apply syntax highlighting
    if (language !== 'plaintext' && Prism.languages[language]) {
      const highlighted = Prism.highlight(text, Prism.languages[language], language);
      codeElement.innerHTML = highlighted;
      codeElement.setAttribute('data-highlighted', 'true');
    }
  }
  
  private showCodeBlockDialog(): void {
    const dialog = this.createDialog();
    document.body.appendChild(dialog);
  }
  
  private createDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-codeblock-dialog-overlay'
    });
    
    const dialog = createElement('div', {
      className: 'xeditor-codeblock-dialog'
    });
    
    const title = createElement('h3', {}, ['Insert Code Block']);
    
    const languageSelect = createElement('select', {
      className: 'xeditor-codeblock-language-select'
    }) as HTMLSelectElement;
    
    this.options.languages!.forEach(lang => {
      const option = createElement('option', {
        value: lang.value
      }, [lang.name]);
      
      if (lang.value === this.options.defaultLanguage) {
        (option as HTMLOptionElement).selected = true;
      }
      
      languageSelect.appendChild(option);
    });
    
    const codeTextarea = createElement('textarea', {
      className: 'xeditor-codeblock-textarea',
      placeholder: 'Enter your code here...',
      rows: '10',
      spellcheck: 'false'
    }) as HTMLTextAreaElement;
    
    const buttonContainer = createElement('div', {
      className: 'xeditor-codeblock-buttons'
    });
    
    const cancelBtn = createElement('button', {
      className: 'xeditor-codeblock-cancel-btn',
      type: 'button'
    }, ['Cancel']);
    
    const insertBtn = createElement('button', {
      className: 'xeditor-codeblock-insert-btn',
      type: 'button'
    }, ['Insert']);
    
    // Event listeners
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    insertBtn.addEventListener('click', () => {
      const language = languageSelect.value;
      const code = codeTextarea.value;
      
      if (code.trim()) {
        this.insertCodeBlock(language, code);
      }
      
      document.body.removeChild(overlay);
    });
    
    // Ctrl/Cmd + Enter to insert
    codeTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        insertBtn.click();
      }
    });
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(insertBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(languageSelect);
    dialog.appendChild(codeTextarea);
    dialog.appendChild(buttonContainer);
    
    overlay.appendChild(dialog);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    // Focus textarea
    setTimeout(() => codeTextarea.focus(), 100);
    
    return overlay;
  }
  
  private insertCodeBlock(language?: string, code?: string): void {
    const lang = language || this.options.defaultLanguage!;
    
    // Create code block structure
    const pre = createElement('pre', {
      className: 'xeditor-codeblock',
      'data-language': lang
    });
    
    const codeElement = createElement('code', {
      className: `language-${lang}`,
      spellcheck: 'false'
    });
    
    if (code) {
      codeElement.textContent = code;
    } else {
      // Get selected text as code
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const selectedText = selection.toString();
        if (selectedText) {
          codeElement.textContent = selectedText;
        } else {
          codeElement.textContent = '// Enter your code here';
        }
      } else {
        codeElement.textContent = '// Enter your code here';
      }
    }
    
    pre.appendChild(codeElement);
    
    // Apply syntax highlighting
    this.highlightCode(codeElement);
    
    // Insert the code block
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Insert code block
      range.insertNode(pre);
      
      // Add a paragraph after the code block for continued editing
      const p = createElement('p');
      p.innerHTML = '<br>';
      pre.parentNode?.insertBefore(p, pre.nextSibling);
      
      // Move cursor to the new paragraph
      const newRange = document.createRange();
      newRange.selectNodeContents(p);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    this.editor.history.record();
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Tab key handling inside code blocks
    if (e.key === 'Tab') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const codeBlock = this.getParentCodeBlock(range.commonAncestorContainer);
      
      if (codeBlock) {
        e.preventDefault();
        
        // Insert tab character
        document.execCommand('insertText', false, '\t');
      }
    }
  };
  
  private getParentCodeBlock(node: Node): HTMLElement | null {
    let current = node;
    
    while (current && current !== this.editor.contentElement) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        const element = current as HTMLElement;
        if (element.classList.contains('xeditor-codeblock') || element.tagName === 'PRE') {
          return element;
        }
      }
      current = current.parentNode!;
    }
    
    return null;
  }
  
  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      /* Code block styles */
      .xeditor-codeblock {
        background-color: #2d2d2d;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 16px;
        margin: 16px 0;
        overflow-x: auto;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.45;
        position: relative;
      }
      
      .xeditor-codeblock::before {
        content: attr(data-language);
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 11px;
        color: #999;
        text-transform: uppercase;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .xeditor-codeblock code {
        background: none;
        padding: 0;
        border-radius: 0;
        color: #f8f8f2;
        white-space: pre;
        display: block;
      }
      
      /* Override Prism theme for better integration */
      .xeditor-codeblock code[class*="language-"] {
        color: #f8f8f2;
        background: none;
        text-shadow: 0 1px rgba(0, 0, 0, 0.3);
        font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
        font-size: 14px;
        text-align: left;
        white-space: pre;
        word-spacing: normal;
        word-break: normal;
        word-wrap: normal;
        line-height: 1.5;
        tab-size: 4;
        hyphens: none;
      }
      
      /* Light theme support */
      [data-theme="light"] .xeditor-codeblock {
        background-color: #f6f8fa;
        border-color: #e1e4e8;
      }
      
      [data-theme="light"] .xeditor-codeblock code {
        color: #24292e;
        text-shadow: none;
      }
      
      [data-theme="light"] .xeditor-codeblock::before {
        color: #6a737d;
      }
      
      /* Dialog styles */
      .xeditor-codeblock-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .xeditor-codeblock-dialog {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        width: 600px;
        max-width: 90vw;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .xeditor-codeblock-dialog h3 {
        margin: 0 0 20px 0;
      }
      
      .xeditor-codeblock-language-select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 10px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .xeditor-codeblock-textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 20px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
      }
      
      .xeditor-codeblock-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .xeditor-codeblock-cancel-btn,
      .xeditor-codeblock-insert-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-codeblock-cancel-btn {
        background-color: #e9ecef;
        color: #333;
      }
      
      .xeditor-codeblock-insert-btn {
        background-color: var(--xeditor-primary);
        color: white;
      }
      
      .xeditor-codeblock-cancel-btn:hover {
        background-color: #dee2e6;
      }
      
      .xeditor-codeblock-insert-btn:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      /* Dark theme dialog support */
      [data-theme="dark"] .xeditor-codeblock-dialog {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-codeblock-language-select,
      [data-theme="dark"] .xeditor-codeblock-textarea {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-codeblock-cancel-btn {
        background-color: #6c757d;
        color: #f8f9fa;
      }
    `;
    
    document.head.appendChild(style);
  }
}