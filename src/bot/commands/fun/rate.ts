import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Rate something from 1-10')
    .addStringOption(option => option.setName('thing').setDescription('What to rate').setRequired(true)),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const thing = interaction.options.get('thing')?.value as string;
    const rating = Math.floor(Math.random() * 11);
    const stars = '⭐'.repeat(Math.min(rating, 10));
    const embed = new EmbedBuilder()
      .setTitle('📊 Rate')
      .setDescription(`I rate **${thing}** a **${rating}/10**\n${stars}`)
      .setColor(rating >= 7 ? 0x2ecc71 : rating >= 4 ? 0xf39c12 : 0xe74c3c)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
