import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check balance for')
    ),
  category: 'economy',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const target = interaction.options.get('user')?.user || interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    const row = db.prepare('SELECT balance, bank FROM economy WHERE guild_id = ? AND user_id = ?').get(interaction.guildId, target.id) as any;

    const wallet = row?.balance ?? 0;
    const bank = row?.bank ?? 0;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setAuthor({ name: member?.displayName || target.username, iconURL: target.displayAvatarURL() })
      .addFields(
        { name: 'Wallet', value: `$${wallet.toLocaleString()}`, inline: true },
        { name: 'Bank', value: `$${bank.toLocaleString()}`, inline: true },
        { name: 'Total', value: `$${(wallet + bank).toLocaleString()}`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
