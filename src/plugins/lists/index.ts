import { Plugin, Editor } from '../../types';
import { findParentElement } from '../../utils/dom';

export class ListsPlugin implements Plugin {
  name = 'lists';
  private editor: Editor;

  init(editor: Editor): void {
    this.editor = editor;
    
    // Register list commands
    editor.commands.register('insertOrderedList', {
      execute: () => this.toggleList('ol'),
      queryState: () => this.isInList('ol')
    });
    
    editor.commands.register('insertUnorderedList', {
      execute: () => this.toggleList('ul'),
      queryState: () => this.isInList('ul')
    });
    
    editor.commands.register('indent', {
      execute: () => this.changeIndent(1),
      canExecute: () => this.canIndent()
    });
    
    editor.commands.register('outdent', {
      execute: () => this.changeIndent(-1),
      canExecute: () => this.canOutdent()
    });
    
    // Handle Enter key in lists
    editor.contentElement.addEventListener('keydown', this.handleKeyDown);
    
    // Handle Tab key for indentation
    editor.contentElement.addEventListener('keydown', this.handleTab);
  }
  
  destroy(): void {
    this.editor.contentElement.removeEventListener('keydown', this.handleKeyDown);
    this.editor.contentElement.removeEventListener('keydown', this.handleTab);
  }
  
  private toggleList(type: 'ul' | 'ol'): void {
    const selection = this.editor.selection;
    const range = selection.range;
    if (!range) return;
    
    // const listItem = findParentElement(range.commonAncestorContainer, el => 
    //   el.tagName === 'LI'
    // );
    
    const list = findParentElement(range.commonAncestorContainer, el => 
      el.tagName === 'UL' || el.tagName === 'OL'
    );
    
    if (list && list.tagName.toLowerCase() === type) {
      // Remove list
      this.removeList(list);
    } else if (list) {
      // Change list type
      this.changeListType(list, type);
    } else {
      // Create new list
      this.createList(type);
    }
  }
  
  private createList(type: 'ul' | 'ol'): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Get the block element containing the selection
    let block = container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container as Element;
    
    while (block && !this.isBlockElement(block)) {
      block = block.parentElement;
    }
    
    if (!block) return;
    
    const list = document.createElement(type);
    const listItem = document.createElement('li');
    
    // Move content to list item
    while (block.firstChild) {
      listItem.appendChild(block.firstChild);
    }
    
    list.appendChild(listItem);
    block.parentNode?.replaceChild(list, block);
    
    // Restore selection
    const newRange = document.createRange();
    newRange.selectNodeContents(listItem);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  
  private removeList(list: Element): void {
    const fragment = document.createDocumentFragment();
    const items = Array.from(list.querySelectorAll('li'));
    
    items.forEach(item => {
      const p = document.createElement('p');
      while (item.firstChild) {
        p.appendChild(item.firstChild);
      }
      fragment.appendChild(p);
    });
    
    list.parentNode?.replaceChild(fragment, list);
  }
  
  private changeListType(list: Element, newType: 'ul' | 'ol'): void {
    const newList = document.createElement(newType);
    
    while (list.firstChild) {
      newList.appendChild(list.firstChild);
    }
    
    list.parentNode?.replaceChild(newList, list);
  }
  
  private isInList(type?: 'ul' | 'ol'): boolean {
    const selection = this.editor.selection;
    const container = selection.container;
    if (!container) return false;
    
    const list = findParentElement(container, el => 
      el.tagName === 'UL' || el.tagName === 'OL'
    );
    
    if (!list) return false;
    
    return type ? list.tagName.toLowerCase() === type : true;
  }
  
  private changeIndent(direction: number): void {
    const selection = this.editor.selection;
    const range = selection.range;
    if (!range) return;
    
    const listItem = findParentElement(range.commonAncestorContainer, el => 
      el.tagName === 'LI'
    ) as HTMLLIElement;
    
    if (!listItem) return;
    
    if (direction > 0) {
      this.indentListItem(listItem);
    } else {
      this.outdentListItem(listItem);
    }
  }
  
