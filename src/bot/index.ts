import { Client, GatewayIntentBits } from 'discord.js';
import { loadCommands, syncGuild } from './handlers/commandHandler';
import { handleReady } from './events/ready';
import { handleInteractionCreate } from './events/interactionCreate';
import { handleGuildCreate } from './events/guildCreate';
import { handleGuildDelete } from './events/guildDelete';
import { handleGuildMemberAdd } from './events/guildMemberAdd';
import { handleGuildMemberRemove } from './events/guildMemberRemove';
import { handleMessageCreate } from './events/messageCreate';
import { handleAutoModMessage } from './events/autoModMessage';
import { handleReactionRoles } from './events/reactionRoleHandler';
import { handleTicketButtons } from './events/ticketButtonHandler';
import { handleSuggestionVotes } from './events/suggestionVoteHandler';
import { logger } from '../utils/logger';

let client: Client;

export function createBotClient(): Client {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildPresences,
    ],
  });

  loadCommands();
  handleReady(client);
  handleInteractionCreate(client);
  handleGuildCreate(client);
  handleGuildDelete(client);
  handleGuildMemberAdd(client);
  handleGuildMemberRemove(client);
  handleMessageCreate(client);
  handleAutoModMessage(client);
  handleReactionRoles(client);
  handleTicketButtons(client);
  handleSuggestionVotes(client);

  return client;
}

export async function startBot(): Promise<Client> {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    logger.error('BOT_TOKEN is not set in .env');
    process.exit(1);
  }

  const client = createBotClient();

  await client.login(token);
  logger.success('Bot logged in successfully!');

  const guildIds = client.guilds.cache.map(g => g.id);
  if (guildIds.length > 0) {
    logger.info(`Syncing commands to ${guildIds.length} guilds...`);
    for (const gId of guildIds) {
      await syncGuild(gId).catch(e => logger.warn(`Failed to sync guild ${gId}: ${e}`));
      await new Promise(r => setTimeout(r, 300));
    }
    logger.success(`Commands synced to all ${guildIds.length} guilds`);
  }

  return client;
}

export function getClient(): Client {
  return client;
}
