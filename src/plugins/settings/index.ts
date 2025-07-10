/**
 * Settings Plugin for xEditor
 * Provides comprehensive settings management with UI
 */

import { Plugin } from '../../types';

export interface SettingsConfig {
  // Image settings
  image: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    allowedFormats: string[];
    enableResize: boolean;
    enableCaption: boolean;
  };
  
  // Toolbar settings
  toolbar: {
    visibleItems: string[];
    hiddenItems: string[];
    customOrder: string[];
    enableGrouping: boolean;
    enableSticky: boolean;
    enableMobileOptimization: boolean;
  };
  
  // Editor settings
  editor: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    spellCheck: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
  };
  
  // Mobile settings
  mobile: {
    enableTouchGestures: boolean;
    enableMobileToolbar: boolean;
    touchTargetSize: number;
    enableVirtualKeyboardOptimization: boolean;
  };
  
  // Advanced settings
  advanced: {
    enableAnalytics: boolean;
    enableDebugMode: boolean;
    customCSS: string;
    plugins: string[];
  };
}

export class SettingsPlugin implements Plugin {
  name = 'settings';
  private editor: any;
  private settings: SettingsConfig;
  private settingsPanel: HTMLElement | null = null;
  private isOpen = false;

  constructor(initialSettings?: Partial<SettingsConfig>) {
    this.settings = this.getDefaultSettings();
    if (initialSettings) {
      this.settings = { ...this.settings, ...initialSettings };
    }
  }

  init(editor: any) {
    this.editor = editor;
    this.loadSettings();
    this.setupSettingsPanel();
    this.applySettings();
    
    // Register settings command
    editor.commands.register('settings', {
      execute: () => this.toggleSettings()
    });
    
    return {
      toolbar: [{
        name: 'settings',
        icon: '⚙️',
        tooltip: 'Settings',
        command: 'settings'
      }]
    };
  }

  private getDefaultSettings(): SettingsConfig {
    return {
      image: {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.85,
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        enableResize: true,
        enableCaption: true
      },
      toolbar: {
        visibleItems: [
          'bold', 'italic', 'underline', 'strikethrough',
          'heading', 'paragraph', 'orderedList', 'unorderedList',
          'link', 'image', 'table', 'codeBlock',
          'textColor', 'backgroundColor', 'undo', 'redo'
        ],
        hiddenItems: [
          'print', 'source', 'fullscreen', 'findReplace'
        ],
        customOrder: [],
        enableGrouping: true,
        enableSticky: true,
        enableMobileOptimization: true
      },
      editor: {
        theme: 'light',
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        lineHeight: 1.5,
        spellCheck: true,
        autoSave: true,
        autoSaveInterval: 30000
      },
      mobile: {
        enableTouchGestures: true,
        enableMobileToolbar: true,
        touchTargetSize: 44,
        enableVirtualKeyboardOptimization: true
      },
      advanced: {
        enableAnalytics: false,
        enableDebugMode: false,
        customCSS: '',
        plugins: []
      }
    };
  }

