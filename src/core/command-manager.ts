import { CommandManager, Command } from '../types';

export class CommandManagerImpl implements CommandManager {
  private commands: Map<string, Command> = new Map();

  register(name: string, command: Command): void {
    if (this.commands.has(name)) {
      console.warn(`Command "${name}" is already registered. Overwriting...`);
    }
    this.commands.set(name, command);
  }

  unregister(name: string): void {
    this.commands.delete(name);
  }

  execute(name: string, value?: any): void {
    const command = this.commands.get(name);
    if (!command) {
      console.error(`Command "${name}" not found`);
      return;
    }

    if (command.canExecute && !command.canExecute()) {
      console.warn(`Command "${name}" cannot be executed`);
      return;
    }

    try {
      command.execute(value);
    } catch (error) {
      console.error(`Error executing command "${name}":`, error);
    }
  }

  canExecute(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) return false;
    
    return command.canExecute ? command.canExecute() : true;
  }

  queryState(name: string): boolean {
    const command = this.commands.get(name);
    if (!command || !command.queryState) return false;
    
    try {
      return command.queryState();
    } catch (error) {
      console.error(`Error querying state for command "${name}":`, error);
      return false;
    }
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  clear(): void {
    this.commands.clear();
  }
}