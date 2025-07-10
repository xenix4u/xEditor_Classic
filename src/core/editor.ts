import { 
  Editor, 
  EditorConfig, 
  Toolbar, 
  Selection, 
  CommandManager, 
  PluginManager, 
  HistoryManager, 
  EventEmitter 
} from '../types';
import { createElement, setAttributes } from '../utils/dom';
import { EventEmitterImpl, debounce } from '../utils/events';
import { sanitizeHTML } from '../utils/sanitize';
import { optimizeContent } from '../utils/performance';
import { errorHandler, withErrorHandling } from '../utils/error-handler';
import { SelectionManager } from './selection';
import { CommandManagerImpl } from './command-manager';
import { PluginManagerImpl } from './plugin-manager';
import { HistoryManagerImpl } from './history-manager';
import { ToolbarImpl } from '../ui/toolbar';
import { 
  ImagePlugin,
  ListsPlugin,
  LinkPlugin,
  ColorPlugin,
  FontPlugin,
  CodeBlockPlugin,
  FullscreenPlugin,
  SourcePlugin,
  TablePlugin,
  FindReplacePlugin,
  VideoPlugin,
  ChecklistPlugin,
  ImageCaptionPlugin,
  StatisticsPlugin,
  ResizePlugin,
  MarkdownPlugin,
  InlineToolbarPlugin,
  EmojiPlugin,
  SpecialCharsPlugin,
  CharLimitPlugin,
  FileManagerPlugin,
  QuickInsertPlugin,
  FormElementsPlugin,
  PrintPreviewPlugin,
  AutoSavePlugin,
  VersionHistoryPlugin,
  CommentsPlugin,
  TrackChangesPlugin,
  MobileOptimizationPlugin,
  SettingsPlugin,
  IconsPlugin
} from '../plugins';
import { KeyboardManager } from './keyboard';
import { AccessibilityManager } from '../utils/accessibility';

export class xEditor implements Editor {
  config: EditorConfig;
  container: HTMLElement;
  wrapper: HTMLElement;
  contentElement: HTMLElement;
  toolbar: Toolbar | null = null;
  selection: Selection;
  commands: CommandManager;
  plugins: PluginManager;
  history: HistoryManager;
  events: EventEmitter;
  keyboard: KeyboardManager;
  accessibility: AccessibilityManager;
  // private _initialized: boolean = false;
  private autoSaveTimer?: ReturnType<typeof setTimeout>;

  constructor(config: EditorConfig) {
    try {
      this.config = this.normalizeConfig(config);
      this.container = this.resolveContainer(this.config.container);
      this.events = new EventEmitterImpl();
      
      this.wrapper = this.createWrapper();
      this.contentElement = this.createContentElement();
      this.wrapper.appendChild(this.contentElement);
      
      this.selection = new SelectionManager(this.contentElement);
      this.commands = new CommandManagerImpl();
      this.plugins = new PluginManagerImpl(this);
      this.history = new HistoryManagerImpl(this.contentElement);
      this.keyboard = new KeyboardManager(this);
      this.accessibility = new AccessibilityManager();
      
      this.init();
    } catch (error) {
      errorHandler.handle(error as Error, 'Failed to initialize editor');
      throw error;
    }
  }

  private normalizeConfig(config: EditorConfig): EditorConfig {
    return {
      ...config,
      height: config.height || '400px',
      width: config.width || '100%',
      theme: config.theme || 'light',
      language: config.language || 'en',
      sanitize: config.sanitize !== false,
      placeholder: config.placeholder || 'Start typing...',
      autoSave: config.autoSave || { enabled: false }
    };
  }

