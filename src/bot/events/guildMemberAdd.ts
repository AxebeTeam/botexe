import { Client, GuildMember, TextChannel } from 'discord.js';
import { logger } from '../../utils/logger';
import db from '../../database/connection';

export function handleGuildMemberAdd(client: Client): void {
  client.on('guildMemberAdd', async (member: GuildMember) => {
    try {
      const guildData = db.prepare('SELECT welcome_channel, welcome_message FROM guilds WHERE guild_id = ?').get(member.guild.id) as any;
      if (!guildData?.welcome_channel) return;

      let config: any = {};
      if (guildData.welcome_message) {
        try { config = JSON.parse(guildData.welcome_message); } catch {}
      }

      if (config.welcomeEnabled === false || !config.welcome) return;

      const channel = member.guild.channels.cache.get(guildData.welcome_channel) as TextChannel;
      if (!channel) return;

      const content = config.welcome
        .replaceAll('{user}', member.toString())
        .replaceAll('{username}', member.user.username)
        .replaceAll('{server}', member.guild.name);

      await channel.send(content);
    } catch (error) {
      logger.error(`Error in guildMemberAdd: ${error}`);
    }
  });
}