import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'm') return num * 60000;
  if (unit === 'h') return num * 3600000;
  if (unit === 'd') return num * 86400000;
  return null;
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('timer')
    .setDescription('Set a countdown timer')
    .addStringOption(option => option.setName('duration').setDescription('Duration: 30m, 2h, 1d').setRequired(true))
    .addStringOption(option => option.setName('message').setDescription('Message to send when done').setRequired(true))
    .addChannelOption(option => option.setName('channel').setDescription('Channel to send message (default: current)').setRequired(false)),
  category: 'admin',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const durationStr = interaction.options.get('duration')?.value as string;
    const message = interaction.options.get('message')?.value as string;
    const targetChannel = interaction.options.getChannel('channel') as TextChannel | undefined;

    const duration = parseDuration(durationStr);
    if (!duration) {
      await interaction.reply({ content: '❌ Invalid format. Use: `30m`, `2h`, `1d`', ephemeral: true });
      return;
    }

    const channel = targetChannel || interaction.channel as TextChannel;
    await interaction.reply({ content: `⏰ Timer set! Will go off in **${durationStr}**.`, ephemeral: true });

    setTimeout(async () => {
      try {
        await channel.send({ content: `⏰ **Timer Done!** ${message}` });
      } catch {}
    }, duration);
  },
};

export = command;
