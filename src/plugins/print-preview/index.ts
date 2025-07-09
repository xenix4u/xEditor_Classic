import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface PrintPreviewConfig {
  pageSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  showPageNumbers?: boolean;
  showHeaders?: boolean;
  headerText?: string;
  footerText?: string;
  showTableOfContents?: boolean;
  watermark?: {
    text?: string;
    image?: string;
    opacity?: number;
  };
  pageBreaks?: boolean;
  zoom?: number;
}

export class PrintPreviewPlugin implements Plugin {
  name = 'print-preview';
  private editor!: Editor;
  private config: PrintPreviewConfig;
  private dialog?: HTMLElement;

  toolbar: ToolbarItem[] = [];

  constructor(config: PrintPreviewConfig = {}) {
    this.config = {
      pageSize: config.pageSize || 'A4',
      orientation: config.orientation || 'portrait',
      margins: {
        top: config.margins?.top || '2cm',
        right: config.margins?.right || '2cm',
        bottom: config.margins?.bottom || '2cm',
        left: config.margins?.left || '2cm'
      },
      showPageNumbers: config.showPageNumbers !== false,
      showHeaders: config.showHeaders !== false,
      headerText: config.headerText || document.title,
      footerText: config.footerText || '',
      showTableOfContents: config.showTableOfContents || false,
      watermark: config.watermark,
      pageBreaks: config.pageBreaks !== false,
      zoom: config.zoom || 100,
      ...config
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Override default print command
    this.editor.commands.register('print', {
      execute: () => this.showPrintPreview()
    });
    
    // Make method available
    (this as any).showPrintPreview = this.showPrintPreview.bind(this);
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
  }

  private showPrintPreview(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
    
    this.dialog = this.createPreviewDialog();
    document.body.appendChild(this.dialog);
  }

  private createPreviewDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-printpreview-overlay'
    });

    const dialog = createElement('div', {
      className: 'xeditor-printpreview-dialog'
    });

    // Header
    const header = this.createHeader();
    dialog.appendChild(header);

    // Settings bar
    const settingsBar = this.createSettingsBar();
    dialog.appendChild(settingsBar);

    // Preview container
    const previewContainer = createElement('div', {
      className: 'xeditor-printpreview-container'
    });

    const previewContent = this.createPreviewContent();
    previewContainer.appendChild(previewContent);

    dialog.appendChild(previewContainer);

    overlay.appendChild(dialog);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Close on escape
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
      }
    });

    return overlay;
  }

  private createHeader(): HTMLElement {
    const header = createElement('div', {
      className: 'xeditor-printpreview-header'
    });

    const title = createElement('h3', {}, ['Print Preview']);

    const actions = createElement('div', {
      className: 'xeditor-printpreview-actions'
    });

    const printBtn = createElement('button', {
      className: 'xeditor-printpreview-btn xeditor-printpreview-btn--primary',
      type: 'button'
    }, ['🖨️ Print']);

    const downloadBtn = createElement('button', {
      className: 'xeditor-printpreview-btn',
      type: 'button'
    }, ['⬇ Download PDF']);

    const closeBtn = createElement('button', {
      className: 'xeditor-printpreview-close',
      type: 'button',
      'aria-label': 'Close'
    }, ['×']);

    printBtn.addEventListener('click', () => {
      this.print();
    });

    downloadBtn.addEventListener('click', () => {
      this.downloadPDF();
    });

    closeBtn.addEventListener('click', () => {
      this.dialog?.remove();
    });

    actions.appendChild(printBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(actions);

    return header;
  }

  private createSettingsBar(): HTMLElement {
    const settingsBar = createElement('div', {
      className: 'xeditor-printpreview-settings'
    });

    // Page size
    const pageSizeGroup = createElement('div', {
      className: 'xeditor-printpreview-setting-group'
    });

    const pageSizeLabel = createElement('label', {}, ['Page Size:']);
    const pageSizeSelect = createElement('select', {
      className: 'xeditor-printpreview-select'
    }) as HTMLSelectElement;

    ['A4', 'Letter', 'Legal'].forEach(size => {
      const option = createElement('option', {
        value: size
      }, [size]);
      if (size === this.config.pageSize) {
        (option as HTMLOptionElement).selected = true;
      }
      pageSizeSelect.appendChild(option);
    });

    pageSizeSelect.addEventListener('change', () => {
      this.config.pageSize = pageSizeSelect.value as any;
      this.updatePreview();
    });

    pageSizeGroup.appendChild(pageSizeLabel);
    pageSizeGroup.appendChild(pageSizeSelect);

    // Orientation
    const orientationGroup = createElement('div', {
      className: 'xeditor-printpreview-setting-group'
    });

    const orientationLabel = createElement('label', {}, ['Orientation:']);
    const orientationSelect = createElement('select', {
      className: 'xeditor-printpreview-select'
    }) as HTMLSelectElement;

    ['portrait', 'landscape'].forEach(orientation => {
      const option = createElement('option', {
        value: orientation
      }, [orientation.charAt(0).toUpperCase() + orientation.slice(1)]);
      if (orientation === this.config.orientation) {
        (option as HTMLOptionElement).selected = true;
      }
      orientationSelect.appendChild(option);
    });

    orientationSelect.addEventListener('change', () => {
      this.config.orientation = orientationSelect.value as any;
      this.updatePreview();
    });

    orientationGroup.appendChild(orientationLabel);
    orientationGroup.appendChild(orientationSelect);

    // Margins
    const marginsGroup = createElement('div', {
      className: 'xeditor-printpreview-setting-group'
    });

    const marginsLabel = createElement('label', {}, ['Margins:']);
    const marginsSelect = createElement('select', {
      className: 'xeditor-printpreview-select'
    }) as HTMLSelectElement;

    const marginOptions = [
      { value: 'normal', label: 'Normal (2cm)' },
      { value: 'narrow', label: 'Narrow (1cm)' },
      { value: 'wide', label: 'Wide (3cm)' },
      { value: 'custom', label: 'Custom' }
    ];

    marginOptions.forEach(option => {
      const opt = createElement('option', {
        value: option.value
      }, [option.label]);
      marginsSelect.appendChild(opt);
    });

    marginsSelect.addEventListener('change', () => {
      this.updateMargins(marginsSelect.value);
    });

    marginsGroup.appendChild(marginsLabel);
    marginsGroup.appendChild(marginsSelect);

    // Options
    const optionsGroup = createElement('div', {
      className: 'xeditor-printpreview-setting-group xeditor-printpreview-setting-group--options'
    });

    const pageNumbersCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'page-numbers'
    }) as HTMLInputElement;
    if (this.config.showPageNumbers) {
      pageNumbersCheckbox.checked = true;
    }

    const pageNumbersLabel = createElement('label', {
      for: 'page-numbers'
    }, ['Page Numbers']);

    pageNumbersCheckbox.addEventListener('change', () => {
      this.config.showPageNumbers = pageNumbersCheckbox.checked;
      this.updatePreview();
    });

    const headersCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'headers'
    }) as HTMLInputElement;
    if (this.config.showHeaders) {
      headersCheckbox.checked = true;
    }

    const headersLabel = createElement('label', {
      for: 'headers'
    }, ['Headers']);

    headersCheckbox.addEventListener('change', () => {
      this.config.showHeaders = headersCheckbox.checked;
      this.updatePreview();
    });

    const tocCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'toc'
    }) as HTMLInputElement;
    if (this.config.showTableOfContents) {
      tocCheckbox.checked = true;
    }

    const tocLabel = createElement('label', {
      for: 'toc'
    }, ['Table of Contents']);

    tocCheckbox.addEventListener('change', () => {
      this.config.showTableOfContents = tocCheckbox.checked;
      this.updatePreview();
    });

    optionsGroup.appendChild(pageNumbersCheckbox);
    optionsGroup.appendChild(pageNumbersLabel);
    optionsGroup.appendChild(headersCheckbox);
    optionsGroup.appendChild(headersLabel);
    optionsGroup.appendChild(tocCheckbox);
    optionsGroup.appendChild(tocLabel);

    // Zoom control
    const zoomGroup = createElement('div', {
      className: 'xeditor-printpreview-setting-group'
    });

    const zoomLabel = createElement('label', {}, ['Zoom:']);
    const zoomSelect = createElement('select', {
      className: 'xeditor-printpreview-select'
    }) as HTMLSelectElement;

    const zoomOptions = ['50%', '75%', '100%', '125%', '150%', '200%'];
    zoomOptions.forEach(zoom => {
      const option = createElement('option', {
        value: zoom.replace('%', '')
      }, [zoom]);
      if (parseInt(zoom) === this.config.zoom) {
        (option as HTMLOptionElement).selected = true;
      }
      zoomSelect.appendChild(option);
    });

    zoomSelect.addEventListener('change', () => {
      this.config.zoom = parseInt(zoomSelect.value);
      this.updatePreview();
    });

    zoomGroup.appendChild(zoomLabel);
    zoomGroup.appendChild(zoomSelect);

    // Assemble settings bar
    settingsBar.appendChild(pageSizeGroup);
    settingsBar.appendChild(orientationGroup);
    settingsBar.appendChild(marginsGroup);
    settingsBar.appendChild(zoomGroup);
    settingsBar.appendChild(optionsGroup);

    return settingsBar;
  }

  private createPreviewContent(): HTMLElement {
    const wrapper = createElement('div', {
      className: 'xeditor-printpreview-wrapper'
    });

    const content = this.editor.getContent();
    
    // Add table of contents if enabled
    if (this.config.showTableOfContents) {
      const toc = this.generateTableOfContents(content);
      if (toc) {
        const tocPage = this.createPage(toc, 1, 1);
        tocPage.classList.add('xeditor-printpreview-page--toc');
        wrapper.appendChild(tocPage);
      }
    }

    // Process content for page breaks
    const processedContent = this.config.pageBreaks ? 
      this.processPageBreaks(content) : content;

    const pages = this.paginateContent(processedContent);
    const startPage = this.config.showTableOfContents ? 2 : 1;

    pages.forEach((pageContent, index) => {
      const page = this.createPage(pageContent, startPage + index, startPage + pages.length - 1);
      wrapper.appendChild(page);
    });

    return wrapper;
  }

  private generateTableOfContents(content: string): string | null {
    const tempDiv = createElement('div');
    tempDiv.innerHTML = content;
    
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) return null;

    let toc = '<div class="xeditor-printpreview-toc">';
    toc += '<h1>Table of Contents</h1>';
    toc += '<ul class="xeditor-printpreview-toc-list">';

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.textContent || '';
      const id = `heading-${index}`;
      heading.id = id;
      
      toc += `<li class="xeditor-printpreview-toc-item xeditor-printpreview-toc-level-${level}">`;
      toc += `<a href="#${id}">${text}</a>`;
      toc += '</li>';
    });

    toc += '</ul></div>';
    return toc;
  }

  private processPageBreaks(content: string): string {
    // Replace manual page break markers with actual page break divs
    return content.replace(
      /<div class="page-break">.*?<\/div>|<!-- pagebreak -->/gi,
      '<div class="xeditor-printpreview-pagebreak"></div>'
    );
  }

  private createPage(content: string, pageNumber: number, totalPages: number): HTMLElement {
    const page = createElement('div', {
      className: `xeditor-printpreview-page xeditor-printpreview-page--${this.config.pageSize} xeditor-printpreview-page--${this.config.orientation}`
    });

    // Add watermark if configured
    if (this.config.watermark) {
      const watermark = this.createWatermark();
      page.appendChild(watermark);
    }

    // Header
    if (this.config.showHeaders && this.config.headerText) {
      const header = createElement('div', {
        className: 'xeditor-printpreview-page-header'
      }, [this.config.headerText]);
      page.appendChild(header);
    }

    // Content
    const pageContent = createElement('div', {
      className: 'xeditor-printpreview-page-content'
    });
    pageContent.innerHTML = content;
    page.appendChild(pageContent);

    // Footer
    const footer = createElement('div', {
      className: 'xeditor-printpreview-page-footer'
    });

    if (this.config.footerText) {
      const footerText = createElement('span', {}, [this.config.footerText]);
      footer.appendChild(footerText);
    }

    if (this.config.showPageNumbers) {
      const pageNumbers = createElement('span', {
        className: 'xeditor-printpreview-page-number'
      }, [`Page ${pageNumber} of ${totalPages}`]);
      footer.appendChild(pageNumbers);
    }

    if (footer.childNodes.length > 0) {
      page.appendChild(footer);
    }

    // Apply margins
    page.style.padding = `${this.config.margins!.top} ${this.config.margins!.right} ${this.config.margins!.bottom} ${this.config.margins!.left}`;

    // Apply zoom
    if (this.config.zoom !== 100) {
      page.style.transform = `scale(${this.config.zoom! / 100})`;
      page.style.transformOrigin = 'top center';
    }

    return page;
  }

  private createWatermark(): HTMLElement {
    const watermark = createElement('div', {
      className: 'xeditor-printpreview-watermark'
    });

    if (this.config.watermark!.text) {
      watermark.textContent = this.config.watermark!.text;
    } else if (this.config.watermark!.image) {
      const img = createElement('img', {
        src: this.config.watermark!.image
      }) as HTMLImageElement;
      watermark.appendChild(img);
    }

    if (this.config.watermark!.opacity) {
      watermark.style.opacity = String(this.config.watermark!.opacity);
    }

    return watermark;
  }

  private paginateContent(content: string): string[] {
    // Create a temporary container to measure content
    const tempContainer = createElement('div', {
      className: `xeditor-printpreview-page xeditor-printpreview-page--${this.config.pageSize} xeditor-printpreview-page--${this.config.orientation}`
    });
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.padding = `${this.config.margins!.top} ${this.config.margins!.right} ${this.config.margins!.bottom} ${this.config.margins!.left}`;
    document.body.appendChild(tempContainer);

    // Create content container
    const contentDiv = createElement('div', {
      className: 'xeditor-printpreview-page-content'
    });
    contentDiv.innerHTML = content;
    tempContainer.appendChild(contentDiv);

    // Calculate available page height
    const pageHeight = this.getPageHeight();
    const headerHeight = this.config.showHeaders ? 50 : 0;
    const footerHeight = this.config.showPageNumbers || this.config.footerText ? 50 : 0;
    const availableHeight = pageHeight - headerHeight - footerHeight;

    const pages: string[] = [];
    const allElements = Array.from(contentDiv.children) as HTMLElement[];
    let currentPageContent = '';
    let currentPageHeight = 0;

    for (const element of allElements) {
      const elementHeight = element.offsetHeight;
      
      // Check if element fits on current page
      if (currentPageHeight + elementHeight > availableHeight && currentPageContent) {
        // Start new page
        pages.push(currentPageContent);
        currentPageContent = '';
        currentPageHeight = 0;
      }

      // Add element to current page
      currentPageContent += element.outerHTML;
      currentPageHeight += elementHeight;

      // Handle elements that are taller than a page
      if (elementHeight > availableHeight) {
        // For very tall elements, we'll just put them on their own page
        pages.push(currentPageContent);
        currentPageContent = '';
        currentPageHeight = 0;
      }
    }

    // Add remaining content
    if (currentPageContent) {
      pages.push(currentPageContent);
    }

    // Cleanup
    document.body.removeChild(tempContainer);

    // Return at least one page
    return pages.length > 0 ? pages : [content];
  }

  private getPageHeight(): number {
    // Page heights in pixels at 96 DPI
    const pageSizes: Record<string, Record<string, number>> = {
      'A4': { 'portrait': 1123, 'landscape': 794 },
      'Letter': { 'portrait': 1056, 'landscape': 816 },
      'Legal': { 'portrait': 1344, 'landscape': 816 }
    };

    return pageSizes[this.config.pageSize!]?.[this.config.orientation!] || 1123;
  }

  private updatePreview(): void {
    const container = this.dialog?.querySelector('.xeditor-printpreview-container');
    if (container) {
      const previewContent = this.createPreviewContent();
      container.innerHTML = '';
      container.appendChild(previewContent);
    }
  }

  private updateMargins(value: string): void {
    switch (value) {
      case 'narrow':
        this.config.margins = { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' };
        break;
      case 'wide':
        this.config.margins = { top: '3cm', right: '3cm', bottom: '3cm', left: '3cm' };
        break;
      case 'normal':
      default:
        this.config.margins = { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' };
        break;
    }
    this.updatePreview();
  }

  private print(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print.');
      return;
    }

    const content = this.generatePrintHTML();
    
    printWindow.document.write(content);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }

  private downloadPDF(): void {
    // This would require a PDF library like jsPDF
    // For now, we'll just show an alert
    alert('PDF download requires additional libraries. Use the browser\'s "Print to PDF" feature instead.');
  }

  private generatePrintHTML(): string {
    const content = this.editor.getContent();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${this.config.headerText || 'Print Document'}</title>
        <style>
          @page {
            size: ${this.config.pageSize} ${this.config.orientation};
            margin: ${this.config.margins!.top} ${this.config.margins!.right} ${this.config.margins!.bottom} ${this.config.margins!.left};
            
            @top-center {
              content: "${this.config.headerText || ''}";
              font-size: 12px;
              color: #666;
            }
            
            @bottom-center {
              content: counter(page) " of " counter(pages);
              font-size: 12px;
              color: #666;
            }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #212529;
            background-color: white;
            margin: 0;
            padding: 0;
          }
          
          h1, h2, h3, h4, h5, h6 {
            margin-top: 0;
            margin-bottom: 0.5em;
            font-weight: 600;
            line-height: 1.2;
            page-break-after: avoid;
          }
          
          h1 { font-size: 2em; }
          h2 { font-size: 1.5em; }
          h3 { font-size: 1.17em; }
          h4 { font-size: 1em; }
          h5 { font-size: 0.83em; }
          h6 { font-size: 0.67em; }
          
          p {
            margin-top: 0;
            margin-bottom: 1em;
            orphans: 3;
            widows: 3;
          }
          
          ul, ol {
            margin-top: 0;
            margin-bottom: 1em;
            padding-left: 2em;
          }
          
          li {
            margin-bottom: 0.25em;
          }
          
          blockquote {
            margin: 0 0 1em 0;
            padding-left: 1em;
            border-left: 4px solid #dee2e6;
            color: #6c757d;
            page-break-inside: avoid;
          }
          
          pre {
            margin: 0 0 1em 0;
            padding: 1em;
            background-color: #f6f8fa;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            overflow-x: auto;
            page-break-inside: avoid;
          }
          
          code {
            padding: 0.2em 0.4em;
            background-color: #f6f8fa;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          pre code {
            padding: 0;
            background-color: transparent;
          }
          
          img {
            max-width: 100%;
            height: auto;
            page-break-inside: avoid;
          }
          
          table {
            width: 100%;
            margin-bottom: 1em;
            border-collapse: collapse;
            page-break-inside: avoid;
          }
          
          th, td {
            padding: 8px;
            border: 1px solid #dee2e6;
          }
          
          th {
            background-color: #f8f9fa;
            font-weight: 600;
          }
          
          hr {
            margin: 2em 0;
            border: 0;
            border-top: 1px solid #dee2e6;
            page-break-after: avoid;
          }
          
          /* Hide non-printable elements */
          .no-print {
            display: none !important;
          }
          
          /* Page breaks */
          .page-break {
            page-break-after: always;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-printpreview-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #333;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        overflow: auto;
      }
      
      .xeditor-printpreview-dialog {
        background: #f0f0f0;
        width: 90vw;
        height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }
      
      .xeditor-printpreview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: white;
        border-bottom: 1px solid #ddd;
      }
      
      .xeditor-printpreview-header h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .xeditor-printpreview-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .xeditor-printpreview-btn {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .xeditor-printpreview-btn:hover {
        background-color: #f8f9fa;
      }
      
      .xeditor-printpreview-btn--primary {
        background-color: var(--xeditor-primary);
        color: white;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-printpreview-btn--primary:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      .xeditor-printpreview-close {
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
      
      .xeditor-printpreview-close:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-printpreview-settings {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 12px 20px;
        background: white;
        border-bottom: 1px solid #ddd;
      }
      
      .xeditor-printpreview-setting-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .xeditor-printpreview-setting-group label {
        font-size: 14px;
        color: #555;
      }
      
      .xeditor-printpreview-select {
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .xeditor-printpreview-setting-group--options {
        margin-left: auto;
      }
      
      .xeditor-printpreview-setting-group--options input[type="checkbox"] {
        margin-right: 4px;
      }
      
      .xeditor-printpreview-container {
        flex: 1;
        overflow: auto;
        padding: 20px;
        display: flex;
        justify-content: center;
        background: #e0e0e0;
      }
      
      .xeditor-printpreview-wrapper {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
      }
      
      .xeditor-printpreview-page {
        background: white;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        position: relative;
        display: flex;
        flex-direction: column;
      }
      
      /* Page sizes */
      .xeditor-printpreview-page--A4.xeditor-printpreview-page--portrait {
        width: 210mm;
        min-height: 297mm;
      }
      
      .xeditor-printpreview-page--A4.xeditor-printpreview-page--landscape {
        width: 297mm;
        min-height: 210mm;
      }
      
      .xeditor-printpreview-page--Letter.xeditor-printpreview-page--portrait {
        width: 8.5in;
        min-height: 11in;
      }
      
      .xeditor-printpreview-page--Letter.xeditor-printpreview-page--landscape {
        width: 11in;
        min-height: 8.5in;
      }
      
      .xeditor-printpreview-page--Legal.xeditor-printpreview-page--portrait {
        width: 8.5in;
        min-height: 14in;
      }
      
      .xeditor-printpreview-page--Legal.xeditor-printpreview-page--landscape {
        width: 14in;
        min-height: 8.5in;
      }
      
      .xeditor-printpreview-page-header {
        padding: 10px 0;
        font-size: 12px;
        color: #666;
        text-align: center;
        border-bottom: 1px solid #eee;
        margin-bottom: 20px;
      }
      
      .xeditor-printpreview-page-content {
        flex: 1;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #212529;
      }
      
      .xeditor-printpreview-page-footer {
        padding: 10px 0;
        font-size: 12px;
        color: #666;
        text-align: center;
        border-top: 1px solid #eee;
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
      }
      
      .xeditor-printpreview-page-number {
        margin-left: auto;
      }
      
      /* Responsive scaling */
      @media (max-width: 1200px) {
        .xeditor-printpreview-page {
          transform: scale(0.8);
          transform-origin: top center;
        }
      }
      
      @media (max-width: 768px) {
        .xeditor-printpreview-page {
          transform: scale(0.6);
        }
      }
      
      /* Watermark styles */
      .xeditor-printpreview-watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 72px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.1);
        z-index: 0;
        pointer-events: none;
        white-space: nowrap;
      }
      
      .xeditor-printpreview-watermark img {
        max-width: 300px;
        opacity: 0.1;
      }
      
      /* Table of contents styles */
      .xeditor-printpreview-toc {
        padding: 20px;
      }
      
      .xeditor-printpreview-toc h1 {
        font-size: 24px;
        margin-bottom: 20px;
      }
      
      .xeditor-printpreview-toc-list {
        list-style: none;
        padding: 0;
      }
      
      .xeditor-printpreview-toc-item {
        margin-bottom: 8px;
        position: relative;
      }
      
      .xeditor-printpreview-toc-item a {
        color: inherit;
        text-decoration: none;
      }
      
      .xeditor-printpreview-toc-item a:hover {
        text-decoration: underline;
      }
      
      .xeditor-printpreview-toc-level-2 { padding-left: 20px; }
      .xeditor-printpreview-toc-level-3 { padding-left: 40px; }
      .xeditor-printpreview-toc-level-4 { padding-left: 60px; }
      .xeditor-printpreview-toc-level-5 { padding-left: 80px; }
      .xeditor-printpreview-toc-level-6 { padding-left: 100px; }
      
      /* Page break styles */
      .xeditor-printpreview-pagebreak {
        page-break-after: always;
        break-after: page;
        height: 0;
        margin: 0;
        border: none;
      }
      
      /* Ensure content doesn't overflow watermark */
      .xeditor-printpreview-page {
        position: relative;
      }
      
      .xeditor-printpreview-page-content {
        position: relative;
        z-index: 1;
      }
      
      /* Print styles */
      @media print {
        .xeditor-printpreview-overlay {
          display: none;
        }
        
        .xeditor-printpreview-pagebreak {
          page-break-after: always;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}