import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, addClass } from '../../utils/dom';
import { sanitizeURL } from '../../utils/sanitize';

interface ImageUploadOptions {
  maxSize?: number; // in MB
  maxWidth?: number; // max width in pixels
  quality?: number; // JPEG quality 0-1
  allowedTypes?: string[];
  upload?: (file: File) => Promise<string>;
  onError?: (error: Error) => void;
  resizeBeforeUpload?: boolean; // resize images before uploading
}

export class ImagePlugin implements Plugin {
  name = 'image';
  private editor!: Editor;
  private options: ImageUploadOptions;
  private resizing: boolean = false;
  private selectedImage: HTMLImageElement | null = null;

  constructor(options: ImageUploadOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 10, // 10MB default
      maxWidth: options.maxWidth || 1200, // 1200px default
      quality: options.quality || 0.85, // 85% quality default
      allowedTypes: options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      upload: options.upload,
      onError: options.onError || ((error) => console.error('Image upload error:', error)),
      resizeBeforeUpload: options.resizeBeforeUpload !== false // true by default
    };
  }

  // Don't add toolbar items since the default toolbar already includes image button
  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make showImageDialog available globally on the plugin instance
    (this as any).showImageDialog = this.showImageDialog.bind(this);
    
    // Register commands
    editor.commands.register('insertImage', {
      execute: (src: string) => this.insertImage(src)
    });
    
    // Handle paste events for images
    editor.contentElement.addEventListener('paste', this.handlePaste);
    
    // Handle drop events
    editor.contentElement.addEventListener('drop', this.handleDrop);
    editor.contentElement.addEventListener('dragover', this.handleDragOver);
    editor.contentElement.addEventListener('dragleave', this.handleDragLeave);
    
    // Handle image selection
    editor.contentElement.addEventListener('click', this.handleClick);
    
    // Add styles for image handling
    this.addStyles();
  }
  
  destroy(): void {
    this.editor.contentElement.removeEventListener('paste', this.handlePaste);
    this.editor.contentElement.removeEventListener('drop', this.handleDrop);
    this.editor.contentElement.removeEventListener('dragover', this.handleDragOver);
    this.editor.contentElement.removeEventListener('dragleave', this.handleDragLeave);
    this.editor.contentElement.removeEventListener('click', this.handleClick);
    
    // Remove resize handles if any
    this.removeResizeHandles();
  }
  
  private showImageDialog(): void {
    // Save selection before showing dialog
    this.editor.selection.save();
    const dialog = this.createDialog();
    document.body.appendChild(dialog);
  }
  
  private createDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-image-dialog-overlay'
    });
    
    const dialog = createElement('div', {
      className: 'xeditor-image-dialog'
    });
    
    const title = createElement('h3', {}, ['Insert Image']);
    
    const tabs = createElement('div', {
      className: 'xeditor-image-tabs'
    });
    
    const uploadTab = createElement('button', {
      className: 'xeditor-image-tab active',
      type: 'button'
    }, ['Upload']);
    
    const urlTab = createElement('button', {
      className: 'xeditor-image-tab',
      type: 'button'
    }, ['From URL']);
    
    tabs.appendChild(uploadTab);
    tabs.appendChild(urlTab);
    
    const urlContent = this.createUrlContent();
    const uploadContent = this.createUploadContent();
    urlContent.style.display = 'none';
    
    uploadTab.addEventListener('click', () => {
      addClass(uploadTab, 'active');
      removeClass(urlTab, 'active');
      uploadContent.style.display = 'block';
      urlContent.style.display = 'none';
    });
    
    urlTab.addEventListener('click', () => {
      addClass(urlTab, 'active');
      removeClass(uploadTab, 'active');
      urlContent.style.display = 'block';
      uploadContent.style.display = 'none';
    });
    
    const closeBtn = createElement('button', {
      className: 'xeditor-image-dialog-close',
      type: 'button'
    }, ['×']);
    
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(tabs);
    dialog.appendChild(uploadContent);
    dialog.appendChild(urlContent);
    
    overlay.appendChild(dialog);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    return overlay;
  }
  
  private createUrlContent(): HTMLElement {
    const content = createElement('div', {
      className: 'xeditor-image-url-content'
    });
    
    const input = createElement('input', {
      type: 'url',
      placeholder: 'Enter image URL',
      className: 'xeditor-image-url-input'
    }) as HTMLInputElement;
    
    const altInput = createElement('input', {
      type: 'text',
      placeholder: 'Alt text (optional)',
      className: 'xeditor-image-alt-input'
    }) as HTMLInputElement;
    
    const preview = createElement('div', {
      className: 'xeditor-image-preview'
    });
    
    input.addEventListener('input', () => {
      const url = input.value;
      if (url) {
        const img = new Image();
        img.onload = () => {
          preview.innerHTML = '';
          preview.appendChild(img);
        };
        img.onerror = () => {
          preview.innerHTML = '<p>Failed to load image</p>';
        };
        img.src = url;
      } else {
        preview.innerHTML = '';
      }
    });
    
    const insertBtn = createElement('button', {
      className: 'xeditor-image-insert-btn',
      type: 'button'
    }, ['Insert']);
    
    insertBtn.addEventListener('click', () => {
      const url = sanitizeURL(input.value);
      if (url) {
        // Save current selection before dialog closes
        this.editor.selection.save();
        
        const overlay = content.closest('.xeditor-image-dialog-overlay');
        if (overlay) {
          document.body.removeChild(overlay);
        }
        
        // Restore selection and insert image
        setTimeout(() => {
          this.editor.selection.restore();
          this.insertImage(url, altInput.value);
        }, 50);
      }
    });
    
    content.appendChild(input);
    content.appendChild(altInput);
    content.appendChild(preview);
    content.appendChild(insertBtn);
    
    return content;
  }
  
  private createUploadContent(): HTMLElement {
    const content = createElement('div', {
      className: 'xeditor-image-upload-content'
    });
    
    const dropZone = createElement('div', {
      className: 'xeditor-image-dropzone'
    });
    
    const icon = createElement('div', {
      className: 'xeditor-image-dropzone-icon',
      innerHTML: `<svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a5.53 5.53 0 0 0-3.594 1.342c-.766.66-1.321 1.52-1.464 2.383C1.266 4.095 0 5.555 0 7.318 0 9.366 1.708 11 3.781 11H7.5V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11h4.188C14.502 11 16 9.57 16 7.773c0-1.636-1.242-2.969-2.834-3.194C12.923 1.999 10.69 0 8 0zm-.5 14.5V11h1v3.5a.5.5 0 0 1-1 0z"/>
      </svg>`
    });
    
    const text = createElement('p', {}, ['Drag and drop an image here or click to browse']);
    
    const input = createElement('input', {
      type: 'file',
      accept: this.options.allowedTypes!.join(','),
      style: 'display: none'
    }) as HTMLInputElement;
    
    const altInput = createElement('input', {
      type: 'text',
      placeholder: 'Alt text (optional)',
      className: 'xeditor-image-alt-input',
      style: 'display: none'
    }) as HTMLInputElement;
    
    const preview = createElement('div', {
      className: 'xeditor-image-preview'
    });
    
    const insertBtn = createElement('button', {
      className: 'xeditor-image-insert-btn',
      type: 'button',
      style: 'display: none'
    }, ['Insert']);
    
    dropZone.appendChild(icon);
    dropZone.appendChild(text);
    dropZone.appendChild(input);
    
    dropZone.addEventListener('click', () => input.click());
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      addClass(dropZone, 'dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
      removeClass(dropZone, 'dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      removeClass(dropZone, 'dragover');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFile(files[0], preview, altInput, insertBtn);
      }
    });
    
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) {
        this.handleFile(file, preview, altInput, insertBtn);
      }
    });
    
    insertBtn.addEventListener('click', () => {
      const file = input.files?.[0];
      if (file) {
        // Save current selection before dialog closes
        this.editor.selection.save();
        
        const overlay = content.closest('.xeditor-image-dialog-overlay');
        if (overlay) {
          document.body.removeChild(overlay);
        }
        
        // Restore selection and insert image
        setTimeout(() => {
          this.editor.selection.restore();
          this.uploadAndInsert(file, altInput.value);
        }, 50);
      }
    });
    
    content.appendChild(dropZone);
    content.appendChild(altInput);
    content.appendChild(preview);
    content.appendChild(insertBtn);
    
    return content;
  }
  
  private handleFile(
    file: File, 
    preview: HTMLElement, 
    altInput: HTMLElement, 
    insertBtn: HTMLElement
  ): void {
    if (!this.validateFile(file)) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        preview.innerHTML = '';
        preview.appendChild(img);
        altInput.style.display = 'block';
        insertBtn.style.display = 'block';
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
  
  private validateFile(file: File): boolean {
    if (!this.options.allowedTypes!.includes(file.type)) {
      this.options.onError!(new Error(`File type ${file.type} is not allowed`));
      return false;
    }
    
    const maxSizeBytes = this.options.maxSize! * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.options.onError!(new Error(`File size exceeds ${this.options.maxSize}MB limit`));
      return false;
    }
    
    return true;
  }
  
  private async uploadAndInsert(file: File, alt: string = ''): Promise<void> {
    try {
      let processedFile = file;
      
      // Resize image if needed
      if (this.options.resizeBeforeUpload && file.type.startsWith('image/')) {
        processedFile = await this.resizeImage(file);
      }
      
      let src: string;
      
      if (this.options.upload) {
        src = await this.options.upload(processedFile);
      } else {
        // Use data URL as fallback
        src = await this.fileToDataURL(processedFile);
      }
      
      this.insertImage(src, alt);
    } catch (error) {
      this.options.onError!(error as Error);
    }
  }
  
  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  private async resizeImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      img.onload = () => {
        let { width, height } = img;
        const maxWidth = this.options.maxWidth!;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create new file with same name and type
              const resizedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          file.type || 'image/jpeg',
          this.options.quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
  
  private insertImage(src: string, alt: string = ''): void {
    const img = createElement('img', {
      src,
      alt,
      className: 'xeditor-image'
    }) as HTMLImageElement;
    
    // Apply max width constraint
    if (this.options.maxWidth) {
      img.style.maxWidth = `${this.options.maxWidth}px`;
      img.style.width = '100%';
      img.style.height = 'auto';
    }
    
    // Make sure editor has focus
    this.editor.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // If no selection, insert at the end of the editor
      this.editor.contentElement.appendChild(img);
      const range = document.createRange();
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      const range = selection.getRangeAt(0);
      
      // Check if selection is within the editor
      if (!this.editor.contentElement.contains(range.commonAncestorContainer)) {
        // If not, insert at the end of the editor
        this.editor.contentElement.appendChild(img);
        const newRange = document.createRange();
        newRange.setStartAfter(img);
        newRange.setEndAfter(img);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // Insert at the current selection
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.setEndAfter(img);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    // Record history after a short delay to ensure DOM is updated
    setTimeout(() => {
      this.editor.history.record();
    }, 50);
  }
  
  private handlePaste = (e: ClipboardEvent): void => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && this.validateFile(file)) {
          this.uploadAndInsert(file);
        }
        break;
      }
    }
  };
  
  private handleDrop = (e: DragEvent): void => {
    const files = e.dataTransfer?.files;
    if (!files) return;
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Add visual feedback
        this.editor.contentElement.classList.remove('xeditor-drag-over');
        
        if (this.validateFile(file)) {
          // Get drop position
          const x = e.clientX;
          const y = e.clientY;
          
          // Set caret position at drop point
          const range = document.caretRangeFromPoint(x, y);
          if (range) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
          
          this.uploadAndInsert(file);
        }
        break;
      }
    }
  };
  
  private handleDragOver = (e: DragEvent): void => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      
      // Add visual feedback
      this.editor.contentElement.classList.add('xeditor-drag-over');
    }
  };
  
  private handleDragLeave = (e: DragEvent): void => {
    // Remove visual feedback when leaving
    const relatedTarget = e.relatedTarget as Node;
    if (!this.editor.contentElement.contains(relatedTarget)) {
      this.editor.contentElement.classList.remove('xeditor-drag-over');
    }
  };
  
  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'IMG' && target.classList.contains('xeditor-image')) {
      this.selectImage(target as HTMLImageElement);
    } else {
      this.deselectImage();
    }
  };
  
  private selectImage(img: HTMLImageElement): void {
    this.deselectImage();
    this.selectedImage = img;
    addClass(img, 'xeditor-image-selected');
    this.addResizeHandles(img);
  }
  
  private deselectImage(): void {
    if (this.selectedImage) {
      removeClass(this.selectedImage, 'xeditor-image-selected');
      this.removeResizeHandles();
      this.selectedImage = null;
    }
  }
  
  private addResizeHandles(img: HTMLImageElement): void {
    const wrapper = createElement('div', {
      className: 'xeditor-image-resize-wrapper'
    });
    
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(position => {
      const handle = createElement('div', {
        className: `xeditor-image-resize-handle xeditor-image-resize-handle-${position}`,
        'data-position': position
      });
      
      handle.addEventListener('mousedown', (e) => this.startResize(e, img));
      wrapper.appendChild(handle);
    });
    
    img.parentNode?.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  }
  
  private removeResizeHandles(): void {
    const wrapper = document.querySelector('.xeditor-image-resize-wrapper');
    if (wrapper) {
      const img = wrapper.querySelector('img');
      if (img) {
        wrapper.parentNode?.insertBefore(img, wrapper);
      }
      wrapper.remove();
    }
  }
  
  private startResize(e: MouseEvent, img: HTMLImageElement): void {
    e.preventDefault();
    this.resizing = true;
    
    const startX = e.clientX;
    // const startY = e.clientY;
    const startWidth = img.width;
    const startHeight = img.height;
    const aspectRatio = startWidth / startHeight;
    
    const position = (e.target as HTMLElement).dataset.position!;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!this.resizing) return;
      
      const deltaX = e.clientX - startX;
      // const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (position.includes('e')) {
        newWidth = startWidth + deltaX;
      } else if (position.includes('w')) {
        newWidth = startWidth - deltaX;
      }
      
      // Maintain aspect ratio
      newHeight = newWidth / aspectRatio;
      
      // Apply minimum size
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(50, newHeight);
      
      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
    };
    
    const handleMouseUp = () => {
      this.resizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      this.editor.history.record();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-image {
        max-width: 100%;
        height: auto;
        cursor: pointer;
      }
      
      .xeditor-image-selected {
        outline: 2px solid var(--xeditor-primary);
      }
      
      .xeditor-image-resize-wrapper {
        position: relative;
        display: inline-block;
      }
      
      .xeditor-image-resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: var(--xeditor-primary);
        border: 1px solid white;
        box-shadow: 0 0 3px rgba(0,0,0,0.3);
      }
      
      .xeditor-image-resize-handle-nw {
        top: -5px;
        left: -5px;
        cursor: nw-resize;
      }
      
      .xeditor-image-resize-handle-ne {
        top: -5px;
        right: -5px;
        cursor: ne-resize;
      }
      
      .xeditor-image-resize-handle-sw {
        bottom: -5px;
        left: -5px;
        cursor: sw-resize;
      }
      
      .xeditor-image-resize-handle-se {
        bottom: -5px;
        right: -5px;
        cursor: se-resize;
      }
      
      .xeditor-image-dialog-overlay {
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
      
      .xeditor-image-dialog {
        position: relative;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        width: 500px;
        max-width: 90vw;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .xeditor-image-dialog h3 {
        margin: 0 0 20px 0;
      }
      
      .xeditor-image-dialog-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      
      .xeditor-image-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid #ddd;
      }
      
      .xeditor-image-tab {
        padding: 10px 20px;
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        border-bottom: 2px solid transparent;
      }
      
      .xeditor-image-tab.active {
        color: var(--xeditor-primary);
        border-bottom-color: var(--xeditor-primary);
      }
      
      .xeditor-image-url-input,
      .xeditor-image-alt-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 10px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .xeditor-image-preview {
        min-height: 100px;
        max-height: 300px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-sizing: border-box;
      }
      
      .xeditor-image-preview img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      
      .xeditor-image-dropzone {
        border: 2px dashed #ddd;
        border-radius: 8px;
        padding: 40px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        box-sizing: border-box;
      }
      
      .xeditor-image-dropzone.dragover {
        border-color: var(--xeditor-primary);
        background-color: rgba(0,123,255,0.05);
      }
      
      .xeditor-image-dropzone-icon {
        font-size: 48px;
        margin-bottom: 10px;
      }
      
      .xeditor-image-insert-btn {
        background-color: var(--xeditor-primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-image-insert-btn:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      .xeditor-drag-over {
        position: relative;
        outline: 3px dashed var(--xeditor-primary);
        outline-offset: -3px;
        background-color: rgba(0, 123, 255, 0.05);
      }
      
      .xeditor-drag-over::after {
        content: 'Drop image here';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: var(--xeditor-primary);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        pointer-events: none;
        z-index: 1000;
      }
      
      /* Dark theme support for image dialog */
      [data-theme="dark"] .xeditor-image-dialog {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-image-dialog-close {
        color: #adb5bd;
      }
      
      [data-theme="dark"] .xeditor-image-tabs {
        border-bottom-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-image-tab {
        color: #adb5bd;
      }
      
      [data-theme="dark"] .xeditor-image-tab.active {
        color: #0d6efd;
      }
      
      [data-theme="dark"] .xeditor-image-url-input,
      [data-theme="dark"] .xeditor-image-alt-input {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-image-dropzone {
        background-color: #343a40;
        border-color: #6c757d;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-image-dropzone.dragover {
        background-color: rgba(13, 110, 253, 0.1);
      }
      
      [data-theme="dark"] .xeditor-image-preview {
        background-color: #495057;
        border-color: #6c757d;
      }
      
      /* Ensure all inputs use border-box sizing */
      .xeditor-image-dialog * {
        box-sizing: border-box;
      }
    `;
    
    document.head.appendChild(style);
  }
}

function removeClass(element: Element, className: string): void {
  element.classList.remove(className);
}