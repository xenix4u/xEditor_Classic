import { CommandManager, Command } from '../types';

export class CommandManagerImpl implements CommandManager {
  private commands: Map<string, Command> = new Map();

  register(name: string, command: Command): void {
    if (this.commands.has(name)) {
      // Command already exists, overwriting
    }
    this.commands.set(name, command);
  }

  unregister(name: string): void {
    this.commands.delete(name);
  }

  execute(name: string, value?: unknown): void {
    const command = this.commands.get(name);
    if (!command) {
      // Command not found
      return;
    }

    if (command.canExecute && !command.canExecute()) {
      // Command cannot be executed
      return;
    }

    command.execute(value);
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
      // Error querying state
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