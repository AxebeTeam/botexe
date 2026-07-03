import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),
  category: 'utility',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const sent = await interaction.deferReply({ fetchReply: true });

    const embed = new EmbedBuilder()
      .setTitle(t(lang, 'utility.ping'))
      .setColor(0x00ff00)
      .addFields(
        { name: t(lang, 'utility.ping_latency'), value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, inline: true },
        { name: t(lang, 'utility.api_latency'), value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export = command;
