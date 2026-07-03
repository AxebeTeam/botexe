import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user information')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user to check')

    ),
  category: 'utility',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const user = interaction.options.get('user')?.user || interaction.user;
    const member = interaction.guild?.members.cache.get(user.id);

    const embed = new EmbedBuilder()
      .setTitle(t(lang, 'utility.user_info'))
      .setColor(0x0099ff)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: t(lang, 'utility.tag'), value: user.tag, inline: true },
        { name: t(lang, 'utility.id'), value: user.id, inline: true },
        { name: t(lang, 'utility.bot_status'), value: user.bot ? 'Yes' : 'No', inline: true },
        { name: t(lang, 'utility.joined_at'), value: member?.joinedAt?.toLocaleDateString() || 'N/A', inline: true },
        { name: t(lang, 'utility.roles_count'), value: String(member?.roles.cache.size || 0), inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
