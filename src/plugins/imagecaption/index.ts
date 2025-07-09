import { Plugin, Editor } from '../../types';
import { createElement, addClass, removeClass, findParentElement } from '../../utils/dom';

interface ImageCaptionConfig {
  defaultCaption?: string;
  captionPosition?: 'top' | 'bottom';
  showCaptionOnHover?: boolean;
}

export class ImageCaptionPlugin implements Plugin {
  name = 'imagecaption';
  private editor!: Editor;
  private config: ImageCaptionConfig;
  private selectedImage: HTMLImageElement | null = null;

  constructor(config: ImageCaptionConfig = {}) {
    this.config = {
      defaultCaption: config.defaultCaption || 'Image caption',
      captionPosition: config.captionPosition || 'bottom',
      showCaptionOnHover: config.showCaptionOnHover || false
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Add styles
    this.addStyles();
    
    // Process existing images
    this.processExistingImages();
    
    // Add event listeners
    this.addEventListeners();
    
    // Register commands
    this.editor.commands.register('addImageCaption', {
      execute: () => this.showCaptionDialog()
    });
  }

  destroy(): void {
    this.editor.contentElement.removeEventListener('click', this.handleClick);
    this.editor.contentElement.removeEventListener('paste', this.handlePaste);
  }

  private processExistingImages(): void {
    const images = this.editor.contentElement.querySelectorAll('img');
    images.forEach(img => {
      if (!img.closest('.xeditor-image-wrapper')) {
        this.wrapImage(img as HTMLImageElement);
      }
    });
  }

  private wrapImage(img: HTMLImageElement): void {
    const wrapper = createElement('figure', {
      className: 'xeditor-image-wrapper',
      contentEditable: 'false'
    });
    
    // Clone image to preserve attributes
    const imgClone = img.cloneNode(true) as HTMLImageElement;
    imgClone.setAttribute('contentEditable', 'false');
    
    // Check if image already has a caption in its alt or title
    const existingCaption = img.getAttribute('alt') || img.getAttribute('title');
    
    const caption = createElement('figcaption', {
      className: 'xeditor-image-caption',
      contentEditable: 'true'
    }, [existingCaption || this.config.defaultCaption || '']);
    
    wrapper.appendChild(imgClone);
    
    if (this.config.captionPosition === 'top') {
      wrapper.insertBefore(caption, imgClone);
    } else {
      wrapper.appendChild(caption);
    }
    
    // Replace original image with wrapper
    img.parentNode?.replaceChild(wrapper, img);
    
    // Prevent caption from affecting editor content when clicked
    caption.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Handle caption editing
    caption.addEventListener('blur', () => {
      if (!caption.textContent?.trim()) {
        caption.textContent = this.config.defaultCaption || '';
      }
      this.editor.history.record();
    });
    
    // Handle Enter key in caption
    caption.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        caption.blur();
        
        // Move cursor after the figure
        const range = document.createRange();
        const selection = window.getSelection();
        
        // Create a paragraph after the figure if needed
        let nextElement = wrapper.nextElementSibling;
        if (!nextElement || nextElement.tagName === 'FIGURE') {
          const p = createElement('p');
          p.innerHTML = '<br>';
          wrapper.parentNode?.insertBefore(p, wrapper.nextSibling);
          nextElement = p;
        }
        
        range.setStart(nextElement, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
  }

  private addEventListeners(): void {
    // Handle clicks on images
    this.editor.contentElement.addEventListener('click', this.handleClick);
    
    // Handle paste events to wrap pasted images
    this.editor.contentElement.addEventListener('paste', this.handlePaste);
    
    // Handle image insertion
    this.editor.events.on('imageInserted', (img: HTMLImageElement) => {
      if (!img.closest('.xeditor-image-wrapper')) {
        this.wrapImage(img);
      }
    });
  }

  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    
    // Check if clicked on an image
    if (target.tagName === 'IMG') {
      this.selectedImage = target as HTMLImageElement;
      
      // Show caption controls if configured
      if (!this.config.showCaptionOnHover) {
        const wrapper = target.closest('.xeditor-image-wrapper');
        if (wrapper) {
          const caption = wrapper.querySelector('.xeditor-image-caption');
          if (caption) {
            addClass(caption as HTMLElement, 'xeditor-image-caption--visible');
          }
        }
      }
    } else {
      // Hide all captions when clicking elsewhere
      if (!this.config.showCaptionOnHover) {
        const captions = this.editor.contentElement.querySelectorAll('.xeditor-image-caption--visible');
        captions.forEach(caption => {
          removeClass(caption as HTMLElement, 'xeditor-image-caption--visible');
        });
      }
      this.selectedImage = null;
    }
  };

  private handlePaste = (_e: ClipboardEvent): void => {
    // Give time for the paste to complete
    setTimeout(() => {
      this.processExistingImages();
    }, 100);
  };

  private showCaptionDialog(): void {
    if (!this.selectedImage) {
      // Find first image in selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const img = findParentElement(container, el => el.tagName === 'IMG') ||
                   (container as Element).querySelector?.('img');
        
        if (img) {
          this.selectedImage = img as HTMLImageElement;
        }
      }
    }
    
    if (!this.selectedImage) {
      alert('Please select an image first');
      return;
    }
    
    const wrapper = this.selectedImage.closest('.xeditor-image-wrapper');
    if (wrapper) {
      const caption = wrapper.querySelector('.xeditor-image-caption') as HTMLElement;
      if (caption) {
        caption.focus();
        
        // Select all text in caption
        const range = document.createRange();
        range.selectNodeContents(caption);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-image-wrapper {
        display: inline-block;
        max-width: 100%;
        margin: 1em 0;
        text-align: center;
        position: relative;
      }
      
      .xeditor-image-wrapper img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      
      .xeditor-image-caption {
        display: block;
        width: 100%;
        padding: 0.5em;
        font-size: 0.9em;
        color: #666;
        text-align: center;
        font-style: italic;
        background-color: rgba(0, 0, 0, 0.05);
        border: 1px solid transparent;
        transition: all 0.3s ease;
        outline: none;
      }
      
      .xeditor-image-caption:focus {
        background-color: rgba(0, 0, 0, 0.1);
        border-color: var(--xeditor-primary);
        color: #333;
      }
      
      .xeditor-image-caption:empty:before {
        content: attr(data-placeholder);
        color: #999;
      }
      
      /* Hide caption by default if showCaptionOnHover is false */
      ${!this.config.showCaptionOnHover ? `
        .xeditor-image-caption {
          opacity: 0;
          visibility: hidden;
        }
        
        .xeditor-image-caption--visible,
        .xeditor-image-caption:focus {
          opacity: 1;
          visibility: visible;
        }
      ` : ''}
      
      /* Show on hover if configured */
      ${this.config.showCaptionOnHover ? `
        .xeditor-image-wrapper:hover .xeditor-image-caption {
          background-color: rgba(0, 0, 0, 0.1);
        }
      ` : ''}
      
      /* Dark theme */
      [data-theme="dark"] .xeditor-image-caption {
        background-color: rgba(255, 255, 255, 0.05);
        color: #ccc;
      }
      
      [data-theme="dark"] .xeditor-image-caption:focus {
        background-color: rgba(255, 255, 255, 0.1);
        color: #f8f9fa;
      }
      
      /* Caption position */
      ${this.config.captionPosition === 'top' ? `
        .xeditor-image-wrapper {
          display: flex;
          flex-direction: column;
        }
        
        .xeditor-image-caption {
          order: -1;
          margin-bottom: 0.5em;
        }
      ` : ''}
      
      /* Responsive */
      @media (max-width: 768px) {
        .xeditor-image-wrapper {
          margin: 0.5em 0;
        }
        
        .xeditor-image-caption {
          font-size: 0.85em;
          padding: 0.3em;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}