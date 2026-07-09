import { ChatInputCommandInteraction, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const choices = ['🪨', '📄', '✂️'];
const names: Record<string, string> = { '🪨': 'Rock', '📄': 'Paper', '✂️': 'Scissors' };

function getWinner(a: string, b: string): number {
  if (a === b) return 0;
  if ((a === '🪨' && b === '✂️') || (a === '📄' && b === '🪨') || (a === '✂️' && b === '📄')) return 1;
  return 2;
}

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors')
    .addUserOption(option => option.setName('opponent').setDescription('Your opponent').setRequired(true)),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const opponent = interaction.options.getUser('opponent');
    if (!opponent || opponent.id === interaction.user.id || opponent.bot) {
      await interaction.reply({ content: '❌ Pick a valid opponent!', ephemeral: true });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      choices.map((c, i) => new ButtonBuilder().setCustomId(`rps_${i}`).setLabel(names[c]).setEmoji(c).setStyle(ButtonStyle.Secondary))
    );

    const embed = new EmbedBuilder()
      .setTitle('🎮 Rock Paper Scissors')
      .setDescription(`${interaction.user.tag} vs ${opponent.tag}\n\n**${interaction.user.tag}**, pick your weapon!`)
      .setColor(0x3498db);

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, max: 2 });

    const playerChoices: Record<string, string> = {};

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id && btn.user.id !== opponent.id) {
        await btn.reply({ content: '❌ This isn\'t your game!', ephemeral: true });
        return;
      }

      const idx = parseInt(btn.customId.replace('rps_', ''));
      playerChoices[btn.user.id] = choices[idx];
      await btn.reply({ content: `You picked ${choices[idx]} ${names[choices[idx]]}!`, ephemeral: true });

      if (Object.keys(playerChoices).length === 2) {
        const p1 = playerChoices[interaction.user.id];
        const p2 = playerChoices[opponent.id];
        const result = getWinner(p1, p2);

        let resultText = '';
        if (result === 0) resultText = '🤝 It\'s a draw!';
        else if (result === 1) resultText = `🎉 **${interaction.user.tag}** wins!`;
        else resultText = `🎉 **${opponent.tag}** wins!`;

        embed.setDescription(`**${interaction.user.tag}**: ${p1} ${names[p1]}\n**${opponent.tag}**: ${p2} ${names[p2]}\n\n${resultText}`);
        embed.setColor(result === 0 ? 0xf39c12 : 0x2ecc71);
        await interaction.editReply({ embeds: [embed], components: [] });
      }
    });
  },
};

export = command;
