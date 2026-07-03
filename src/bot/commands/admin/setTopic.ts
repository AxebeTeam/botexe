import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('topic')
    .setDescription('Set channel topic')

    .addStringOption(option =>
      option.setName('text')

        .setDescription('The topic text')

        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('channel')

        .setDescription('Channel (default: current)')

    ),
  category: 'admin',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const text = interaction.options.get('text')?.value as string;
    const channel = (interaction.options.get('channel')?.channel || interaction.channel) as any;

    await interaction.deferReply();

    try {
      await channel.setTopic(text);
      await interaction.editReply({ content: t(lang, 'admin.topic_set') });
    } catch (error) {
      await interaction.editReply({ content: `❌ Failed to set topic: ${error}` });
    }
  },
};

export = command;
