import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice')
    .addIntegerOption(option =>
      option.setName('sides').setDescription('Number of sides (default 6)').setRequired(false).setMinValue(2).setMaxValue(100)
    )
    .addIntegerOption(option =>
      option.setName('count').setDescription('Number of dice (default 1)').setRequired(false).setMinValue(1).setMaxValue(10)
    ),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const sides = (interaction.options.get('sides')?.value as number) || 6;
    const count = (interaction.options.get('count')?.value as number) || 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder()
      .setTitle('🎲 Dice Roll')
      .setDescription(`Rolled ${count}d${sides}: ${rolls.join(', ')}\n**Total: ${total}**`)
      .setColor(0x3498db)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
