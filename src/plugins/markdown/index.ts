import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface MarkdownOptions {
  exportOptions?: {
    headingStyle?: 'atx' | 'setext';
    bulletListMarker?: '-' | '*' | '+';
    codeBlockStyle?: 'fenced' | 'indented';
    linkStyle?: 'inline' | 'reference';
  };
}

export class MarkdownPlugin implements Plugin {
  name = 'markdown';
  private editor!: Editor;
  private options: MarkdownOptions;

  toolbar: ToolbarItem[] = [];

  constructor(options: MarkdownOptions = {}) {
    this.options = {
      exportOptions: {
        headingStyle: options.exportOptions?.headingStyle || 'atx',
        bulletListMarker: options.exportOptions?.bulletListMarker || '-',
        codeBlockStyle: options.exportOptions?.codeBlockStyle || 'fenced',
        linkStyle: options.exportOptions?.linkStyle || 'inline',
        ...options.exportOptions
      }
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Register commands
    this.editor.commands.register('exportMarkdown', {
      execute: () => this.exportMarkdown()
    });
    
    this.editor.commands.register('importMarkdown', {
      execute: (markdown: string) => this.importMarkdown(markdown)
    });
    
    // Add toolbar items
    this.toolbar = [
      {
        name: 'exportMarkdown',
        icon: '⬇ MD',
        tooltip: 'Export as Markdown',
        onClick: () => this.showExportDialog()
      },
      {
        name: 'importMarkdown',
        icon: '⬆ MD',
        tooltip: 'Import from Markdown',
        onClick: () => this.showImportDialog()
      }
    ];
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    // Cleanup if needed
  }

  private exportMarkdown(): string {
    const html = this.editor.getContent();
    return this.htmlToMarkdown(html);
  }

  private importMarkdown(markdown: string): void {
    const html = this.markdownToHtml(markdown);
    this.editor.setContent(html);
  }

  private htmlToMarkdown(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    let markdown = '';
    const processNode = (node: Node, listLevel: number = 0): string => {
      let result = '';
      
      if (node.nodeType === Node.TEXT_NODE) {
        return this.escapeMarkdown(node.textContent || '');
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        switch (tagName) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            const level = parseInt(tagName[1]);
            if (this.options.exportOptions?.headingStyle === 'setext' && level <= 2) {
              result += element.textContent + '\n';
              result += (level === 1 ? '=' : '-').repeat(element.textContent?.length || 0) + '\n\n';
            } else {
              result += '#'.repeat(level) + ' ' + element.textContent + '\n\n';
            }
            break;
            
          case 'p':
            result += Array.from(element.childNodes).map(child => processNode(child, listLevel)).join('') + '\n\n';
            break;
            
          case 'strong':
          case 'b':
            result += '**' + Array.from(element.childNodes).map(child => processNode(child, listLevel)).join('') + '**';
            break;
            
          case 'em':
          case 'i':
            result += '*' + Array.from(element.childNodes).map(child => processNode(child, listLevel)).join('') + '*';
            break;
            
          case 'u':
            result += '<u>' + Array.from(element.childNodes).map(child => processNode(child, listLevel)).join('') + '</u>';
            break;
            
          case 's':
          case 'strike':
          case 'del':
            result += '~~' + Array.from(element.childNodes).map(child => processNode(child, listLevel)).join('') + '~~';
            break;
            
          case 'code':
            result += '`' + element.textContent + '`';
            break;
            
          case 'pre':
            const codeBlock = element.querySelector('code');
            const language = codeBlock?.className.match(/language-(\w+)/)?.[1] || '';
            if (this.options.exportOptions?.codeBlockStyle === 'fenced') {
              result += '```' + language + '\n';
              result += (codeBlock?.textContent || element.textContent || '') + '\n';
              result += '```\n\n';
            } else {
              const lines = (codeBlock?.textContent || element.textContent || '').split('\n');
              result += lines.map(line => '    ' + line).join('\n') + '\n\n';
            }
            break;
            
          case 'blockquote':
            const quoteLines = Array.from(element.childNodes)
              .map(child => processNode(child, listLevel))
              .join('')
              .split('\n');
            result += quoteLines.map(line => '> ' + line).join('\n') + '\n\n';
            break;
            
          case 'ul':
          case 'ol':
            const items = Array.from(element.children);
            items.forEach((item, index) => {
              if (item.tagName.toLowerCase() === 'li') {
                const indent = '  '.repeat(listLevel);
                const marker = tagName === 'ul' 
                  ? this.options.exportOptions?.bulletListMarker || '-'
                  : `${index + 1}.`;
                  
                result += indent + marker + ' ';
                result += Array.from(item.childNodes)
                  .map(child => processNode(child, listLevel + 1))
                  .join('')
                  .trim() + '\n';
              }
            });
            result += '\n';
            break;
            
          case 'a':
            const href = element.getAttribute('href') || '';
            const text = element.textContent || '';
            if (this.options.exportOptions?.linkStyle === 'inline') {
              result += `[${text}](${href})`;
            } else {
              result += `[${text}][${text}]`;
              // In a real implementation, you'd collect references and output them at the end
            }
            break;
            
          case 'img':
            const src = element.getAttribute('src') || '';
            const alt = element.getAttribute('alt') || '';
            result += `![${alt}](${src})`;
            break;
            
          case 'table':
            const rows = Array.from(element.querySelectorAll('tr'));
            if (rows.length > 0) {
              rows.forEach((row, rowIndex) => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                result += '| ' + cells.map(cell => cell.textContent?.trim() || '').join(' | ') + ' |\n';
                
                // Add separator after header row
                if (rowIndex === 0) {
                  result += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
                }
              });
              result += '\n';
            }
            break;
            
          case 'hr':
            result += '---\n\n';
            break;
            
          case 'br':
            result += '  \n';
            break;
            
          default:
            // Process children for other elements
            Array.from(element.childNodes).forEach(child => {
              result += processNode(child, listLevel);
            });
        }
      }
      
      return result;
    };
    
