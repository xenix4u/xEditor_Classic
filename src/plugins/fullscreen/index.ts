import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, addClass, removeClass } from '../../utils/dom';
import { icons } from '../../ui/icons';

export class FullscreenPlugin implements Plugin {
  name = 'fullscreen';
  private editor!: Editor;
  private isFullscreen: boolean = false;
  private originalStyles: { [key: string]: string } = {};

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make toggleFullscreen available
    (this as any).toggleFullscreen = this.toggleFullscreen.bind(this);
    
    // Register command
    editor.commands.register('toggleFullscreen', {
      execute: () => this.toggleFullscreen()
    });
    
    // Handle ESC key to exit fullscreen
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Add styles
    this.addStyles();
  }
  
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Exit fullscreen if active
    if (this.isFullscreen) {
      this.exitFullscreen();
    }
  }
  
  toggleFullscreen(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }
  
  private enterFullscreen(): void {
    this.isFullscreen = true;
    
    // Save original styles
    const wrapper = this.editor.container.querySelector('.xeditor-wrapper') as HTMLElement;
    if (!wrapper) return;
    
    this.originalStyles = {
      position: wrapper.style.position,
      top: wrapper.style.top,
      left: wrapper.style.left,
      right: wrapper.style.right,
      bottom: wrapper.style.bottom,
      width: wrapper.style.width,
      height: wrapper.style.height,
      zIndex: wrapper.style.zIndex
    };
    
    // Apply fullscreen styles
    addClass(wrapper, 'xeditor-fullscreen');
    
    // Update toolbar button
    this.updateToolbarButton();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Emit event
    this.editor.emit('fullscreenenter');
  }
  
  private exitFullscreen(): void {
    this.isFullscreen = false;
    
    const wrapper = this.editor.container.querySelector('.xeditor-wrapper') as HTMLElement;
    if (!wrapper) return;
    
    // Remove fullscreen class
    removeClass(wrapper, 'xeditor-fullscreen');
    
    // Restore original styles
    Object.keys(this.originalStyles).forEach(key => {
      wrapper.style[key as any] = this.originalStyles[key];
    });
    
    // Update toolbar button
    this.updateToolbarButton();
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Emit event
    this.editor.emit('fullscreenexit');
  }
  
  private updateToolbarButton(): void {
    // Find the fullscreen button in toolbar
    const toolbar = this.editor.toolbar;
    if (!toolbar) return;
    
    const buttons = toolbar.element.querySelectorAll('.xeditor-toolbar__item');
    buttons.forEach(button => {
      const icon = button.querySelector('.xeditor-toolbar__icon');
      if (icon && icon.innerHTML.includes('fullscreen')) {
        // Update icon
        icon.innerHTML = this.isFullscreen ? icons.exitFullscreen : icons.fullscreen;
        
        // Update tooltip
        button.setAttribute('title', this.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen');
        button.setAttribute('aria-label', this.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen');
      }
    });
  }
  
  private handleKeyDown = (e: KeyboardEvent): void => {
    // ESC key to exit fullscreen
    if (e.key === 'Escape' && this.isFullscreen) {
      e.preventDefault();
      this.exitFullscreen();
    }
  };
  
  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      /* Fullscreen styles */
      .xeditor-fullscreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 9999 !important;
        background-color: var(--xeditor-bg);
        border-radius: 0 !important;
      }
      
      .xeditor-fullscreen .xeditor-toolbar {
        border-radius: 0;
        position: sticky;
        top: 0;
        z-index: 10000;
      }
      
      .xeditor-fullscreen .xeditor-content {
        height: calc(100vh - 60px) !important;
        max-height: none !important;
        border-radius: 0;
      }
      
      /* Smooth transition */
      .xeditor-wrapper {
        transition: all 0.3s ease;
      }
      
      /* Hide scrollbars on body when fullscreen */
      body.xeditor-fullscreen-active {
        overflow: hidden !important;
      }
      
      /* Fullscreen overlay for better isolation */
      .xeditor-fullscreen::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--xeditor-bg);
        z-index: -1;
      }
      
      /* Dark theme adjustments */
      [data-theme="dark"] .xeditor-fullscreen::before {
        background-color: #1a1a1a;
      }
    `;
    
    document.head.appendChild(style);
  }
}