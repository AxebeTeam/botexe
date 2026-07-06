import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status')
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for being AFK').setRequired(false)
    ),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const reason = (interaction.options.get('reason')?.value as string) || 'AFK';
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;

    db.prepare('INSERT OR REPLACE INTO afk_users (guild_id, user_id, reason, afk_since) VALUES (?, ?, ?, datetime("now"))').run(guildId, userId, reason);

    await interaction.reply({ content: `💤 You are now AFK: **${reason}**`, ephemeral: true });
  },
};

export = command;