    Array.from(div.childNodes).forEach(child => {
      markdown += processNode(child);
    });
    
    return markdown.trim();
  }

  private markdownToHtml(markdown: string): string {
    let html = markdown;
    
    // Escape HTML
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // Headers (setext style)
    html = html.replace(/^(.+)\n={3,}$/gm, '<h1>$1</h1>');
    html = html.replace(/^(.+)\n-{3,}$/gm, '<h2>$1</h2>');
    
    // Headers (atx style)
    html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');
    
    // Code blocks (fenced)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      const escaped = code.replace(/&/g, '&amp;')
                         .replace(/</g, '&lt;')
                         .replace(/>/g, '&gt;');
      return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    });
    
    // Code blocks (indented)
    html = html.replace(/^(?: {4}|\t)(.+)$/gm, '<pre><code>$1</code></pre>');
    
    // Merge consecutive code blocks
    html = html.replace(/<\/pre>\n<pre><code>/g, '\n');
    
    // Horizontal rules
    html = html.replace(/^[-*_]{3,}$/gm, '<hr>');
    
    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');
    
    // Lists
    // Unordered lists
    html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (matchedList) => {
      return '<ul>' + matchedList + '</ul>';
    });
    
    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    
    // Images
    html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">');
    
    // Line breaks
    html = html.replace(/  \n/g, '<br>\n');
    
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>|<ol>)/g, '$1');
    html = html.replace(/(<\/ul>|<\/ol>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)/g, '$1');
    html = html.replace(/(<hr>)<\/p>/g, '$1');
    
    return html;
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
  }

  private showExportDialog(): void {
    const markdown = this.exportMarkdown();
    
    const overlay = createElement('div', {
      className: 'xeditor-markdown-dialog-overlay'
    });
    
    const dialog = createElement('div', {
      className: 'xeditor-markdown-dialog'
    });
    
    const title = createElement('h3', {}, ['Export as Markdown']);
    
    const textarea = createElement('textarea', {
      className: 'xeditor-markdown-textarea',
      readonly: 'readonly',
      rows: '20'
    }) as HTMLTextAreaElement;
    textarea.value = markdown;
    
    const buttonContainer = createElement('div', {
      className: 'xeditor-markdown-buttons'
    });
    
    const copyBtn = createElement('button', {
      className: 'xeditor-markdown-copy-btn',
      type: 'button'
    }, ['Copy to Clipboard']);
    
    const downloadBtn = createElement('button', {
      className: 'xeditor-markdown-download-btn',
      type: 'button'
    }, ['Download']);
    
    const closeBtn = createElement('button', {
      className: 'xeditor-markdown-close-btn',
      type: 'button'
    }, ['Close']);
    
    copyBtn.addEventListener('click', () => {
      textarea.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy to Clipboard';
      }, 2000);
    });
    
    downloadBtn.addEventListener('click', () => {
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.md';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(downloadBtn);
    buttonContainer.appendChild(closeBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(textarea);
    dialog.appendChild(buttonContainer);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Select all text
    setTimeout(() => textarea.select(), 100);
  }

  private showImportDialog(): void {
    const overlay = createElement('div', {
      className: 'xeditor-markdown-dialog-overlay'
    });
    
    const dialog = createElement('div', {
      className: 'xeditor-markdown-dialog'
    });
    
    const title = createElement('h3', {}, ['Import from Markdown']);
    
    const textarea = createElement('textarea', {
      className: 'xeditor-markdown-textarea',
      placeholder: 'Paste your Markdown here...',
      rows: '20'
    }) as HTMLTextAreaElement;
    
    const buttonContainer = createElement('div', {
      className: 'xeditor-markdown-buttons'
    });
    
    const cancelBtn = createElement('button', {
      className: 'xeditor-markdown-cancel-btn',
      type: 'button'
    }, ['Cancel']);
    
    const importBtn = createElement('button', {
      className: 'xeditor-markdown-import-btn',
      type: 'button'
    }, ['Import']);
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    importBtn.addEventListener('click', () => {
      const markdown = textarea.value;
      if (markdown.trim()) {
        this.importMarkdown(markdown);
      }
      document.body.removeChild(overlay);
    });
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(importBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(textarea);
    dialog.appendChild(buttonContainer);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus textarea
    setTimeout(() => textarea.focus(), 100);
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-markdown-dialog-overlay {
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
      
      .xeditor-markdown-dialog {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 800px;
        max-width: 90vw;
        max-height: 90vh;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      
      .xeditor-markdown-dialog h3 {
        margin: 0 0 20px 0;
      }
      
      .xeditor-markdown-textarea {
        flex: 1;
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        resize: none;
        box-sizing: border-box;
        min-height: 400px;
      }
      
      .xeditor-markdown-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }
      
      .xeditor-markdown-buttons button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-markdown-copy-btn,
      .xeditor-markdown-download-btn,
      .xeditor-markdown-import-btn {
        background-color: var(--xeditor-primary);
        color: white;
      }
      
      .xeditor-markdown-cancel-btn,
      .xeditor-markdown-close-btn {
        background-color: #e9ecef;
        color: #333;
      }
      
      .xeditor-markdown-copy-btn:hover,
      .xeditor-markdown-download-btn:hover,
      .xeditor-markdown-import-btn:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      .xeditor-markdown-cancel-btn:hover,
      .xeditor-markdown-close-btn:hover {
        background-color: #dee2e6;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-markdown-dialog {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-markdown-textarea {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-markdown-cancel-btn,
      [data-theme="dark"] .xeditor-markdown-close-btn {
        background-color: #6c757d;
        color: #f8f9fa;
      }
    `;
    
    document.head.appendChild(style);
  }
}