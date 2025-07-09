import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface ColorPickerOptions {
  colors?: string[];
  recentColors?: number;
}

export class ColorPlugin implements Plugin {
  name = 'color';
  private editor!: Editor;
  private options: ColorPickerOptions;
  private recentColors: string[] = [];
  
  private defaultColors = [
    // First row - Basic colors
    '#000000', '#424242', '#636363', '#9C9C94', '#CEC6CE', '#EFEFEF', '#F7F7F7', '#FFFFFF',
    // Second row - Red shades
    '#FF0000', '#FF9C00', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#9C00FF', '#FF00FF',
    // Third row - Light colors
    '#F7C6CE', '#FFE7CE', '#FFEFC6', '#D6EFD6', '#CEDEE7', '#CEE7F7', '#D6D6E7', '#E7D6DE',
    // Fourth row - Medium colors
    '#E79C9C', '#FFC69C', '#FFE79C', '#B5D6A5', '#A5C6CE', '#9CC6EF', '#B5A5D6', '#D6A5BD',
    // Fifth row - Dark colors
    '#E76363', '#F7AD6B', '#FFD663', '#94BD7B', '#73A5AD', '#6BADDE', '#8C7BC6', '#C67BA5',
    // Sixth row - Darker colors
    '#CE0000', '#E79439', '#EFC631', '#6BA54A', '#4A7B8C', '#3984C6', '#634AA5', '#A54A7B',
    // Seventh row - Very dark colors
    '#9C0000', '#B56308', '#BD9400', '#397B21', '#104A5A', '#085294', '#311873', '#731842'
  ];

  constructor(options: ColorPickerOptions = {}) {
    this.options = {
      colors: options.colors || this.defaultColors,
      recentColors: options.recentColors || 5
    };
  }

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make color picker methods available
    (this as any).showTextColorPicker = this.showColorPicker.bind(this, 'foreColor');
    (this as any).showBackgroundColorPicker = this.showColorPicker.bind(this, 'backColor');
    
    // Register commands
    editor.commands.register('foreColor', {
      execute: (color: string) => this.setColor('foreColor', color)
    });
    
    editor.commands.register('backColor', {
      execute: (color: string) => this.setColor('backColor', color)
    });
    
    // Load recent colors from localStorage
    this.loadRecentColors();
    
