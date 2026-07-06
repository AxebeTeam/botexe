import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a member')
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add a role')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a role')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true))
    ),
  category: 'moderation',
  permissionLevel: PermissionLevel.SERVER_OWNER,
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.get('user')?.user;
    const role = interaction.options.get('role')?.role;

    if (!user || !role) {
      await interaction.reply({ content: '❌ Invalid user or role.', ephemeral: true });
      return;
    }

    const member = await interaction.guild?.members.fetch(user.id);
    if (!member) {
      await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
      return;
    }

    const guildRole = interaction.guild?.roles.cache.get(role.id);
    if (!guildRole) {
      await interaction.reply({ content: '❌ Role not found in this server.', ephemeral: true });
      return;
    }

    if (sub === 'add') {
      if (member.roles.cache.has(role.id)) {
        await interaction.reply({ content: '❌ User already has this role.', ephemeral: true });
        return;
      }
      await member.roles.add(guildRole);
      await interaction.reply({ content: `✅ Added **${role.name}** to **${user.tag}**` });
    } else {
      if (!member.roles.cache.has(role.id)) {
        await interaction.reply({ content: '❌ User doesn\'t have this role.', ephemeral: true });
        return;
      }
      await member.roles.remove(guildRole);
      await interaction.reply({ content: `✅ Removed **${role.name}** from **${user.tag}**` });
    }
  },
};

export = command;
