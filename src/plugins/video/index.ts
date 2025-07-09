import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, addClass } from '../../utils/dom';

interface VideoConfig {
  allowedProviders?: string[];
  defaultWidth?: number;
  defaultHeight?: number;
  responsive?: boolean;
}

export class VideoPlugin implements Plugin {
  name = 'video';
  private editor!: Editor;
  private config: VideoConfig;

  toolbar: ToolbarItem[] = [];

  constructor(config: VideoConfig = {}) {
    this.config = {
      allowedProviders: config.allowedProviders || ['youtube', 'vimeo', 'dailymotion', 'facebook'],
      defaultWidth: config.defaultWidth || 560,
      defaultHeight: config.defaultHeight || 315,
      responsive: config.responsive !== false
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).showVideoDialog = this.showVideoDialog.bind(this);
    
    // Register commands
    this.editor.commands.register('insertVideo', {
      execute: (url: string) => this.insertVideo(url)
    });
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    // Cleanup if needed
  }

  private showVideoDialog(): void {
    const dialog = this.createVideoDialog();
    document.body.appendChild(dialog);
  }

  private createVideoDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-video-dialog-overlay'
    });

    const dialog = createElement('div', {
      className: 'xeditor-video-dialog'
    });

    const title = createElement('h3', {}, ['Insert Video']);

    const tabs = createElement('div', {
      className: 'xeditor-video-tabs'
    });

    const urlTab = createElement('button', {
      className: 'xeditor-video-tab active',
      type: 'button'
    }, ['URL']);

    const embedTab = createElement('button', {
      className: 'xeditor-video-tab',
      type: 'button'
    }, ['Embed Code']);

    tabs.appendChild(urlTab);
    tabs.appendChild(embedTab);

    // URL content
    const urlContent = this.createUrlContent();
    
    // Embed content
    const embedContent = this.createEmbedContent();
    embedContent.style.display = 'none';

    // Tab switching
    urlTab.addEventListener('click', () => {
      addClass(urlTab, 'active');
      embedTab.classList.remove('active');
      urlContent.style.display = 'block';
      embedContent.style.display = 'none';
    });

    embedTab.addEventListener('click', () => {
      addClass(embedTab, 'active');
      urlTab.classList.remove('active');
      embedContent.style.display = 'block';
      urlContent.style.display = 'none';
    });

    const closeBtn = createElement('button', {
      className: 'xeditor-video-dialog-close',
      type: 'button'
    }, ['×']);

    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(tabs);
    dialog.appendChild(urlContent);
    dialog.appendChild(embedContent);

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
      className: 'xeditor-video-url-content'
    });

    const input = createElement('input', {
      type: 'url',
      placeholder: 'Enter video URL (YouTube, Vimeo, etc.)',
      className: 'xeditor-video-url-input'
    }) as HTMLInputElement;

    const preview = createElement('div', {
      className: 'xeditor-video-preview'
    });

    const sizeOptions = createElement('div', {
      className: 'xeditor-video-size-options'
    });

    const responsiveCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'video-responsive',
      checked: this.config.responsive ? 'checked' : ''
    }) as HTMLInputElement;

    const responsiveLabel = createElement('label', {
      htmlFor: 'video-responsive'
    }, ['Responsive (auto-resize)']);

    sizeOptions.appendChild(responsiveCheckbox);
    sizeOptions.appendChild(responsiveLabel);

    const customSize = createElement('div', {
      className: 'xeditor-video-custom-size',
      style: this.config.responsive ? 'display: none' : ''
    });

    const widthInput = createElement('input', {
      type: 'number',
      placeholder: 'Width',
      value: String(this.config.defaultWidth),
      className: 'xeditor-video-size-input'
    }) as HTMLInputElement;

    const heightInput = createElement('input', {
      type: 'number',
      placeholder: 'Height',
      value: String(this.config.defaultHeight),
      className: 'xeditor-video-size-input'
    }) as HTMLInputElement;

    customSize.appendChild(widthInput);
    customSize.appendChild(createElement('span', {}, [' × ']));
    customSize.appendChild(heightInput);

    responsiveCheckbox.addEventListener('change', () => {
      customSize.style.display = responsiveCheckbox.checked ? 'none' : 'flex';
    });

    const insertBtn = createElement('button', {
      className: 'xeditor-video-insert-btn',
      type: 'button'
    }, ['Insert']);

    input.addEventListener('input', () => {
      const url = input.value;
      if (url) {
        const embedInfo = this.parseVideoUrl(url);
        if (embedInfo) {
          preview.innerHTML = `
            <div class="xeditor-video-preview-title">Preview</div>
            <div class="xeditor-video-preview-provider">${embedInfo.provider}</div>
            <div class="xeditor-video-preview-id">Video ID: ${embedInfo.id}</div>
          `;
        } else {
          preview.innerHTML = '<div class="xeditor-video-preview-error">Invalid video URL</div>';
        }
      } else {
        preview.innerHTML = '';
      }
    });

    insertBtn.addEventListener('click', () => {
      const url = input.value;
      if (url) {
        const options = {
          responsive: responsiveCheckbox.checked,
          width: parseInt(widthInput.value) || this.config.defaultWidth,
          height: parseInt(heightInput.value) || this.config.defaultHeight
        };
        
        this.insertVideoFromUrl(url, options);
        
        const overlay = content.closest('.xeditor-video-dialog-overlay');
        if (overlay) {
          document.body.removeChild(overlay);
        }
      }
    });

    content.appendChild(input);
    content.appendChild(preview);
    content.appendChild(sizeOptions);
    content.appendChild(customSize);
    content.appendChild(insertBtn);

    return content;
  }

  private createEmbedContent(): HTMLElement {
    const content = createElement('div', {
      className: 'xeditor-video-embed-content'
    });

    const textarea = createElement('textarea', {
      placeholder: 'Paste embed code here...',
      className: 'xeditor-video-embed-textarea'
    }) as HTMLTextAreaElement;

    const insertBtn = createElement('button', {
      className: 'xeditor-video-insert-btn',
      type: 'button'
    }, ['Insert']);

    insertBtn.addEventListener('click', () => {
      const embedCode = textarea.value;
      if (embedCode) {
        this.insertEmbedCode(embedCode);
        
        const overlay = content.closest('.xeditor-video-dialog-overlay');
        if (overlay) {
          document.body.removeChild(overlay);
        }
      }
    });

    content.appendChild(textarea);
    content.appendChild(insertBtn);

    return content;
  }

  private parseVideoUrl(url: string): { provider: string; id: string; embedUrl: string } | null {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (youtubeMatch) {
      return {
        provider: 'YouTube',
        id: youtubeMatch[1],
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`
      };
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return {
        provider: 'Vimeo',
        id: vimeoMatch[1],
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
      };
    }

    // Dailymotion
    const dailymotionMatch = url.match(/dailymotion\.com\/video\/([^_]+)/);
    if (dailymotionMatch) {
      return {
        provider: 'Dailymotion',
        id: dailymotionMatch[1],
        embedUrl: `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`
      };
    }

    return null;
  }

  private insertVideoFromUrl(url: string, options: any): void {
    const embedInfo = this.parseVideoUrl(url);
    if (!embedInfo) {
      alert('Invalid video URL');
      return;
    }

    let embedHtml: string;
    
    if (options.responsive) {
      embedHtml = `
        <div class="xeditor-video-wrapper">
          <iframe 
            src="${embedInfo.embedUrl}" 
            frameborder="0" 
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
          </iframe>
        </div>
      `;
    } else {
      embedHtml = `
        <iframe 
          src="${embedInfo.embedUrl}" 
          width="${options.width}" 
          height="${options.height}" 
          frameborder="0" 
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
        </iframe>
      `;
    }

    this.insertVideo(embedHtml);
  }

  private insertEmbedCode(embedCode: string): void {
    // Sanitize embed code (basic sanitization)
    const tempDiv = createElement('div');
    tempDiv.innerHTML = embedCode;
    
    const iframe = tempDiv.querySelector('iframe');
    if (iframe) {
      // Ensure it's from allowed providers
      const src = iframe.getAttribute('src') || '';
      let allowed = false;
      
      const allowedDomains = [
        'youtube.com', 'youtube-nocookie.com', 'youtu.be',
        'vimeo.com', 'player.vimeo.com',
        'dailymotion.com',
        'facebook.com'
      ];
      
      for (const domain of allowedDomains) {
        if (src.includes(domain)) {
          allowed = true;
          break;
        }
      }
      
      if (allowed) {
        // Add responsive wrapper if needed
        if (this.config.responsive && !iframe.closest('.xeditor-video-wrapper')) {
          const wrapper = createElement('div', {
            className: 'xeditor-video-wrapper'
          });
          wrapper.appendChild(iframe.cloneNode(true));
          this.insertVideo(wrapper.outerHTML);
        } else {
          this.insertVideo(iframe.outerHTML);
        }
      } else {
        alert('Video source not allowed');
      }
    } else {
      alert('Invalid embed code');
    }
  }

  private insertVideo(html: string): void {
    this.editor.focus();
    
    // Insert video
    this.editor.execCommand('insertHTML', html);
    
    // Add line break after video
    this.editor.execCommand('insertHTML', '<p><br></p>');
    
    this.editor.history.record();
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      /* Video wrapper for responsive videos */
      .xeditor-video-wrapper {
        position: relative;
        padding-bottom: 56.25%; /* 16:9 */
        height: 0;
        overflow: hidden;
        max-width: 100%;
        margin: 10px 0;
      }
      
      .xeditor-video-wrapper iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
      }
      
      /* Non-responsive video */
      .xeditor-content iframe {
        max-width: 100%;
        display: block;
        margin: 10px 0;
      }
      
      /* Video dialog */
      .xeditor-video-dialog-overlay {
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
      
      .xeditor-video-dialog {
        position: relative;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 500px;
        max-width: 90vw;
        padding: 20px;
      }
      
      .xeditor-video-dialog h3 {
        margin: 0 0 20px 0;
      }
      
      .xeditor-video-dialog-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      
      .xeditor-video-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid #ddd;
      }
      
      .xeditor-video-tab {
        padding: 10px 20px;
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        border-bottom: 2px solid transparent;
      }
      
      .xeditor-video-tab.active {
        color: var(--xeditor-primary);
        border-bottom-color: var(--xeditor-primary);
      }
      
      .xeditor-video-url-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 15px;
        font-size: 14px;
      }
      
      .xeditor-video-preview {
        background-color: #f5f5f5;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 15px;
        min-height: 60px;
      }
      
      .xeditor-video-preview-title {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .xeditor-video-preview-provider {
        color: #666;
        font-size: 14px;
      }
      
      .xeditor-video-preview-id {
        font-size: 12px;
        color: #999;
        margin-top: 5px;
      }
      
      .xeditor-video-preview-error {
        color: #f44336;
      }
      
      .xeditor-video-size-options {
        margin-bottom: 15px;
      }
      
      .xeditor-video-size-options label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      
      .xeditor-video-custom-size {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 10px;
      }
      
      .xeditor-video-size-input {
        width: 80px;
        padding: 6px;
        border: 1px solid #ddd;
        border-radius: 4px;
        text-align: center;
      }
      
      .xeditor-video-embed-textarea {
        width: 100%;
        height: 150px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 15px;
        font-family: monospace;
        font-size: 13px;
      }
      
      .xeditor-video-insert-btn {
        background-color: var(--xeditor-primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-video-insert-btn:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      /* Dark theme */
      [data-theme="dark"] .xeditor-video-dialog {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-video-url-input,
      [data-theme="dark"] .xeditor-video-embed-textarea,
      [data-theme="dark"] .xeditor-video-size-input {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-video-preview {
        background-color: #495057;
      }
    `;
    
    document.head.appendChild(style);
  }
}