    // Add styles
    this.addStyles();
  }
  
  destroy(): void {
    // Save recent colors
    this.saveRecentColors();
  }
  
  private showColorPicker(type: 'foreColor' | 'backColor'): void {
    const picker = this.createColorPicker(type);
    document.body.appendChild(picker);
  }
  
  private createColorPicker(type: 'foreColor' | 'backColor'): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-color-picker-overlay'
    });
    
    const picker = createElement('div', {
      className: 'xeditor-color-picker'
    });
    
    const title = createElement('h3', {}, [type === 'foreColor' ? 'Text Color' : 'Background Color']);
    
    // Color input
    const inputContainer = createElement('div', {
      className: 'xeditor-color-input-container'
    });
    
    const colorInput = createElement('input', {
      type: 'color',
      className: 'xeditor-color-input',
      value: '#000000'
    }) as HTMLInputElement;
    
    const hexInput = createElement('input', {
      type: 'text',
      className: 'xeditor-color-hex-input',
      placeholder: '#000000',
      maxLength: '7',
      value: '#000000'
    }) as HTMLInputElement;
    
    // Sync inputs
    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value;
    });
    
    hexInput.addEventListener('input', () => {
      if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
        colorInput.value = hexInput.value;
      }
    });
    
    inputContainer.appendChild(colorInput);
    inputContainer.appendChild(hexInput);
    
    // Recent colors
    if (this.recentColors.length > 0) {
      const recentTitle = createElement('div', {
        className: 'xeditor-color-section-title'
      }, ['Recent Colors']);
      
      const recentColors = createElement('div', {
        className: 'xeditor-color-grid'
      });
      
      this.recentColors.forEach(color => {
        const colorSwatch = this.createColorSwatch(color, type, overlay);
        recentColors.appendChild(colorSwatch);
      });
      
      picker.appendChild(recentTitle);
      picker.appendChild(recentColors);
    }
    
    // Predefined colors
    const presetTitle = createElement('div', {
      className: 'xeditor-color-section-title'
    }, ['Theme Colors']);
    
    const colorGrid = createElement('div', {
      className: 'xeditor-color-grid'
    });
    
    this.options.colors!.forEach(color => {
      const colorSwatch = this.createColorSwatch(color, type, overlay);
      colorGrid.appendChild(colorSwatch);
    });
    
    // Buttons
    const buttonContainer = createElement('div', {
      className: 'xeditor-color-buttons'
    });
    
    const clearBtn = createElement('button', {
      className: 'xeditor-color-clear-btn',
      type: 'button'
    }, ['Clear']);
    
    const cancelBtn = createElement('button', {
      className: 'xeditor-color-cancel-btn',
      type: 'button'
    }, ['Cancel']);
    
    const applyBtn = createElement('button', {
      className: 'xeditor-color-apply-btn',
      type: 'button'
    }, ['Apply']);
    
    // Event listeners
    clearBtn.addEventListener('click', () => {
      this.setColor(type, 'inherit');
      document.body.removeChild(overlay);
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    
    applyBtn.addEventListener('click', () => {
      const color = colorInput.value;
      this.setColor(type, color);
      this.addRecentColor(color);
      document.body.removeChild(overlay);
    });
    
    buttonContainer.appendChild(clearBtn);
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(applyBtn);
    
    picker.appendChild(title);
    picker.appendChild(inputContainer);
    picker.appendChild(presetTitle);
    picker.appendChild(colorGrid);
    picker.appendChild(buttonContainer);
    
    overlay.appendChild(picker);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    
    return overlay;
  }
  
  private createColorSwatch(color: string, type: string, overlay: HTMLElement): HTMLElement {
    const swatch = createElement('button', {
      className: 'xeditor-color-swatch',
      style: `background-color: ${color}`,
      title: color,
      type: 'button'
    });
    
    swatch.addEventListener('click', () => {
      this.setColor(type as 'foreColor' | 'backColor', color);
      this.addRecentColor(color);
      document.body.removeChild(overlay);
    });
    
    return swatch;
  }
  
  private setColor(type: 'foreColor' | 'backColor', color: string): void {
    this.editor.selection.save();
    
    if (type === 'foreColor') {
      if (color === 'inherit') {
        // Remove color
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.style.color = '';
          
          try {
            range.surroundContents(span);
          } catch (e) {
            // If surroundContents fails, use execCommand
            document.execCommand('removeFormat', false);
          }
        }
      } else {
        document.execCommand('foreColor', false, color);
      }
    } else {
      if (color === 'inherit') {
        // Remove background color
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.style.backgroundColor = '';
          
          try {
            range.surroundContents(span);
          } catch (e) {
            // If surroundContents fails, try alternative method
            document.execCommand('removeFormat', false);
          }
        }
      } else {
        document.execCommand('backColor', false, color);
      }
    }
    
    this.editor.selection.restore();
    this.editor.history.record();
  }
  
  private addRecentColor(color: string): void {
    // Remove if already exists
    const index = this.recentColors.indexOf(color);
    if (index > -1) {
      this.recentColors.splice(index, 1);
    }
    
    // Add to beginning
    this.recentColors.unshift(color);
    
    // Keep only the specified number of recent colors
    if (this.recentColors.length > this.options.recentColors!) {
      this.recentColors = this.recentColors.slice(0, this.options.recentColors);
    }
    
    this.saveRecentColors();
  }
  
  private loadRecentColors(): void {
    const saved = localStorage.getItem('xeditor-recent-colors');
    if (saved) {
      try {
        this.recentColors = JSON.parse(saved);
      } catch (e) {
        this.recentColors = [];
      }
    }
  }
  
  private saveRecentColors(): void {
    localStorage.setItem('xeditor-recent-colors', JSON.stringify(this.recentColors));
  }
  
  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-color-picker-overlay {
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
      
      .xeditor-color-picker {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        width: 340px;
        max-width: 90vw;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .xeditor-color-picker h3 {
        margin: 0 0 20px 0;
      }
      
      .xeditor-color-input-container {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .xeditor-color-input {
        width: 60px;
        height: 40px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .xeditor-color-hex-input {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: monospace;
        text-transform: uppercase;
      }
      
      .xeditor-color-section-title {
        font-size: 12px;
        font-weight: 600;
        color: #666;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      
      .xeditor-color-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
        margin-bottom: 20px;
      }
      
      .xeditor-color-swatch {
        width: 32px;
        height: 32px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.2s;
        position: relative;
      }
      
      .xeditor-color-swatch:hover {
        transform: scale(1.1);
        z-index: 1;
        border-color: #333;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      .xeditor-color-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      
      .xeditor-color-clear-btn {
        margin-right: auto;
      }
      
      .xeditor-color-clear-btn,
      .xeditor-color-cancel-btn,
      .xeditor-color-apply-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-color-clear-btn {
        background-color: #f8f9fa;
        color: #333;
      }
      
      .xeditor-color-cancel-btn {
        background-color: #e9ecef;
        color: #333;
      }
      
      .xeditor-color-apply-btn {
        background-color: var(--xeditor-primary);
        color: white;
      }
      
      .xeditor-color-clear-btn:hover {
        background-color: #e9ecef;
      }
      
      .xeditor-color-cancel-btn:hover {
        background-color: #dee2e6;
      }
      
      .xeditor-color-apply-btn:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-color-picker {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-color-hex-input {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-color-section-title {
        color: #adb5bd;
      }
      
      [data-theme="dark"] .xeditor-color-swatch {
        border-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-color-clear-btn {
        background-color: #495057;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-color-cancel-btn {
        background-color: #6c757d;
        color: #f8f9fa;
      }
    `;
    
    document.head.appendChild(style);
  }
}