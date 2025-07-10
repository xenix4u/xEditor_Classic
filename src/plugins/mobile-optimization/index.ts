/**
 * Mobile Optimization Plugin for xEditor
 * Provides touch events, responsive UI, and mobile-specific features
 */

import { Plugin } from '../../types';

export class MobileOptimizationPlugin implements Plugin {
  name = 'mobile-optimization';
  private editor: any;
  private touchStartX = 0;
  private touchStartY = 0;
  private isTouchDevice = false;
  private virtualKeyboardHeight = 0;

  init(editor: any) {
    this.editor = editor;
    this.isTouchDevice = this.detectTouchDevice();
    
    if (this.isTouchDevice) {
      this.setupTouchEvents();
      this.setupVirtualKeyboard();
      this.setupResponsiveToolbar();
      this.setupTouchDragDrop();
    }
    
    this.setupResponsiveCSS();
    
    return {
      toolbar: this.isTouchDevice ? this.getMobileToolbarItems() : []
    };
  }

  private detectTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  private setupTouchEvents() {
    const container = this.editor.getContainer();
    
    // Touch selection events
    container.addEventListener('touchstart', this.handleTouchStart.bind(this));
    container.addEventListener('touchmove', this.handleTouchMove.bind(this));
    container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Prevent default touch behaviors that interfere with editing
    container.addEventListener('touchstart', (event: TouchEvent) => {
      if (event.target && (event.target as HTMLElement).closest('.xeditor-content')) {
        event.stopPropagation();
      }
    });
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      
      // Detect swipe gestures
      if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
        this.handleSwipeGesture(deltaX, deltaY);
      }
    }
  }

  private handleTouchEnd(_e: TouchEvent) {
    // Show mobile toolbar on touch end if text is selected
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        this.showMobileToolbar();
      } else {
        this.hideMobileToolbar();
      }
    }, 100);
  }

  private handleSwipeGesture(deltaX: number, deltaY: number) {
    // Implement swipe actions
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Right swipe - undo
        this.editor.execCommand('undo');
      } else {
        // Left swipe - redo
        this.editor.execCommand('redo');
      }
    }
  }

  private setupVirtualKeyboard() {
    const initialViewportHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialViewportHeight - currentHeight;
      
      if (heightDiff > 150) {
        // Virtual keyboard is open
        this.virtualKeyboardHeight = heightDiff;
        this.adjustForVirtualKeyboard(true);
      } else {
        // Virtual keyboard is closed
        this.virtualKeyboardHeight = 0;
        this.adjustForVirtualKeyboard(false);
      }
    });
  }

  private adjustForVirtualKeyboard(isOpen: boolean) {
    const container = this.editor.getContainer();
    const toolbar = container.querySelector('.xeditor-toolbar');
    
    if (isOpen) {
      // Adjust editor height when virtual keyboard opens
      container.style.height = `${window.innerHeight - this.virtualKeyboardHeight}px`;
      
      // Make toolbar sticky when keyboard is open
      if (toolbar) {
        toolbar.classList.add('xeditor-toolbar--keyboard-open');
      }
    } else {
      // Restore original height
      container.style.height = '';
      
      if (toolbar) {
        toolbar.classList.remove('xeditor-toolbar--keyboard-open');
      }
    }
  }

  private setupResponsiveToolbar() {
    const toolbar = this.editor.getContainer().querySelector('.xeditor-toolbar');
    if (!toolbar) return;

    // Add responsive classes
    toolbar.classList.add('xeditor-toolbar--responsive');
    
    // Create mobile toolbar overlay
    const mobileToolbar = document.createElement('div');
    mobileToolbar.className = 'xeditor-mobile-toolbar';
    mobileToolbar.style.display = 'none';
    document.body.appendChild(mobileToolbar);
    
    // Populate mobile toolbar with essential tools
    this.populateMobileToolbar(mobileToolbar);
  }

  private populateMobileToolbar(toolbar: HTMLElement) {
    const essentialTools = [
      'bold', 'italic', 'underline', 'link', 'heading', 'list'
    ];
    
    essentialTools.forEach(tool => {
      const button = document.createElement('button');
      button.className = 'xeditor-mobile-toolbar__item';
      button.dataset.command = tool;
      button.innerHTML = this.getToolIcon(tool);
      button.addEventListener('click', () => {
        this.editor.execCommand(tool);
        this.hideMobileToolbar();
      });
      toolbar.appendChild(button);
    });
  }

  private getToolIcon(tool: string): string {
    const icons: { [key: string]: string } = {
      'bold': '<strong>B</strong>',
      'italic': '<em>I</em>',
      'underline': '<u>U</u>',
      'link': '🔗',
      'heading': 'H1',
      'list': '• • •'
    };
    return icons[tool] || tool;
  }

  private showMobileToolbar() {
    const toolbar = document.querySelector('.xeditor-mobile-toolbar') as HTMLElement;
    if (!toolbar) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position toolbar above selection
    toolbar.style.display = 'flex';
    toolbar.style.position = 'fixed';
    toolbar.style.top = `${rect.top - 50}px`;
    toolbar.style.left = `${rect.left + (rect.width / 2) - 100}px`;
    toolbar.style.zIndex = '1000';
  }

  private hideMobileToolbar() {
    const toolbar = document.querySelector('.xeditor-mobile-toolbar') as HTMLElement;
    if (toolbar) {
      toolbar.style.display = 'none';
    }
  }

  private setupTouchDragDrop() {
    const content = this.editor.getContainer().querySelector('.xeditor-content');
    if (!content) return;

    let draggedElement: HTMLElement | null = null;
    
    content.addEventListener('touchstart', (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('[draggable="true"]')) {
        draggedElement = target.tagName === 'IMG' ? target : target.closest('[draggable="true"]') as HTMLElement;
        target.style.opacity = '0.5';
      }
    });

    content.addEventListener('touchmove', (e: TouchEvent) => {
      if (draggedElement) {
        e.preventDefault();
        const touch = e.touches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Visual feedback for drop zone
        if (elementBelow && elementBelow.closest('.xeditor-content')) {
          this.showDropZone(elementBelow);
        }
      }
    });

    content.addEventListener('touchend', (e: TouchEvent) => {
      if (draggedElement) {
        draggedElement.style.opacity = '';
        const touch = e.changedTouches[0];
        const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (dropTarget && dropTarget.closest('.xeditor-content')) {
          this.handleTouchDrop(draggedElement, dropTarget);
        }
        
        draggedElement = null;
        this.hideDropZone();
      }
    });
  }

  private showDropZone(element: Element) {
    // Remove existing drop zone indicators
    this.hideDropZone();
    
    // Add drop zone indicator
    const dropZone = document.createElement('div');
    dropZone.className = 'xeditor-drop-zone';
    dropZone.style.cssText = `
      position: absolute;
      background: #007bff;
      height: 2px;
      width: 100%;
      z-index: 999;
    `;
    
    const rect = element.getBoundingClientRect();
    const container = this.editor.getContainer();
    const containerRect = container.getBoundingClientRect();
    
    dropZone.style.top = `${rect.top - containerRect.top}px`;
    dropZone.style.left = `${rect.left - containerRect.left}px`;
    
    container.appendChild(dropZone);
  }

  private hideDropZone() {
    const dropZones = this.editor.getContainer().querySelectorAll('.xeditor-drop-zone');
    dropZones.forEach((zone: Element) => zone.remove());
  }

  private handleTouchDrop(draggedElement: HTMLElement, dropTarget: Element) {
    // Simple implementation - move element to drop location
    const content = this.editor.getContainer().querySelector('.xeditor-content');
    if (!content) return;
    
    try {
      if (dropTarget.closest('.xeditor-content')) {
        // Find the closest paragraph or block element
        const targetBlock = dropTarget.closest('p, div, h1, h2, h3, h4, h5, h6') || dropTarget;
        
        // Insert the dragged element after the target
        if (targetBlock.parentNode) {
          targetBlock.parentNode.insertBefore(draggedElement, targetBlock.nextSibling);
        }
        
        // Trigger change event
        this.editor.trigger('change');
      }
    } catch (error) {
      console.warn('Touch drop failed:', error);
    }
  }

  private setupResponsiveCSS() {
    const style = document.createElement('style');
    style.textContent = `
      /* Mobile Responsive Styles */
      @media (max-width: 768px) {
        .xeditor-toolbar--responsive {
          flex-wrap: wrap !important;
          padding: 4px !important;
          gap: 2px !important;
        }
        
        .xeditor-toolbar--responsive .xeditor-toolbar__item {
          min-width: 40px !important;
          height: 40px !important;
          font-size: 14px !important;
          margin: 1px !important;
        }
        
        .xeditor-toolbar--responsive .xeditor-toolbar__dropdown {
          min-width: 80px !important;
          height: 40px !important;
          font-size: 14px !important;
        }
        
        .xeditor-toolbar--keyboard-open {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 1000 !important;
          background: white !important;
          border-bottom: 1px solid #ddd !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        .xeditor-content {
          min-height: 200px !important;
          padding: 12px !important;
          font-size: 16px !important; /* Prevent zoom on iOS */
          line-height: 1.5 !important;
        }
        
        .xeditor-mobile-toolbar {
          display: flex !important;
          background: #333 !important;
          border-radius: 8px !important;
          padding: 4px !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.3) !important;
        }
        
        .xeditor-mobile-toolbar__item {
          background: transparent !important;
          border: none !important;
          color: white !important;
          padding: 8px 12px !important;
          border-radius: 4px !important;
          font-size: 14px !important;
          cursor: pointer !important;
        }
        
        .xeditor-mobile-toolbar__item:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        
        .xeditor-drop-zone {
          animation: pulse 1s infinite !important;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      }
      
      @media (max-width: 480px) {
        .xeditor-toolbar--responsive {
          padding: 2px !important;
        }
        
        .xeditor-toolbar--responsive .xeditor-toolbar__item {
          min-width: 36px !important;
          height: 36px !important;
          font-size: 12px !important;
        }
        
        .xeditor-content {
          padding: 8px !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  private getMobileToolbarItems() {
    return [
      {
        name: 'mobile-format',
        icon: '📱',
        tooltip: 'Mobile Format',
        command: 'mobile-format'
      }
    ];
  }

  destroy() {
    // Clean up mobile toolbar
    const mobileToolbar = document.querySelector('.xeditor-mobile-toolbar');
    if (mobileToolbar) {
      mobileToolbar.remove();
    }
    
    // Remove event listeners
    const container = this.editor.getContainer();
    if (container) {
      container.removeEventListener('touchstart', this.handleTouchStart);
      container.removeEventListener('touchmove', this.handleTouchMove);
      container.removeEventListener('touchend', this.handleTouchEnd);
    }
  }
}