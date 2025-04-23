// game.js - Refactored + Last Move Highlight + 3-Ply AI (Recursive Minimax) + DEBUG FLAG

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // ** DEBUG FLAG ** Set to true to enable console logs, false to disable
    // ==========================================================================
    const DEBUG_MODE = false;

    // ==========================================================================
    // Constants & Configuration
    // ==========================================================================
    const BOARD_ROWS = 9;
    const BOARD_COLS = 7;
    const PIECES = { R: { rank: 1, name: 'Rat' }, C: { rank: 2, name: 'Cat' }, D: { rank: 3, name: 'Dog' }, W: { rank: 4, name: 'Wolf' }, P: { rank: 5, name: 'Leopard' }, T: { rank: 6, name: 'Tiger' }, L: { rank: 7, name: 'Lion' }, E: { rank: 8, name: 'Elephant' } };
    const PLAYER_RED = 'red';
    const PLAYER_BLACK = 'black';
    const TERRAIN = { GROUND: 0, WATER: 1, RED_TRAP: 2, BLACK_TRAP: 3, RED_DEN: 4, BLACK_DEN: 5 };
    const AI_MOVE_DELAY_MS = 50; // Can be shorter now, calculation takes time
    const WIN_SCORE = 10000;
    const LOSS_SCORE = -10000;
    const PIECE_SET_LETTERS = 'letters';
    const PIECE_SET_NUMBERS = 'numbers';
    const SEARCH_DEPTH = 3; // ** SET SEARCH DEPTH TO 3-PLY **

    // ==========================================================================
    // Game State Variables
    // ==========================================================================
    let board = [];
    let terrainMap = [];
    let playerSide = PLAYER_RED;
    let aiSide = PLAYER_BLACK;
    let currentPlayer = PLAYER_RED;
    let selectedCell = null;
    let gameRunning = false;
    let isPlayerTurn = false;
    let lastAiMove = null;
    let currentPieceSet = PIECE_SET_LETTERS;

    // ==========================================================================
    // UI Element References
    // ==========================================================================
    let boardElement, statusElement, depthSelector, sideRedRadio, sideBlackRadio,
        themeToggleButton, startGameButton, sideSelectionFieldset,
        togglePieceSetButton;

    function cacheUIElements() { /* ... unchanged ... */
        if (DEBUG_MODE) console.log("Caching UI elements...");
        boardElement = document.getElementById('gameBoard'); statusElement = document.getElementById('gameStatus'); depthSelector = document.getElementById('searchDepth'); sideRedRadio = document.getElementById('sideRed'); sideBlackRadio = document.getElementById('sideBlack'); themeToggleButton = document.getElementById('toggleTheme'); startGameButton = document.getElementById('startGame'); sideSelectionFieldset = document.getElementById('sideSelection'); togglePieceSetButton = document.getElementById('togglePieceSet');
        if (!boardElement || !statusElement || !depthSelector || !sideRedRadio || !sideBlackRadio || !themeToggleButton || !startGameButton || !sideSelectionFieldset || !togglePieceSetButton) { console.error("FATAL: Could not find all required UI elements! Check HTML IDs."); return false; }
        if (DEBUG_MODE) console.log("UI elements cached successfully."); return true;
    }

    // ==========================================================================
    // Initialization Functions
    // ==========================================================================
    function initializeTerrainMap() { /* ... unchanged ... */
        terrainMap = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(TERRAIN.GROUND));
        for (let r = 3; r <= 5; r++) { terrainMap[r][1] = TERRAIN.WATER; terrainMap[r][2] = TERRAIN.WATER; terrainMap[r][4] = TERRAIN.WATER; terrainMap[r][5] = TERRAIN.WATER; }
        terrainMap[0][2] = TERRAIN.RED_TRAP; terrainMap[0][4] = TERRAIN.RED_TRAP; terrainMap[1][3] = TERRAIN.RED_TRAP;
        terrainMap[8][2] = TERRAIN.BLACK_TRAP; terrainMap[8][4] = TERRAIN.BLACK_TRAP; terrainMap[7][3] = TERRAIN.BLACK_TRAP;
        terrainMap[0][3] = TERRAIN.RED_DEN; terrainMap[8][3] = TERRAIN.BLACK_DEN;
    }
    function setupInitialBoard() { /* ... unchanged ... */
        board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        board[0][0] = { piece: 'T', color: PLAYER_RED }; board[0][6] = { piece: 'L', color: PLAYER_RED }; board[1][1] = { piece: 'C', color: PLAYER_RED }; board[1][5] = { piece: 'D', color: PLAYER_RED }; board[2][0] = { piece: 'E', color: PLAYER_RED }; board[2][2] = { piece: 'W', color: PLAYER_RED }; board[2][4] = { piece: 'P', color: PLAYER_RED }; board[2][6] = { piece: 'R', color: PLAYER_RED };
        board[8][0] = { piece: 'L', color: PLAYER_BLACK }; board[8][6] = { piece: 'T', color: PLAYER_BLACK }; board[7][1] = { piece: 'D', color: PLAYER_BLACK }; board[7][5] = { piece: 'C', color: PLAYER_BLACK }; board[6][0] = { piece: 'R', color: PLAYER_BLACK }; board[6][2] = { piece: 'P', color: PLAYER_BLACK }; board[6][4] = { piece: 'W', color: PLAYER_BLACK }; board[6][6] = { piece: 'E', color: PLAYER_BLACK };
    }
    function initialUISetup() { /* ... unchanged ... */
        if (DEBUG_MODE) console.log("Running initialUISetup..."); if (!cacheUIElements()) return; renderBoard(true); statusElement.innerText = 'Select your side and press Start Game.';
        if (DEBUG_MODE) console.log("Adding pre-game listeners..."); sideRedRadio.addEventListener('change', handleSideChange); sideBlackRadio.addEventListener('change', handleSideChange); themeToggleButton.addEventListener('click', handleThemeToggle); startGameButton.addEventListener('click', handleStartGame); togglePieceSetButton.addEventListener('click', handleTogglePieceSet); if (DEBUG_MODE) console.log("Pre-game listeners added.");
        sideSelectionFieldset.disabled = false; startGameButton.disabled = false; depthSelector.disabled = true; depthSelector.style.opacity = 0.5;
    }

    // ==========================================================================
    // Rendering Logic
    // ==========================================================================
    function renderBoard(initialClear = false) { /* ... unchanged ... */
        if (!boardElement) return;
        for (let r = 0; r < BOARD_ROWS; r++) { for (let c = 0; c < BOARD_COLS; c++) { const cellElement = document.getElementById(`cell-${r}-${c}`); if (!cellElement) continue; const cellData = board[r]?.[c]; const terrain = terrainMap[r]?.[c];
        cellElement.innerText = ''; cellElement.classList.remove( 'terrain-ground', 'terrain-water', 'terrain-trap', 'terrain-den', 'piece-red', 'piece-black', 'selected', 'last-move-from', 'last-move-to');
        switch (terrain) { case TERRAIN.WATER: cellElement.classList.add('terrain-water'); break; case TERRAIN.RED_TRAP: case TERRAIN.BLACK_TRAP: cellElement.classList.add('terrain-trap'); break; case TERRAIN.RED_DEN: case TERRAIN.BLACK_DEN: cellElement.classList.add('terrain-den'); break; case TERRAIN.GROUND: default: cellElement.classList.add('terrain-ground'); break; }
        if (!initialClear && cellData) { let pieceDisplay; if (currentPieceSet === PIECE_SET_LETTERS) { pieceDisplay = cellData.piece; } else { pieceDisplay = PIECES[cellData.piece]?.rank || '?'; } cellElement.innerText = pieceDisplay; cellElement.classList.add(`piece-${cellData.color}`); }
        if (selectedCell && selectedCell.row === r && selectedCell.col === c) { cellElement.classList.add('selected'); }
        if (lastAiMove) { if (lastAiMove.from.row === r && lastAiMove.from.col === c) { cellElement.classList.add('last-move-from'); } if (lastAiMove.to.row === r && lastAiMove.to.col === c) { cellElement.classList.add('last-move-to'); } } } }
        if (initialClear && statusElement) { statusElement.innerText = 'Select your side and press Start Game.'; }
    }

    // ==========================================================================
    // Rules Engine & Move Validation (No changes needed)
    // ==========================================================================
    function getTerrain(row, col) { if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return null; return terrainMap[row][col]; }
    function isOwnDen(terrain, color) { return (terrain === TERRAIN.RED_DEN && color === PLAYER_RED) || (terrain === TERRAIN.BLACK_DEN && color === PLAYER_BLACK); }
    function isEnemyTrap(terrain, color) { return (terrain === TERRAIN.BLACK_TRAP && color === PLAYER_RED) || (terrain === TERRAIN.RED_TRAP && color === PLAYER_BLACK); }
    function canCapture(attackerPieceInfo, defenderPieceInfo, attackerRow, attackerCol, defenderTerrain) { if (!attackerPieceInfo || !defenderPieceInfo) return false; const defenderRank = isEnemyTrap(defenderTerrain, attackerPieceInfo.color) ? 0 : PIECES[defenderPieceInfo.piece].rank; const attackerRank = PIECES[attackerPieceInfo.piece].rank; const attackerTerrain = getTerrain(attackerRow, attackerCol); if (attackerPieceInfo.piece === 'R' && defenderPieceInfo.piece === 'E') { return attackerTerrain !== TERRAIN.WATER; } if (attackerPieceInfo.piece === 'E' && defenderPieceInfo.piece === 'R') { return defenderTerrain === TERRAIN.WATER; } if (attackerPieceInfo.piece === 'R' && attackerTerrain === TERRAIN.WATER) { return false; } return attackerRank >= defenderRank; }
    function isValidMove(startRow, startCol, endRow, endCol) { if (endRow < 0 || endRow >= BOARD_ROWS || endCol < 0 || endCol >= BOARD_COLS) return false; const pieceInfo = board[startRow]?.[startCol]; if (!pieceInfo) return false; const targetPieceInfo = board[endRow]?.[endCol]; const startTerrain = getTerrain(startRow, startCol); const targetTerrain = getTerrain(endRow, endCol); if (targetPieceInfo && targetPieceInfo.color === pieceInfo.color) return false; const rowDiff = Math.abs(startRow - endRow); const colDiff = Math.abs(startCol - endCol); const pieceType = pieceInfo.piece; const isStandardMove = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1); let isJump = false; if (pieceType === 'L' || pieceType === 'T') { if (colDiff === 0 && rowDiff === 4 && (startCol === 1 || startCol === 2 || startCol === 4 || startCol === 5)) { let p = true; const s = (endRow > startRow) ? 1 : -1; for (let r = startRow + s; r !== endRow; r += s) { if (getTerrain(r, startCol) !== TERRAIN.WATER || board[r][startCol] !== null) { p = false; break; } } if (p) isJump = true; } if (!isJump && rowDiff === 0 && colDiff === 3 && (startRow >= 3 && startRow <= 5)) { let p = true; const s = (endCol > startCol) ? 1 : -1; for (let c = startCol + s; c !== endCol; c += s) { if (getTerrain(startRow, c) !== TERRAIN.WATER || board[startRow][c] !== null) { p = false; break; } } if (p) isJump = true; } } if (!isStandardMove && !isJump) return false; if (isOwnDen(targetTerrain, pieceInfo.color)) return false; if (targetTerrain === TERRAIN.WATER && pieceType !== 'R') return false; if (isJump && targetTerrain === TERRAIN.WATER) return false; if (targetPieceInfo) { if (!canCapture(pieceInfo, targetPieceInfo, startRow, startCol, targetTerrain)) return false; } return true; }
    // ** MODIFIED generateLegalMoves to accept a board state **
    function generateLegalMoves(color, currentBoardState) {
        const legalMoves = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const pieceInfo = currentBoardState[r]?.[c]; // Use passed board state
                if (pieceInfo && pieceInfo.color === color) {
                    const stdMoves = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
                    stdMoves.forEach(m => {
                        // Need a version of isValidMove that takes boardState? Or modify global temporarily?
                        // Let's modify global temporarily for simulation (simpler for now)
                        if (isValidMove(r, c, r + m.dr, c + m.dc)) { // isValidMove implicitly uses global 'board'
                            legalMoves.push({ from: { row: r, col: c }, to: { row: r + m.dr, col: c + m.dc } });
                        }
                    });
                    if (pieceInfo.piece === 'L' || pieceInfo.piece === 'T') {
                        const jumpMoves = [{ dr: 4, dc: 0 }, { dr: -4, dc: 0 }, { dr: 0, dc: 3 }, { dr: 0, dc: -3 }];
                        jumpMoves.forEach(j => {
                            if (isValidMove(r, c, r + j.dr, c + j.dc)) {
                                legalMoves.push({ from: { row: r, col: c }, to: { row: r + j.dr, col: c + j.dc } });
                            }
                        });
                    }
                }
            }
        }
        return legalMoves;
    }


    // ==========================================================================
    // Game Flow & Turn Management
    // ==========================================================================
    function makeMove(from, to) { /* ... unchanged ... */
        if (!gameRunning) return; const piece = board[from.row][from.col]; if (!piece) { console.error("Attempted to move empty square:", from); return; }
        if (isPlayerTurn) { if (DEBUG_MODE) console.log("Player move: Clearing lastAiMove"); lastAiMove = null; } else { if (DEBUG_MODE) console.log("AI move: Keeping lastAiMove which was set in makeAiMove"); }
        board[to.row][to.col] = piece; board[from.row][from.col] = null; selectedCell = null;
        if (checkWinCondition(piece.color, to.row, to.col)) { endGame(piece.color); return; }
        currentPlayer = (currentPlayer === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED; isPlayerTurn = (currentPlayer === playerSide);
        renderBoard(); updateStatus();
        if (!isPlayerTurn && gameRunning) { if (DEBUG_MODE) console.log("Switching to AI turn, scheduling triggerAiTurn"); setTimeout(triggerAiTurn, AI_MOVE_DELAY_MS); } // ** Call triggerAiTurn **
    }
    function checkWinCondition(moverColor, landedRow, landedCol) { /* ... unchanged ... */
        const targetTerrain = getTerrain(landedRow, landedCol); if ((targetTerrain === TERRAIN.BLACK_DEN && moverColor === PLAYER_RED) || (targetTerrain === TERRAIN.RED_DEN && moverColor === PLAYER_BLACK)) { return true; } const opponentColor = (moverColor === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED; for (let r = 0; r < BOARD_ROWS; r++) { for (let c = 0; c < BOARD_COLS; c++) { if (board[r]?.[c]?.color === opponentColor) { return false; } } } return true;
    }
     function endGame(winnerColor, reason = "win") { /* ... unchanged ... */
         gameRunning = false; isPlayerTurn = false; boardElement?.removeEventListener('click', handleCellClick); let message = ""; if (reason === "win") { message = `${winnerColor.toUpperCase()} wins!`; } else if (reason === "no_moves") { const loserColor = (winnerColor === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED; message = `${loserColor.toUpperCase()} has no legal moves! ${winnerColor.toUpperCase()} wins!`; } else { message = "Game Over!"; } statusElement.innerText = message; if (DEBUG_MODE) console.log("Game ended:", message); renderBoard();
     }

    // ==========================================================================
    // AI Logic (3-Ply Minimax with Alpha-Beta)
    // ==========================================================================

    /**
     * Evaluates the current board state from the perspective of the AI player.
     * Higher score is better for the AI.
     * Considers only den capture and material balance.
     * @param {Array} boardState - The board state to evaluate.
     * @returns {number} The evaluation score.
     */
    function evaluateBoard(boardState) { // ** Takes boardState as parameter **
        let aiMaterial = 0;
        let playerMaterial = 0;
        let aiWon = false;
        let playerWon = false;

        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const pieceInfo = boardState[r]?.[c]; // Use passed board state
                if (pieceInfo) {
                    const rank = PIECES[pieceInfo.piece]?.rank || 0;
                    if (pieceInfo.color === aiSide) {
                        aiMaterial += rank;
                    } else {
                        playerMaterial += rank;
                    }
                }
                // Check den entry based on terrain and piece color on the passed state
                 const terrain = getTerrain(r, c);
                 const playerDen = (playerSide === PLAYER_RED) ? TERRAIN.RED_DEN : TERRAIN.BLACK_DEN;
                 const aiDen = (aiSide === PLAYER_RED) ? TERRAIN.RED_DEN : TERRAIN.BLACK_DEN;
                 if (terrain === aiDen && boardState[r]?.[c]?.color === playerSide) playerWon = true;
                 if (terrain === playerDen && boardState[r]?.[c]?.color === aiSide) aiWon = true;
            }
        }

        if (aiWon) return WIN_SCORE;
        if (playerWon) return LOSS_SCORE;
        return aiMaterial - playerMaterial;
    }

    /**
     * Recursive Minimax function with Alpha-Beta Pruning.
     * @param {number} depth - Current depth remaining in the search.
     * @param {number} alpha - Best score found so far for the maximizing player (AI).
     * @param {number} beta - Best score found so far for the minimizing player (Human).
     * @param {boolean} isMaximizingPlayer - True if current node is for AI (maximizing), false for Human (minimizing).
     * @returns {number} The best score achievable from this state.
     */
    function minimax(depth, alpha, beta, isMaximizingPlayer) {
        // Base case: depth limit reached or game over
        // Need a way to check if the *current simulated state* is a game over state
        // For simplicity at depth 3, we might only rely on depth check or basic eval check
        const currentEval = evaluateBoard(board); // Evaluate the *current* global board state after simulation
        if (currentEval >= WIN_SCORE || currentEval <= LOSS_SCORE) { // Check for immediate win/loss in simulation
            return currentEval;
        }
        if (depth === 0) {
            return currentEval; // Return evaluation at max depth
        }

        const moves = generateLegalMoves(isMaximizingPlayer ? aiSide : playerSide, board); // Generate moves for current player in simulation

        if (moves.length === 0) {
            // If no moves, it's a loss for the current player (win for the other)
            return isMaximizingPlayer ? LOSS_SCORE : WIN_SCORE;
        }

        if (isMaximizingPlayer) { // AI's turn (Maximize score)
            let maxEval = LOSS_SCORE - 1; // Worse than worst possible
            for (const move of moves) {
                // Simulate move
                const pieceFrom = board[move.from.row][move.from.col];
                const pieceTo = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = pieceFrom;
                board[move.from.row][move.from.col] = null;

                // Recursive call for the minimizing player (opponent)
                const evaluation = minimax(depth - 1, alpha, beta, false);

                // Undo move
                board[move.from.row][move.from.col] = pieceFrom;
                board[move.to.row][move.to.col] = pieceTo;

                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation); // Update alpha
                if (beta <= alpha) {
                    break; // Beta cutoff (opponent has a better option already)
                }
            }
            return maxEval;
        } else { // Player's turn (Minimize AI's score)
            let minEval = WIN_SCORE + 1; // Worse than best possible
            for (const move of moves) {
                // Simulate move
                const pieceFrom = board[move.from.row][move.from.col];
                const pieceTo = board[move.to.row][move.to.col];
                board[move.to.row][move.to.col] = pieceFrom;
                board[move.from.row][move.from.col] = null;

                // Recursive call for the maximizing player (AI)
                const evaluation = minimax(depth - 1, alpha, beta, true);

                // Undo move
                board[move.from.row][move.from.col] = pieceFrom;
                board[move.to.row][move.to.col] = pieceTo;

                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation); // Update beta
                if (beta <= alpha) {
                    break; // Alpha cutoff (AI has a better option already)
                }
            }
            return minEval;
        }
    }


    /** Finds the best move for the AI using Minimax. */
    function findBestAiMove() {
        if (DEBUG_MODE) console.time("AI Best Move Search (3-Ply)");
        const legalMoves = generateLegalMoves(aiSide, board); // Generate initial moves

        if (legalMoves.length === 0) {
            if (DEBUG_MODE) console.timeEnd("AI Best Move Search (3-Ply)");
            return null; // No move possible
        }

        let bestScore = LOSS_SCORE - 1;
        let bestMove = null;
        let possibleBestMoves = [];
        let alpha = LOSS_SCORE - 1;
        let beta = WIN_SCORE + 1;

        for (const move of legalMoves) {
            // Simulate move on the *actual* board (minimax will handle further simulation/undo)
            const pieceFrom = board[move.from.row][move.from.col];
            const pieceTo = board[move.to.row][move.to.col];
            board[move.to.row][move.to.col] = pieceFrom;
            board[move.from.row][move.from.col] = null;

            // Call minimax for the opponent's turn (minimizing player)
            const score = minimax(SEARCH_DEPTH - 1, alpha, beta, false); // Depth is now 2

            // Undo move on the *actual* board
            board[move.from.row][move.from.col] = pieceFrom;
            board[move.to.row][move.to.col] = pieceTo;

            if (DEBUG_MODE) console.log(`  Top Level Move (${move.from.row},${move.from.col})->(${move.to.row},${move.to.col}) evaluated score: ${score}`);

            // Update best move tracking (AI wants to maximize score)
            if (score > bestScore) {
                bestScore = score;
                possibleBestMoves = [move];
            } else if (score === bestScore) {
                possibleBestMoves.push(move);
            }
             // Update alpha for the top level
             alpha = Math.max(alpha, score);
        }

        // Choose the best move (randomly from equally good moves)
        if (possibleBestMoves.length > 0) {
            const randomIndex = Math.floor(Math.random() * possibleBestMoves.length);
            bestMove = possibleBestMoves[randomIndex];
            if (DEBUG_MODE) console.log(`AI selecting from ${possibleBestMoves.length} best moves with score ${bestScore}. Chosen index: ${randomIndex}`);
        } else {
             console.error("AI Error: No best move found in findBestAiMove?");
             bestMove = legalMoves[0]; // Fallback
        }

        if (DEBUG_MODE) console.timeEnd("AI Best Move Search (3-Ply)");
        return bestMove;
    }


    /** Main function to trigger the AI's turn. */
    function triggerAiTurn() {
        if (!gameRunning || isPlayerTurn) return;

        statusElement.innerText = `AI (${aiSide.toUpperCase()}) is thinking...`;

        // Use setTimeout to allow the status update to render before potentially blocking calculation
        setTimeout(() => {
            const bestMove = findBestAiMove();

            if (!bestMove) {
                // This case should be handled by generateLegalMoves check inside findBestAiMove,
                // but as a failsafe, if AI has no moves, player wins.
                endGame(playerSide, "no_moves");
                return;
            }

            // Store the chosen move for highlighting
            lastAiMove = { from: bestMove.from, to: bestMove.to };
            if (DEBUG_MODE) console.log("Setting lastAiMove to:", lastAiMove);

            const movingPiece = board[bestMove.from.row]?.[bestMove.from.col];
            if (DEBUG_MODE) console.log(`AI (${aiSide}) final choice: ${movingPiece?.piece} from (${bestMove.from.row},${bestMove.from.col}) to (${bestMove.to.row},${bestMove.to.col})`);

            // Execute the best move
            makeMove(bestMove.from, bestMove.to);
            if (DEBUG_MODE) console.log("--- AI Turn End ---");
        }, 10); // Very short delay just to allow UI update

    }


    // ==========================================================================
    // UI Interaction & Event Handlers
    // ==========================================================================
    function handleCellClick(event) { /* ... unchanged ... */
        if (!gameRunning || !isPlayerTurn) return; const cellElement = event.target.closest('td'); if (!cellElement || !cellElement.id.startsWith('cell-')) return; const parts = cellElement.id.split('-'); const row = parseInt(parts[1], 10); const col = parseInt(parts[2], 10); const clickedPieceInfo = board[row]?.[col]; if (selectedCell) { const startRow = selectedCell.row; const startCol = selectedCell.col; if (startRow === row && startCol === col) { selectedCell = null; } else if (isValidMove(startRow, startCol, row, col)) { const moveFrom = { row: startRow, col: startCol }; const moveTo = { row: row, col: col }; makeMove(moveFrom, moveTo); return; } else { if (DEBUG_MODE) console.log("Invalid move target."); selectedCell = null; } } else { if (clickedPieceInfo && clickedPieceInfo.color === playerSide) { selectedCell = { row: row, col: col }; } } renderBoard(); updateStatus();
    }
    function handleSideChange() { /* ... unchanged ... */
        if (gameRunning) return; if (DEBUG_MODE) console.log("Side selection changed (will apply on Start).");
    }
    function handleThemeToggle() { /* ... unchanged ... */
        if (DEBUG_MODE) console.log("handleThemeToggle CLICKED!"); document.body.classList.toggle('dark-mode'); if (DEBUG_MODE) console.log("Theme toggled.");
    }
    function handleStartGame() { /* ... unchanged ... */
        if (DEBUG_MODE) console.log("handleStartGame CLICKED!"); if (gameRunning) return; if (DEBUG_MODE) console.log("Starting new game..."); playerSide = sideRedRadio.checked ? PLAYER_RED : PLAYER_BLACK; aiSide = (playerSide === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED; if (DEBUG_MODE) console.log(`Player: ${playerSide}, AI: ${aiSide}. Red moves first.`); setupInitialBoard(); currentPlayer = PLAYER_RED; isPlayerTurn = (currentPlayer === playerSide); selectedCell = null; gameRunning = true; lastAiMove = null; sideSelectionFieldset.disabled = true; startGameButton.disabled = true; depthSelector.disabled = true; depthSelector.style.opacity = 0.5; boardElement.removeEventListener('click', handleCellClick); boardElement.addEventListener('click', handleCellClick); renderBoard(); updateStatus(); if (!isPlayerTurn && gameRunning) { setTimeout(triggerAiTurn, AI_MOVE_DELAY_MS * 2); } // ** Call triggerAiTurn **
    }
    function updateStatus() { /* ... unchanged ... */
        if (!statusElement) return; if (!gameRunning) { return; } if (isPlayerTurn) { if (selectedCell) { const piece = board[selectedCell.row]?.[selectedCell.col]; statusElement.innerText = `${playerSide.toUpperCase()}'s turn. Select destination for ${piece?.piece}.`; } else { statusElement.innerText = `${playerSide.toUpperCase()}'s turn. Select a piece.`; } } else { statusElement.innerText = `AI (${aiSide.toUpperCase()}) is thinking...`; }
    }
    function handleTogglePieceSet() { /* ... unchanged ... */
        if (DEBUG_MODE) console.log("handleTogglePieceSet CLICKED!"); if (currentPieceSet === PIECE_SET_LETTERS) { currentPieceSet = PIECE_SET_NUMBERS; } else { currentPieceSet = PIECE_SET_LETTERS; } if (DEBUG_MODE) console.log("Piece set toggled to:", currentPieceSet); renderBoard();
    }

    // ==========================================================================
    // Script Entry Point
    // ==========================================================================
    initializeTerrainMap();
    initialUISetup();
    if (DEBUG_MODE) console.log("Script initialization complete.");

}); // End DOMContentLoaded
