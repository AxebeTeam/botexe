import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

function shipName(name1: string, name2: string): string {
  const half = Math.ceil(name1.length / 2);
  return name1.substring(0, half) + name2.substring(half);
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Ship two users together')
    .addUserOption(option => option.setName('user1').setDescription('First user').setRequired(true))
    .addUserOption(option => option.setName('user2').setDescription('Second user').setRequired(true)),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const user1 = interaction.options.getUser('user1')!;
    const user2 = interaction.options.getUser('user2')!;
    const percent = Math.floor(Math.random() * 101);
    const shipNm = shipName(user1.username, user2.username);

    let bar = '';
    const filled = Math.round(percent / 10);
    for (let i = 0; i < 10; i++) bar += i < filled ? '❤️' : '🤍';

    let comment = '';
    if (percent >= 90) comment = '💕 Perfect match!';
    else if (percent >= 70) comment = '😍 Great couple!';
    else if (percent >= 50) comment = '🙂 Not bad!';
    else if (percent >= 30) comment = '😬 Could be better...';
    else comment = '💔 Not meant to be.';

    const embed = new EmbedBuilder()
      .setTitle('💕 Ship Calculator')
      .setDescription(`${user1.tag} 💕 ${user2.tag}\n\n**${shipNm}** — ${percent}%\n${bar}\n${comment}`)
      .setColor(percent >= 70 ? 0xff69b4 : percent >= 40 ? 0xf39c12 : 0xe74c3c)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};

export = command;
