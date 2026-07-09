import { ChatInputCommandInteraction, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from 'discord.js';
import { BotCommand } from '../../handlers/commandHandler';
import { PermissionLevel } from '../../../utils/permissions';

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play Tic Tac Toe')
    .addUserOption(option => option.setName('opponent').setDescription('Your opponent').setRequired(true)),
  category: 'fun',
  permissionLevel: PermissionLevel.SERVER_MEMBER,
  async execute(interaction: ChatInputCommandInteraction) {
    const opponent = interaction.options.getUser('opponent');
    if (!opponent || opponent.id === interaction.user.id) {
      await interaction.reply({ content: '❌ You can\'t play against yourself!', ephemeral: true });
      return;
    }
    if (opponent.bot) {
      await interaction.reply({ content: '❌ You can\'t play against a bot!', ephemeral: true });
      return;
    }

    const board = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
    const players = [interaction.user.id, opponent.id];
    const marks = ['❌', '⭕'];
    let currentPlayer = 0;
    let gameOver = false;

    const winLines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];

    function getRows() {
      return [0,1,2,3,4,5,6,7,8].reduce((acc: any[], _, i) => {
        const rowIndex = Math.floor(i / 3);
        if (!acc[rowIndex]) acc[rowIndex] = [];
        acc[rowIndex].push(
          new ButtonBuilder()
            .setCustomId(`ttt_${i}`)
            .setLabel(board[i])
            .setStyle(board[i] === '❌' ? ButtonStyle.Danger : board[i] === '⭕' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(board[i] === '❌' || board[i] === '⭕' || gameOver)
        );
        return acc;
      }, []).map((row: any[]) => new ActionRowBuilder<ButtonBuilder>().addComponents(...row));
    }

    const embed = new EmbedBuilder()
      .setTitle('🎮 Tic Tac Toe')
      .setDescription(`**${interaction.user.tag}** (❌) vs **${opponent.tag}** (⭕)\n\nIt's ${interaction.user.tag}'s turn!`)
      .setColor(0x3498db);

    const msg = await interaction.reply({ embeds: [embed], components: getRows(), fetchReply: true });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== players[currentPlayer]) {
        await btn.reply({ content: '❌ Not your turn!', ephemeral: true });
        return;
      }

      const idx = parseInt(btn.customId.replace('ttt_', ''));
      if (board[idx] === '❌' || board[idx] === '⭕') {
        await btn.reply({ content: '❌ Already taken!', ephemeral: true });
        return;
      }

      board[idx] = marks[currentPlayer];

      for (const [a,b,c] of winLines) {
        if (board[a] === marks[currentPlayer] && board[b] === marks[currentPlayer] && board[c] === marks[currentPlayer]) {
          gameOver = true;
          embed.setDescription(`🎉 **${players[currentPlayer] === interaction.user.id ? interaction.user.tag : opponent.tag}** wins!`);
          embed.setColor(0x2ecc71);
          await btn.update({ embeds: [embed], components: getRows() });
          collector.stop();
          return;
        }
      }

      if (board.every(b => b === '❌' || b === '⭕')) {
        gameOver = true;
        embed.setDescription('🤝 It\'s a draw!');
        embed.setColor(0xf39c12);
        await btn.update({ embeds: [embed], components: getRows() });
        collector.stop();
        return;
      }

      currentPlayer = 1 - currentPlayer;
      embed.setDescription(`**${interaction.user.tag}** (❌) vs **${opponent.tag}** (⭕)\n\nIt's ${currentPlayer === 0 ? interaction.user.tag : opponent.tag}'s turn!`);
      await btn.update({ embeds: [embed], components: getRows() });
    });

    collector.on('end', () => {
      if (!gameOver) {
        embed.setDescription('⏰ Game timed out!');
        embed.setColor(0xe74c3c);
        interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
      }
    });
  },
};

export = command;
