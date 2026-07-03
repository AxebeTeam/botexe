import { Client, CommandInteraction, AutocompleteInteraction, Interaction, GuildMember, MessageFlags } from 'discord.js';
import { getCommands, handleCooldown } from '../handlers/commandHandler';
import { checkKeyActive } from '../../utils/permissions';
import { t, getLanguageForGuild } from '../../utils/languageManager';
import { logger } from '../../utils/logger';
import db from '../../database/connection';

export function handleInteractionCreate(client: Client): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isStringSelectMenu()) {
      if (!interaction.customId.startsWith('role_panel_')) return;
      if (!interaction.inCachedGuild()) return;

      await interaction.deferReply({ ephemeral: true });

      try {
        const panelId = parseInt(interaction.customId.replace('role_panel_', ''));
        const selected = interaction.values;
        const member = interaction.member;

        const options = db.prepare('SELECT * FROM role_panel_options WHERE panel_id = ?').all(panelId) as any[];
        if (options.length === 0) {
          await interaction.editReply({ content: 'Panel has no role options configured.' });
          return;
        }

        const selectedRoles = options.filter(o => selected.includes(`role_${o.role_id}`)).map(o => o.role_id);
        const allOptionRoles = options.map(o => o.role_id);

        const rolesToRemove = allOptionRoles.filter(r => !selectedRoles.includes(r));
        const rolesToAdd = selectedRoles;

        for (const roleId of rolesToRemove) {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId).catch(() => {});
          }
        }

        for (const roleId of rolesToAdd) {
          if (!member.roles.cache.has(roleId)) {
            await member.roles.add(roleId).catch(() => {});
          }
        }

        const addedNames = selectedRoles.map(r => `<@&${r}>`).join(', ');
        const removedNames = rolesToRemove.filter(r => member.roles.cache.has(r) === false).map(r => `<@&${r}>`).join(', ');

        let reply = 'Updated your roles.';
        if (addedNames) reply = `Added: ${addedNames}`;
        if (removedNames) reply += `\nRemoved: ${removedNames}`;

        await interaction.editReply({ content: reply });
      } catch (error) {
        logger.error(`Role panel error: ${error}`);
        await interaction.editReply({ content: `Error: ${error}` });
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const guildId = interaction.guildId;
      if (interaction.commandName === 'buy' && guildId) {
        const focused = interaction.options.getFocused();
        const items = db.prepare('SELECT name, emoji FROM shop_items WHERE guild_id = ? AND name LIKE ?').all(guildId, `%${focused}%`) as any[];
        await interaction.respond(items.slice(0, 25).map(i => ({ name: `${i.emoji || '🛒'} ${i.name}`, value: i.name })));
      }
      return;
    }

    if (!interaction.isCommand()) return;

    const command = getCommands().get(interaction.commandName);
    if (!command) return;

    const member = interaction.member as GuildMember;
    const guildId = interaction.guildId;
    const lang = getLanguageForGuild(guildId);

    try {
      if (command.permissionLevel && command.permissionLevel > 0) {
        const { getPermissionLevel, PermissionLevel } = await import('../../utils/permissions');
        const userLevel = getPermissionLevel(member);
        if (userLevel < command.permissionLevel) {
          await interaction.reply({
            content: t(lang, 'common.no_permission'),
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      const cmdConfig = guildId ? db.prepare('SELECT * FROM server_commands WHERE guild_id = ? AND command_name = ?').get(guildId, command.data.name) as any : null;
      if (cmdConfig && cmdConfig.enabled === 0) {
        await interaction.reply({
          content: t(lang, 'common.command_disabled'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const keyProtectedCategories = ['admin', 'moderation', 'economy', 'giveaway', 'tickets', 'music'];
      if (guildId && keyProtectedCategories.includes(command.category)) {
        const isActive = checkKeyActive(guildId);
        if (!isActive) {
          const existingKey = db.prepare('SELECT * FROM keys WHERE guild_id = ? AND is_active = 1').get(guildId) as any;
          if (existingKey && existingKey.expires_at) {
            const expires = new Date(existingKey.expires_at).getTime();
            if (Date.now() > expires) {
              db.prepare('UPDATE keys SET is_active = 0 WHERE guild_id = ?').run(guildId);
            }
          }
          await interaction.reply({
            content: t(lang, 'common.no_key'),
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      if (command.cooldown && command.cooldown > 0) {
        const canProceed = handleCooldown(command.data.name, interaction.user.id, command.cooldown);
        if (!canProceed) {
          const cooldowns = new Map(); 
          const timestamps = (global as any).__cooldowns?.get(command.data.name)?.get(interaction.user.id);
          const remaining = timestamps ? Math.ceil((timestamps + command.cooldown * 1000 - Date.now()) / 1000) : 0;
          await interaction.reply({
            content: t(lang, 'common.cooldown', { time: String(remaining) }),
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}: ${error}`);
      const errorMsg = t(lang, 'common.error');

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMsg, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
      }
    }
  });
}
