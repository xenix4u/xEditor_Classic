import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';
import { sanitizeURL } from '../../utils/sanitize';

export class LinkPlugin implements Plugin {
  name = 'link';
  private editor!: Editor;
  private currentLink: HTMLAnchorElement | null = null;

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make showLinkDialog available globally on the plugin instance
    (this as any).showLinkDialog = this.showLinkDialog.bind(this);
    
    // Register commands
    editor.commands.register('createLink', {
      execute: (url: string) => this.createLink(url)
    });
    
    editor.commands.register('unlink', {
      execute: () => this.unlink()
    });
    
    // Handle clicks on links
    editor.contentElement.addEventListener('click', this.handleClick);
    
    // Add styles
    this.addStyles();
  }
  
  destroy(): void {
    this.editor.contentElement.removeEventListener('click', this.handleClick);
  }
  
  private showLinkDialog(link?: HTMLAnchorElement): void {
    this.currentLink = link || null;
    const dialog = this.createDialog();
    document.body.appendChild(dialog);
  }
  
  private createDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-link-dialog-overlay'
    });
    
    const dialog = createElement('div', {
      className: 'xeditor-link-dialog'
    });
    
    const title = createElement('h3', {}, [this.currentLink ? 'Edit Link' : 'Insert Link']);
    
    const urlInput = createElement('input', {
      type: 'url',
      placeholder: 'Enter URL',
      className: 'xeditor-link-url-input',
      value: this.currentLink ? this.currentLink.href : ''
    }) as HTMLInputElement;
    
    const textInput = createElement('input', {
      type: 'text',
      placeholder: 'Link text',
      className: 'xeditor-link-text-input',
      value: this.currentLink ? this.currentLink.textContent || '' : this.getSelectedText()
    }) as HTMLInputElement;
    
    const targetCheckbox = createElement('label', {
      className: 'xeditor-link-target-label'
    });
    
    const checkbox = createElement('input', {
      type: 'checkbox'
    }) as HTMLInputElement;
    
    if (this.currentLink && this.currentLink.target === '_blank') {
      checkbox.checked = true;
    }
    
    targetCheckbox.appendChild(checkbox);
    targetCheckbox.appendChild(document.createTextNode(' Open in new tab'));
    
    const buttonContainer = createElement('div', {
      className: 'xeditor-link-buttons'
    });
    
    const cancelBtn = createElement('button', {
      className: 'xeditor-link-cancel-btn',
      type: 'button'
    }, ['Cancel']);
    
    const insertBtn = createElement('button', {
      className: 'xeditor-link-insert-btn',
      type: 'button'
    }, [this.currentLink ? 'Update' : 'Insert']);
    
    if (this.currentLink) {
      const removeBtn = createElement('button', {
        className: 'xeditor-link-remove-btn',
        type: 'button'
      }, ['Remove Link']);
      
      removeBtn.addEventListener('click', () => {
        this.unlink();
        document.body.removeChild(overlay);
      });
      
      buttonContainer.appendChild(removeBtn);
    }
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(insertBtn);
    
    const closeBtn = createElement('button', {
      className: 'xeditor-link-dialog-close',
      type: 'button'
    }, ['×']);
    
    // Event listeners
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    insertBtn.addEventListener('click', () => {
      const url = sanitizeURL(urlInput.value);
      const text = textInput.value || url;
      const target = checkbox.checked ? '_blank' : '';
      
      if (url) {
        this.editor.selection.save();
        
        if (this.currentLink) {
          // Update existing link
          this.currentLink.href = url;
          this.currentLink.textContent = text;
          if (target) {
            this.currentLink.target = target;
            this.currentLink.rel = 'noopener noreferrer';
          } else {
            this.currentLink.removeAttribute('target');
            this.currentLink.removeAttribute('rel');
          }
        } else {
          // Create new link
          this.createLink(url, text, target);
        }
        
        this.editor.selection.restore();
        document.body.removeChild(overlay);
      }
    });
    
    // Enter key submits
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        insertBtn.click();
      }
    });
    
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        insertBtn.click();
      }
    });
    
    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(urlInput);
    dialog.appendChild(textInput);
    dialog.appendChild(targetCheckbox);
    dialog.appendChild(buttonContainer);
    
    overlay.appendChild(dialog);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    // Focus URL input
    setTimeout(() => urlInput.focus(), 100);
    
    return overlay;
  }
  
  private getSelectedText(): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';
    return selection.toString();
  }
  
  private createLink(url: string, text?: string, target?: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!text) {
      text = selectedText || url;
    }
    
    const link = createElement('a', {
      href: url,
      ...(target && { target, rel: 'noopener noreferrer' })
    }, [text]) as HTMLAnchorElement;
    
    range.deleteContents();
    range.insertNode(link);
    
    // Set cursor after the link
    range.setStartAfter(link);
    range.setEndAfter(link);
    selection.removeAllRanges();
    selection.addRange(range);
    
    this.editor.history.record();
  }
  
  private unlink(): void {
    if (this.currentLink) {
      // Replace link with its text content
      const text = document.createTextNode(this.currentLink.textContent || '');
      this.currentLink.parentNode?.replaceChild(text, this.currentLink);
      this.currentLink = null;
    } else {
      // Use browser's unlink command
      document.execCommand('unlink', false);
    }
    
    this.editor.history.record();
  }
  
  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    
    // Check if clicked on a link
    const link = target.closest('a');
    if (link && this.editor.contentElement.contains(link)) {
      e.preventDefault();
      
      // Ctrl/Cmd + Click opens the link
      if (e.ctrlKey || e.metaKey) {
        window.open(link.href, link.target || '_self');
      } else {
        // Show edit dialog
        this.showLinkDialog(link as HTMLAnchorElement);
      }
    }
  };
  
  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-content a {
        color: var(--xeditor-primary);
        text-decoration: underline;
        cursor: pointer;
      }
      
      .xeditor-content a:hover {
        color: var(--xeditor-primary-hover);
      }
      
      .xeditor-link-dialog-overlay {
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
      
      .xeditor-link-dialog {
        position: relative;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        width: 400px;
        max-width: 90vw;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .xeditor-link-dialog h3 {
        margin: 0 0 20px 0;
      }
      
      .xeditor-link-dialog-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      
      .xeditor-link-url-input,
      .xeditor-link-text-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 10px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .xeditor-link-target-label {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        cursor: pointer;
        user-select: none;
      }
      
      .xeditor-link-target-label input {
        margin-right: 8px;
      }
      
      .xeditor-link-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .xeditor-link-cancel-btn,
      .xeditor-link-insert-btn,
      .xeditor-link-remove-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-link-cancel-btn {
        background-color: #f0f0f0;
        color: #333;
      }
      
      .xeditor-link-insert-btn {
        background-color: var(--xeditor-primary);
        color: white;
      }
      
      .xeditor-link-remove-btn {
        background-color: #dc3545;
        color: white;
        margin-right: auto;
      }
      
      .xeditor-link-cancel-btn:hover {
        background-color: #e0e0e0;
      }
      
      .xeditor-link-insert-btn:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      .xeditor-link-remove-btn:hover {
        background-color: #c82333;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-link-dialog {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-link-dialog-close {
        color: #adb5bd;
      }
      
      [data-theme="dark"] .xeditor-link-url-input,
      [data-theme="dark"] .xeditor-link-text-input {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
    `;
    
    document.head.appendChild(style);
  }
}