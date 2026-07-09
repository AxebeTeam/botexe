import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const slapGifs = [
  'https://media.giphy.com/media/l4FGI2HnlKMvXQ1lS/giphy.gif',
  'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('slap')
    .setDescription('Slap someone!')
    .addUserOption(option => option.setName('user').setDescription('Who to slap').setRequired(true)),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('user')!;
    if (user.id === interaction.user.id) {
      await interaction.reply({ content: '🤦 You slap yourself...', ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle('👋 *slap*')
      .setDescription(`${interaction.user} slaps ${user}! 👋😤`)
      .setImage(slapGifs[Math.floor(Math.random() * slapGifs.length)])
      .setColor(0xe74c3c)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
