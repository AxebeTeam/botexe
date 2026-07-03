import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('giveaway-end')
    .setDescription('End a giveaway early')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true)),
  category: 'giveaway',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString('message_id', true);

    const giveaway = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId) as any;
    if (!giveaway) {
      await interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      return;
    }

    if (giveaway.ended) {
      await interaction.reply({ content: '❌ This giveaway has already ended.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const entries = db.prepare('SELECT user_id FROM giveaway_entries WHERE message_id = ?').all(messageId) as any[];
    const userIds = entries.map((e: any) => e.user_id);
    const shuffled = userIds.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(giveaway.winners_count, shuffled.length));

    db.prepare('UPDATE giveaways SET ended = 1, winners = ? WHERE message_id = ?').run(JSON.stringify(picked), messageId);

    try {
      const channel = interaction.guild!.channels.cache.get(giveaway.channel_id) as any;
      if (channel) {
        const msg = await channel.messages.fetch(messageId);

        const disabledButton = new ButtonBuilder()
          .setCustomId('giveaway_ended')
          .setEmoji('🎉')
          .setLabel('Ended')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButton);

        if (picked.length > 0) {
          const winnerEmbed = new EmbedBuilder()
            .setTitle('🎉 Giveaway Ended')
            .setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${picked.map((id: string) => `<@${id}>`).join(', ')}`)
            .setColor(0x00ff00)
            .setTimestamp();
          await msg.edit({ embeds: [winnerEmbed], components: [disabledRow] });
          await channel.send(`🎉 Congratulations ${picked.map((id: string) => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`);
        } else {
          const noWinnerEmbed = new EmbedBuilder()
            .setTitle('🎉 Giveaway Ended')
            .setDescription(`**Prize:** ${giveaway.prize}\nNo one entered the giveaway.`)
            .setColor(0xff0000)
            .setTimestamp();
          await msg.edit({ embeds: [noWinnerEmbed], components: [disabledRow] });
        }
      }
    } catch (e) {
      // message might be deleted or inaccessible
    }

    if (picked.length > 0) {
      await interaction.editReply({ content: `✅ Giveaway ended. Winners: ${picked.map((id: string) => `<@${id}>`).join(', ')}` });
    } else {
      await interaction.editReply({ content: '✅ Giveaway ended. No one entered.' });
    }
  },
};

export = command;
