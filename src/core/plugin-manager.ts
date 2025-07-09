import { PluginManager, Plugin, Editor } from '../types';

export class PluginManagerImpl implements PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered. Skipping...`);
      return;
    }

    try {
      plugin.init(this.editor);
      this.plugins.set(plugin.name, plugin);

      if (plugin.commands) {
        Object.entries(plugin.commands).forEach(([name, command]) => {
          this.editor.commands.register(name, command);
        });
      }

      if (plugin.toolbar && this.editor.toolbar) {
        plugin.toolbar.forEach(item => {
          this.editor.toolbar!.addItem(item);
        });
      }

      if (plugin.shortcuts) {
        Object.entries(plugin.shortcuts).forEach(([key, handler]) => {
          this.registerShortcut(key, handler);
        });
      }

      this.editor.events.emit('plugin:registered', plugin);
    } catch (error) {
      console.error(`Failed to register plugin "${plugin.name}":`, error);
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      console.warn(`Plugin "${name}" not found`);
      return;
    }

    try {
      if (plugin.destroy) {
        plugin.destroy();
      }

      if (plugin.commands) {
        Object.keys(plugin.commands).forEach(cmdName => {
          this.editor.commands.unregister(cmdName);
        });
      }

      if (plugin.toolbar && this.editor.toolbar) {
        plugin.toolbar.forEach(item => {
          this.editor.toolbar!.removeItem(item.name);
        });
      }

      this.plugins.delete(name);
      this.editor.events.emit('plugin:unregistered', plugin);
    } catch (error) {
      console.error(`Failed to unregister plugin "${name}":`, error);
    }
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  private registerShortcut(key: string, handler: string | (() => void)): void {
    const normalizedKey = this.normalizeShortcut(key);
    
    this.editor.container.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.matchShortcut(e, normalizedKey)) {
        e.preventDefault();
        
        if (typeof handler === 'string') {
          this.editor.execCommand(handler);
        } else {
          handler();
        }
      }
    });
  }

  private normalizeShortcut(shortcut: string): string {
    return shortcut
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace('cmd', 'meta')
      .replace('command', 'meta')
      .replace('option', 'alt')
      .replace('return', 'enter');
  }

  private matchShortcut(event: KeyboardEvent, shortcut: string): boolean {
    const parts = shortcut.split('+');
    const key = parts[parts.length - 1];
    
    const modifiers = {
      ctrl: false,
      meta: false,
      alt: false,
      shift: false
    };
    
    parts.slice(0, -1).forEach(part => {
      if (part in modifiers) {
        modifiers[part as keyof typeof modifiers] = true;
      }
    });
    
    return (
      event.key.toLowerCase() === key &&
      event.ctrlKey === modifiers.ctrl &&
      event.metaKey === modifiers.meta &&
      event.altKey === modifiers.alt &&
      event.shiftKey === modifiers.shift
    );
  }
}