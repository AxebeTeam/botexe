import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '🪙' : '🌕';
    const embed = new EmbedBuilder()
      .setTitle('🪙 Coin Flip')
      .setDescription(`The coin landed on **${result}** ${emoji}`)
      .setColor(result === 'heads' ? 0xf1c40f : 0x95a5a6)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
