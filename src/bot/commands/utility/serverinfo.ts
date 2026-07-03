import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get server information'),
  category: 'utility',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({ content: 'This command can only be used in servers.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(t(lang, 'utility.server_info'))
      .setColor(0x0099ff)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: t(lang, 'utility.server_name'), value: guild.name, inline: true },
        { name: t(lang, 'utility.server_id'), value: guild.id, inline: true },
        { name: t(lang, 'utility.owner'), value: `<@${guild.ownerId}>`, inline: true },
        { name: t(lang, 'utility.members'), value: String(guild.memberCount), inline: true },
        { name: t(lang, 'utility.channels'), value: String(guild.channels.cache.size), inline: true },
        { name: t(lang, 'utility.roles'), value: String(guild.roles.cache.size), inline: true },
        { name: t(lang, 'utility.boost_level'), value: String(guild.premiumTier), inline: true },
        { name: t(lang, 'utility.created_on'), value: guild.createdAt.toLocaleDateString(), inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
