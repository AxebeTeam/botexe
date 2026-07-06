import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('Show server statistics')
    .setDMPermission(false),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;
    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = totalMembers - bots;
    const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const roles = guild.roles.cache.size;
    const emojis = guild.emojis.cache.size;
    const boostLevel = guild.premiumTier;
    const boosts = guild.premiumSubscriptionCount || 0;

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name} Statistics`)
      .setThumbnail(guild.iconURL({ size: 256 }) ?? undefined)
      .setColor(0x3498db)
      .addFields(
        { name: '👥 Members', value: `Total: **${totalMembers}**\nHumans: **${humans}**\nBots: **${bots}**\nOnline: **${online}**`, inline: true },
        { name: '📝 Channels', value: `Text: **${textChannels}**\nVoice: **${voiceChannels}**`, inline: true },
        { name: '🎭 Other', value: `Roles: **${roles}**\nEmojis: **${emojis}**\nBoosts: **${boosts}** (Tier ${boostLevel})`, inline: true }
      )
      .setTimestamp();

    if (guild.iconURL()) embed.setFooter({ text: `Server ID: ${guild.id}` });

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
