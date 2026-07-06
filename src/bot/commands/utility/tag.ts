import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';
import db from '../../../database/connection';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Manage tags')
    .addSubcommand(sub =>
      sub.setName('create').setDescription('Create a tag')
        .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true))
        .addStringOption(o => o.setName('content').setDescription('Tag content').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('get').setDescription('Get a tag')
        .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete').setDescription('Delete a tag')
        .addStringOption(o => o.setName('name').setDescription('Tag name').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all tags')
    ),
  category: 'utility',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (sub === 'create') {
      const name = (interaction.options.get('name')?.value as string).toLowerCase();
      const content = interaction.options.get('content')?.value as string;
      const existing = db.prepare('SELECT id FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name);
      if (existing) {
        await interaction.reply({ content: '❌ Tag already exists.', ephemeral: true });
        return;
      }
      db.prepare('INSERT INTO tags (guild_id, name, content, creator_id) VALUES (?, ?, ?, ?)').run(guildId, name, content, interaction.user.id);
      await interaction.reply({ content: `✅ Tag **${name}** created.` });
    } else if (sub === 'get') {
      const name = (interaction.options.get('name')?.value as string).toLowerCase();
      const tag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name) as any;
      if (!tag) {
        await interaction.reply({ content: '❌ Tag not found.', ephemeral: true });
        return;
      }
      db.prepare('UPDATE tags SET uses = uses + 1 WHERE id = ?').run(tag.id);
      await interaction.reply({ content: tag.content });
    } else if (sub === 'delete') {
      const name = (interaction.options.get('name')?.value as string).toLowerCase();
      const tag = db.prepare('SELECT * FROM tags WHERE guild_id = ? AND name = ?').get(guildId, name) as any;
      if (!tag) {
        await interaction.reply({ content: '❌ Tag not found.', ephemeral: true });
        return;
      }
      db.prepare('DELETE FROM tags WHERE id = ?').run(tag.id);
      await interaction.reply({ content: `✅ Tag **${name}** deleted.` });
    } else if (sub === 'list') {
      const tags = db.prepare('SELECT name, uses FROM tags WHERE guild_id = ? ORDER BY uses DESC').all(guildId) as any[];
      if (tags.length === 0) {
        await interaction.reply({ content: 'No tags in this server.', ephemeral: true });
        return;
      }
      const list = tags.map(t => `\`${t.name}\` — ${t.uses} uses`).join('\n');
      await interaction.reply({ content: `📋 **Tags:**\n${list}` });
    }
  },
};

export = command;
