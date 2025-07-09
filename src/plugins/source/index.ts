import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, addClass, removeClass } from '../../utils/dom';

export class SourcePlugin implements Plugin {
  name = 'source';
  private editor!: Editor;
  private isSourceMode: boolean = false;
  private sourceTextarea: HTMLTextAreaElement | null = null;
  private originalContent: string = '';

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make toggleSource available
    (this as any).toggleSource = this.toggleSource.bind(this);
    
    // Register command
    editor.commands.register('toggleSource', {
      execute: () => this.toggleSource()
    });
    
    // Add styles
    this.addStyles();
  }
  
  destroy(): void {
    // Exit source mode if active
    if (this.isSourceMode) {
      this.exitSourceMode();
    }
  }
  
  toggleSource(): void {
    if (this.isSourceMode) {
      this.exitSourceMode();
    } else {
      this.enterSourceMode();
    }
  }
  
  private enterSourceMode(): void {
    this.isSourceMode = true;
    
    // Save current content
    this.originalContent = this.editor.getContent();
    
    // Create source textarea
    this.sourceTextarea = createElement('textarea', {
      className: 'xeditor-source-textarea',
      spellcheck: 'false'
    }) as HTMLTextAreaElement;
    
    // Format HTML for better readability
    this.sourceTextarea.value = this.formatHTML(this.originalContent);
    
    // Hide content element
    this.editor.contentElement.style.display = 'none';
    
    // Insert textarea after content element
    this.editor.contentElement.parentNode?.insertBefore(
      this.sourceTextarea,
      this.editor.contentElement.nextSibling
    );
    
    // Update toolbar
    this.updateToolbar(true);
    
    // Focus textarea
    this.sourceTextarea.focus();
    
    // Handle keyboard shortcuts
    this.sourceTextarea.addEventListener('keydown', this.handleKeyDown);
    
    // Emit event
    this.editor.emit('sourceenter');
  }
  
  private exitSourceMode(): void {
    if (!this.sourceTextarea) return;
    
    this.isSourceMode = false;
    
    // Get the HTML from textarea
    const newContent = this.sourceTextarea.value;
    
    // Update editor content
    this.editor.setContent(newContent);
    
    // Remove textarea
    this.sourceTextarea.removeEventListener('keydown', this.handleKeyDown);
    this.sourceTextarea.remove();
    this.sourceTextarea = null;
    
    // Show content element
    this.editor.contentElement.style.display = '';
    
    // Update toolbar
    this.updateToolbar(false);
    
    // Focus editor
    this.editor.focus();
    
    // Emit event
    this.editor.emit('sourceexit');
  }
  
  private updateToolbar(sourceMode: boolean): void {
    const toolbar = this.editor.toolbar;
    if (!toolbar) return;
    
    // Find all toolbar items
    const items = toolbar.element.querySelectorAll('.xeditor-toolbar__item');
    items.forEach(item => {
      const button = item as HTMLElement;
      
      // Check if this is the source button by checking title or aria-label
      const isSourceButton = button.getAttribute('title') === 'HTML Source Code' || 
                           button.getAttribute('aria-label') === 'HTML Source Code';
      
      if (isSourceButton) {
        // Update active state but keep it enabled
        if (sourceMode) {
          addClass(button, 'xeditor-toolbar__item--active');
        } else {
          removeClass(button, 'xeditor-toolbar__item--active');
        }
        // Never disable the source button
        button.removeAttribute('disabled');
        removeClass(button, 'xeditor-toolbar__item--disabled');
      } else {
        // Disable other buttons in source mode
        if (sourceMode) {
          button.setAttribute('disabled', 'true');
          addClass(button, 'xeditor-toolbar__item--disabled');
        } else {
          button.removeAttribute('disabled');
          removeClass(button, 'xeditor-toolbar__item--disabled');
        }
      }
    });
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Tab key handling
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Insert tab
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      
      // Move cursor
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }
    
    // Ctrl/Cmd + Enter to exit source mode
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.exitSourceMode();
    }
  };
  
  private formatHTML(html: string): string {
    // Basic HTML formatting
    let formatted = html;
    
    // Add newlines after block elements
    formatted = formatted.replace(/(<\/(p|div|h[1-6]|ul|ol|li|blockquote|pre)>)/gi, '$1\n');
    formatted = formatted.replace(/(<(p|div|h[1-6]|ul|ol|li|blockquote|pre)[^>]*>)/gi, '\n$1');
    
    // Add newlines around <br> tags
    formatted = formatted.replace(/(<br\s*\/?>)/gi, '$1\n');
    
    // Remove extra newlines
    formatted = formatted.replace(/\n\n+/g, '\n\n');
    
    // Trim
    formatted = formatted.trim();
    
    return formatted;
  }
  
  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      /* Source mode styles */
      .xeditor-source-textarea {
        width: 100%;
        height: 400px;
        padding: 16px;
        border: none;
        background-color: #f6f8fa;
        color: #24292e;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.45;
        resize: vertical;
        outline: none;
        overflow: auto;
        white-space: pre;
        word-wrap: normal;
        box-sizing: border-box;
      }
      
      .xeditor-source-textarea:focus {
        box-shadow: 0 0 0 3px var(--xeditor-focus-outline);
      }
      
      /* Match content element height */
      .xeditor-wrapper .xeditor-source-textarea {
        height: var(--content-height, 400px);
      }
      
      /* Dark theme */
      [data-theme="dark"] .xeditor-source-textarea {
        background-color: #2d333b;
        color: #adbac7;
      }
      
      /* Fullscreen adjustments */
      .xeditor-fullscreen .xeditor-source-textarea {
        height: calc(100vh - 60px) !important;
        border-radius: 0;
      }
      
      /* Source mode indicator */
      .xeditor-source-mode-active .xeditor-toolbar {
        background-color: #fff3cd;
        border-bottom-color: #ffeaa7;
      }
      
      [data-theme="dark"] .xeditor-source-mode-active .xeditor-toolbar {
        background-color: #3a3a2e;
        border-bottom-color: #5a5a4e;
      }
    `;
    
    document.head.appendChild(style);
  }
}