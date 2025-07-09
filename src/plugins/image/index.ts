import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, addClass, removeClass } from '../../utils/dom';

interface ImageOptions {
  maxSize?: number; // MB
  maxWidth?: number;
  maxHeight?: number;
  allowedTypes?: string[];
  quality?: number;
  autoResize?: boolean;
  onUpload?: (file: File) => Promise<string>;
  onError?: (error: Error) => void;
}

export class ImagePlugin implements Plugin {
  name = 'image';
  private editor!: Editor;
  private options: ImageOptions;

  toolbar: ToolbarItem[] = [];

  constructor(options: ImageOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 5, // 5MB default
      maxWidth: options.maxWidth || 1200,
      maxHeight: options.maxHeight || 1200,
      allowedTypes: options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      quality: options.quality || 0.9,
      autoResize: options.autoResize !== false,
      onError: options.onError || ((error) => alert(error.message)),
      ...options
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).showImageDialog = this.showImageDialog.bind(this);
    
    // Register commands
    this.editor.commands.register('insertImage', {
      execute: (src: string) => this.insertImage(src)
    });
    
    // Add paste handler
    this.editor.contentElement.addEventListener('paste', this.handlePaste);
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    this.editor.contentElement.removeEventListener('paste', this.handlePaste);
  }

  private showImageDialog(): void {
    const dialog = this.createImageDialog();
    document.body.appendChild(dialog);
  }

  private createImageDialog(): HTMLElement {
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

    // Create content areas
    const uploadContent = this.createUploadContent();
    const urlContent = this.createUrlContent();
    urlContent.style.display = 'none';

    // Tab switching
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
      type: 'button',
      innerHTML: '×'
    });

    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(tabs);
    dialog.appendChild(uploadContent);
    dialog.appendChild(urlContent);

    overlay.appendChild(dialog);

    // Close on overlay click
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
      className: 'xeditor-image-url-preview'
    });

    // Handle URL input
    let previewTimeout: NodeJS.Timeout;
    input.addEventListener('input', () => {
      clearTimeout(previewTimeout);
      const url = input.value.trim();
      
      if (!url) {
        preview.innerHTML = '';
        return;
      }

      preview.innerHTML = '<div class="xeditor-image-url-preview-loading">Loading preview...</div>';
      
      previewTimeout = setTimeout(() => {
        const img = new Image();
        img.onload = () => {
          preview.innerHTML = '';
          const previewImg = createElement('img', { src: url });
          preview.appendChild(previewImg);
        };
        img.onerror = () => {
          preview.innerHTML = '<div style="color: #ef4444; font-size: 14px;">Failed to load image</div>';
        };
        img.src = url;
      }, 500);
    });

    const buttonGroup = createElement('div', {
      className: 'xeditor-image-button-group'
    });

    const insertBtn = createElement('button', {
      className: 'xeditor-btn-primary'
    }, ['Insert']);

    const cancelBtn = createElement('button', {
      className: 'xeditor-btn-secondary'
    }, ['Cancel']);

    insertBtn.addEventListener('click', () => {
      const url = input.value.trim();
      if (url) {
        this.editor.selection.save();
        
        const overlay = content.closest('.xeditor-image-dialog-overlay');
        if (overlay) {
          document.body.removeChild(overlay);
        }
        
        setTimeout(() => {
          this.editor.selection.restore();
          this.insertImage(url, altInput.value);
        }, 50);
      }
    });

    cancelBtn.addEventListener('click', () => {
      const overlay = content.closest('.xeditor-image-dialog-overlay');
      if (overlay) {
        document.body.removeChild(overlay);
      }
    });

    buttonGroup.appendChild(insertBtn);
    buttonGroup.appendChild(cancelBtn);

    content.appendChild(input);
    content.appendChild(altInput);
    content.appendChild(preview);
    content.appendChild(buttonGroup);

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
      innerHTML: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>`
    });

    const title = createElement('h4', {}, ['Drop your image here']);
    const text = createElement('p', {}, ['or click to browse from your computer']);
    
    const supportedFormats = createElement('div', {
      className: 'xeditor-image-formats'
    }, [`Supported formats: ${this.options.allowedTypes!.map(t => t.replace('image/', '').toUpperCase()).join(', ')}`]);

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

    const fileInfo = createElement('div', {
      className: 'xeditor-image-file-info',
      style: 'display: none'
    });

    const progressBar = createElement('div', {
      className: 'xeditor-image-progress',
      style: 'display: none'
    });

    const progressFill = createElement('div', {
      className: 'xeditor-image-progress-fill'
    });
    progressBar.appendChild(progressFill);

    dropZone.appendChild(icon);
    dropZone.appendChild(title);
    dropZone.appendChild(text);
    dropZone.appendChild(supportedFormats);
    dropZone.appendChild(input);

    dropZone.addEventListener('click', () => input.click());

    // Drag and drop events
    let dragCounter = 0;
    
    dropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      addClass(dropZone, 'dragover');
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    dropZone.addEventListener('dragleave', () => {
      dragCounter--;
      if (dragCounter === 0) {
        removeClass(dropZone, 'dragover');
      }
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      removeClass(dropZone, 'dragover');
      
      const files = Array.from(e.dataTransfer?.files || []);
      const imageFile = files.find(file => file.type.startsWith('image/'));
      
      if (imageFile && this.validateFile(imageFile)) {
        handleFile(imageFile);
      } else if (imageFile) {
        alert('Invalid file type or size. Please check the requirements.');
      }
    });

    const handleFile = async (file: File) => {
      dropZone.style.display = 'none';
      fileInfo.style.display = 'block';
      progressBar.style.display = 'block';
      
      // Show file info
      fileInfo.innerHTML = `
        <div class="xeditor-image-file-name">${file.name}</div>
        <div class="xeditor-image-file-size">${(file.size / 1024).toFixed(1)} KB</div>
      `;
      
      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        progressFill.style.width = `${progress}%`;
        if (progress >= 90) {
          clearInterval(progressInterval);
        }
      }, 100);
      
      try {
        const resizedFile = await this.resizeImage(file);
        const reader = new FileReader();
        
        reader.onload = (e) => {
          clearInterval(progressInterval);
          progressFill.style.width = '100%';
          
          setTimeout(() => {
            progressBar.style.display = 'none';
            altInput.style.display = 'block';
            
            const preview = createElement('img', {
              src: e.target?.result as string,
              className: 'xeditor-image-preview'
            });
            
            content.insertBefore(preview, fileInfo);
            
            const buttonGroup = createElement('div', {
              className: 'xeditor-image-button-group'
            });
            
            const insertBtn = createElement('button', {
              className: 'xeditor-btn-primary'
            }, ['Insert Image']);
            
            const cancelBtn = createElement('button', {
              className: 'xeditor-btn-secondary'
            }, ['Cancel']);
            
            buttonGroup.appendChild(insertBtn);
            buttonGroup.appendChild(cancelBtn);
            
            insertBtn.addEventListener('click', () => {
              this.editor.selection.save();
              
              const overlay = content.closest('.xeditor-image-dialog-overlay');
              if (overlay) {
                document.body.removeChild(overlay);
              }
              
              setTimeout(() => {
                this.editor.selection.restore();
                this.uploadAndInsert(resizedFile, altInput.value);
              }, 50);
            });
            
            cancelBtn.addEventListener('click', () => {
              // Reset the dialog
              dropZone.style.display = 'block';
              altInput.style.display = 'none';
              fileInfo.style.display = 'none';
              progressBar.style.display = 'none';
              altInput.value = '';
              input.value = '';
              
              // Remove preview
              const preview = content.querySelector('.xeditor-image-preview');
              if (preview) preview.remove();
              
              // Remove button group
              const btnGroup = content.querySelector('.xeditor-image-button-group');
              if (btnGroup) btnGroup.remove();
            });
            
            content.appendChild(buttonGroup);
          }, 300);
        };
        
        reader.readAsDataURL(resizedFile);
      } catch (error) {
        clearInterval(progressInterval);
        this.options.onError!(error as Error);
        
        // Reset on error
        dropZone.style.display = 'block';
        fileInfo.style.display = 'none';
        progressBar.style.display = 'none';
      }
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file && this.validateFile(file)) {
        handleFile(file);
      }
    });

    content.appendChild(dropZone);
    content.appendChild(fileInfo);
    content.appendChild(progressBar);
    content.appendChild(altInput);

    return content;
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
      let src: string;
      
      if (this.options.onUpload) {
        src = await this.options.onUpload(file);
      } else {
        // Convert to data URL
        src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      
      this.insertImage(src, alt);
      
      // Emit event for image caption plugin
      this.editor.events.emit('imageInserted', { src, alt });
    } catch (error) {
      this.options.onError!(error as Error);
    }
  }

  private async resizeImage(file: File): Promise<File> {
    if (!this.options.autoResize) return file;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const { width, height } = img;
        const maxWidth = this.options.maxWidth!;
        const maxHeight = this.options.maxHeight!;
        
        let newWidth = width;
        let newHeight = height;
        
        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > maxWidth) {
            newWidth = maxWidth;
            newHeight = newWidth / aspectRatio;
          }
          
          if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
          }
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Failed to create blob'));
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

    if (this.options.maxWidth) {
      img.style.maxWidth = `${this.options.maxWidth}px`;
      img.style.width = '100%';
      img.style.height = 'auto';
    }

    this.editor.focus();
    this.editor.execCommand('insertHTML', img.outerHTML);
    
    // Emit event for image caption plugin
    setTimeout(() => {
      const insertedImg = this.editor.contentElement.querySelector(`img[src="${src}"]`);
      if (insertedImg) {
        this.editor.events.emit('imageInserted', insertedImg);
      }
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

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      /* Image Plugin Styles */
      .xeditor-image-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: xeditor-fadeIn 0.2s ease;
      }
      
      @keyframes xeditor-fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .xeditor-image-dialog {
        position: relative;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        width: 600px;
        max-width: 90vw;
        max-height: 85vh;
        overflow: hidden;
        animation: xeditor-slideUp 0.3s ease;
      }
      
      @keyframes xeditor-slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .xeditor-image-dialog h3 {
        margin: 0;
        padding: 24px 24px 20px;
        font-size: 20px;
        font-weight: 600;
        color: #1a1a1a;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .xeditor-image-dialog-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #9ca3af;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s ease;
      }
      
      .xeditor-image-dialog-close:hover {
        background-color: #f3f4f6;
        color: #4b5563;
      }
      
      /* Tabs */
      .xeditor-image-tabs {
        display: flex;
        gap: 8px;
        padding: 0 24px 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .xeditor-image-tab {
        padding: 10px 20px;
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .xeditor-image-tab:hover {
        background-color: #f9fafb;
        color: #374151;
      }
      
      .xeditor-image-tab.active {
        background-color: var(--xeditor-primary);
        color: white;
        border-color: var(--xeditor-primary);
      }
      
      /* Content areas */
      .xeditor-image-url-content,
      .xeditor-image-upload-content {
        padding: 24px;
        min-height: 300px;
      }
      
      /* URL Input */
      .xeditor-image-url-input,
      .xeditor-image-alt-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.2s ease;
        margin-bottom: 16px;
        box-sizing: border-box;
      }
      
      .xeditor-image-url-input:focus,
      .xeditor-image-alt-input:focus {
        outline: none;
        border-color: var(--xeditor-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      /* Upload Dropzone */
      .xeditor-image-dropzone {
        border: 2px dashed #d1d5db;
        border-radius: 12px;
        padding: 48px 24px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background-color: #f9fafb;
      }
      
      .xeditor-image-dropzone:hover {
        border-color: #9ca3af;
        background-color: #f3f4f6;
      }
      
      .xeditor-image-dropzone.dragover {
        border-color: var(--xeditor-primary);
        background-color: rgba(59, 130, 246, 0.05);
        transform: scale(1.02);
      }
      
      .xeditor-image-dropzone-icon {
        margin-bottom: 16px;
        color: #9ca3af;
      }
      
      .xeditor-image-dropzone h4 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #374151;
      }
      
      .xeditor-image-dropzone p {
        margin: 0 0 16px 0;
        color: #6b7280;
        font-size: 14px;
      }
      
      .xeditor-image-formats {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 16px;
      }
      
      /* File info */
      .xeditor-image-file-info {
        background-color: #f3f4f6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .xeditor-image-file-name {
        font-weight: 500;
        color: #374151;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 70%;
      }
      
      .xeditor-image-file-size {
        font-size: 12px;
        color: #6b7280;
      }
      
      /* Progress bar */
      .xeditor-image-progress {
        height: 4px;
        background-color: #e5e7eb;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 16px;
      }
      
      .xeditor-image-progress-fill {
        height: 100%;
        background-color: var(--xeditor-primary);
        width: 0;
        transition: width 0.3s ease;
      }
      
      /* Preview */
      .xeditor-image-preview {
        max-width: 100%;
        max-height: 200px;
        display: block;
        margin: 0 auto 16px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .xeditor-image-url-preview {
        background-color: #f3f4f6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        min-height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .xeditor-image-url-preview img {
        max-width: 100%;
        max-height: 150px;
        border-radius: 4px;
      }
      
      .xeditor-image-url-preview-loading {
        color: #6b7280;
        font-size: 14px;
      }
      
      /* Buttons */
      .xeditor-image-button-group {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }
      
      .xeditor-btn-primary,
      .xeditor-btn-secondary {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .xeditor-btn-primary {
        background-color: var(--xeditor-primary);
        color: white;
      }
      
      .xeditor-btn-primary:hover {
        background-color: var(--xeditor-primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }
      
      .xeditor-btn-secondary {
        background-color: #f3f4f6;
        color: #4b5563;
      }
      
      .xeditor-btn-secondary:hover {
        background-color: #e5e7eb;
      }
      
      /* Dark theme */
      [data-theme="dark"] .xeditor-image-dialog {
        background-color: #1f2937;
        color: #f9fafb;
      }
      
      [data-theme="dark"] .xeditor-image-dialog h3 {
        color: #f9fafb;
        border-bottom-color: #374151;
      }
      
      [data-theme="dark"] .xeditor-image-dialog-close {
        color: #6b7280;
      }
      
      [data-theme="dark"] .xeditor-image-dialog-close:hover {
        background-color: #374151;
        color: #9ca3af;
      }
      
      [data-theme="dark"] .xeditor-image-tabs {
        border-bottom-color: #374151;
      }
      
      [data-theme="dark"] .xeditor-image-tab {
        border-color: #374151;
        color: #9ca3af;
      }
      
      [data-theme="dark"] .xeditor-image-tab:hover {
        background-color: #374151;
        color: #e5e7eb;
      }
      
      [data-theme="dark"] .xeditor-image-url-input,
      [data-theme="dark"] .xeditor-image-alt-input {
        background-color: #374151;
        color: #f9fafb;
        border-color: #4b5563;
      }
      
      [data-theme="dark"] .xeditor-image-dropzone {
        background-color: #374151;
        border-color: #4b5563;
      }
      
      [data-theme="dark"] .xeditor-image-dropzone:hover {
        background-color: #4b5563;
        border-color: #6b7280;
      }
      
      [data-theme="dark"] .xeditor-image-dropzone h4 {
        color: #f3f4f6;
      }
      
      [data-theme="dark"] .xeditor-image-file-info {
        background-color: #374151;
      }
      
      [data-theme="dark"] .xeditor-image-url-preview {
        background-color: #374151;
      }
      
      [data-theme="dark"] .xeditor-btn-secondary {
        background-color: #374151;
        color: #e5e7eb;
      }
      
      [data-theme="dark"] .xeditor-btn-secondary:hover {
        background-color: #4b5563;
      }
      
      /* Responsive */
      @media (max-width: 600px) {
        .xeditor-image-dialog {
          width: 95vw;
          margin: 10px;
        }
        
        .xeditor-image-dropzone {
          padding: 32px 16px;
        }
        
        .xeditor-image-button-group {
          flex-direction: column;
        }
        
        .xeditor-btn-primary,
        .xeditor-btn-secondary {
          width: 100%;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}