import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';
import db from '../../../database/connection';
import { PermissionLevel } from '../../../utils/permissions';

db.exec(`CREATE TABLE IF NOT EXISTS giveaway_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  won INTEGER NOT NULL DEFAULT 0,
  UNIQUE(message_id, user_id)
)`);

try {
  db.exec(`ALTER TABLE giveaways ADD COLUMN winners TEXT DEFAULT '[]'`);
} catch (e) {
  // column already exists
}

function parseDuration(str: string): number | null {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const val = parseInt(match[1]);
  switch (match[2]) {
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(option =>
      option.setName('prize')
        .setDescription('The prize for the giveaway')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g. 10m, 1h, 1d)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('winners')
        .setDescription('Number of winners')
        .setMinValue(1)
        .setMaxValue(10)),
  category: 'giveaway',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const prize = interaction.options.getString('prize', true);
    const durationStr = interaction.options.getString('duration', true);
    const winnersCount = interaction.options.getInteger('winners') ?? 1;

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      await interaction.reply({ content: '❌ Invalid duration format. Use e.g. 10m, 1h, 1d.', ephemeral: true });
      return;
    }

    const endTime = Date.now() + durationMs;

    const embed = new EmbedBuilder()
      .setTitle('🎉 Giveaway')
      .setDescription(`**Prize:** ${prize}`)
      .addFields(
        { name: 'Ends At', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
        { name: 'Winners', value: `${winnersCount}`, inline: true },
        { name: 'Hosted by', value: interaction.user.toString(), inline: true },
      )
      .setColor(0x00ff00)
      .setTimestamp();

    const customId = `giveaway_enter_${Date.now()}`;

    const enterButton = new ButtonBuilder()
      .setCustomId(customId)
      .setEmoji('🎉')
      .setLabel('Enter Giveaway')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(enterButton);

    await interaction.deferReply({ ephemeral: true });

    const message = await interaction.channel!.send({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.customId === customId,
    });

    collector.on('collect', async i => {
      const giveaway = db.prepare('SELECT ended FROM giveaways WHERE message_id = ?').get(message.id) as any;
      if (!giveaway || giveaway.ended) {
        await i.reply({ content: '❌ This giveaway has ended.', ephemeral: true });
        return;
      }
      try {
        db.prepare('INSERT OR IGNORE INTO giveaway_entries (message_id, user_id) VALUES (?, ?)').run(message.id, i.user.id);
        await i.reply({ content: '✅ You have entered the giveaway!', ephemeral: true });
      } catch {
        await i.reply({ content: '❌ Failed to enter the giveaway.', ephemeral: true });
      }
    });

    db.prepare(
      'INSERT INTO giveaways (guild_id, channel_id, message_id, prize, winners_count, ends_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(interaction.guildId, interaction.channelId, message.id, prize, winnersCount, new Date(endTime).toISOString());

    setTimeout(async () => {
      const giveaway = db.prepare('SELECT ended FROM giveaways WHERE message_id = ?').get(message.id) as any;
      if (!giveaway || giveaway.ended) return;

      const entries = db.prepare('SELECT user_id FROM giveaway_entries WHERE message_id = ?').all(message.id) as any[];
      const userIds = entries.map((e: any) => e.user_id);
      const shuffled = userIds.sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, Math.min(winnersCount, shuffled.length));

      db.prepare('UPDATE giveaways SET ended = 1, winners = ? WHERE message_id = ?').run(JSON.stringify(picked), message.id);

      const disabledButton = ButtonBuilder.from(enterButton).setDisabled(true);
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButton);

      if (picked.length > 0) {
        const winnerEmbed = new EmbedBuilder()
          .setTitle('🎉 Giveaway Ended')
          .setDescription(`**Prize:** ${prize}\n**Winner(s):** ${picked.map((id: string) => `<@${id}>`).join(', ')}`)
          .setColor(0x00ff00)
          .setTimestamp();
        await message.edit({ embeds: [winnerEmbed], components: [disabledRow] }).catch(() => {});
        await interaction.channel!.send(`🎉 Congratulations ${picked.map((id: string) => `<@${id}>`).join(', ')}! You won **${prize}**!`);
      } else {
        const noWinnerEmbed = new EmbedBuilder()
          .setTitle('🎉 Giveaway Ended')
          .setDescription(`**Prize:** ${prize}\nNo one entered the giveaway.`)
          .setColor(0xff0000)
          .setTimestamp();
        await message.edit({ embeds: [noWinnerEmbed], components: [disabledRow] }).catch(() => {});
      }

      collector.stop();
    }, durationMs);

    await interaction.editReply({ content: `✅ Giveaway for **${prize}** started! Ends <t:${Math.floor(endTime / 1000)}:R>.` });
  },
};

export = command;
