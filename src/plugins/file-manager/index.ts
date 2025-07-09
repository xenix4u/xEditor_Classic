import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  url?: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  children?: FileItem[];
  lastModified?: Date;
}

interface FileManagerConfig {
  getFiles: (path?: string) => Promise<FileItem[]>;
  uploadFile?: (file: File, path?: string) => Promise<FileItem>;
  deleteFile?: (id: string) => Promise<boolean>;
  createFolder?: (name: string, path?: string) => Promise<FileItem>;
  acceptedTypes?: string[];
  maxFileSize?: number;
  enableUpload?: boolean;
  enableDelete?: boolean;
  enableFolders?: boolean;
  viewMode?: 'grid' | 'list';
}

export class FileManagerPlugin implements Plugin {
  name = 'file-manager';
  private editor!: Editor;
  private config: FileManagerConfig;
  private dialog?: HTMLElement;
  private currentPath: string[] = [];
  private selectedFile?: FileItem;
  private viewMode: 'grid' | 'list';

  toolbar: ToolbarItem[] = [];

  constructor(config: FileManagerConfig) {
    this.config = {
      enableUpload: config.enableUpload !== false,
      enableDelete: config.enableDelete !== false,
      enableFolders: config.enableFolders !== false,
      viewMode: config.viewMode || 'grid',
      acceptedTypes: config.acceptedTypes || ['image/*', 'video/*', 'audio/*', '.pdf', '.doc', '.docx'],
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB default
      ...config
    };
    this.viewMode = this.config.viewMode!;
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make method available
    (this as any).showFileManager = this.showFileManager.bind(this);
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
  }

  private async showFileManager(): Promise<void> {
    if (this.dialog) {
      this.dialog.remove();
    }
    
    this.dialog = await this.createFileManagerDialog();
    document.body.appendChild(this.dialog);
  }

  private async createFileManagerDialog(): Promise<HTMLElement> {
    const overlay = createElement('div', {
      className: 'xeditor-filemanager-overlay'
    });

    const dialog = createElement('div', {
      className: 'xeditor-filemanager-dialog'
    });

    // Header
    const header = this.createHeader();
    dialog.appendChild(header);

    // Toolbar
    const toolbar = this.createToolbar();
    dialog.appendChild(toolbar);

    // Breadcrumb
    const breadcrumb = this.createBreadcrumb();
    dialog.appendChild(breadcrumb);

    // Content area
    const content = createElement('div', {
      className: 'xeditor-filemanager-content'
    });

    // Load initial files
    try {
      const files = await this.config.getFiles(this.getCurrentPath());
      this.renderFiles(content, files);
    } catch (error) {
      this.showError(content, 'Failed to load files');
    }

    dialog.appendChild(content);

    // Footer
    const footer = this.createFooter();
    dialog.appendChild(footer);

    overlay.appendChild(dialog);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    return overlay;
  }

