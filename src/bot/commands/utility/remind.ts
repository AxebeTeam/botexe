import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    case 'w': return num * 7 * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(option =>
      option.setName('time').setDescription('Duration: 30m, 2h, 1d, 1w').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message').setDescription('What to remind you about').setRequired(true)
    ),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const timeStr = interaction.options.get('time')?.value as string;
    const message = interaction.options.get('message')?.value as string;
    const duration = parseDuration(timeStr);
    if (!duration) {
      await interaction.reply({ content: '❌ Invalid time format. Use: `30m`, `2h`, `1d`, `1w`', ephemeral: true });
      return;
    }
    const remindAt = new Date(Date.now() + duration).toISOString();
    db.prepare('INSERT INTO reminders (user_id, guild_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?, ?)').run(
      interaction.user.id, interaction.guildId, interaction.channelId, message, remindAt
    );
    await interaction.reply({ content: `⏰ Reminder set! I'll remind you in **${timeStr}**.`, ephemeral: true });
  },
};

export = command;