  private setupSettingsPanel() {
    // Create settings panel
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.className = 'xeditor-settings-panel';
    this.settingsPanel.style.display = 'none';
    
    // Create panel content
    this.settingsPanel.innerHTML = `
      <div class="xeditor-settings-overlay">
        <div class="xeditor-settings-modal">
          <div class="xeditor-settings-header">
            <h2>⚙️ Editor Settings</h2>
            <button class="xeditor-settings-close">&times;</button>
          </div>
          <div class="xeditor-settings-content">
            <div class="xeditor-settings-tabs">
              <button class="xeditor-settings-tab active" data-tab="image">📷 Image</button>
              <button class="xeditor-settings-tab" data-tab="toolbar">🔧 Toolbar</button>
              <button class="xeditor-settings-tab" data-tab="editor">📝 Editor</button>
              <button class="xeditor-settings-tab" data-tab="mobile">📱 Mobile</button>
              <button class="xeditor-settings-tab" data-tab="advanced">⚡ Advanced</button>
            </div>
            <div class="xeditor-settings-body">
              ${this.generateSettingsHTML()}
            </div>
          </div>
          <div class="xeditor-settings-footer">
            <button class="xeditor-settings-reset">Reset to Default</button>
            <button class="xeditor-settings-export">Export Settings</button>
            <button class="xeditor-settings-import">Import Settings</button>
            <button class="xeditor-settings-save">Save Settings</button>
          </div>
        </div>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(this.settingsPanel);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Apply CSS
    this.addSettingsCSS();
  }

  private generateSettingsHTML(): string {
    return `
      <!-- Image Settings -->
      <div class="xeditor-settings-section" data-section="image">
        <h3>Image Settings</h3>
        <div class="xeditor-settings-row">
          <label>Max Width (px):</label>
          <input type="number" id="image-max-width" min="100" max="2000" value="${this.settings.image.maxWidth}">
        </div>
        <div class="xeditor-settings-row">
          <label>Max Height (px):</label>
          <input type="number" id="image-max-height" min="100" max="2000" value="${this.settings.image.maxHeight}">
        </div>
        <div class="xeditor-settings-row">
          <label>Quality (0-1):</label>
          <input type="range" id="image-quality" min="0.1" max="1" step="0.1" value="${this.settings.image.quality}">
          <span class="xeditor-settings-value">${this.settings.image.quality}</span>
        </div>
        <div class="xeditor-settings-row">
          <label>Enable Resize:</label>
          <input type="checkbox" id="image-enable-resize" ${this.settings.image.enableResize ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Enable Caption:</label>
          <input type="checkbox" id="image-enable-caption" ${this.settings.image.enableCaption ? 'checked' : ''}>
        </div>
      </div>

      <!-- Toolbar Settings -->
      <div class="xeditor-settings-section" data-section="toolbar" style="display: none;">
        <h3>Toolbar Settings</h3>
        <div class="xeditor-settings-row">
          <label>Visible Toolbar Items:</label>
          <div class="xeditor-toolbar-items">
            ${this.generateToolbarItemsHTML()}
          </div>
        </div>
        <div class="xeditor-settings-row">
          <label>Enable Sticky Toolbar:</label>
          <input type="checkbox" id="toolbar-sticky" ${this.settings.toolbar.enableSticky ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Enable Mobile Optimization:</label>
          <input type="checkbox" id="toolbar-mobile" ${this.settings.toolbar.enableMobileOptimization ? 'checked' : ''}>
        </div>
      </div>

      <!-- Editor Settings -->
      <div class="xeditor-settings-section" data-section="editor" style="display: none;">
        <h3>Editor Settings</h3>
        <div class="xeditor-settings-row">
          <label>Theme:</label>
          <select id="editor-theme">
            <option value="light" ${this.settings.editor.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${this.settings.editor.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="auto" ${this.settings.editor.theme === 'auto' ? 'selected' : ''}>Auto</option>
          </select>
        </div>
        <div class="xeditor-settings-row">
          <label>Font Size:</label>
          <input type="number" id="editor-font-size" min="10" max="24" value="${this.settings.editor.fontSize}">
        </div>
        <div class="xeditor-settings-row">
          <label>Font Family:</label>
          <select id="editor-font-family">
            <option value="Arial, sans-serif" ${this.settings.editor.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
            <option value="Georgia, serif" ${this.settings.editor.fontFamily === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
            <option value="'Courier New', monospace" ${this.settings.editor.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
            <option value="'Helvetica Neue', sans-serif" ${this.settings.editor.fontFamily === "'Helvetica Neue', sans-serif" ? 'selected' : ''}>Helvetica Neue</option>
          </select>
        </div>
        <div class="xeditor-settings-row">
          <label>Line Height:</label>
          <input type="range" id="editor-line-height" min="1" max="2" step="0.1" value="${this.settings.editor.lineHeight}">
          <span class="xeditor-settings-value">${this.settings.editor.lineHeight}</span>
        </div>
        <div class="xeditor-settings-row">
          <label>Spell Check:</label>
          <input type="checkbox" id="editor-spell-check" ${this.settings.editor.spellCheck ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Auto Save:</label>
          <input type="checkbox" id="editor-auto-save" ${this.settings.editor.autoSave ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Auto Save Interval (ms):</label>
          <input type="number" id="editor-auto-save-interval" min="5000" max="300000" step="1000" value="${this.settings.editor.autoSaveInterval}">
        </div>
      </div>

      <!-- Mobile Settings -->
      <div class="xeditor-settings-section" data-section="mobile" style="display: none;">
        <h3>Mobile Settings</h3>
        <div class="xeditor-settings-row">
          <label>Enable Touch Gestures:</label>
          <input type="checkbox" id="mobile-touch-gestures" ${this.settings.mobile.enableTouchGestures ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Enable Mobile Toolbar:</label>
          <input type="checkbox" id="mobile-toolbar" ${this.settings.mobile.enableMobileToolbar ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Touch Target Size:</label>
          <input type="number" id="mobile-touch-size" min="24" max="60" value="${this.settings.mobile.touchTargetSize}">
        </div>
        <div class="xeditor-settings-row">
          <label>Virtual Keyboard Optimization:</label>
          <input type="checkbox" id="mobile-keyboard" ${this.settings.mobile.enableVirtualKeyboardOptimization ? 'checked' : ''}>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="xeditor-settings-section" data-section="advanced" style="display: none;">
        <h3>Advanced Settings</h3>
        <div class="xeditor-settings-row">
          <label>Enable Analytics:</label>
          <input type="checkbox" id="advanced-analytics" ${this.settings.advanced.enableAnalytics ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Debug Mode:</label>
          <input type="checkbox" id="advanced-debug" ${this.settings.advanced.enableDebugMode ? 'checked' : ''}>
        </div>
        <div class="xeditor-settings-row">
          <label>Custom CSS:</label>
          <textarea id="advanced-custom-css" rows="6" placeholder="Enter custom CSS here...">${this.settings.advanced.customCSS}</textarea>
        </div>
      </div>
    `;
  }

  private generateToolbarItemsHTML(): string {
    const allItems = [
      { id: 'bold', name: 'Bold', icon: '𝐁' },
      { id: 'italic', name: 'Italic', icon: '𝐼' },
      { id: 'underline', name: 'Underline', icon: '𝐔' },
      { id: 'strikethrough', name: 'Strikethrough', icon: '𝐒' },
      { id: 'heading', name: 'Heading', icon: 'H' },
      { id: 'paragraph', name: 'Paragraph', icon: '¶' },
      { id: 'orderedList', name: 'Ordered List', icon: '1.' },
      { id: 'unorderedList', name: 'Unordered List', icon: '•' },
      { id: 'link', name: 'Link', icon: '🔗' },
      { id: 'image', name: 'Image', icon: '📷' },
      { id: 'table', name: 'Table', icon: '📊' },
      { id: 'codeBlock', name: 'Code Block', icon: '</>' },
      { id: 'textColor', name: 'Text Color', icon: '🎨' },
      { id: 'backgroundColor', name: 'Background', icon: '🖍️' },
      { id: 'undo', name: 'Undo', icon: '↶' },
      { id: 'redo', name: 'Redo', icon: '↷' },
      { id: 'print', name: 'Print', icon: '🖨️' },
      { id: 'source', name: 'Source', icon: '📄' },
      { id: 'fullscreen', name: 'Fullscreen', icon: '⛶' },
      { id: 'findReplace', name: 'Find & Replace', icon: '🔍' }
    ];

    return allItems.map(item => `
      <label class="xeditor-toolbar-item">
        <input type="checkbox" value="${item.id}" 
               ${this.settings.toolbar.visibleItems.includes(item.id) ? 'checked' : ''}>
        <span class="xeditor-toolbar-item-icon">${item.icon}</span>
        <span class="xeditor-toolbar-item-name">${item.name}</span>
      </label>
    `).join('');
  }

  private setupEventListeners() {
    if (!this.settingsPanel) return;

    // Close button
    const closeBtn = this.settingsPanel.querySelector('.xeditor-settings-close');
    closeBtn?.addEventListener('click', () => this.toggleSettings());

    // Overlay click
    const overlay = this.settingsPanel.querySelector('.xeditor-settings-overlay');
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) this.toggleSettings();
    });

    // Tab switching
    const tabs = this.settingsPanel.querySelectorAll('.xeditor-settings-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.getAttribute('data-tab')!));
    });

    // Settings changes
    this.setupSettingsChangeListeners();

    // Footer buttons
    const resetBtn = this.settingsPanel.querySelector('.xeditor-settings-reset');
    resetBtn?.addEventListener('click', () => this.resetSettings());

    const exportBtn = this.settingsPanel.querySelector('.xeditor-settings-export');
    exportBtn?.addEventListener('click', () => this.exportSettings());

    const importBtn = this.settingsPanel.querySelector('.xeditor-settings-import');
    importBtn?.addEventListener('click', () => this.importSettings());

    const saveBtn = this.settingsPanel.querySelector('.xeditor-settings-save');
    saveBtn?.addEventListener('click', () => this.saveSettings());
  }

  private setupSettingsChangeListeners() {
    if (!this.settingsPanel) return;

    // Range inputs with value display
    const rangeInputs = this.settingsPanel.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const valueSpan = target.nextElementSibling as HTMLSpanElement;
        if (valueSpan) {
          valueSpan.textContent = target.value;
        }
      });
    });

    // Toolbar items
    const toolbarItems = this.settingsPanel.querySelectorAll('.xeditor-toolbar-item input');
    toolbarItems.forEach(input => {
      input.addEventListener('change', () => this.updateToolbarSettings());
    });
  }

  private switchTab(tabName: string) {
    if (!this.settingsPanel) return;

    // Update tab buttons
    const tabs = this.settingsPanel.querySelectorAll('.xeditor-settings-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    // Update sections
    const sections = this.settingsPanel.querySelectorAll('.xeditor-settings-section');
    sections.forEach(section => {
      const sectionElement = section as HTMLElement;
      sectionElement.style.display = section.getAttribute('data-section') === tabName ? 'block' : 'none';
    });
  }

  private updateToolbarSettings() {
    if (!this.settingsPanel) return;

    const checkedItems = this.settingsPanel.querySelectorAll('.xeditor-toolbar-item input:checked');
    this.settings.toolbar.visibleItems = Array.from(checkedItems).map(input => 
      (input as HTMLInputElement).value
    );
  }

  private toggleSettings() {
    if (!this.settingsPanel) return;

    this.isOpen = !this.isOpen;
    this.settingsPanel.style.display = this.isOpen ? 'block' : 'none';
    
    if (this.isOpen) {
      // Focus first input
      const firstInput = this.settingsPanel.querySelector('input, select, textarea') as HTMLElement;
      firstInput?.focus();
    }
  }

  private resetSettings() {
    this.settings = this.getDefaultSettings();
    this.updateSettingsPanel();
    this.applySettings();
  }

  private exportSettings() {
    const blob = new Blob([JSON.stringify(this.settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xeditor-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string);
            this.settings = { ...this.settings, ...imported };
            this.updateSettingsPanel();
            this.applySettings();
          } catch (error) {
            alert('Invalid settings file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  private saveSettings() {
    this.collectSettings();
    this.applySettings();
    this.persistSettings();
    this.toggleSettings();
  }

  private collectSettings() {
    if (!this.settingsPanel) return;

    // Image settings
    this.settings.image.maxWidth = parseInt((this.settingsPanel.querySelector('#image-max-width') as HTMLInputElement).value);
    this.settings.image.maxHeight = parseInt((this.settingsPanel.querySelector('#image-max-height') as HTMLInputElement).value);
    this.settings.image.quality = parseFloat((this.settingsPanel.querySelector('#image-quality') as HTMLInputElement).value);
    this.settings.image.enableResize = (this.settingsPanel.querySelector('#image-enable-resize') as HTMLInputElement).checked;
    this.settings.image.enableCaption = (this.settingsPanel.querySelector('#image-enable-caption') as HTMLInputElement).checked;

    // Editor settings
    this.settings.editor.theme = (this.settingsPanel.querySelector('#editor-theme') as HTMLSelectElement).value as any;
    this.settings.editor.fontSize = parseInt((this.settingsPanel.querySelector('#editor-font-size') as HTMLInputElement).value);
    this.settings.editor.fontFamily = (this.settingsPanel.querySelector('#editor-font-family') as HTMLSelectElement).value;
    this.settings.editor.lineHeight = parseFloat((this.settingsPanel.querySelector('#editor-line-height') as HTMLInputElement).value);
    this.settings.editor.spellCheck = (this.settingsPanel.querySelector('#editor-spell-check') as HTMLInputElement).checked;
    this.settings.editor.autoSave = (this.settingsPanel.querySelector('#editor-auto-save') as HTMLInputElement).checked;
    this.settings.editor.autoSaveInterval = parseInt((this.settingsPanel.querySelector('#editor-auto-save-interval') as HTMLInputElement).value);

    // Mobile settings
    this.settings.mobile.enableTouchGestures = (this.settingsPanel.querySelector('#mobile-touch-gestures') as HTMLInputElement).checked;
    this.settings.mobile.enableMobileToolbar = (this.settingsPanel.querySelector('#mobile-toolbar') as HTMLInputElement).checked;
    this.settings.mobile.touchTargetSize = parseInt((this.settingsPanel.querySelector('#mobile-touch-size') as HTMLInputElement).value);
    this.settings.mobile.enableVirtualKeyboardOptimization = (this.settingsPanel.querySelector('#mobile-keyboard') as HTMLInputElement).checked;

    // Advanced settings
    this.settings.advanced.enableAnalytics = (this.settingsPanel.querySelector('#advanced-analytics') as HTMLInputElement).checked;
    this.settings.advanced.enableDebugMode = (this.settingsPanel.querySelector('#advanced-debug') as HTMLInputElement).checked;
    this.settings.advanced.customCSS = (this.settingsPanel.querySelector('#advanced-custom-css') as HTMLTextAreaElement).value;
  }

  private updateSettingsPanel() {
    if (!this.settingsPanel) return;

    const body = this.settingsPanel.querySelector('.xeditor-settings-body');
    if (body) {
      body.innerHTML = this.generateSettingsHTML();
      this.setupSettingsChangeListeners();
    }
  }

  private applySettings() {
    // Apply image settings
    if (this.editor.plugins.get('image')) {
      this.editor.plugins.get('image').updateConfig({
        maxWidth: this.settings.image.maxWidth,
        maxHeight: this.settings.image.maxHeight,
        quality: this.settings.image.quality,
        enableResize: this.settings.image.enableResize,
        enableCaption: this.settings.image.enableCaption
      });
    }

    // Apply editor settings
    const content = this.editor.getContainer().querySelector('.xeditor-content');
    if (content) {
      content.style.fontSize = `${this.settings.editor.fontSize}px`;
      content.style.fontFamily = this.settings.editor.fontFamily;
      content.style.lineHeight = this.settings.editor.lineHeight.toString();
      content.spellcheck = this.settings.editor.spellCheck;
    }

    // Apply theme
    this.editor.setTheme(this.settings.editor.theme);

    // Apply custom CSS
    if (this.settings.advanced.customCSS) {
      this.applyCustomCSS(this.settings.advanced.customCSS);
    }

    // Apply toolbar settings
    this.updateToolbar();
  }

  private updateToolbar() {
    const toolbar = this.editor.getContainer().querySelector('.xeditor-toolbar');
    if (!toolbar) return;

    // Show/hide toolbar items
    const allItems = toolbar.querySelectorAll('.xeditor-toolbar__item');
    allItems.forEach((item: Element) => {
      const itemElement = item as HTMLElement;
      const itemName = itemElement.dataset.command || itemElement.dataset.name;
      if (itemName) {
        itemElement.style.display = this.settings.toolbar.visibleItems.includes(itemName) ? '' : 'none';
      }
    });

    // Apply mobile optimization
    if (this.settings.toolbar.enableMobileOptimization) {
      toolbar.classList.add('xeditor-toolbar--mobile-optimized');
    } else {
      toolbar.classList.remove('xeditor-toolbar--mobile-optimized');
    }
  }

  private applyCustomCSS(css: string) {
    // Remove existing custom CSS
    const existingStyle = document.querySelector('#xeditor-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new custom CSS
    if (css.trim()) {
      const style = document.createElement('style');
      style.id = 'xeditor-custom-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  private loadSettings() {
    const saved = localStorage.getItem('xeditor-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    }
  }

  private persistSettings() {
    localStorage.setItem('xeditor-settings', JSON.stringify(this.settings));
  }

  private addSettingsCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .xeditor-settings-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }

      .xeditor-settings-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .xeditor-settings-modal {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .xeditor-settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #eee;
      }

      .xeditor-settings-header h2 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }

      .xeditor-settings-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .xeditor-settings-close:hover {
        background: #f5f5f5;
      }

      .xeditor-settings-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .xeditor-settings-tabs {
        display: flex;
        border-bottom: 1px solid #eee;
        overflow-x: auto;
      }

      .xeditor-settings-tab {
        background: none;
        border: none;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 14px;
        white-space: nowrap;
        color: #666;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }

      .xeditor-settings-tab:hover {
        background: #f8f9fa;
      }

      .xeditor-settings-tab.active {
        color: #007bff;
        border-bottom-color: #007bff;
      }

      .xeditor-settings-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .xeditor-settings-section h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        color: #333;
      }

      .xeditor-settings-row {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        gap: 12px;
      }

      .xeditor-settings-row label {
        min-width: 150px;
        font-size: 14px;
        color: #555;
      }

      .xeditor-settings-row input,
      .xeditor-settings-row select,
      .xeditor-settings-row textarea {
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .xeditor-settings-row input[type="checkbox"] {
        flex: none;
        width: auto;
      }

      .xeditor-settings-row input[type="range"] {
        flex: 1;
      }

      .xeditor-settings-value {
        min-width: 50px;
        text-align: center;
        font-size: 14px;
        color: #666;
      }

      .xeditor-toolbar-items {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 8px;
        flex: 1;
      }

      .xeditor-toolbar-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border: 1px solid #eee;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .xeditor-toolbar-item:hover {
        background: #f8f9fa;
      }

      .xeditor-toolbar-item input {
        margin: 0;
      }

      .xeditor-toolbar-item-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }

      .xeditor-toolbar-item-name {
        font-size: 14px;
        color: #555;
      }

      .xeditor-settings-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px;
        border-top: 1px solid #eee;
      }

      .xeditor-settings-footer button {
        padding: 8px 16px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .xeditor-settings-footer button:hover {
        background: #f8f9fa;
      }

      .xeditor-settings-save {
        background: #007bff !important;
        color: white !important;
        border-color: #007bff !important;
      }

      .xeditor-settings-save:hover {
        background: #0056b3 !important;
      }

      .xeditor-settings-reset {
        background: #dc3545 !important;
        color: white !important;
        border-color: #dc3545 !important;
      }

      .xeditor-settings-reset:hover {
        background: #c82333 !important;
      }

      @media (max-width: 768px) {
        .xeditor-settings-modal {
          width: 95%;
          max-height: 90vh;
        }

        .xeditor-settings-row {
          flex-direction: column;
          align-items: stretch;
        }

        .xeditor-settings-row label {
          min-width: auto;
        }

        .xeditor-toolbar-items {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  getSettings(): SettingsConfig {
    return this.settings;
  }

  updateSettings(newSettings: Partial<SettingsConfig>) {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
    this.persistSettings();
  }

  destroy() {
    if (this.settingsPanel) {
      this.settingsPanel.remove();
    }
  }
}