  private createHeader(): HTMLElement {
    const header = createElement('div', {
      className: 'xeditor-filemanager-header'
    });

    const title = createElement('h3', {}, ['File Manager']);

    const closeBtn = createElement('button', {
      className: 'xeditor-filemanager-close',
      type: 'button',
      'aria-label': 'Close'
    }, ['×']);

    closeBtn.addEventListener('click', () => {
      this.dialog?.remove();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    return header;
  }

  private createToolbar(): HTMLElement {
    const toolbar = createElement('div', {
      className: 'xeditor-filemanager-toolbar'
    });

    // Upload button
    if (this.config.enableUpload) {
      const uploadBtn = createElement('button', {
        className: 'xeditor-filemanager-btn',
        type: 'button'
      }, ['📤 Upload']);

      uploadBtn.addEventListener('click', () => {
        this.showUploadDialog();
      });

      toolbar.appendChild(uploadBtn);
    }

    // Create folder button
    if (this.config.enableFolders && this.config.createFolder) {
      const folderBtn = createElement('button', {
        className: 'xeditor-filemanager-btn',
        type: 'button'
      }, ['📁 New Folder']);

      folderBtn.addEventListener('click', () => {
        this.createNewFolder();
      });

      toolbar.appendChild(folderBtn);
    }

    // View mode toggle
    const viewToggle = createElement('div', {
      className: 'xeditor-filemanager-view-toggle'
    });

    const gridBtn = createElement('button', {
      className: `xeditor-filemanager-view-btn ${this.viewMode === 'grid' ? 'active' : ''}`,
      type: 'button',
      'aria-label': 'Grid view'
    }, ['⊞']);

    const listBtn = createElement('button', {
      className: `xeditor-filemanager-view-btn ${this.viewMode === 'list' ? 'active' : ''}`,
      type: 'button',
      'aria-label': 'List view'
    }, ['☰']);

    gridBtn.addEventListener('click', () => {
      this.setViewMode('grid');
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
    });

    listBtn.addEventListener('click', () => {
      this.setViewMode('list');
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
    });

    viewToggle.appendChild(gridBtn);
    viewToggle.appendChild(listBtn);
    toolbar.appendChild(viewToggle);

    return toolbar;
  }

  private createBreadcrumb(): HTMLElement {
    const breadcrumb = createElement('div', {
      className: 'xeditor-filemanager-breadcrumb'
    });

    this.updateBreadcrumb(breadcrumb);

    return breadcrumb;
  }

  private updateBreadcrumb(container: HTMLElement): void {
    container.innerHTML = '';

    // Root
    const rootLink = createElement('a', {
      href: '#',
      className: 'xeditor-filemanager-breadcrumb-item'
    }, ['Home']);

    rootLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateToPath([]);
    });

    container.appendChild(rootLink);

    // Path items
    this.currentPath.forEach((folder, index) => {
      const separator = createElement('span', {
        className: 'xeditor-filemanager-breadcrumb-separator'
      }, [' / ']);
      container.appendChild(separator);

      const link = createElement('a', {
        href: '#',
        className: 'xeditor-filemanager-breadcrumb-item'
      }, [folder]);

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPath(this.currentPath.slice(0, index + 1));
      });

      container.appendChild(link);
    });
  }

  private createFooter(): HTMLElement {
    const footer = createElement('div', {
      className: 'xeditor-filemanager-footer'
    });

    const info = createElement('div', {
      className: 'xeditor-filemanager-info'
    });

    const cancelBtn = createElement('button', {
      className: 'xeditor-filemanager-btn xeditor-filemanager-btn--secondary',
      type: 'button'
    }, ['Cancel']);

    const insertBtn = createElement('button', {
      className: 'xeditor-filemanager-btn xeditor-filemanager-btn--primary',
      type: 'button',
      disabled: 'disabled'
    }, ['Insert']);

    cancelBtn.addEventListener('click', () => {
      this.dialog?.remove();
    });

    insertBtn.addEventListener('click', () => {
      if (this.selectedFile) {
        this.insertFile(this.selectedFile);
        this.dialog?.remove();
      }
    });

    footer.appendChild(info);
    footer.appendChild(cancelBtn);
    footer.appendChild(insertBtn);

    return footer;
  }

  private renderFiles(container: HTMLElement, files: FileItem[]): void {
    container.innerHTML = '';

    const filesContainer = createElement('div', {
      className: `xeditor-filemanager-files xeditor-filemanager-files--${this.viewMode}`
    });

    files.forEach(file => {
      const fileElement = this.createFileElement(file);
      filesContainer.appendChild(fileElement);
    });

    container.appendChild(filesContainer);
  }

  private createFileElement(file: FileItem): HTMLElement {
    const element = createElement('div', {
      className: `xeditor-filemanager-file xeditor-filemanager-file--${file.type}`,
      'data-id': file.id
    });

    if (this.viewMode === 'grid') {
      // Thumbnail or icon
      const preview = createElement('div', {
        className: 'xeditor-filemanager-file-preview'
      });

      if (file.thumbnail) {
        const img = createElement('img', {
          src: file.thumbnail,
          alt: file.name
        }) as HTMLImageElement;
        preview.appendChild(img);
      } else {
        const icon = this.getFileIcon(file);
        preview.innerHTML = icon;
      }

      // Name
      const name = createElement('div', {
        className: 'xeditor-filemanager-file-name'
      }, [file.name]);

      element.appendChild(preview);
      element.appendChild(name);
    } else {
      // List view
      const icon = createElement('span', {
        className: 'xeditor-filemanager-file-icon'
      });
      icon.innerHTML = this.getFileIcon(file);

      const name = createElement('span', {
        className: 'xeditor-filemanager-file-name'
      }, [file.name]);

      const size = createElement('span', {
        className: 'xeditor-filemanager-file-size'
      }, [file.size ? this.formatFileSize(file.size) : '-']);

      const date = createElement('span', {
        className: 'xeditor-filemanager-file-date'
      }, [file.lastModified ? this.formatDate(file.lastModified) : '-']);

      element.appendChild(icon);
      element.appendChild(name);
      element.appendChild(size);
      element.appendChild(date);
    }

    // Click handler
    element.addEventListener('click', () => {
      if (file.type === 'folder') {
        this.openFolder(file);
      } else {
        this.selectFile(file);
      }
    });

    // Double click for folders
    if (file.type === 'file') {
      element.addEventListener('dblclick', () => {
        this.insertFile(file);
        this.dialog?.remove();
      });
    }

    // Context menu
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, file);
    });

    return element;
  }

  private getFileIcon(file: FileItem): string {
    if (file.type === 'folder') {
      return '📁';
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.mimeType || '';

    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📈';
      case 'zip':
      case 'rar': return '🗜️';
      default: return '📎';
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  private getCurrentPath(): string {
    return this.currentPath.join('/');
  }

  private async navigateToPath(path: string[]): Promise<void> {
    this.currentPath = path;
    
    const breadcrumb = this.dialog?.querySelector('.xeditor-filemanager-breadcrumb');
    if (breadcrumb) {
      this.updateBreadcrumb(breadcrumb as HTMLElement);
    }

    const content = this.dialog?.querySelector('.xeditor-filemanager-content');
    if (content) {
      try {
        const files = await this.config.getFiles(this.getCurrentPath());
        this.renderFiles(content as HTMLElement, files);
      } catch (error) {
        this.showError(content as HTMLElement, 'Failed to load files');
      }
    }
  }

  private openFolder(folder: FileItem): void {
    this.currentPath.push(folder.name);
    this.navigateToPath(this.currentPath);
  }

  private selectFile(file: FileItem): void {
    // Remove previous selection
    this.dialog?.querySelectorAll('.xeditor-filemanager-file--selected').forEach(el => {
      el.classList.remove('xeditor-filemanager-file--selected');
    });

    // Add selection
    const element = this.dialog?.querySelector(`[data-id="${file.id}"]`);
    element?.classList.add('xeditor-filemanager-file--selected');

    this.selectedFile = file;

    // Enable insert button
    const insertBtn = this.dialog?.querySelector('.xeditor-filemanager-btn--primary') as HTMLButtonElement;
    if (insertBtn) {
      insertBtn.disabled = false;
    }

    // Update info
    const info = this.dialog?.querySelector('.xeditor-filemanager-info');
    if (info) {
      info.textContent = `Selected: ${file.name} (${file.size ? this.formatFileSize(file.size) : 'Unknown size'})`;
    }
  }

  private insertFile(file: FileItem): void {
    if (!file.url) return;

    const mimeType = file.mimeType || '';
    
    if (mimeType.startsWith('image/')) {
      this.editor.execCommand('insertImage', file.url);
    } else if (mimeType.startsWith('video/')) {
      const videoPlugin = this.editor.plugins.get('video');
      if (videoPlugin && typeof (videoPlugin as any).insertVideo === 'function') {
        (videoPlugin as any).insertVideo(file.url);
      } else {
        // Fallback
        const video = `<video controls src="${file.url}"></video>`;
        this.editor.execCommand('insertHTML', video);
      }
    } else {
      // Insert as link
      const link = `<a href="${file.url}" download="${file.name}">${file.name}</a>`;
      this.editor.execCommand('insertHTML', link);
    }
  }

  private setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    
    const content = this.dialog?.querySelector('.xeditor-filemanager-content');
    if (content) {
      const filesContainer = content.querySelector('.xeditor-filemanager-files');
      if (filesContainer) {
        filesContainer.className = `xeditor-filemanager-files xeditor-filemanager-files--${mode}`;
        
        // Re-render files in new view mode
        Array.from(filesContainer.children).map(el => {
          return {
            id: el.getAttribute('data-id') || '',
            name: el.querySelector('.xeditor-filemanager-file-name')?.textContent || '',
            type: el.classList.contains('xeditor-filemanager-file--folder') ? 'folder' : 'file'
          } as FileItem;
        });
        
        // This is a simplified re-render. In real implementation, 
        // you'd want to preserve the full file data
      }
    }
  }

  private async showUploadDialog(): Promise<void> {
    const input = createElement('input', {
      type: 'file',
      multiple: 'multiple'
    }) as HTMLInputElement;
    
    if (this.config.acceptedTypes) {
      input.accept = this.config.acceptedTypes.join(',');
    }

    input.addEventListener('change', async () => {
      if (input.files) {
        const files = Array.from(input.files);
        for (const file of files) {
          await this.uploadFile(file);
        }
      }
    });

    input.click();
  }

  private async uploadFile(file: File): Promise<void> {
    // Check file size
    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      alert(`File "${file.name}" exceeds maximum size limit of ${this.formatFileSize(this.config.maxFileSize)}`);
      return;
    }

    if (!this.config.uploadFile) {
      alert('Upload functionality is not configured');
      return;
    }

    try {
      // Show progress
      const progressDialog = this.showUploadProgress(file.name);

      const uploadedFile = await this.config.uploadFile(file, this.getCurrentPath());
      
      progressDialog.remove();

      // Refresh file list
      await this.navigateToPath(this.currentPath);

      // Select uploaded file
      this.selectFile(uploadedFile);
    } catch (error) {
      alert(`Failed to upload ${file.name}`);
    }
  }

  private showUploadProgress(fileName: string): HTMLElement {
    const dialog = createElement('div', {
      className: 'xeditor-filemanager-progress'
    });

    dialog.innerHTML = `
      <div class="xeditor-filemanager-progress-content">
        <div class="xeditor-filemanager-progress-text">Uploading ${fileName}...</div>
        <div class="xeditor-filemanager-progress-bar">
          <div class="xeditor-filemanager-progress-fill"></div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    return dialog;
  }

  private async createNewFolder(): Promise<void> {
    const name = prompt('Enter folder name:');
    if (!name || !this.config.createFolder) return;

    try {
      await this.config.createFolder(name, this.getCurrentPath());
      await this.navigateToPath(this.currentPath);
    } catch (error) {
      alert('Failed to create folder');
    }
  }

  private showContextMenu(event: MouseEvent, file: FileItem): void {
    // Remove existing context menu
    document.querySelector('.xeditor-filemanager-contextmenu')?.remove();

    const menu = createElement('div', {
      className: 'xeditor-filemanager-contextmenu'
    });

    // Insert option
    const insertOption = createElement('div', {
      className: 'xeditor-filemanager-contextmenu-item'
    }, ['Insert']);
    
    insertOption.addEventListener('click', () => {
      this.insertFile(file);
      menu.remove();
      this.dialog?.remove();
    });

    menu.appendChild(insertOption);

    // Delete option
    if (this.config.enableDelete && this.config.deleteFile) {
      const deleteOption = createElement('div', {
        className: 'xeditor-filemanager-contextmenu-item xeditor-filemanager-contextmenu-item--danger'
      }, ['Delete']);
      
      deleteOption.addEventListener('click', async () => {
        if (confirm(`Delete "${file.name}"?`)) {
          try {
            await this.config.deleteFile!(file.id);
            await this.navigateToPath(this.currentPath);
          } catch (error) {
            alert('Failed to delete file');
          }
        }
        menu.remove();
      });

      menu.appendChild(deleteOption);
    }

    // Position menu
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;

    document.body.appendChild(menu);

    // Remove on click outside
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  }

  private showError(container: HTMLElement, message: string): void {
    container.innerHTML = `
      <div class="xeditor-filemanager-error">
        <div class="xeditor-filemanager-error-icon">⚠️</div>
        <div class="xeditor-filemanager-error-message">${message}</div>
      </div>
    `;
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-filemanager-overlay {
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
      }
      
      .xeditor-filemanager-dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 800px;
        max-width: 90vw;
        height: 600px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      
      .xeditor-filemanager-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .xeditor-filemanager-header h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .xeditor-filemanager-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .xeditor-filemanager-close:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-filemanager-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .xeditor-filemanager-btn {
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .xeditor-filemanager-btn:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-filemanager-btn--primary {
        background-color: var(--xeditor-primary);
        color: white;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-filemanager-btn--primary:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      .xeditor-filemanager-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .xeditor-filemanager-view-toggle {
        margin-left: auto;
        display: flex;
        gap: 4px;
      }
      
      .xeditor-filemanager-view-btn {
        padding: 4px 8px;
        border: 1px solid #ddd;
        background: white;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .xeditor-filemanager-view-btn:first-child {
        border-radius: 4px 0 0 4px;
      }
      
      .xeditor-filemanager-view-btn:last-child {
        border-radius: 0 4px 4px 0;
        border-left: none;
      }
      
      .xeditor-filemanager-view-btn.active {
        background-color: var(--xeditor-primary);
        color: white;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-filemanager-breadcrumb {
        padding: 8px 20px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e0e0e0;
        font-size: 14px;
      }
      
      .xeditor-filemanager-breadcrumb-item {
        color: var(--xeditor-primary);
        text-decoration: none;
      }
      
      .xeditor-filemanager-breadcrumb-item:hover {
        text-decoration: underline;
      }
      
      .xeditor-filemanager-breadcrumb-separator {
        color: #666;
        margin: 0 4px;
      }
      
      .xeditor-filemanager-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .xeditor-filemanager-files--grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 16px;
      }
      
      .xeditor-filemanager-files--list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .xeditor-filemanager-file {
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
        position: relative;
      }
      
      .xeditor-filemanager-files--grid .xeditor-filemanager-file {
        padding: 12px;
        text-align: center;
        border: 2px solid transparent;
      }
      
      .xeditor-filemanager-files--grid .xeditor-filemanager-file:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-filemanager-files--grid .xeditor-filemanager-file--selected {
        border-color: var(--xeditor-primary);
        background-color: #e3f2fd;
      }
      
      .xeditor-filemanager-files--list .xeditor-filemanager-file {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border: 1px solid transparent;
      }
      
      .xeditor-filemanager-files--list .xeditor-filemanager-file:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-filemanager-files--list .xeditor-filemanager-file--selected {
        background-color: #e3f2fd;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-filemanager-file-preview {
        width: 80px;
        height: 80px;
        margin: 0 auto 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        border-radius: 4px;
        overflow: hidden;
        background-color: #f8f9fa;
      }
      
      .xeditor-filemanager-file-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .xeditor-filemanager-file-name {
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .xeditor-filemanager-files--list .xeditor-filemanager-file-icon {
        font-size: 24px;
        margin-right: 12px;
      }
      
      .xeditor-filemanager-files--list .xeditor-filemanager-file-name {
        flex: 1;
        font-size: 14px;
      }
      
      .xeditor-filemanager-files--list .xeditor-filemanager-file-size,
      .xeditor-filemanager-files--list .xeditor-filemanager-file-date {
        font-size: 12px;
        color: #666;
        margin-left: 12px;
      }
      
      .xeditor-filemanager-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-top: 1px solid #e0e0e0;
      }
      
      .xeditor-filemanager-info {
        font-size: 14px;
        color: #666;
      }
      
      .xeditor-filemanager-progress {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10001;
      }
      
      .xeditor-filemanager-progress-bar {
        width: 200px;
        height: 4px;
        background-color: #e0e0e0;
        border-radius: 2px;
        margin-top: 12px;
        overflow: hidden;
      }
      
      .xeditor-filemanager-progress-fill {
        height: 100%;
        background-color: var(--xeditor-primary);
        width: 0;
        animation: progress 2s ease-in-out infinite;
      }
      
      @keyframes progress {
        0% { width: 0; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
      
      .xeditor-filemanager-contextmenu {
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 10002;
        overflow: hidden;
      }
      
      .xeditor-filemanager-contextmenu-item {
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      
      .xeditor-filemanager-contextmenu-item:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-filemanager-contextmenu-item--danger {
        color: #f44336;
      }
      
      .xeditor-filemanager-error {
        text-align: center;
        padding: 40px;
      }
      
      .xeditor-filemanager-error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .xeditor-filemanager-error-message {
        font-size: 16px;
        color: #666;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-filemanager-dialog {
        background: #2d2d2d;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-filemanager-header,
      [data-theme="dark"] .xeditor-filemanager-toolbar,
      [data-theme="dark"] .xeditor-filemanager-breadcrumb,
      [data-theme="dark"] .xeditor-filemanager-footer {
        border-color: #444;
      }
      
      [data-theme="dark"] .xeditor-filemanager-breadcrumb {
        background-color: #3d3d3d;
      }
      
      [data-theme="dark"] .xeditor-filemanager-btn {
        background: #3d3d3d;
        border-color: #555;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-filemanager-btn:hover {
        background-color: #444;
      }
      
      [data-theme="dark"] .xeditor-filemanager-close:hover {
        background-color: #444;
      }
      
      [data-theme="dark"] .xeditor-filemanager-file-preview {
        background-color: #3d3d3d;
      }
      
      [data-theme="dark"] .xeditor-filemanager-file:hover {
        background-color: #444;
      }
      
      [data-theme="dark"] .xeditor-filemanager-file--selected {
        background-color: #1976d2;
      }
      
      [data-theme="dark"] .xeditor-filemanager-contextmenu {
        background: #3d3d3d;
        border-color: #555;
      }
      
      [data-theme="dark"] .xeditor-filemanager-contextmenu-item:hover {
        background-color: #444;
      }
    `;
    
    document.head.appendChild(style);
  }
}