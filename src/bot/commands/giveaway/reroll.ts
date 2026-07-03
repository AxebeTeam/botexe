import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('giveaway-reroll')
    .setDescription('Reroll a giveaway winner')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true)),
  category: 'giveaway',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString('message_id', true);

    const giveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId) as any;
    if (!giveaway) {
      await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      return;
    }

    const previousWinners: string[] = JSON.parse(giveaway.winners || '[]');

    const entries = db.prepare('SELECT user_id FROM giveaway_entries WHERE message_id = ?').all(messageId) as any[];
    const eligible = entries
      .map((e: any) => e.user_id)
      .filter((id: string) => !previousWinners.includes(id));

    if (eligible.length === 0) {
      await interaction.reply({ content: '❌ No eligible entries to reroll.', ephemeral: true });
      return;
    }

    const newWinner = eligible[Math.floor(Math.random() * eligible.length)];
    const updatedWinners = [...previousWinners, newWinner];
    db.prepare('UPDATE giveaways SET winners = ? WHERE message_id = ?').run(JSON.stringify(updatedWinners), messageId);

    await interaction.reply({ content: `🎉 The new winner is <@${newWinner}>! Congratulations! You won **${giveaway.prize}**!` });
  },
};

export = command;
