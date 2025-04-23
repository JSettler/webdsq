// game.js - Refactored for Clarity and Random AI (with Mirrored Board Setup)

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // Constants & Configuration
    // ==========================================================================

    const BOARD_ROWS = 9;
    const BOARD_COLS = 7;

    // Piece ranks (higher number is stronger, except for Rat vs Elephant)
    const PIECES = {
        R: { rank: 1, name: 'Rat' },
        C: { rank: 2, name: 'Cat' },
        D: { rank: 3, name: 'Dog' },
        W: { rank: 4, name: 'Wolf' },
        P: { rank: 5, name: 'Leopard' },
        T: { rank: 6, name: 'Tiger' },
        L: { rank: 7, name: 'Lion' },
        E: { rank: 8, name: 'Elephant' }
    };

    // Player identifiers
    const PLAYER_RED = 'red';     // Starts at bottom (row 0)
    const PLAYER_BLACK = 'black';   // Starts at top (row 8)

    // Terrain types
    const TERRAIN = {
        GROUND: 0,
        WATER: 1,
        RED_TRAP: 2,    // Trap adjacent to Red Den (row 0-1)
        BLACK_TRAP: 3,  // Trap adjacent to Black Den (row 7-8)
        RED_DEN: 4,     // Red player's goal (row 0, col 3)
        BLACK_DEN: 5    // Black player's goal (row 8, col 3)
    };

    // AI configuration (currently just delay)
    const AI_MOVE_DELAY_MS = 100; // Shorter delay for random moves

    // ==========================================================================
    // Game State Variables
    // ==========================================================================

    let board = []; // 2D array [row][col] storing { piece: 'X', color: 'red'/'black' } or null
    let terrainMap = []; // 2D array [row][col] storing TERRAIN type
    let playerSide = PLAYER_RED; // Which color the human player controls
    let aiSide = PLAYER_BLACK;   // Which color the AI controls
    let currentPlayer = PLAYER_RED; // Whose turn it currently is (Red always starts)
    let selectedCell = null; // Stores { row, col } of the piece the player selected
    let gameRunning = false; // Flag indicating if the game is active
    let isPlayerTurn = false; // Flag indicating if it's the human's turn to move

    // ==========================================================================
    // UI Element References
    // ==========================================================================

    let boardElement, statusElement, depthSelector, sideRedRadio, sideBlackRadio,
        themeToggleButton, startGameButton, sideSelectionFieldset;

    function cacheUIElements() {
        boardElement = document.getElementById('gameBoard');
        statusElement = document.getElementById('gameStatus');
        depthSelector = document.getElementById('searchDepth');
        sideRedRadio = document.getElementById('sideRed');
        sideBlackRadio = document.getElementById('sideBlack');
        themeToggleButton = document.getElementById('toggleTheme');
        startGameButton = document.getElementById('startGame');
        sideSelectionFieldset = document.getElementById('sideSelection');

        // Basic check if elements exist
        if (!boardElement || !statusElement || !depthSelector || !sideRedRadio ||
            !sideBlackRadio || !themeToggleButton || !startGameButton || !sideSelectionFieldset) {
            console.error("FATAL: Could not find all required UI elements! Check HTML IDs.");
            return false;
        }
        return true;
    }

    // ==========================================================================
    // Initialization Functions
    // ==========================================================================

    /** Initializes the terrain map based on game rules. */
    function initializeTerrainMap() {
        terrainMap = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(TERRAIN.GROUND));
        // Water
        for (let r = 3; r <= 5; r++) { terrainMap[r][1] = TERRAIN.WATER; terrainMap[r][2] = TERRAIN.WATER; terrainMap[r][4] = TERRAIN.WATER; terrainMap[r][5] = TERRAIN.WATER; }
        // Red Traps (Bottom)
        terrainMap[0][2] = TERRAIN.RED_TRAP; terrainMap[0][4] = TERRAIN.RED_TRAP; terrainMap[1][3] = TERRAIN.RED_TRAP;
        // Black Traps (Top)
        terrainMap[8][2] = TERRAIN.BLACK_TRAP; terrainMap[8][4] = TERRAIN.BLACK_TRAP; terrainMap[7][3] = TERRAIN.BLACK_TRAP;
        // Dens
        terrainMap[0][3] = TERRAIN.RED_DEN; terrainMap[8][3] = TERRAIN.BLACK_DEN;
    }

    /** Sets up the pieces on the board to their starting positions (HORIZONTALLY MIRRORED). */
    function setupInitialBoard() {
        board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));

        // Place Red pieces (bottom) - MIRRORED
        board[0][6] = { piece: 'L', color: PLAYER_RED }; // Swapped L and T
        board[0][0] = { piece: 'T', color: PLAYER_RED };
        board[1][5] = { piece: 'D', color: PLAYER_RED }; // Swapped D and C
        board[1][1] = { piece: 'C', color: PLAYER_RED };
        board[2][6] = { piece: 'R', color: PLAYER_RED }; // Swapped R and E
        board[2][4] = { piece: 'P', color: PLAYER_RED }; // Swapped P and W
        board[2][2] = { piece: 'W', color: PLAYER_RED };
        board[2][0] = { piece: 'E', color: PLAYER_RED };

        // Place Black pieces (top) - MIRRORED
        board[8][0] = { piece: 'L', color: PLAYER_BLACK }; // Swapped L and T
        board[8][6] = { piece: 'T', color: PLAYER_BLACK };
        board[7][1] = { piece: 'D', color: PLAYER_BLACK }; // Swapped D and C
        board[7][5] = { piece: 'C', color: PLAYER_BLACK };
        board[6][0] = { piece: 'R', color: PLAYER_BLACK }; // Swapped R and E
        board[6][2] = { piece: 'P', color: PLAYER_BLACK }; // Swapped P and W
        board[6][4] = { piece: 'W', color: PLAYER_BLACK };
        board[6][6] = { piece: 'E', color: PLAYER_BLACK };
    }

    /** Sets up the initial UI state before the game starts. */
    function initialUISetup() {
        if (!cacheUIElements()) return; // Stop if elements missing

        renderBoard(true); // Render empty board initially with terrain
        statusElement.innerText = 'Select your side and press Start Game.';

        // Add essential listeners that work before game starts
        sideRedRadio.addEventListener('change', handleSideChange);
        sideBlackRadio.addEventListener('change', handleSideChange);
        themeToggleButton.addEventListener('click', handleThemeToggle);
        startGameButton.addEventListener('click', handleStartGame);

        // Ensure controls are enabled initially
        sideSelectionFieldset.disabled = false;
        startGameButton.disabled = false;
        depthSelector.disabled = true; // Keep depth disabled
        depthSelector.style.opacity = 0.5;
    }

    // ==========================================================================
    // Rendering Logic
    // ==========================================================================

    /** Updates the visual representation of the board in HTML. */
    function renderBoard(initialClear = false) {
        if (!boardElement) return; // Don't render if board element not found

        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const cellElement = document.getElementById(`cell-${r}-${c}`);
                if (!cellElement) continue;

                const cellData = board[r]?.[c]; // Use optional chaining for safety
                const terrain = terrainMap[r]?.[c];

                // --- Update Cell Appearance ---
                // 1. Clear previous dynamic state
                cellElement.innerText = '';
                cellElement.classList.remove(
                    'terrain-ground', 'terrain-water', 'terrain-trap', 'terrain-den',
                    'piece-red', 'piece-black', 'selected'
                );

                // 2. Add terrain class
                switch (terrain) {
                    case TERRAIN.WATER: cellElement.classList.add('terrain-water'); break;
                    case TERRAIN.RED_TRAP: case TERRAIN.BLACK_TRAP: cellElement.classList.add('terrain-trap'); break;
                    case TERRAIN.RED_DEN: case TERRAIN.BLACK_DEN: cellElement.classList.add('terrain-den'); break;
                    case TERRAIN.GROUND: default: cellElement.classList.add('terrain-ground'); break;
                }

                // 3. Add piece if exists (and not initial clear)
                if (!initialClear && cellData) {
                    cellElement.innerText = cellData.piece;
                    cellElement.classList.add(`piece-${cellData.color}`);
                }

                // 4. Highlight selected cell
                if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
                    cellElement.classList.add('selected');
                }
            }
        }

        // Clear status if initial clear before game start
        if (initialClear && statusElement) {
            statusElement.innerText = 'Select your side and press Start Game.';
        }
    }

    // ==========================================================================
    // Rules Engine & Move Validation
    // ==========================================================================

    /** Gets the terrain type at a given coordinate. */
    function getTerrain(row, col) {
        if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return null;
        return terrainMap[row][col];
    }

    /** Checks if the terrain is the Den belonging to the piece's color. */
    function isOwnDen(terrain, color) {
        return (terrain === TERRAIN.RED_DEN && color === PLAYER_RED) ||
               (terrain === TERRAIN.BLACK_DEN && color === PLAYER_BLACK);
    }

    /** Checks if the terrain is a Trap belonging to the opponent. */
    function isEnemyTrap(terrain, color) {
        return (terrain === TERRAIN.BLACK_TRAP && color === PLAYER_RED) ||
               (terrain === TERRAIN.RED_TRAP && color === PLAYER_BLACK);
    }

    /** Determines if the attacker can capture the defender based on ranks, terrain, and special rules. */
    function canCapture(attackerPieceInfo, defenderPieceInfo, attackerRow, attackerCol, defenderTerrain) {
        if (!attackerPieceInfo || !defenderPieceInfo) return false;

        const defenderRank = isEnemyTrap(defenderTerrain, attackerPieceInfo.color) ? 0 : PIECES[defenderPieceInfo.piece].rank;
        const attackerRank = PIECES[attackerPieceInfo.piece].rank;
        const attackerTerrain = getTerrain(attackerRow, attackerCol);

        // Rat vs Elephant
        if (attackerPieceInfo.piece === 'R' && defenderPieceInfo.piece === 'E') {
            return attackerTerrain !== TERRAIN.WATER; // Rat cannot capture Elephant if Rat is in water
        }
        if (attackerPieceInfo.piece === 'E' && defenderPieceInfo.piece === 'R') {
            return defenderTerrain === TERRAIN.WATER; // Elephant CAN capture Rat ONLY if Rat is in water
        }
        // Rat cannot capture from water
        if (attackerPieceInfo.piece === 'R' && attackerTerrain === TERRAIN.WATER) {
            return false;
        }
        // General capture rule
        return attackerRank >= defenderRank;
    }

    /** Checks if a move from (startRow, startCol) to (endRow, endCol) is legal. */
    function isValidMove(startRow, startCol, endRow, endCol) {
        // Basic bounds check
        if (endRow < 0 || endRow >= BOARD_ROWS || endCol < 0 || endCol >= BOARD_COLS) return false; // Corrected bounds check

        const pieceInfo = board[startRow]?.[startCol];
        if (!pieceInfo) return false; // No piece at start

        const targetPieceInfo = board[endRow]?.[endCol];
        const startTerrain = getTerrain(startRow, startCol);
        const targetTerrain = getTerrain(endRow, endCol);

        // Cannot capture own piece
        if (targetPieceInfo && targetPieceInfo.color === pieceInfo.color) return false;

        // Check movement type (Standard Orthogonal or Jump)
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        const pieceType = pieceInfo.piece;
        const isStandardMove = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
        let isJump = false;
        if (pieceType === 'L' || pieceType === 'T') {
            // Vertical Jump check
            if (colDiff === 0 && rowDiff === 4 && (startCol === 1 || startCol === 2 || startCol === 4 || startCol === 5)) {
                let pathClear = true; const step = (endRow > startRow) ? 1 : -1;
                for (let r = startRow + step; r !== endRow; r += step) { if (getTerrain(r, startCol) !== TERRAIN.WATER || board[r][startCol] !== null) { pathClear = false; break; } }
                if (pathClear) isJump = true;
            }
            // Horizontal Jump check
            if (!isJump && rowDiff === 0 && colDiff === 3 && (startRow >= 3 && startRow <= 5)) {
                let pathClear = true; const step = (endCol > startCol) ? 1 : -1;
                for (let c = startCol + step; c !== endCol; c += step) { if (getTerrain(startRow, c) !== TERRAIN.WATER || board[startRow][c] !== null) { pathClear = false; break; } }
                if (pathClear) isJump = true;
            }
        }
        if (!isStandardMove && !isJump) return false; // Invalid movement pattern

        // Check Terrain Restrictions
        if (isOwnDen(targetTerrain, pieceInfo.color)) return false; // Cannot enter own Den
        if (targetTerrain === TERRAIN.WATER && pieceType !== 'R') return false; // Only Rat in water
        if (isJump && targetTerrain === TERRAIN.WATER) return false; // Jump cannot land in water

        // Check Capture Rules if it's a capture
        if (targetPieceInfo) {
            if (!canCapture(pieceInfo, targetPieceInfo, startRow, startCol, targetTerrain)) return false;
        }

        return true; // If all checks pass
    }

    /** Generates a list of all legal moves for the given color. */
    function generateLegalMoves(color) {
        const legalMoves = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const pieceInfo = board[r]?.[c];
                if (pieceInfo && pieceInfo.color === color) {
                    // Standard moves
                    const stdMoves = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
                    stdMoves.forEach(move => {
                        if (isValidMove(r, c, r + move.dr, c + move.dc)) {
                            legalMoves.push({ from: { row: r, col: c }, to: { row: r + move.dr, col: c + move.dc } });
                        }
                    });
                    // Jumps for Lion/Tiger
                    if (pieceInfo.piece === 'L' || pieceInfo.piece === 'T') {
                        const jumpMoves = [{ dr: 4, dc: 0 }, { dr: -4, dc: 0 }, { dr: 0, dc: 3 }, { dr: 0, dc: -3 }];
                        jumpMoves.forEach(jump => {
                            if (isValidMove(r, c, r + jump.dr, c + jump.dc)) {
                                legalMoves.push({ from: { row: r, col: c }, to: { row: r + jump.dr, col: c + jump.dc } });
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

    /** Executes a move, updates state, checks win conditions, and switches turn. */
    function makeMove(from, to) {
        if (!gameRunning) return;

        const piece = board[from.row][from.col];
        if (!piece) {
            console.error("Attempted to move empty square:", from);
            return;
        }

        // Perform the move
        board[to.row][to.col] = piece;
        board[from.row][from.col] = null;
        selectedCell = null; // Ensure deselection after move

        // Check for win conditions
        if (checkWinCondition(piece.color, to.row, to.col)) {
            endGame(piece.color); // Pass winner color
            return; // Stop further processing
        }

        // Switch player
        currentPlayer = (currentPlayer === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
        isPlayerTurn = (currentPlayer === playerSide);

        // Update UI
        renderBoard();
        updateStatus();

        // Trigger AI turn if necessary
        if (!isPlayerTurn && gameRunning) {
            // Use setTimeout to avoid blocking the UI thread and allow rendering
            setTimeout(makeAiMove, AI_MOVE_DELAY_MS);
        }
    }

    /** Checks if the game has ended based on the last move. */
    function checkWinCondition(moverColor, landedRow, landedCol) {
        // 1. Den Entry Win
        const targetTerrain = getTerrain(landedRow, landedCol);
        if ((targetTerrain === TERRAIN.BLACK_DEN && moverColor === PLAYER_RED) ||
            (targetTerrain === TERRAIN.RED_DEN && moverColor === PLAYER_BLACK)) {
            return true; // Den capture win
        }

        // 2. Capture All Pieces Win
        const opponentColor = (moverColor === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
        let opponentPiecesLeft = 0;
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r]?.[c]?.color === opponentColor) {
                    opponentPiecesLeft++;
                    // Optimization: Can stop checking as soon as one opponent piece is found
                    return false; // Game hasn't ended by capture yet
                }
            }
        }
        // If loop completes without finding any opponent pieces
        if (opponentPiecesLeft === 0) {
            return true; // All opponent pieces captured
        }

        // Should not reach here if opponent pieces existed
        return false;
    }

     /** Ends the game and displays the winner. */
     function endGame(winnerColor, reason = "win") {
         gameRunning = false;
         isPlayerTurn = false; // Prevent further moves
         boardElement?.removeEventListener('click', handleCellClick); // Remove listener

         let message = "";
         if (reason === "win") {
             message = `${winnerColor.toUpperCase()} wins!`;
         } else if (reason === "no_moves") {
             // The player whose turn it WAS couldn't move, so the OTHER player wins
             const loserColor = (winnerColor === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
             message = `${loserColor.toUpperCase()} has no legal moves! ${winnerColor.toUpperCase()} wins!`;
         } else {
             message = "Game Over!";
         }

         statusElement.innerText = message;
         console.log("Game ended:", message);
         renderBoard(); // Final render
     }


    // ==========================================================================
    // AI Logic (Random Mover)
    // ==========================================================================

    /** Makes the AI choose and execute a random legal move. */
    function makeAiMove() {
        if (!gameRunning || isPlayerTurn) return;

        statusElement.innerText = `AI (${aiSide.toUpperCase()}) is thinking...`;

        console.time("AI Move Calculation");
        const legalMoves = generateLegalMoves(aiSide);
        console.timeEnd("AI Move Calculation");

        if (legalMoves.length === 0) {
            // AI has no moves, the other player (human) wins
            endGame(playerSide, "no_moves");
            return;
        }

        // Select a random move
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const move = legalMoves[randomIndex];

        const movingPiece = board[move.from.row]?.[move.from.col];
        console.log(`AI (${aiSide}) moving ${movingPiece?.piece} from (${move.from.row},${move.from.col}) to (${move.to.row},${move.to.col})`);

        // Execute the move
        makeMove(move.from, move.to);
    }

    // ==========================================================================
    // UI Interaction & Event Handlers
    // ==========================================================================

    /** Handles clicks on the game board cells. */
    function handleCellClick(event) {
        if (!gameRunning || !isPlayerTurn) return; // Ignore clicks if not player's turn

        const cellElement = event.target.closest('td');
        if (!cellElement || !cellElement.id.startsWith('cell-')) return;

        const parts = cellElement.id.split('-');
        const row = parseInt(parts[1], 10);
        const col = parseInt(parts[2], 10);

        const clickedPieceInfo = board[row]?.[col];

        if (selectedCell) {
            // Piece already selected, try to move or deselect
            const startRow = selectedCell.row;
            const startCol = selectedCell.col;

            if (startRow === row && startCol === col) { // Clicked same piece
                selectedCell = null;
            } else if (isValidMove(startRow, startCol, row, col)) { // Valid move target
                const moveFrom = { row: startRow, col: startCol };
                const moveTo = { row: row, col: col };
                makeMove(moveFrom, moveTo);
                 return; // makeMove handles render/status/AI trigger
            } else { // Invalid move target
                console.log("Invalid move target.");
                selectedCell = null; // Deselect on invalid click
            }
        } else {
            // No piece selected, try to select player's piece
            if (clickedPieceInfo && clickedPieceInfo.color === playerSide) {
                selectedCell = { row: row, col: col };
            }
        }

        // Update UI after selection/deselection/invalid move attempt
        renderBoard();
        updateStatus();
    }

    /** Handles changes to the player side selection radio buttons. */
    function handleSideChange() {
        if (gameRunning) return; // Don't allow side change mid-game
        console.log("Side selection changed (will apply on Start).");
    }

    /** Toggles the dark mode theme. */
    function handleThemeToggle() {
        document.body.classList.toggle('dark-mode');
        console.log("Theme toggled.");
    }

    /** Starts a new game when the Start button is clicked. */
    function handleStartGame() {
        if (gameRunning) return; // Prevent starting multiple times
        console.log("Starting new game...");

        // 1. Determine sides
        playerSide = sideRedRadio.checked ? PLAYER_RED : PLAYER_BLACK;
        aiSide = (playerSide === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
        console.log(`Player: ${playerSide}, AI: ${aiSide}. Red moves first.`);

        // 2. Setup board and initial state
        setupInitialBoard(); // Uses the mirrored setup
        currentPlayer = PLAYER_RED; // Red always starts
        isPlayerTurn = (currentPlayer === playerSide);
        selectedCell = null;
        gameRunning = true;

        // 3. Update UI state
        sideSelectionFieldset.disabled = true;
        startGameButton.disabled = true;
        depthSelector.disabled = true; // Still disabled
        depthSelector.style.opacity = 0.5;

        // 4. Add board listener
        boardElement.removeEventListener('click', handleCellClick); // Ensure no duplicates
        boardElement.addEventListener('click', handleCellClick);

        // 5. Initial render and status
        renderBoard();
        updateStatus();

        // 6. Trigger first AI move if needed
        if (!isPlayerTurn && gameRunning) {
            setTimeout(makeAiMove, AI_MOVE_DELAY_MS * 2); // Slightly longer delay for first move
        }
    }

    /** Updates the text in the status display area. */
    function updateStatus() {
        if (!statusElement) return;

        if (!gameRunning) {
             // Final win message is set by endGame
             return;
        }

        if (isPlayerTurn) {
            if (selectedCell) {
                 const piece = board[selectedCell.row]?.[selectedCell.col];
                 statusElement.innerText = `${playerSide.toUpperCase()}'s turn. Select destination for ${piece?.piece}.`;
            } else {
                statusElement.innerText = `${playerSide.toUpperCase()}'s turn. Select a piece.`;
            }
        } else {
             statusElement.innerText = `AI (${aiSide.toUpperCase()}) is thinking...`;
        }
    }

    // ==========================================================================
    // Script Entry Point
    // ==========================================================================

    initializeTerrainMap();
    initialUISetup(); // Sets up UI elements and pre-game listeners

}); // End DOMContentLoaded
