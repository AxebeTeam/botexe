import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const responses = [
  { text: 'It is certain.', color: 0x2ecc71 },
  { text: 'Without a doubt.', color: 0x2ecc71 },
  { text: 'Yes, definitely.', color: 0x2ecc71 },
  { text: 'You may rely on it.', color: 0x2ecc71 },
  { text: 'As I see it, yes.', color: 0x2ecc71 },
  { text: 'Most likely.', color: 0x2ecc71 },
  { text: 'Outlook good.', color: 0x2ecc71 },
  { text: 'Yes.', color: 0x2ecc71 },
  { text: 'Signs point to yes.', color: 0x2ecc71 },
  { text: 'Reply hazy, try again.', color: 0xf39c12 },
  { text: 'Ask again later.', color: 0xf39c12 },
  { text: 'Better not tell you now.', color: 0xf39c12 },
  { text: 'Cannot predict now.', color: 0xf39c12 },
  { text: 'Concentrate and ask again.', color: 0xf39c12 },
  { text: "Don't count on it.", color: 0xe74c3c },
  { text: 'My reply is no.', color: 0xe74c3c },
  { text: 'My sources say no.', color: 0xe74c3c },
  { text: 'Outlook not so good.', color: 0xe74c3c },
  { text: 'Very doubtful.', color: 0xe74c3c },
];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball')
    .addStringOption(option =>
      option.setName('question').setDescription('Your question').setRequired(true)
    ),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.get('question')?.value as string;
    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Question', value: question },
        { name: 'Answer', value: response.text }
      )
      .setColor(response.color)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
