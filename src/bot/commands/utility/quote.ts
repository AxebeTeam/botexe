import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, TextChannel } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Quote a message')
    .addStringOption(option =>
      option.setName('message_id').setDescription('The message ID to quote').setRequired(true)
    ),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.get('message_id')?.value as string;
    const channel = interaction.channel as TextChannel;

    try {
      const msg = await channel.messages.fetch(messageId);
      if (!msg) {
        await interaction.reply({ content: '❌ Message not found.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(msg.content || '[No text content]')
        .setColor(0x3498db)
        .setTimestamp(msg.createdAt)
        .setFooter({ text: `Quoted by ${interaction.user.tag}` });

      if (msg.embeds.length > 0) {
        embed.addFields({ name: 'Embeds', value: `${msg.embeds.length} embed(s) in original message` });
      }

      if (msg.attachments.size > 0) {
        const att = msg.attachments.first();
        if (att && att.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url)) {
          embed.setImage(att.url);
        }
        embed.addFields({ name: 'Attachments', value: `${msg.attachments.size} attachment(s)` });
      }

      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: '❌ Message not found. Make sure it\'s in the same channel.', ephemeral: true });
    }
  },
};

export = command;
