import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, MessageFlags } from 'discord.js';
import { BotCommand, getCommands } from '../../handlers/commandHandler';
import { t, getLanguageForGuild } from '../../../utils/languageManager';

const categories: { [key: string]: string } = {
  admin: '🛠️ Admin',
  moderation: '🔨 Moderation',
  keys: '🔑 Keys',
  owner: '👑 Owner',
  utility: '⚙️ Utility',
};

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all commands')

    .addStringOption(option =>
      option.setName('command')

        .setDescription('Get help for a specific command')

    ),
  category: 'utility',
  async execute(interaction: ChatInputCommandInteraction) {
    const lang = getLanguageForGuild(interaction.guildId);
    const cmdName = interaction.options.get('command')?.value as string;

    if (cmdName) {
      const cmd = getCommands().get(cmdName);
      if (!cmd) {
        await interaction.reply({ content: t(lang, 'utility.no_command'), flags: MessageFlags.Ephemeral });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(t(lang, 'utility.command_info'))
        .setColor(0x0099ff)
        .addFields(
          { name: t(lang, 'utility.description'), value: cmd.data.description || 'No description' },
          { name: t(lang, 'utility.category_title'), value: categories[cmd.category] || cmd.category },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    const allCommands = getCommands();
    const categoryMap = new Map<string, string[]>();

    allCommands.forEach((cmd, name) => {
      const cat = cmd.category || 'other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(name);
    });

    const embed = new EmbedBuilder()
      .setTitle(t(lang, 'utility.help_title'))
      .setColor(0x0099ff)
      .setDescription(t(lang, 'utility.help_desc'));

    categoryMap.forEach((cmds, category) => {
      const catName = categories[category] || category;
      embed.addFields({ name: catName, value: cmds.map(c => `\`/${c}\``).join(', '), inline: false });
    });

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_category')
          .setPlaceholder('Select a category')
          .addOptions(
            Array.from(categoryMap.keys()).map(cat => ({
              label: categories[cat] || cat,
              value: cat,
              description: `${categoryMap.get(cat)!.length} commands`,
            }))
          )
      );

    const reply = await interaction.reply({ embeds: [embed], components: [selectRow] });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'This menu is not for you.', flags: MessageFlags.Ephemeral });
        return;
      }

      const selectedCategory = i.values[0];
      const cmds = categoryMap.get(selectedCategory) || [];
      const catName = categories[selectedCategory] || selectedCategory;

      const catEmbed = new EmbedBuilder()
        .setTitle(`${catName} - ${t(lang, 'utility.commands_in')}`)
        .setColor(0x0099ff)
        .setDescription(cmds.map(c => {
          const cmd = allCommands.get(c);
          return `**/${c}** - ${cmd?.data.description || 'No description'}`;
        }).join('\n\n'))
        .setTimestamp();

      await i.update({ embeds: [catEmbed] });
    });

    collector.on('end', async () => {
      selectRow.components[0].setDisabled(true);
      await interaction.editReply({ components: [selectRow] }).catch(() => {});
    });
  },
};

export = command;
