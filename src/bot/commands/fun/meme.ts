import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme'),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json() as any;
      const embed = new EmbedBuilder()
        .setTitle(data.title || 'Random Meme')
        .setImage(data.url)
        .setColor(0x3498db)
        .setFooter({ text: `👍 ${data.ups || 0} | r/${data.subreddit || 'memes'}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: '❌ Failed to fetch meme. Try again later.' });
    }
  },
};

export = command;
