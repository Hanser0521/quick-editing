import type { App } from 'obsidian';

interface CommandManagerCompat {
  executeCommandById(commandId: string): boolean | void;
}

type AppWithCommandManager = App & {
  commands?: CommandManagerCompat;
};

const SUPPORTED_COMMANDS = new Set([
  'app:open-settings',
  'global-search:open',
]);

export function executeCoreCommand(app: App, commandId: string): boolean {
  if (!SUPPORTED_COMMANDS.has(commandId)) return false;
  const commandManager = (app as AppWithCommandManager).commands;
  if (typeof commandManager?.executeCommandById !== 'function') return false;
  try {
    return commandManager.executeCommandById(commandId) !== false;
  } catch {
    return false;
  }
}
