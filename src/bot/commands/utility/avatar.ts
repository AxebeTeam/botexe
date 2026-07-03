import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')

    .addUserOption(option =>
      option.setName('user')

        .setDescription('The user')

    ),
  category: 'utility',
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.get('user')?.user || interaction.user;

    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setColor(0x0099ff)
      .setImage(user.displayAvatarURL({ size: 1024 }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
