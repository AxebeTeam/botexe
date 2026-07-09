import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Let me choose for you')
    .addStringOption(option =>
      option.setName('options').setDescription('Options separated by commas').setRequired(true)
    ),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const optionsStr = interaction.options.get('options')?.value as string;
    const options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0);
    if (options.length < 2) {
      await interaction.reply({ content: '❌ Give me at least 2 options separated by commas!', ephemeral: true });
      return;
    }
    const chosen = options[Math.floor(Math.random() * options.length)];
    const embed = new EmbedBuilder()
      .setTitle('🤔 I choose...')
      .setDescription(`**${chosen}**`)
      .setColor(0x9b59b6)
      .setFooter({ text: `Out of ${options.length} options` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
