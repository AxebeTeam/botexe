import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('keyinfo')
    .setDescription('Check key status for this server'),
  category: 'keys',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in servers.', flags: MessageFlags.Ephemeral });
      return;
    }

    const lang = getLanguageForGuild(interaction.guildId);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const key = db.prepare('SELECT * FROM keys WHERE guild_id = ?').get(interaction.guildId) as any;

    if (!key) {
      await interaction.editReply({ content: t(lang, 'common.no_key') });
      return;
    }

    const isExpired = key.expires_at ? Date.now() > new Date(key.expires_at).getTime() : false;
    const daysLeft = key.expires_at
      ? Math.max(0, Math.floor((new Date(key.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    const embed = new EmbedBuilder()
      .setTitle(t(lang, 'keys.key_info'))
      .setColor(isExpired ? 0xff0000 : key.is_active ? 0x00ff00 : 0xffa500)
      .addFields(
        { name: t(lang, 'keys.key'), value: `\`${key.key}\``, inline: true },
        { name: t(lang, 'keys.status'), value: isExpired ? t(lang, 'keys.expired_status') : key.is_active ? t(lang, 'keys.active') : t(lang, 'keys.inactive'), inline: true },
        { name: t(lang, 'keys.created_at'), value: key.created_at || 'N/A', inline: true },
        { name: t(lang, 'keys.activated_at'), value: key.activated_at || 'N/A', inline: true },
        { name: t(lang, 'keys.expires_at'), value: key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'N/A', inline: true },
        { name: t(lang, 'keys.days_remaining'), value: String(daysLeft), inline: true },
      )
      .setFooter({ text: `ID: ${interaction.guildId}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export = command;
