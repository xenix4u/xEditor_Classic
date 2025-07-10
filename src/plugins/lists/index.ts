import { Plugin, Editor } from '../../types';
import { findParentElement } from '../../utils/dom';

export class ListsPlugin implements Plugin {
  name = 'lists';
  private editor: Editor;

  init(editor: Editor): void {
    this.editor = editor;
    
    // Register list commands
    editor.commands.register('insertOrderedList', {
      execute: () => {
        this.toggleList('ol');
      },
      queryState: () => this.isInList('ol')
    });
    
    editor.commands.register('insertUnorderedList', {
      execute: () => {
        this.toggleList('ul');
      },
      queryState: () => this.isInList('ul')
    });
    
    editor.commands.register('indent', {
      execute: () => {
        
        // Save selection before any operation
        this.editor.selection.save();
        
        try {
          // Focus the content element
          this.editor.contentElement.focus();
          
          // Check if we're in a list
          const range = this.editor.selection.range;
          if (range) {
            const listItem = findParentElement(range.commonAncestorContainer, el => 
              el.tagName === 'LI'
            );
            
            if (listItem && listItem instanceof HTMLLIElement) {
              // Handle list item indentation
              this.indentListItem(listItem);
            } else {
              // Handle general text indentation
              this.indentGeneralText(1);
            }
          }
          
          // Restore selection
          this.editor.selection.restore();
          
          // Update toolbar state
          if (this.editor.toolbar) {
            this.editor.toolbar.updateState();
          }
        } catch (error) {
          console.error('Error in indent command:', error);
        }
      },
      canExecute: () => this.canIndent()
    });
    
    editor.commands.register('outdent', {
      execute: () => {
        
        // Save selection before any operation
        this.editor.selection.save();
        
        try {
          // Focus the content element
          this.editor.contentElement.focus();
          
          // Check if we're in a list
          const range = this.editor.selection.range;
          if (range) {
            const listItem = findParentElement(range.commonAncestorContainer, el => 
              el.tagName === 'LI'
            );
            
            if (listItem && listItem instanceof HTMLLIElement) {
              // Handle list item outdentation
              this.outdentListItem(listItem);
            } else {
              // Handle general text outdentation
              this.indentGeneralText(-1);
            }
          }
          
          // Restore selection
          this.editor.selection.restore();
          
          // Update toolbar state
          if (this.editor.toolbar) {
            this.editor.toolbar.updateState();
          }
        } catch (error) {
          console.error('Error in outdent command:', error);
        }
      },
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
    
    // Focus the editor first to ensure proper selection
    this.editor.focus();
    
    const selection = this.editor.selection;
    const range = selection.range;
    
    if (!range) {
      // If no range, create a collapsed selection at the start of the editor
      const newRange = document.createRange();
      newRange.setStart(this.editor.contentElement, 0);
      newRange.collapse(true);
      
      const windowSelection = window.getSelection();
      if (windowSelection) {
        windowSelection.removeAllRanges();
        windowSelection.addRange(newRange);
      }
      
      // Try again with the new range
      const newSelectionRange = selection.range;
      if (!newSelectionRange) {
        return;
      }
    }
    
    // Get the current range (which might be the newly created one)
    const currentRange = selection.range;
    if (!currentRange) {
      return;
    }
    
    // const listItem = findParentElement(currentRange.commonAncestorContainer, el => 
    //   el.tagName === 'LI'
    // );
    
    const list = findParentElement(currentRange.commonAncestorContainer, el => 
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
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Get the block element containing the selection
    let block = container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container as Element;
    
    
    while (block && !this.isBlockElement(block)) {
      block = block.parentElement;
    }
    
    
    if (!block) {
      // If no block element, create list at editor root
      const list = document.createElement(type);
      const listItem = document.createElement('li');
      
      // Add a text node to the list item
      listItem.appendChild(document.createTextNode(''));
      
      list.appendChild(listItem);
      this.editor.contentElement.appendChild(list);
      
      // Set selection to the list item
      const newRange = document.createRange();
      newRange.selectNodeContents(listItem);
      newRange.collapse(true);
      const windowSelection = window.getSelection();
      if (windowSelection) {
        windowSelection.removeAllRanges();
        windowSelection.addRange(newRange);
      }
      
      return;
    }
    
    const list = document.createElement(type);
    const listItem = document.createElement('li');
    
    
    // Move content to list item
    if (block.textContent?.trim()) {
      // If block has content, move it to list item
      while (block.firstChild) {
        listItem.appendChild(block.firstChild);
      }
    } else {
      // If block is empty, add empty text node
      listItem.appendChild(document.createTextNode(''));
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
    
    if (listItem) {
      // In a list: can indent if there's a previous list item
      return listItem.previousElementSibling?.tagName === 'LI';
    }
    
    // General text: can always indent
    return true;
  }
  
  private canOutdent(): boolean {
    const selection = this.editor.selection;
    const range = selection.range;
    if (!range) return false;
    
    const listItem = findParentElement(range.commonAncestorContainer, el => 
      el.tagName === 'LI'
    );
    
    if (listItem) {
      // In a list: can outdent if in a nested list
      const parentList = listItem.parentElement;
      if (!parentList) return false;
      return parentList.parentElement?.tagName === 'LI';
    }
    
    // General text: can outdent if there's existing indent
    let block = range.commonAncestorContainer;
    if (block.nodeType === Node.TEXT_NODE) {
      block = block.parentElement || block;
    }
    
    while (block && !this.isBlockElement(block as Element)) {
      block = (block as Element).parentElement || block;
    }
    
    if (!block) return false;
    
    const blockElement = block as HTMLElement;
    const currentPadding = parseInt(window.getComputedStyle(blockElement).paddingLeft || '0', 10);
    return currentPadding > 0;
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
  
  private indentGeneralText(direction: number): void {
    
    const selection = this.editor.selection;
    const range = selection.range;
    if (!range) {
      return;
    }
    
    // Get the current block element
    let block = range.commonAncestorContainer;
    
    if (block.nodeType === Node.TEXT_NODE) {
      block = block.parentElement || block;
    }
    
    
    // Find the closest block element
    while (block && block !== this.editor.contentElement && !this.isBlockElement(block as Element)) {
      block = (block as Element).parentElement || block;
    }
    
    
    if (!block || block === this.editor.contentElement) {
      // If no block element found, create a wrapper
      const wrapper = document.createElement('div');
      const text = range.toString();
      wrapper.textContent = text;
      
      if (direction > 0) {
        wrapper.style.paddingLeft = '20px';
      }
      
      range.deleteContents();
      range.insertNode(wrapper);
      
      // Update selection
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      newRange.collapse(false);
      const windowSelection = window.getSelection();
      if (windowSelection) {
        windowSelection.removeAllRanges();
        windowSelection.addRange(newRange);
      }
      
      return;
    }
    
    const blockElement = block as HTMLElement;
    
    if (direction > 0) {
      // Indent: add padding-left instead of margin-left for better compatibility
      const currentPadding = parseInt(window.getComputedStyle(blockElement).paddingLeft || '0', 10);
      const newPadding = currentPadding + 20;
      blockElement.style.paddingLeft = `${newPadding}px`;
      
      // Force update
      blockElement.setAttribute('data-indent-level', String((parseInt(blockElement.getAttribute('data-indent-level') || '0') + 1)));
    } else {
      // Outdent: reduce padding-left
      const currentPadding = parseInt(window.getComputedStyle(blockElement).paddingLeft || '0', 10);
      const newPadding = Math.max(0, currentPadding - 20);
      blockElement.style.paddingLeft = newPadding > 0 ? `${newPadding}px` : '';
      
      // Force update
      const indentLevel = parseInt(blockElement.getAttribute('data-indent-level') || '0');
      blockElement.setAttribute('data-indent-level', String(Math.max(0, indentLevel - 1)));
    }
    
  }

  private isBlockElement(element: Element): boolean {
    const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
                      'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI'];
    return blockTags.includes(element.tagName);
  }
}