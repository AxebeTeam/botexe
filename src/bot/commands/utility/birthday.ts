import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Set your birthday')
    .addSubcommand(sub =>
      sub.setName('set').setDescription('Set your birthday')
        .addIntegerOption(o => o.setName('day').setDescription('Day (1-31)').setRequired(true).setMinValue(1).setMaxValue(31))
        .addIntegerOption(o => o.setName('month').setDescription('Month (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
        .addIntegerOption(o => o.setName('year').setDescription('Year (optional)').setRequired(false).setMinValue(1900).setMaxValue(2030))
    )
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove your birthday')
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all birthdays')
    ),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (sub === 'set') {
      const day = interaction.options.get('day')?.value as number;
      const month = interaction.options.get('month')?.value as number;
      const year = interaction.options.get('year')?.value as number | null;

      try {
        const date = new Date(year || 2000, month - 1, day);
        if (date.getDate() !== day || date.getMonth() !== month - 1) {
          await interaction.reply({ content: '❌ Invalid date.', ephemeral: true });
          return;
        }
      } catch {
        await interaction.reply({ content: '❌ Invalid date.', ephemeral: true });
        return;
      }

      db.prepare('INSERT OR REPLACE INTO birthdays (guild_id, user_id, day, month, year) VALUES (?, ?, ?, ?, ?)').run(guildId, interaction.user.id, day, month, year);
      await interaction.reply({ content: `🎂 Your birthday has been set to **${MONTHS[month-1]} ${day}${year ? `, ${year}` : ''}**!`, ephemeral: true });
    } else if (sub === 'remove') {
      db.prepare('DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?').run(guildId, interaction.user.id);
      await interaction.reply({ content: '🎂 Your birthday has been removed.', ephemeral: true });
    } else if (sub === 'list') {
      const birthdays = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? ORDER BY month, day').all(guildId) as any[];
      if (birthdays.length === 0) {
        await interaction.reply({ content: 'No birthdays set in this server.', ephemeral: true });
        return;
      }
      const list = birthdays.map(b => `<@${b.user}> — **${MONTHS[b.month-1]} ${b.day}**`).join('\n');
      await interaction.reply({ content: `🎂 **Birthdays:**\n${list}` });
    }
  },
};

export = command;
