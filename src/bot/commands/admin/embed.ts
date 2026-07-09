import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed')
    .addChannelOption(option => option.setName('channel').setDescription('Target channel').setRequired(true))
    .addStringOption(option => option.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(option => option.setName('description').setDescription('Embed description').setRequired(true))
    .addStringOption(option => option.setName('color').setDescription('Color hex').setRequired(false))
    .addStringOption(option => option.setName('footer').setDescription('Footer text').setRequired(false))
    .addStringOption(option => option.setName('image').setDescription('Image URL').setRequired(false))
    .addStringOption(option => option.setName('thumbnail').setDescription('Thumbnail URL').setRequired(false)),
  category: 'admin',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel') as TextChannel;
    const title = interaction.options.get('title')?.value as string;
    const description = interaction.options.get('description')?.value as string;
    const colorStr = interaction.options.get('color')?.value as string | undefined;
    const footer = interaction.options.get('footer')?.value as string | undefined;
    const image = interaction.options.get('image')?.value as string | undefined;
    const thumbnail = interaction.options.get('thumbnail')?.value as string | undefined;

    const color = colorStr ? parseInt(colorStr.replace('#', ''), 16) || 0x3498db : 0x3498db;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (footer) embed.setFooter({ text: footer });
    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Embed sent to ${channel}!`, ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: `❌ Failed: ${error}`, ephemeral: true });
    }
  },
};

export = command;
