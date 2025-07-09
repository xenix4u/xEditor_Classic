import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, findParentElement } from '../../utils/dom';

export class ChecklistPlugin implements Plugin {
  name = 'checklist';
  private editor!: Editor;

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).toggleChecklist = this.toggleChecklist.bind(this);
    
    // Register commands
    this.editor.commands.register('insertChecklist', {
      execute: () => this.toggleChecklist(),
      queryState: () => this.isInChecklist()
    });
    
    // Add styles
    this.addStyles();
    
    // Add click handler for checkboxes
    this.addCheckboxHandler();
    
    // Handle Enter key in checklists
    this.addKeyboardHandler();
  }

  destroy(): void {
    this.editor.contentElement.removeEventListener('click', this.handleCheckboxClick);
    this.editor.contentElement.removeEventListener('keydown', this.handleKeyDown);
  }

  private toggleChecklist(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Check if we're in a checklist
    const checklistItem = findParentElement(container, el => 
      el.classList.contains('xeditor-checklist-item')
    );
    
    if (checklistItem) {
      // Convert checklist to regular list
      this.convertToRegularList(checklistItem);
    } else {
      // Check if we're in a regular list
      const listItem = findParentElement(container, el => el.tagName === 'LI');
      
      if (listItem) {
        // Convert list item to checklist
        this.convertToChecklist(listItem);
      } else {
        // Create new checklist
        this.createChecklist();
      }
    }
    
    this.editor.history.record();
  }

  private createChecklist(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Get the block element
    let block = container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container as Element;
    
    while (block && !this.isBlockElement(block)) {
      block = block.parentElement;
    }
    
    if (!block || !this.editor.contentElement.contains(block)) return;
    
    const ul = createElement('ul', {
      className: 'xeditor-checklist'
    });
    
    const li = createElement('li', {
      className: 'xeditor-checklist-item'
    });
    
    const checkbox = createElement('input', {
      type: 'checkbox',
      className: 'xeditor-checklist-checkbox',
      contentEditable: 'false'
    });
    
    const textSpan = createElement('span', {
      className: 'xeditor-checklist-text',
      contentEditable: 'true'
    });
    
    // Move content to text span
    while (block.firstChild) {
      textSpan.appendChild(block.firstChild);
    }
    
    li.appendChild(checkbox);
    li.appendChild(textSpan);
    ul.appendChild(li);
    
    block.parentNode?.replaceChild(ul, block);
    
    // Focus the text span
    const newRange = document.createRange();
    newRange.selectNodeContents(textSpan);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  private convertToChecklist(listItem: Element): void {
    const list = listItem.parentElement;
    if (!list) return;
    
    // Add checklist class to the list
    list.classList.add('xeditor-checklist');
    
    // Convert all list items
    const items = Array.from(list.children);
    items.forEach(item => {
      if (item.tagName === 'LI' && !item.classList.contains('xeditor-checklist-item')) {
        item.classList.add('xeditor-checklist-item');
        
        const checkbox = createElement('input', {
          type: 'checkbox',
          className: 'xeditor-checklist-checkbox',
          contentEditable: 'false'
        });
        
        const textSpan = createElement('span', {
          className: 'xeditor-checklist-text',
          contentEditable: 'true'
        });
        
        // Move content to text span
        while (item.firstChild) {
          textSpan.appendChild(item.firstChild);
        }
        
        item.appendChild(checkbox);
        item.appendChild(textSpan);
      }
    });
  }

  private convertToRegularList(checklistItem: Element): void {
    const list = checklistItem.parentElement;
    if (!list) return;
    
    // Remove checklist class
    list.classList.remove('xeditor-checklist');
    
    // Convert all checklist items
    const items = Array.from(list.querySelectorAll('.xeditor-checklist-item'));
    items.forEach(item => {
      item.classList.remove('xeditor-checklist-item');
      
      const checkbox = item.querySelector('.xeditor-checklist-checkbox');
      const textSpan = item.querySelector('.xeditor-checklist-text');
      
      if (checkbox) checkbox.remove();
      
      if (textSpan) {
        // Move text content back to list item
        while (textSpan.firstChild) {
          item.appendChild(textSpan.firstChild);
        }
        textSpan.remove();
      }
    });
  }

  private isInChecklist(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    return !!findParentElement(container, el => 
      el.classList.contains('xeditor-checklist-item')
    );
  }

  private addCheckboxHandler(): void {
    this.editor.contentElement.addEventListener('click', this.handleCheckboxClick);
  }

  private handleCheckboxClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    
    if (target.classList.contains('xeditor-checklist-checkbox')) {
      const checkbox = target as HTMLInputElement;
      const listItem = checkbox.closest('.xeditor-checklist-item');
      
      if (listItem) {
        if (checkbox.checked) {
          listItem.classList.add('xeditor-checklist-completed');
        } else {
          listItem.classList.remove('xeditor-checklist-completed');
        }
        
        this.editor.history.record();
      }
    }
  };

  private addKeyboardHandler(): void {
    this.editor.contentElement.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      const checklistItem = findParentElement(container, el => 
        el.classList.contains('xeditor-checklist-item')
      );
      
      if (!checklistItem) return;
      
      e.preventDefault();
      
      const textSpan = checklistItem.querySelector('.xeditor-checklist-text');
      
      // Check if item is empty
      if (!textSpan?.textContent?.trim()) {
        // Exit checklist
        const list = checklistItem.parentElement;
        if (!list) return;
        
        const p = createElement('p');
        p.innerHTML = '<br>';
        
        list.parentNode?.insertBefore(p, list.nextSibling);
        checklistItem.remove();
        
        // If list is empty, remove it
        if (list.children.length === 0) {
          list.remove();
        }
        
        // Focus new paragraph
        const newRange = document.createRange();
        newRange.selectNodeContents(p);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Create new checklist item
        const newItem = createElement('li', {
          className: 'xeditor-checklist-item'
        });
        
        const newCheckbox = createElement('input', {
          type: 'checkbox',
          className: 'xeditor-checklist-checkbox',
          contentEditable: 'false'
        });
        
        const newTextSpan = createElement('span', {
          className: 'xeditor-checklist-text',
          contentEditable: 'true'
        });
        
        newTextSpan.innerHTML = '<br>';
        
        newItem.appendChild(newCheckbox);
        newItem.appendChild(newTextSpan);
        
        checklistItem.parentNode?.insertBefore(newItem, checklistItem.nextSibling);
        
        // Focus new item
        const newRange = document.createRange();
        newRange.selectNodeContents(newTextSpan);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  };

  private isBlockElement(element: Element): boolean {
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
                      'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI'];
    return blockTags.includes(element.tagName);
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-checklist {
        list-style: none;
        padding-left: 0;
        margin: 0.5em 0;
      }
      
      .xeditor-checklist-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 0.5em;
        position: relative;
        padding-left: 0;
      }
      
      .xeditor-checklist-checkbox {
        margin-right: 0.5em;
        margin-top: 0.1em;
        cursor: pointer;
        flex-shrink: 0;
      }
      
      .xeditor-checklist-text {
        flex: 1;
        outline: none;
        display: inline-block;
        min-height: 1.2em;
      }
      
      .xeditor-checklist-completed .xeditor-checklist-text {
        text-decoration: line-through;
        opacity: 0.6;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-checklist-checkbox {
        accent-color: var(--xeditor-primary);
      }
      
      /* Focus styles */
      .xeditor-checklist-text:focus {
        outline: none;
      }
      
      /* Prevent text selection on checkbox click */
      .xeditor-checklist-checkbox {
        user-select: none;
      }
    `;
    
    document.head.appendChild(style);
  }
}