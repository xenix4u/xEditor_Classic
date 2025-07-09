import { Plugin, Editor, Comment, CommentThread, CommentsConfig } from '../../types';
import { createElement } from '../../utils/dom';

class CommentsPluginImpl implements Plugin {
  name = 'comments';
  private editor: Editor | null = null;
  config: CommentsConfig;
  private comments: Map<string, Comment> = new Map();
  private threads: Map<string, CommentThread> = new Map();
  private sidePanel: HTMLElement | null = null;
  private highlightClass = 'xeditor-comment-highlight';
  private activeThreadId: string | null = null;
  private commentDialog: HTMLElement | null = null;

  constructor(config?: Partial<CommentsConfig>) {
    this.config = {
      enabled: true,
      currentUser: 'Anonymous',
      sidePanel: true,
      allowReplies: true,
      allowEdit: true,
      allowDelete: true,
      ...config
    };
  }

  init(editor: Editor): void {
    this.editor = editor;

    if (this.config.sidePanel) {
      this.createSidePanel();
    }

    this.setupEventListeners();
    this.addToolbarItems();
    this.addStyles();
  }

  destroy(): void {
    if (this.sidePanel) {
      this.sidePanel.remove();
    }
    if (this.commentDialog) {
      this.commentDialog.remove();
    }
    this.removeAllHighlights();
  }

  private addToolbarItems(): void {
    if (!this.editor || !this.editor.toolbar) return;

    this.editor.toolbar.addItem({
      name: 'comments',
      icon: this.getCommentIcon(),
      tooltip: 'Add Comment',
      enabled: () => {
        const selection = window.getSelection();
        return selection !== null && selection.toString().trim().length > 0;
      },
      onClick: () => this.showCommentDialog()
    });

    this.editor.toolbar.addItem({
      name: 'comments-toggle',
      icon: this.getCommentToggleIcon(),
      tooltip: 'Toggle Comments Panel',
      active: () => this.sidePanel?.style.display === 'block',
      onClick: () => this.toggleSidePanel()
    });
  }

