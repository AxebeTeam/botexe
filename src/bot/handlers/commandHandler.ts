import { Collection, REST, Routes, SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';

export interface BotCommand {
  data: SlashCommandBuilder | any;
  execute: (interaction: any) => Promise<void>;
  category: string;
  permissionLevel?: number;
  cooldown?: number;
}

const commands = new Collection<string, BotCommand>();
const cooldowns = new Collection<string, Collection<string, number>>();

export function getCommands(): Collection<string, BotCommand> {
  return commands;
}

function clearModuleCache(dir: string): void {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(dir + path.sep)) {
      delete require.cache[key];
    }
  }
}

export function reloadCommandsFromDisk(): number {
  const commandsPath = path.join(__dirname, '..', 'commands');
  clearModuleCache(commandsPath);
  commands.clear();

  if (!fs.existsSync(commandsPath)) {
    logger.error(`Commands directory not found: ${commandsPath}`);
    return 0;
  }

  const categories = fs.readdirSync(commandsPath);
  let loaded = 0;

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter(file =>
      (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts')
    );

    for (const file of commandFiles) {
      try {
        const command = require(path.join(categoryPath, file)) as BotCommand;
        if ('data' in command && 'execute' in command) {
          commands.set(command.data.name, command);
          loaded++;
        } else {
          logger.warn(`Command ${file} missing required fields`);
        }
      } catch (err) {
        logger.error(`Failed to load command ${file}: ${err}`);
      }
    }
  }

  logger.success(`Reloaded ${loaded} commands from disk`);
  return loaded;
}

export function loadCommands(): void {
  reloadCommandsFromDisk();
}

export async function clearGlobalCommands(): Promise<{ success: boolean; error?: string }> {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), { body: [] });
    logger.success('Cleared all global commands');
    return { success: true };
  } catch (error: any) {
    logger.error(`Failed to clear global commands: ${error}`);
    return { success: false, error: error.message || String(error) };
  }
}

export async function syncGuild(guildId: string): Promise<{ count: number; error?: string }> {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

  try {
    const slashCommands = commands.map(cmd => cmd.data.toJSON());
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId), { body: slashCommands });
    return { count: slashCommands.length };
  } catch (error: any) {
    return { count: 0, error: error.message || String(error) };
  }
}

export async function reloadAndSync(guildIds?: string[]): Promise<{ guilds: number; errors: string[] }> {
  const result = { guilds: 0, errors: [] as string[] };

  const loaded = reloadCommandsFromDisk();
  if (loaded === 0) {
    result.errors.push('No commands could be loaded from disk');
    return result;
  }

  if (guildIds && guildIds.length > 0) {
    for (const gId of guildIds) {
      const guildResult = await syncGuild(gId);
      if (guildResult.error) {
        result.errors.push(`Guild ${gId}: ${guildResult.error}`);
      } else {
        result.guilds += guildResult.count || 0;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    logger.success(`Synced commands to ${guildIds.length} guilds`);
  }

  return result;
}

export function handleCooldown(commandName: string, userId: string, cooldownSeconds: number): boolean {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection());
  }

  const timestamps = cooldowns.get(commandName)!;
  const now = Date.now();
  const cooldownAmount = cooldownSeconds * 1000;

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId)! + cooldownAmount;
    if (now < expirationTime) {
      return false;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);
  return true;
}
