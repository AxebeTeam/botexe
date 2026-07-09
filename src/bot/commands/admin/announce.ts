import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement')
    .addChannelOption(option => option.setName('channel').setDescription('Target channel').setRequired(true))
    .addStringOption(option => option.setName('title').setDescription('Announcement title').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('Announcement message').setRequired(true))
    .addStringOption(option => option.setName('color').setDescription('Embed color hex (e.g. 3498db)').setRequired(false))
    .addUserOption(option => option.setName('ping').setDescription('User or role to ping').setRequired(false)),
  category: 'admin',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel') as TextChannel;
    const title = interaction.options.get('title')?.value as string;
    const message = interaction.options.get('message')?.value as string;
    const colorStr = interaction.options.get('color')?.value as string | undefined;
    const ping = interaction.options.getUser('ping');

    const color = colorStr ? parseInt(colorStr.replace('#', ''), 16) || 0x3498db : 0x3498db;

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setColor(color)
      .setFooter({ text: `Announced by ${interaction.user.tag}` })
      .setTimestamp();

    const content = ping ? `${ping}` : '';

    try {
      await channel.send({ content, embeds: [embed] });
      await interaction.reply({ content: `✅ Announcement sent to ${channel}!`, ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: `❌ Failed: ${error}`, ephemeral: true });
    }
  },
};

export = command;
