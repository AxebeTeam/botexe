import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, version } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Get bot information'),
  category: 'utility',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const client = interaction.client;

    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setTitle(t(lang, 'utility.bot_info'))
      .setColor(0x0099ff)
      .setThumbnail(client.user!.displayAvatarURL())
      .addFields(
        { name: t(lang, 'utility.name'), value: client.user!.tag, inline: true },
        { name: t(lang, 'utility.servers'), value: String(client.guilds.cache.size), inline: true },
        { name: t(lang, 'utility.users'), value: String(totalUsers), inline: true },
        { name: t(lang, 'utility.uptime'), value: `${days}d ${hours}h ${minutes}m`, inline: true },
        { name: 'Discord.js', value: `v${version}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
