import { Plugin, Editor } from '../../types';
import { createElement } from '../../utils/dom';

interface ResizeConfig {
  minHeight?: number;
  maxHeight?: number;
  handleHeight?: number;
  handleColor?: string;
}

export class ResizePlugin implements Plugin {
  name = 'resize';
  private editor!: Editor;
  private config: ResizeConfig;
  private resizeHandle!: HTMLElement;
  private isResizing = false;
  private startY = 0;
  private startHeight = 0;

  constructor(config: ResizeConfig = {}) {
    this.config = {
      minHeight: config.minHeight || 100,
      maxHeight: config.maxHeight || 800,
      handleHeight: config.handleHeight || 8,
      handleColor: config.handleColor || '#e5e7eb'
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Create resize handle
    this.createResizeHandle();
    
    // Add styles
    this.addStyles();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  destroy(): void {
    if (this.resizeHandle) {
      this.resizeHandle.remove();
    }
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  private createResizeHandle(): void {
    this.resizeHandle = createElement('div', {
      className: 'xeditor-resize-handle'
    });
    
    // Insert handle after the editor wrapper
    this.editor.wrapper.appendChild(this.resizeHandle);
  }

  private setupEventListeners(): void {
    this.resizeHandle.addEventListener('mousedown', this.handleMouseDown);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    this.isResizing = true;
    this.startY = e.clientY;
    this.startHeight = this.editor.contentElement.offsetHeight;
    
    // Add resizing class
    this.editor.wrapper.classList.add('xeditor-resizing');
    document.body.style.cursor = 'ns-resize';
    
    // Add document event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isResizing) return;
    
    e.preventDefault();
    const deltaY = e.clientY - this.startY;
    const newHeight = Math.min(
      Math.max(this.startHeight + deltaY, this.config.minHeight!),
      this.config.maxHeight!
    );
    
    this.editor.contentElement.style.height = `${newHeight}px`;
  };

  private handleMouseUp = (): void => {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    this.editor.wrapper.classList.remove('xeditor-resizing');
    document.body.style.cursor = '';
    
    // Remove document event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    // Save the new height to config if needed
    const newHeight = this.editor.contentElement.offsetHeight;
    this.editor.events.emit('resize', newHeight);
  };

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-resize-handle {
        position: relative;
        height: ${this.config.handleHeight}px;
        background-color: ${this.config.handleColor};
        cursor: ns-resize;
        user-select: none;
        transition: background-color 0.2s ease;
        overflow: hidden;
      }
      
      .xeditor-resize-handle::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 4px;
        background-color: #9ca3af;
        border-radius: 2px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .xeditor-resize-handle:hover {
        background-color: #d1d5db;
      }
      
      .xeditor-resize-handle:hover::before {
        opacity: 1;
      }
      
      .xeditor-resizing .xeditor-resize-handle {
        background-color: #93c5fd;
      }
      
      .xeditor-resizing .xeditor-resize-handle::before {
        opacity: 1;
        background-color: #3b82f6;
      }
      
      /* Prevent text selection during resize */
      .xeditor-resizing {
        user-select: none;
      }
      
      .xeditor-resizing * {
        user-select: none !important;
      }
      
      /* Dark theme */
      [data-theme="dark"] .xeditor-resize-handle {
        background-color: #374151;
      }
      
      [data-theme="dark"] .xeditor-resize-handle:hover {
        background-color: #4b5563;
      }
      
      [data-theme="dark"] .xeditor-resize-handle::before {
        background-color: #6b7280;
      }
      
      [data-theme="dark"] .xeditor-resizing .xeditor-resize-handle {
        background-color: #1e40af;
      }
      
      [data-theme="dark"] .xeditor-resizing .xeditor-resize-handle::before {
        background-color: #60a5fa;
      }
    `;
    
    document.head.appendChild(style);
  }
}