  private indentListItem(item: HTMLLIElement): void {
    const previousItem = item.previousElementSibling as HTMLLIElement;
    if (!previousItem || previousItem.tagName !== 'LI') return;
    
    let sublist = previousItem.querySelector('ul, ol');
    if (!sublist) {
      const parentList = item.parentElement;
      if (!parentList) return;
      
      sublist = document.createElement(parentList.tagName as 'ul' | 'ol');
      previousItem.appendChild(sublist);
    }
    
    sublist.appendChild(item);
  }
  
  private outdentListItem(item: HTMLLIElement): void {
    const parentList = item.parentElement;
    if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) return;
    
    const grandParentItem = parentList.parentElement;
    if (!grandParentItem || grandParentItem.tagName !== 'LI') return;
    
    const grandParentList = grandParentItem.parentElement;
    if (!grandParentList) return;
    
    // Move item after its parent list item
    grandParentList.insertBefore(item, grandParentItem.nextSibling);
    
    // If the parent list is now empty, remove it
    if (parentList.children.length === 0) {
      parentList.remove();
    }
  }
  
  private canIndent(): boolean {
    const selection = this.editor.selection;
    const range = selection.range;
    if (!range) return false;
    
    const listItem = findParentElement(range.commonAncestorContainer, el => 
      el.tagName === 'LI'
    );
    
    if (!listItem) return false;
    
    return listItem.previousElementSibling?.tagName === 'LI';
  }
  
  private canOutdent(): boolean {
    const selection = this.editor.selection;
    const range = selection.range;
    if (!range) return false;
    
    const listItem = findParentElement(range.commonAncestorContainer, el => 
      el.tagName === 'LI'
    );
    
    if (!listItem) return false;
    
    const parentList = listItem.parentElement;
    if (!parentList) return false;
    
    return parentList.parentElement?.tagName === 'LI';
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const listItem = findParentElement(range.commonAncestorContainer, el => 
        el.tagName === 'LI'
      ) as HTMLLIElement;
      
      if (!listItem) return;
      
      e.preventDefault();
      
      // Check if list item is empty
      if (!listItem.textContent?.trim()) {
        // Exit list
        const list = listItem.parentElement;
        if (!list) return;
        
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        
        if (listItem.nextElementSibling) {
          list.parentNode?.insertBefore(p, list.nextSibling);
        } else {
          list.parentNode?.insertBefore(p, list.nextSibling);
        }
        
        listItem.remove();
        
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
        // Create new list item
        const newItem = document.createElement('li');
        
        // Split content at cursor
        const offset = range.startOffset;
        const container = range.startContainer;
        
        if (container.nodeType === Node.TEXT_NODE) {
          const text = container.textContent || '';
          const afterText = text.substring(offset);
          container.textContent = text.substring(0, offset);
          
          if (afterText) {
            newItem.appendChild(document.createTextNode(afterText));
          }
        }
        
        // Move remaining content to new item
        let sibling = range.startContainer.nextSibling;
        while (sibling) {
          const next = sibling.nextSibling;
          newItem.appendChild(sibling);
          sibling = next;
        }
        
        // Insert new item
        listItem.parentNode?.insertBefore(newItem, listItem.nextSibling);
        
        // Focus new item
        const newRange = document.createRange();
        newRange.selectNodeContents(newItem);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  };
  
  private handleTab = (e: KeyboardEvent): void => {
    if (e.key === 'Tab') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const listItem = findParentElement(range.commonAncestorContainer, el => 
        el.tagName === 'LI'
      );
      
      if (!listItem) return;
      
      e.preventDefault();
      
      if (e.shiftKey) {
        this.editor.execCommand('outdent');
      } else {
        this.editor.execCommand('indent');
      }
    }
  };
  
  private isBlockElement(element: Element): boolean {
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
                      'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI'];
    return blockTags.includes(element.tagName);
  }
}