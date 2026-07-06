import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { getLanguageForGuild } from '../../../utils/languageManager';
import { PermissionLevel } from '../../../utils/permissions';

const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question').setDescription('The poll question').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('options').setDescription('Options separated by commas (max 10)').setRequired(true)
    ),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.get('question')?.value as string;
    const optionsStr = interaction.options.get('options')?.value as string;
    const options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0).slice(0, 10);

    if (options.length < 2) {
      await interaction.reply({ content: '❌ You need at least 2 options.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(options.map((o, i) => `${numberEmojis[i]} ${o}`).join('\n'))
      .setColor(0x3498db)
      .setFooter({ text: `Poll by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    const msg = await interaction.fetchReply();
    for (let i = 0; i < options.length; i++) {
      await msg.react(numberEmojis[i]).catch(() => {});
    }
  },
};

export = command;