  private resolveContainer(container: HTMLElement | string): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container "${container}" not found`);
      }
      return element as HTMLElement;
    }
    return container;
  }

  private createWrapper(): HTMLElement {
    const wrapper = createElement('div', {
      className: 'xeditor-wrapper'
    });
    
    setAttributes(wrapper, {
      'data-theme': this.config.theme!,
      'data-language': this.config.language!
    });
    
    if (typeof this.config.width === 'string') {
      wrapper.style.width = this.config.width;
    } else {
      wrapper.style.width = `${this.config.width}px`;
    }
    
    return wrapper;
  }

  private createContentElement(): HTMLElement {
    const content = createElement('div', {
      className: 'xeditor-content',
      contentEditable: 'true',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Editor content'
    });
    
    if (typeof this.config.height === 'string') {
      content.style.height = this.config.height;
    } else if (typeof this.config.height === 'number') {
      content.style.height = `${this.config.height}px`;
    } else {
      content.style.height = '400px'; // default height
    }
    
    content.style.minHeight = '100px';
    content.style.overflowY = 'auto';
    content.style.outline = 'none';
    content.style.padding = '1rem';
    content.style.boxSizing = 'border-box';
    
    if (this.config.placeholder) {
      content.setAttribute('data-placeholder', this.config.placeholder);
    }
    
    return content;
  }

  private init(): void {
    try {
      this.registerDefaultCommands();
      this.setupEventListeners();
      this.loadPlugins(); // Load plugins before toolbar so they're available
      this.setupToolbar();
      
      this.container.appendChild(this.wrapper);
      
      // Setup accessibility features
      this.accessibility.init(this);
      
      if (this.config.autoSave?.enabled) {
        this.setupAutoSave();
      }
      
      // this._initialized = true;
      
      this.events.emit('ready');
      if (this.config.onReady) {
        this.config.onReady();
      }
    } catch (error) {
      errorHandler.handle(error as Error, 'Failed to initialize editor components');
      throw error;
    }
  }

  private registerDefaultCommands(): void {
    this.commands.register('bold', {
      execute: () => document.execCommand('bold', false),
      queryState: () => document.queryCommandState('bold')
    });
    
    this.commands.register('italic', {
      execute: () => document.execCommand('italic', false),
      queryState: () => document.queryCommandState('italic')
    });
    
    this.commands.register('underline', {
      execute: () => document.execCommand('underline', false),
      queryState: () => document.queryCommandState('underline')
    });
    
    this.commands.register('strikethrough', {
      execute: () => document.execCommand('strikethrough', false),
      queryState: () => document.queryCommandState('strikethrough')
    });
    
    this.commands.register('undo', {
      execute: () => this.history.undo(),
      canExecute: () => this.history.canUndo()
    });
    
    this.commands.register('redo', {
      execute: () => this.history.redo(),
      canExecute: () => this.history.canRedo()
    });
    
    // Paragraph and heading commands
    this.commands.register('formatBlock', {
      execute: (value: string) => {
        if (value.startsWith('<') && value.endsWith('>')) {
          document.execCommand('formatBlock', false, value);
        } else {
          document.execCommand('formatBlock', false, `<${value}>`);
        }
      }
    });
    
    // List commands - these are handled by the lists plugin
    this.commands.register('insertOrderedList', {
      execute: () => document.execCommand('insertOrderedList', false),
      queryState: () => document.queryCommandState('insertOrderedList')
    });
    
    this.commands.register('insertUnorderedList', {
      execute: () => document.execCommand('insertUnorderedList', false),
      queryState: () => document.queryCommandState('insertUnorderedList')
    });
    
    // Link command
    this.commands.register('createLink', {
      execute: (url: string) => {
        if (url) {
          document.execCommand('createLink', false, url);
        }
      }
    });
    
    // Image command
    this.commands.register('insertImage', {
      execute: (src: string) => {
        if (src) {
          document.execCommand('insertImage', false, src);
        }
      }
    });
    
    // Indent/Outdent commands - improved implementation
    this.commands.register('indent', {
      execute: () => this.performIndent()
    });
    
    this.commands.register('outdent', {
      execute: () => this.performOutdent()
    });
    
    // Alignment commands
    this.commands.register('justifyLeft', {
      execute: () => {
        this.focus();
        document.execCommand('justifyLeft', false);
      },
      queryState: () => document.queryCommandState('justifyLeft')
    });
    
    this.commands.register('justifyCenter', {
      execute: () => {
        this.focus();
        document.execCommand('justifyCenter', false);
      },
      queryState: () => document.queryCommandState('justifyCenter')
    });
    
    this.commands.register('justifyRight', {
      execute: () => {
        this.focus();
        document.execCommand('justifyRight', false);
      },
      queryState: () => document.queryCommandState('justifyRight')
    });
    
    this.commands.register('justifyFull', {
      execute: () => {
        this.focus();
        document.execCommand('justifyFull', false);
      },
      queryState: () => document.queryCommandState('justifyFull')
    });
    
    // Horizontal rule command
    this.commands.register('insertHorizontalRule', {
      execute: () => document.execCommand('insertHorizontalRule', false)
    });
    
    // Print command
    this.commands.register('print', {
      execute: () => this.print()
    });
  }

  private setupEventListeners(): void {
    const handleInput = debounce(() => {
      this.history.record();
      this.events.emit('change', this.getContent());
      this.events.emit('contentChange', this.getContent());
      if (this.config.onChange) {
        this.config.onChange(this.getContent());
      }
    }, 300);
    
    this.contentElement.addEventListener('input', handleInput);
    
    // Listen for restored event from history manager
    this.contentElement.addEventListener('restored', () => {
      if (this.toolbar) {
        this.toolbar.updateState();
      }
    });
    
    this.contentElement.addEventListener('focus', () => {
      this.events.emit('focus');
      if (this.config.onFocus) {
        this.config.onFocus();
      }
    });
    
    this.contentElement.addEventListener('blur', () => {
      this.events.emit('blur');
      if (this.config.onBlur) {
        this.config.onBlur();
      }
    });
    
    this.contentElement.addEventListener('paste', withErrorHandling((e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/html') || 
                  e.clipboardData?.getData('text/plain') || '';
      
      const sanitized = this.config.sanitize ? sanitizeHTML(text) : text;
      const optimized = optimizeContent(sanitized);
      document.execCommand('insertHTML', false, optimized);
    }, 'Failed to handle paste'));
    
    this.contentElement.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.execCommand('undo');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.execCommand('redo');
      }
    });
    
    // Selection change event for statistics
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection && this.contentElement.contains(selection.anchorNode)) {
        this.events.emit('selectionChange', selection);
      }
    });
  }

  private setupToolbar(): void {
    const toolbarConfig = this.config.toolbar;
    if (toolbarConfig === false) {
      return;
    }
    if (toolbarConfig === undefined) {
      this.toolbar = new ToolbarImpl(this);
    } else {
      this.toolbar = new ToolbarImpl(this, toolbarConfig);
    }
    this.wrapper.insertBefore(this.toolbar.element, this.contentElement);
  }

  private loadPlugins(): void {
    // Always load image plugin with configuration
    const imagePlugin = new ImagePlugin(this.config.image || {});
    this.plugins.register(imagePlugin);
    
    // Always load lists plugin
    const listsPlugin = new ListsPlugin();
    this.plugins.register(listsPlugin);
    
    // Always load link plugin
    const linkPlugin = new LinkPlugin();
    this.plugins.register(linkPlugin);
    
    // Always load color plugin
    const colorPlugin = new ColorPlugin();
    this.plugins.register(colorPlugin);
    
    // Always load font plugin
    const fontPlugin = new FontPlugin();
    this.plugins.register(fontPlugin);
    
    // Always load code block plugin
    const codeBlockPlugin = new CodeBlockPlugin();
    this.plugins.register(codeBlockPlugin);
    
    // Always load fullscreen plugin
    const fullscreenPlugin = new FullscreenPlugin();
    this.plugins.register(fullscreenPlugin);
    
    // Always load source plugin
    const sourcePlugin = new SourcePlugin();
    this.plugins.register(sourcePlugin);
    
    // Load table plugin
    const tablePlugin = new TablePlugin();
    this.plugins.register(tablePlugin);
    
    // Load find/replace plugin
    const findReplacePlugin = new FindReplacePlugin();
    this.plugins.register(findReplacePlugin);
    
    // Load video plugin
    const videoPlugin = new VideoPlugin();
    this.plugins.register(videoPlugin);
    
    // Load checklist plugin
    const checklistPlugin = new ChecklistPlugin();
    this.plugins.register(checklistPlugin);
    
    // Load image caption plugin
    const imageCaptionPlugin = new ImageCaptionPlugin();
    this.plugins.register(imageCaptionPlugin);
    
    // Load statistics plugin
    const statisticsPlugin = new StatisticsPlugin();
    this.plugins.register(statisticsPlugin);
    
    // Load resize plugin
    const resizePlugin = new ResizePlugin();
    this.plugins.register(resizePlugin);
    
    // Load markdown plugin
    const markdownPlugin = new MarkdownPlugin();
    this.plugins.register(markdownPlugin);
    
    // Load inline toolbar plugin (optional based on config)
    if (this.config.inlineToolbar !== false) {
      const inlineToolbarPlugin = new InlineToolbarPlugin(this.config.inlineToolbar || {});
      this.plugins.register(inlineToolbarPlugin);
    }
    
    // Load emoji plugin
    const emojiPlugin = new EmojiPlugin();
    this.plugins.register(emojiPlugin);
    
    // Load special chars plugin
    const specialCharsPlugin = new SpecialCharsPlugin();
    this.plugins.register(specialCharsPlugin);
    
    // Load char limit plugin (optional based on config)
    if (this.config.charLimit) {
      const charLimitPlugin = new CharLimitPlugin(this.config.charLimit);
      this.plugins.register(charLimitPlugin);
    }
    
    // Load file manager plugin (optional based on config)
    if (this.config.fileManager) {
      const fileManagerPlugin = new FileManagerPlugin(this.config.fileManager);
      this.plugins.register(fileManagerPlugin);
    }
    
    // Load quick insert plugin
    const quickInsertPlugin = new QuickInsertPlugin(this.config.quickInsert || {});
    this.plugins.register(quickInsertPlugin);
    
    // Load form elements plugin
    const formElementsPlugin = new FormElementsPlugin(this.config.formElements || {});
    this.plugins.register(formElementsPlugin);
    
    // Load print preview plugin
    const printPreviewPlugin = new PrintPreviewPlugin(this.config.printPreview || {});
    this.plugins.register(printPreviewPlugin);
    
    // Load autosave plugin (optional based on config)
    if (this.config.autoSave) {
      const autoSavePlugin = new AutoSavePlugin(this.config.autoSave);
      this.plugins.register(autoSavePlugin);
    }
    
    // Load version history plugin (optional based on config)
    if (this.config.versionHistory) {
      const versionHistoryPlugin = new VersionHistoryPlugin(this.config.versionHistory);
      this.plugins.register(versionHistoryPlugin);
    }
    
    // Load comments plugin (optional based on config)
    if (this.config.comments) {
      const commentsPlugin = new CommentsPlugin(this.config.comments);
      this.plugins.register(commentsPlugin);
    }
    
    // Load track changes plugin (optional based on config)
    if (this.config.trackChanges) {
      const trackChangesPlugin = new TrackChangesPlugin(this.config.trackChanges);
      this.plugins.register(trackChangesPlugin);
    }
    
    // Always register mobile optimization plugin
    this.plugins.register(new MobileOptimizationPlugin());
    
    // Always register settings plugin
    this.plugins.register(new SettingsPlugin());
    
    // Always register icons plugin (should be loaded early)
    this.plugins.register(new IconsPlugin());
    
    if (this.config.plugins) {
      // Additional plugin loading will be implemented
    }
  }

  private setupAutoSave(): void {
    const interval = this.config.autoSave?.interval || 30000;
    const key = 'xeditor-autosave';
    const metaKey = `${key}-meta`;
    
    // Save with metadata
    this.autoSaveTimer = setInterval(() => {
      const content = this.getContent();
      const metadata = {
        timestamp: Date.now(),
        version: '1.0',
        wordCount: this.getWordCount(content),
        checksum: this.generateChecksum(content)
      };
      
      try {
        localStorage.setItem(key, content);
        localStorage.setItem(metaKey, JSON.stringify(metadata));
        this.events.emit('autosave', { content, metadata });
      } catch (error) {
        // AutoSave failed
        this.events.emit('autosave:error', error);
      }
    }, interval);
    
    // Check for saved content
    this.checkAutoSaveRecovery(key, metaKey);
  }
  
  private checkAutoSaveRecovery(key: string, metaKey: string): void {
    try {
      const saved = localStorage.getItem(key);
      const metaStr = localStorage.getItem(metaKey);
      
      if (!saved) return;
      
      const metadata = metaStr ? JSON.parse(metaStr) : null;
      const currentContent = this.getContent();
      
      // Don't restore if current content is not empty
      if (currentContent.replace(/<[^>]*>/g, '').trim()) {
        return;
      }
      
      // Check if saved content is recent (within 24 hours)
      if (metadata && metadata.timestamp) {
        const age = Date.now() - metadata.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age > maxAge) {
          // Clear old autosave
          localStorage.removeItem(key);
          localStorage.removeItem(metaKey);
          return;
        }
      }
      
      // Show recovery dialog
      this.showRecoveryDialog(saved, metadata);
    } catch (error) {
      // Failed to check autosave
    }
  }
  
  private showRecoveryDialog(content: string, metadata: { timestamp?: number; wordCount?: number }): void {
    const shouldRecover = confirm(
      `Found autosaved content from ${metadata?.timestamp ? new Date(metadata.timestamp).toLocaleString() : 'previous session'}.\n\n` +
      `Words: ${metadata?.wordCount || 'unknown'}\n\n` +
      `Would you like to restore it?`
    );
    
    if (shouldRecover) {
      this.setContent(content);
      this.events.emit('autosave:recovered', { content, metadata });
    } else {
      // Clear autosave if user declines
      const key = 'xeditor-autosave';
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}-meta`);
    }
  }
  
  private getWordCount(html: string): number {
    const text = html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  private generateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  getContent(): string {
    return this.contentElement.innerHTML;
  }

  setContent(content: string): void {
    try {
      const sanitized = this.config.sanitize ? sanitizeHTML(content) : content;
      const optimized = optimizeContent(sanitized);
      this.contentElement.innerHTML = optimized;
      this.history.record();
      this.events.emit('change', optimized);
    } catch (error) {
      errorHandler.handle(error as Error, 'Failed to set content');
    }
  }

  insertContent(content: string): void {
    const sanitized = this.config.sanitize ? sanitizeHTML(content) : content;
    this.execCommand('insertHTML', sanitized);
  }

  focus(): void {
    this.contentElement.focus();
  }

  blur(): void {
    this.contentElement.blur();
  }

  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.plugins.getAll().forEach(plugin => {
      this.plugins.unregister(plugin.name);
    });
    
    this.events.emit('destroy');
    (this.events as EventEmitterImpl).clear();
    
    this.container.removeChild(this.wrapper);
    // this._initialized = false;
  }

  execCommand(command: string, value?: unknown): void {
    const executeCommand = withErrorHandling(() => {
      this.selection.save();
      
      // Record state before command for better undo/redo
      if (command !== 'undo' && command !== 'redo') {
        // Recording state before command
        (this.history as HistoryManagerImpl).recordImmediate();
      }
      
      if (command === 'insertHTML') {
        document.execCommand('insertHTML', false, value as string);
      } else {
        this.commands.execute(command, value);
      }
      
      this.selection.restore();
      
      if (this.toolbar) {
        this.toolbar.updateState();
      }
      
      // Emit command executed event for accessibility
      this.events.emit('commandExecuted', command);
      
      // Record state after command
      if (command !== 'undo' && command !== 'redo') {
        setTimeout(() => {
          // Recording state after command
          (this.history as HistoryManagerImpl).recordImmediate();
        }, 100);
      }
    }, `Failed to execute command: ${command}`);
    
    executeCommand();
  }

  queryCommandState(command: string): boolean {
    return this.commands.queryState(command);
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.events.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.events.off(event, handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.events.emit(event, ...args);
  }
  
  // Custom indent/outdent implementation
  private performIndent(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find the closest block element
    let blockElement = container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container as Element;
    
    while (blockElement && !this.isBlockElement(blockElement)) {
      blockElement = blockElement.parentElement;
    }
    
    if (blockElement) {
      const currentStyle = window.getComputedStyle(blockElement);
      const currentMargin = parseInt(currentStyle.marginLeft) || 0;
      (blockElement as HTMLElement).style.marginLeft = `${currentMargin + 40}px`;
    }
  }
  
  private performOutdent(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find the closest block element
    let blockElement = container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container as Element;
    
    while (blockElement && !this.isBlockElement(blockElement)) {
      blockElement = blockElement.parentElement;
    }
    
    if (blockElement) {
      const currentStyle = window.getComputedStyle(blockElement);
      const currentMargin = parseInt(currentStyle.marginLeft) || 0;
      const newMargin = Math.max(0, currentMargin - 40);
      (blockElement as HTMLElement).style.marginLeft = newMargin > 0 ? `${newMargin}px` : '';
    }
  }
  
  private isBlockElement(element: Element): boolean {
    const blockElements = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE'];
    return blockElements.includes(element.tagName);
  }

  print(): void {
    // Create a print-friendly window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow pop-ups to print the content.');
      return;
    }
    
    // Get the content
    const content = this.getContent();
    const theme = this.wrapper.getAttribute('data-theme') || 'light';
    
    // Create print document
    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Print Preview</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: ${theme === 'dark' ? '#f8f9fa' : '#212529'};
            background-color: ${theme === 'dark' ? '#212529' : '#ffffff'};
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
          h1, h2, h3, h4, h5, h6 {
            margin-top: 0;
            margin-bottom: 0.5em;
            font-weight: 600;
            line-height: 1.2;
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
          }
          
          pre {
            margin: 0 0 1em 0;
            padding: 1em;
            background-color: #f6f8fa;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            overflow-x: auto;
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
          }
          
          a {
            color: #007bff;
            text-decoration: underline;
          }
          
          table {
            width: 100%;
            margin-bottom: 1em;
            border-collapse: collapse;
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
          }
          
          @media print {
            body {
              color: #000;
              background-color: #fff;
            }
            
            a {
              color: #000;
              text-decoration: underline;
            }
            
            pre {
              border: 1px solid #ddd;
            }
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(printDoc);
    printWindow.document.close();
  }
}