  private setupEventListeners(): void {
    if (!this.editor) return;

    // Listen for selection changes
    document.addEventListener('selectionchange', () => {
      if (this.editor && this.editor.toolbar) {
        this.editor.toolbar.updateState();
      }
    });

    // Listen for clicks on comment highlights
    this.editor.contentElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const highlight = target.closest(`.${this.highlightClass}`);
      if (highlight) {
        const threadId = highlight.getAttribute('data-thread-id');
        if (threadId) {
          this.showThread(threadId);
        }
      }
    });
  }

  private createSidePanel(): void {
    if (!this.editor) return;

    this.sidePanel = createElement('div', {
      className: 'xeditor-comments-panel'
    });

    this.sidePanel.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: 300px;
      height: 100%;
      background: #f9f9f9;
      border-left: 1px solid #ddd;
      overflow-y: auto;
      display: none;
      z-index: 1000;
    `;

    const header = createElement('div', {
      className: 'xeditor-comments-header'
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
      <span>Comments</span>
      <button class="xeditor-comments-close" style="background: none; border: none; cursor: pointer; font-size: 20px;">&times;</button>
    `;

    const content = createElement('div', {
      className: 'xeditor-comments-content'
    });
    content.style.cssText = 'padding: 15px;';

    this.sidePanel.appendChild(header);
    this.sidePanel.appendChild(content);

    this.editor.wrapper.appendChild(this.sidePanel);

    // Close button
    header.querySelector('.xeditor-comments-close')?.addEventListener('click', () => {
      this.toggleSidePanel();
    });
  }

  private showCommentDialog(): void {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (this.commentDialog) {
      this.commentDialog.remove();
    }

    this.commentDialog = createElement('div', {
      className: 'xeditor-comment-dialog'
    });

    this.commentDialog.style.cssText = `
      position: fixed;
      top: ${rect.bottom + window.scrollY + 10}px;
      left: ${rect.left + window.scrollX}px;
      width: 300px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 15px;
      z-index: 2000;
    `;

    const textarea = createElement('textarea', {
      className: 'xeditor-comment-input',
      placeholder: 'Add a comment...'
    }) as HTMLTextAreaElement;
    textarea.style.cssText = `
      width: 100%;
      min-height: 80px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
    `;

    const buttons = createElement('div');
    buttons.style.cssText = 'margin-top: 10px; text-align: right;';

    const cancelBtn = createElement('button', {}, ['Cancel']) as HTMLButtonElement;
    cancelBtn.style.cssText = `
      background: none;
      border: 1px solid #ddd;
      padding: 5px 15px;
      margin-right: 10px;
      border-radius: 4px;
      cursor: pointer;
    `;

    const addBtn = createElement('button', {}, ['Add Comment']) as HTMLButtonElement;
    addBtn.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      padding: 5px 15px;
      border-radius: 4px;
      cursor: pointer;
    `;

    buttons.appendChild(cancelBtn);
    buttons.appendChild(addBtn);

    this.commentDialog.appendChild(textarea);
    this.commentDialog.appendChild(buttons);

    document.body.appendChild(this.commentDialog);

    // Focus textarea
    textarea.focus();

    // Event handlers
    cancelBtn.addEventListener('click', () => {
      this.commentDialog?.remove();
      this.commentDialog = null;
    });

    addBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text) {
        this.addComment(text, range);
        this.commentDialog?.remove();
        this.commentDialog = null;
      }
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (this.commentDialog && !this.commentDialog.contains(e.target as Node)) {
      this.commentDialog.remove();
      this.commentDialog = null;
      document.removeEventListener('click', this.handleOutsideClick);
    }
  };

  private addComment(text: string, range: Range): void {
    const comment: Comment = {
      id: this.generateId(),
      text,
      author: this.config.currentUser || 'Anonymous',
      timestamp: new Date(),
      range: this.serializeRange(range),
      resolved: false
    };

    // Check if there's an existing thread at this range
    let thread = this.findThreadAtRange(range);
    
    if (!thread) {
      thread = {
        id: this.generateId(),
        comments: [comment],
        range: comment.range,
        resolved: false
      };
      this.threads.set(thread.id, thread);
    } else {
      thread.comments.push(comment);
    }

    this.comments.set(comment.id, comment);
    this.highlightRange(range, thread.id);
    this.updateSidePanel();

    if (this.config.onCommentAdd) {
      this.config.onCommentAdd(comment);
    }

    this.editor?.emit('comment:add', comment);
  }

  private highlightRange(range: Range, threadId: string): void {
    const span = createElement('span', {
      className: this.highlightClass,
      'data-thread-id': threadId
    });
    
    span.style.cssText = `
      background-color: rgba(255, 235, 59, 0.4);
      cursor: pointer;
      position: relative;
    `;

    try {
      range.surroundContents(span);
    } catch (e) {
      // If surroundContents fails, use alternative method
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
  }

  private removeAllHighlights(): void {
    if (!this.editor) return;
    
    const highlights = this.editor.contentElement.querySelectorAll(`.${this.highlightClass}`);
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      while (highlight.firstChild) {
        parent?.insertBefore(highlight.firstChild, highlight);
      }
      parent?.removeChild(highlight);
    });
  }

  private findThreadAtRange(_range: Range): CommentThread | null {
    // Simple implementation - in production, would need more sophisticated range comparison
    return null;
  }

  private serializeRange(range: Range): Comment['range'] {
    const startPath = this.getNodePath(range.startContainer);
    const endPath = this.getNodePath(range.endContainer);
    
    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startPath,
      endPath
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

  private showThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    this.activeThreadId = threadId;
    this.updateSidePanel();
    
    if (this.sidePanel) {
      this.sidePanel.style.display = 'block';
    }
  }

  private updateSidePanel(): void {
    if (!this.sidePanel) return;

    const content = this.sidePanel.querySelector('.xeditor-comments-content');
    if (!content) return;

    content.innerHTML = '';

    this.threads.forEach(thread => {
      const threadEl = this.createThreadElement(thread);
      content.appendChild(threadEl);
    });
  }

  private createThreadElement(thread: CommentThread): HTMLElement {
    const container = createElement('div', {
      className: 'xeditor-comment-thread'
    });
    
    container.style.cssText = `
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
      ${thread.id === this.activeThreadId ? 'border-color: #007bff;' : ''}
    `;

    thread.comments.forEach((comment, index) => {
      const commentEl = this.createCommentElement(comment, thread.id, index > 0);
      container.appendChild(commentEl);
    });

    if (this.config.allowReplies && !thread.resolved) {
      const replyBtn = createElement('button', {
        className: 'xeditor-comment-reply'
      }, ['Reply']) as HTMLButtonElement;
      
      replyBtn.style.cssText = `
        background: none;
        border: none;
        color: #007bff;
        cursor: pointer;
        font-size: 12px;
        padding: 5px 0;
      `;

      replyBtn.addEventListener('click', () => {
        this.showReplyInput(thread.id, container);
      });

      container.appendChild(replyBtn);
    }

    return container;
  }

  private createCommentElement(comment: Comment, threadId: string, isReply: boolean = false): HTMLElement {
    const container = createElement('div', {
      className: 'xeditor-comment'
    });
    
    container.style.cssText = `
      ${isReply ? 'margin-left: 20px; padding-left: 10px; border-left: 2px solid #ddd;' : ''}
      margin-bottom: 10px;
    `;

    const header = createElement('div');
    header.style.cssText = 'margin-bottom: 5px;';
    header.innerHTML = `
      <strong>${comment.author}</strong>
      <span style="color: #666; font-size: 12px; margin-left: 10px;">
        ${this.formatDate(comment.timestamp)}
      </span>
    `;

    const text = createElement('div');
    text.style.cssText = 'font-size: 14px; line-height: 1.4;';
    text.textContent = comment.text;

    const actions = createElement('div');
    actions.style.cssText = 'margin-top: 5px;';

    if (this.config.allowEdit && comment.author === this.config.currentUser) {
      const editBtn = createElement('button', {}, ['Edit']) as HTMLButtonElement;
      editBtn.style.cssText = `
        background: none;
        border: none;
        color: #007bff;
        cursor: pointer;
        font-size: 12px;
        margin-right: 10px;
      `;
      editBtn.addEventListener('click', () => this.editComment(comment.id));
      actions.appendChild(editBtn);
    }

    if (this.config.allowDelete && comment.author === this.config.currentUser) {
      const deleteBtn = createElement('button', {}, ['Delete']) as HTMLButtonElement;
      deleteBtn.style.cssText = `
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        font-size: 12px;
      `;
      deleteBtn.addEventListener('click', () => this.deleteComment(comment.id, threadId));
      actions.appendChild(deleteBtn);
    }

    container.appendChild(header);
    container.appendChild(text);
    container.appendChild(actions);

    return container;
  }

  private showReplyInput(threadId: string, container: HTMLElement): void {
    const existing = container.querySelector('.xeditor-comment-reply-input');
    if (existing) return;

    const replyContainer = createElement('div', {
      className: 'xeditor-comment-reply-input'
    });
    replyContainer.style.cssText = 'margin-top: 10px;';

    const textarea = createElement('textarea', {
      placeholder: 'Write a reply...'
    }) as HTMLTextAreaElement;
    textarea.style.cssText = `
      width: 100%;
      min-height: 60px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
    `;

    const buttons = createElement('div');
    buttons.style.cssText = 'margin-top: 5px; text-align: right;';

    const cancelBtn = createElement('button', {}, ['Cancel']) as HTMLButtonElement;
    cancelBtn.style.cssText = `
      background: none;
      border: 1px solid #ddd;
      padding: 3px 10px;
      margin-right: 5px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;

    const postBtn = createElement('button', {}, ['Post']) as HTMLButtonElement;
    postBtn.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      padding: 3px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;

    buttons.appendChild(cancelBtn);
    buttons.appendChild(postBtn);

    replyContainer.appendChild(textarea);
    replyContainer.appendChild(buttons);

    const replyBtn = container.querySelector('.xeditor-comment-reply');
    container.insertBefore(replyContainer, replyBtn);

    textarea.focus();

    cancelBtn.addEventListener('click', () => {
      replyContainer.remove();
    });

    postBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text) {
        this.addReply(threadId, text);
        replyContainer.remove();
      }
    });
  }

  private addReply(threadId: string, text: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    const reply: Comment = {
      id: this.generateId(),
      text,
      author: this.config.currentUser || 'Anonymous',
      timestamp: new Date(),
      range: thread.range,
      resolved: false,
      parentId: thread.comments[0].id
    };

    thread.comments.push(reply);
    this.comments.set(reply.id, reply);
    this.updateSidePanel();

    if (this.config.onCommentAdd) {
      this.config.onCommentAdd(reply);
    }

    this.editor?.emit('comment:add', reply);
  }

  private editComment(commentId: string): void {
    // Implementation for editing comments
    const comment = this.comments.get(commentId);
    if (!comment) return;

    // Show edit dialog
    const newText = prompt('Edit comment:', comment.text);
    if (newText && newText !== comment.text) {
      comment.text = newText;
      comment.edited = new Date();
      this.updateSidePanel();

      if (this.config.onCommentUpdate) {
        this.config.onCommentUpdate(comment);
      }

      this.editor?.emit('comment:update', comment);
    }
  }

  private deleteComment(commentId: string, threadId: string): void {
    if (!confirm('Delete this comment?')) return;

    const thread = this.threads.get(threadId);
    if (!thread) return;

    thread.comments = thread.comments.filter(c => c.id !== commentId);
    this.comments.delete(commentId);

    if (thread.comments.length === 0) {
      this.threads.delete(threadId);
      // Remove highlight
      const highlight = this.editor?.contentElement.querySelector(
        `.${this.highlightClass}[data-thread-id="${threadId}"]`
      );
      if (highlight) {
        const parent = highlight.parentNode;
        while (highlight.firstChild) {
          parent?.insertBefore(highlight.firstChild, highlight);
        }
        parent?.removeChild(highlight);
      }
    }

    this.updateSidePanel();

    if (this.config.onCommentDelete) {
      this.config.onCommentDelete(commentId);
    }

    this.editor?.emit('comment:delete', commentId);
  }

  private toggleSidePanel(): void {
    if (!this.sidePanel) return;
    
    const isVisible = this.sidePanel.style.display === 'block';
    this.sidePanel.style.display = isVisible ? 'none' : 'block';
    
    if (this.editor && this.editor.toolbar) {
      this.editor.toolbar.updateState();
    }
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return 'just now';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  private generateId(): string {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .${this.highlightClass}:hover {
        background-color: rgba(255, 235, 59, 0.6) !important;
      }
      
      .xeditor-comment-dialog {
        animation: fadeIn 0.2s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .xeditor-comments-panel {
        transition: transform 0.3s ease;
      }
      
      .xeditor-comment-thread:hover {
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
  }

  private getCommentIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>`;
  }

  private getCommentToggleIcon(): string {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      <line x1="8" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="13" y2="14"/>
    </svg>`;
  }

  commands = {
    addComment: {
      execute: () => this.showCommentDialog(),
      canExecute: () => {
        const selection = window.getSelection();
        return selection !== null && selection.toString().trim().length > 0;
      }
    },
    toggleComments: {
      execute: () => this.toggleSidePanel()
    }
  };

  shortcuts = {
    'Ctrl+Alt+M': 'addComment',
    'Cmd+Alt+M': 'addComment'
  };
}

// Export the class directly for the plugins index
export class CommentsPlugin extends CommentsPluginImpl {}

// Export factory function
export default function createCommentsPlugin(config?: Partial<CommentsConfig>): Plugin {
  return new CommentsPlugin(config);
}