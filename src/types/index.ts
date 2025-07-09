export interface EditorConfig {
  container: HTMLElement | string;
  height?: string | number;
  width?: string | number;
  placeholder?: string;
  theme?: 'light' | 'dark' | string;
  language?: string;
  toolbar?: ToolbarConfig | false;
  plugins?: string[];
  shortcuts?: ShortcutMap;
  onChange?: (content: string) => void;
  onReady?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  sanitize?: boolean;
  autoSave?: AutoSaveConfig;
  versionHistory?: VersionHistoryConfig;
  image?: {
    maxWidth?: number;
    maxSize?: number;
    quality?: number;
    resizeBeforeUpload?: boolean;
    upload?: (file: File) => Promise<string>;
  };
  inlineToolbar?: false | {
    items?: string[];
    offset?: { x: number; y: number };
    showDelay?: number;
  };
  charLimit?: {
    maxChars?: number;
    maxWords?: number;
    hardLimit?: boolean;
    countSpaces?: boolean;
    showCounter?: boolean;
    counterPosition?: 'bottom' | 'top';
    warnThreshold?: number;
  };
  fileManager?: {
    getFiles: (path?: string) => Promise<any[]>;
    uploadFile?: (file: File, path?: string) => Promise<any>;
    deleteFile?: (id: string) => Promise<boolean>;
    createFolder?: (name: string, path?: string) => Promise<any>;
    acceptedTypes?: string[];
    maxFileSize?: number;
    enableUpload?: boolean;
    enableDelete?: boolean;
    enableFolders?: boolean;
    viewMode?: 'grid' | 'list';
  };
  quickInsert?: {
    trigger?: string;
    items?: any[];
    maxItems?: number;
  };
  formElements?: {
    enabledElements?: string[];
    defaultStyles?: boolean;
  };
  printPreview?: {
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
  };
  comments?: CommentsConfig;
  trackChanges?: TrackChangesConfig;
}

export interface ToolbarConfig {
  items?: string[] | ToolbarItem[];
  position?: 'top' | 'bottom' | 'floating';
  sticky?: boolean;
  groups?: ToolbarGroup[];
}

export interface ToolbarItem {
  name: string;
  icon?: string;
  text?: string;
  tooltip?: string;
  command?: string;
  dropdown?: DropdownItem[];
  active?: () => boolean;
  enabled?: () => boolean;
  onClick?: () => void;
}

export interface ToolbarGroup {
  name: string;
  items: string[] | ToolbarItem[];
}

export interface DropdownItem {
  text: string;
  value?: string;
  icon?: string;
  style?: string;
  onClick?: () => void;
}

export interface ShortcutMap {
  [key: string]: string | (() => void);
}

export interface Plugin {
  name: string;
  init: (editor: Editor) => void;
  destroy?: () => void;
  commands?: CommandMap;
  toolbar?: ToolbarItem[];
  shortcuts?: ShortcutMap;
}

export interface CommandMap {
  [name: string]: Command;
}

export interface Command {
  execute: (value?: any) => void;
  canExecute?: () => boolean;
  queryState?: () => boolean;
}

export interface Selection {
  range: Range | null;
  text: string;
  container: Node | null;
  save(): void;
  restore(): void;
  clear(): void;
}

export interface Editor {
  config: EditorConfig;
  container: HTMLElement;
  wrapper: HTMLElement;
  contentElement: HTMLElement;
  toolbar: Toolbar | null;
  selection: Selection;
  commands: CommandManager;
  plugins: PluginManager;
  history: HistoryManager;
  events: EventEmitter;
  
  getContent(): string;
  setContent(content: string): void;
  insertContent(content: string): void;
  focus(): void;
  blur(): void;
  destroy(): void;
  
  execCommand(command: string, value?: any): void;
  queryCommandState(command: string): boolean;
  
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, ...args: any[]): void;
}

export interface Toolbar {
  element: HTMLElement;
  items: Map<string, ToolbarItem>;
  render(): void;
  addItem(item: ToolbarItem): void;
  removeItem(name: string): void;
  updateState(): void;
  show(): void;
  hide(): void;
}

export interface CommandManager {
  register(name: string, command: Command): void;
  unregister(name: string): void;
  execute(name: string, value?: any): void;
  canExecute(name: string): boolean;
  queryState(name: string): boolean;
}

export interface PluginManager {
  register(plugin: Plugin): void;
  unregister(name: string): void;
  get(name: string): Plugin | undefined;
  getAll(): Plugin[];
}

export interface HistoryManager {
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  record(): void;
  clear(): void;
}

export interface EventEmitter {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  once(event: string, handler: Function): void;
  emit(event: string, ...args: any[]): void;
}

// AutoSave Plugin Types
export interface AutoSaveConfig {
  enabled: boolean;
  interval?: number; // milliseconds, default 30000 (30 seconds)
  storageBackend?: AutoSaveStorage;
  showStatus?: boolean;
  showLastSaveTime?: boolean;
}

export interface AutoSaveStorage {
  save(key: string, content: string): Promise<void>;
  load(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

export interface AutoSaveStatus {
  state: 'idle' | 'saving' | 'saved' | 'error';
  lastSaveTime?: Date;
  error?: Error;
}

// Version History Plugin Types
export interface VersionHistoryConfig {
  enabled: boolean;
  maxVersions?: number; // default 50
  storageBackend?: VersionHistoryStorage;
  autoSaveVersions?: boolean;
  autoSaveInterval?: number; // milliseconds
}

export interface VersionHistoryStorage {
  save(version: Version): Promise<void>;
  load(id: string): Promise<Version | null>;
  loadAll(): Promise<Version[]>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

export interface Version {
  id: string;
  content: string;
  timestamp: Date;
  size: number;
  description?: string;
  tags?: string[];
}

export interface VersionDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

// Comments Plugin Types
export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  range: {
    startOffset: number;
    endOffset: number;
    startPath: number[];
    endPath: number[];
  };
  resolved: boolean;
  replies?: Comment[];
  parentId?: string;
  edited?: Date;
}

export interface CommentThread {
  id: string;
  comments: Comment[];
  range: {
    startOffset: number;
    endOffset: number;
    startPath: number[];
    endPath: number[];
  };
  resolved: boolean;
}

export interface CommentsConfig {
  enabled?: boolean;
  currentUser?: string;
  sidePanel?: boolean;
  allowReplies?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  onCommentAdd?: (comment: Comment) => void;
  onCommentUpdate?: (comment: Comment) => void;
  onCommentDelete?: (commentId: string) => void;
}

// Track Changes Plugin Types
export interface Change {
  id: string;
  type: 'insert' | 'delete' | 'format';
  author: string;
  timestamp: Date;
  content?: string;
  oldContent?: string;
  range: {
    startOffset: number;
    endOffset: number;
    startPath: number[];
    endPath: number[];
  };
  accepted?: boolean;
  rejected?: boolean;
}

export interface TrackChangesConfig {
  enabled?: boolean;
  currentUser?: string;
  authorColors?: { [author: string]: string };
  showAuthors?: boolean;
  showTimestamps?: boolean;
  onChangeAdd?: (change: Change) => void;
  onChangeAccept?: (changeId: string) => void;
  onChangeReject?: (changeId: string) => void;
}