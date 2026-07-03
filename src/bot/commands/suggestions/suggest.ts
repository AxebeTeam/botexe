import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(option =>
      option.setName('content')
        .setDescription('Your suggestion')
        .setRequired(true)
    ),
  category: 'suggestions',
  async execute(interaction: ChatInputCommandInteraction) {
    const content = interaction.options.getString('content', true);

    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command can only be used in servers.', ephemeral: true });
      return;
    }

    const config = db.prepare('SELECT * FROM suggestion_config WHERE guild_id = ?').get(interaction.guildId) as any;
    if (!config?.channel_id) {
      await interaction.reply({ content: 'Suggestions are not configured in this server.', ephemeral: true });
      return;
    }

    const channel = interaction.guild?.channels.cache.get(config.channel_id);
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: 'The suggestions channel was not found.', ephemeral: true });
      return;
    }

    const result = db.prepare(
      'INSERT INTO suggestions (guild_id, user_id, content) VALUES (?, ?, ?)'
    ).run(interaction.guildId, interaction.user.id, content);

    const suggestionId = result.lastInsertRowid;

    const embed = new EmbedBuilder()
      .setColor(0x00aeff)
      .setTitle(`Suggestion #${suggestionId}`)
      .setDescription(content)
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .addFields(
        { name: 'Status', value: 'Pending', inline: true },
        { name: 'Votes', value: '👍 0 | 👎 0', inline: true }
      )
      .setTimestamp();

    const message = await channel.send({ embeds: [embed] });
    await message.react('✅');
    await message.react('❌');

    db.prepare(
      'UPDATE suggestions SET channel_id = ?, message_id = ? WHERE id = ?'
    ).run(channel.id, message.id, suggestionId);

    await interaction.reply({ content: `Your suggestion has been submitted! (#${suggestionId})`, ephemeral: true });
  },
};

export = command;
