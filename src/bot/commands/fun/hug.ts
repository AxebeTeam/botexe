import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const hugGifs = [
  'https://media.giphy.com/media/l4FGI2HnlKMvXQ1lS/giphy.gif',
  'https://media.giphy.com/media/5eyEApBjKpkfK/giphy.gif',
  'https://media.giphy.com/media/j5CjBpZxr2BkQ/giphy.gif',
];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Hug someone!')
    .addUserOption(option => option.setName('user').setDescription('Who to hug').setRequired(true)),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user')!;
    if (user.id === interaction.user.id) {
      await interaction.reply({ content: '🫂 You hug yourself... that\'s kinda sad.', ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle('🫂 *hugs*')
      .setDescription(`${interaction.user} hugs ${user}! 💕`)
      .setImage(hugGifs[Math.floor(Math.random() * hugGifs.length)])
      .setColor(0xff69b4)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
