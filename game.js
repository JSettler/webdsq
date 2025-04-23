// game.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const BOARD_ROWS = 9;
    const BOARD_COLS = 7;

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

    const PLAYER_RED = 'red'; // Logically represents the player starting at row 0
    const PLAYER_BLACK = 'black'; // Logically represents the player starting at row 8

    const TERRAIN = {
        GROUND: 0,
        WATER: 1,
        RED_TRAP: 2,    // Trap adjacent to Red Den
        BLACK_TRAP: 3,  // Trap adjacent to Black Den
        RED_DEN: 4,     // Red player's goal (row 0)
        BLACK_DEN: 5    // Black player's goal (row 8)
    };

    // Map cell coordinates to terrain types
    const terrainMap = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(TERRAIN.GROUND));

    function initializeTerrainMap() {
        // Reset to Ground first
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                terrainMap[r][c] = TERRAIN.GROUND;
            }
        }

        // Water
        for (let r = 3; r <= 5; r++) {
            terrainMap[r][1] = TERRAIN.WATER;
            terrainMap[r][2] = TERRAIN.WATER;
            terrainMap[r][4] = TERRAIN.WATER;
            terrainMap[r][5] = TERRAIN.WATER;
        }
        // Red Traps (Bottom area)
        terrainMap[0][2] = TERRAIN.RED_TRAP;
        terrainMap[0][4] = TERRAIN.RED_TRAP;
        terrainMap[1][3] = TERRAIN.RED_TRAP;

        // Black Traps (Top area)
        terrainMap[8][2] = TERRAIN.BLACK_TRAP;
        terrainMap[8][4] = TERRAIN.BLACK_TRAP;
        terrainMap[7][3] = TERRAIN.BLACK_TRAP;

        // Dens
        terrainMap[0][3] = TERRAIN.RED_DEN;    // Red Den at bottom
        terrainMap[8][3] = TERRAIN.BLACK_DEN;   // Black Den at top
    }
    // Initialize terrain map once on load
    initializeTerrainMap();

    // --- Game State Variables ---
    let board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)); // Stores { piece: 'R', color: 'red' } or null
    let playerSide = PLAYER_RED; // Default, will be set on Start
    let aiSide = PLAYER_BLACK;   // Default, will be set on Start
    let currentPlayer = PLAYER_RED; // Red always moves first in Jungle Chess rules
    let selectedCell = null; // { row, col } of the selected piece
    let gameRunning = false; // Game doesn't start immediately
    let isPlayerTurn = false; // Will be set based on playerSide and currentPlayer

    // --- UI Elements ---
    const boardElement = document.getElementById('gameBoard');
    const statusElement = document.getElementById('gameStatus');
    const depthSelector = document.getElementById('searchDepth');
    const sideRedRadio = document.getElementById('sideRed');
    const sideBlackRadio = document.getElementById('sideBlack');
    const themeToggleButton = document.getElementById('toggleTheme');
    const startGameButton = document.getElementById('startGame');
    const sideSelectionFieldset = document.getElementById('sideSelection');

    // --- Initialization ---

    function setupInitialBoard() {
        // Always set up Red at bottom (row 0), Black at top (row 8) visually/logically
        board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));

        // Place Red pieces (bottom)
        board[0][0] = { piece: 'L', color: PLAYER_RED }; board[0][6] = { piece: 'T', color: PLAYER_RED };
        board[1][1] = { piece: 'D', color: PLAYER_RED }; board[1][5] = { piece: 'C', color: PLAYER_RED };
        board[2][0] = { piece: 'R', color: PLAYER_RED }; board[2][2] = { piece: 'P', color: PLAYER_RED };
        board[2][4] = { piece: 'W', color: PLAYER_RED }; board[2][6] = { piece: 'E', color: PLAYER_RED };

        // Place Black pieces (top)
        board[8][6] = { piece: 'L', color: PLAYER_BLACK }; board[8][0] = { piece: 'T', color: PLAYER_BLACK };
        board[7][5] = { piece: 'D', color: PLAYER_BLACK }; board[7][1] = { piece: 'C', color: PLAYER_BLACK };
        board[6][6] = { piece: 'R', color: PLAYER_BLACK }; board[6][4] = { piece: 'P', color: PLAYER_BLACK };
        board[6][2] = { piece: 'W', color: PLAYER_BLACK }; board[6][0] = { piece: 'E', color: PLAYER_BLACK };
    }

    function renderBoard(initialClear = false) {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const cellElement = document.getElementById(`cell-${r}-${c}`);
                if (!cellElement) continue; // Safety check

                const cellData = board[r][c];
                const terrain = terrainMap[r][c]; // Use precomputed map

                // 1. Clear previous dynamic classes and content
                cellElement.innerText = '';
                // Remove only the classes we might add/change dynamically
                cellElement.classList.remove(
                    'terrain-ground', 'terrain-water', 'terrain-trap', 'terrain-den', // Terrain classes
                    'piece-red', 'piece-black', // Piece color classes
                    'selected' // Selection class
                );

                // 2. Add the correct terrain class based on the map
                switch (terrain) {
                    case TERRAIN.WATER:
                        cellElement.classList.add('terrain-water');
                        break;
                    case TERRAIN.RED_TRAP:
                    case TERRAIN.BLACK_TRAP: // Use the same visual class for traps
                        cellElement.classList.add('terrain-trap');
                        break;
                    case TERRAIN.RED_DEN:
                    case TERRAIN.BLACK_DEN: // Use the same visual class for dens
                        cellElement.classList.add('terrain-den');
                        break;
                    case TERRAIN.GROUND:
                    default:
                        cellElement.classList.add('terrain-ground');
                        break;
                }

                // 3. Add piece if exists and game is running or initial setup requested display
                if (!initialClear && cellData) {
                     cellElement.innerText = cellData.piece;
                     // Add piece color class directly to the TD
                     cellElement.classList.add(`piece-${cellData.color}`);
                }

                // 4. Highlight selected cell
                if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
                    cellElement.classList.add('selected');
                }
                // No need for explicit remove('selected') here if we clear classes at the start
            }
        }

         // Clear status if initial clear before game start
         if (initialClear) {
             statusElement.innerText = 'Select your side and press Start Game.';
         }
    }

    // --- Game Logic Helper Functions ---

    function getTerrain(row, col) {
        if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
            return null; // Out of bounds
        }
        return terrainMap[row][col];
    }

    function isOwnDen(terrain, color) {
        // Checks if the terrain is the Den belonging to the piece's color
        return (terrain === TERRAIN.RED_DEN && color === PLAYER_RED) ||
               (terrain === TERRAIN.BLACK_DEN && color === PLAYER_BLACK);
    }

     function isEnemyTrap(terrain, color) {
         // Checks if the terrain is a Trap belonging to the opponent
        return (terrain === TERRAIN.BLACK_TRAP && color === PLAYER_RED) ||
               (terrain === TERRAIN.RED_TRAP && color === PLAYER_BLACK);
    }

    function canCapture(attackerPieceInfo, defenderPieceInfo, attackerRow, attackerCol, defenderTerrain) {
        if (!attackerPieceInfo || !defenderPieceInfo) return false; // Cannot capture empty square

        // Rank is 0 if defender is in an enemy trap
        const defenderRank = isEnemyTrap(defenderTerrain, attackerPieceInfo.color) ? 0 : PIECES[defenderPieceInfo.piece].rank;
        const attackerRank = PIECES[attackerPieceInfo.piece].rank;
        const attackerTerrain = getTerrain(attackerRow, attackerCol); // Need attacker's location

        // Special case: Rat captures Elephant
        if (attackerPieceInfo.piece === 'R' && defenderPieceInfo.piece === 'E') {
            // But not if Rat is currently in water
             if (attackerTerrain === TERRAIN.WATER) return false;
            return true;
        }

        // Special case: Elephant cannot capture Rat (on land)
        if (attackerPieceInfo.piece === 'E' && defenderPieceInfo.piece === 'R') {
             // Exception: Elephant CAN capture Rat if Rat is in water
             if (defenderTerrain === TERRAIN.WATER) return true;
            return false;
        }

        // Special case: Rat cannot capture from water
        if (attackerPieceInfo.piece === 'R' && attackerTerrain === TERRAIN.WATER) {
            return false;
        }

        // General capture rule: Higher or equal rank captures lower rank (or rank 0 in trap)
        return attackerRank >= defenderRank;
    }


    function isValidMove(startRow, startCol, endRow, endCol) {
        // 1. Check Bounds
        if (endRow < 0 || endRow >= BOARD_ROWS || endCol < 0 || col >= BOARD_COLS) {
            return false; // Off the board
        }

        const pieceInfo = board[startRow][startCol];
        if (!pieceInfo) return false; // No piece to move

        const targetPieceInfo = board[endRow][endCol];
        const startTerrain = getTerrain(startRow, startCol);
        const targetTerrain = getTerrain(endRow, endCol);

        // 2. Check Target Cell Occupancy by Own Piece
        if (targetPieceInfo && targetPieceInfo.color === pieceInfo.color) {
            return false; // Cannot capture own piece
        }

        // 3. Check Movement Rules (Standard Orthogonal or Jump)
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        const pieceType = pieceInfo.piece;

        // Standard 1-square orthogonal move
        const isStandardMove = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

        // Lion/Tiger Jump over Water
        let isJump = false;
        if ((pieceType === 'L' || pieceType === 'T')) {
             // Vertical Jump (columns 1, 2, 4, 5)
            if (colDiff === 0 && rowDiff === 4 && (startCol === 1 || startCol === 2 || startCol === 4 || startCol === 5)) {
                 let pathClear = true;
                 const step = (endRow > startRow) ? 1 : -1;
                 // Check squares in between
                 for(let r = startRow + step; r !== endRow; r += step) {
                     // Path must be water AND empty
                     if(getTerrain(r, startCol) !== TERRAIN.WATER || board[r][startCol] !== null) {
                         pathClear = false;
                         break;
                     }
                 }
                 if(pathClear) isJump = true;
            }
             // Horizontal Jump (rows 3, 4, 5)
            if (rowDiff === 0 && colDiff === 3 && (startRow >= 3 && startRow <= 5)) {
                 let pathClear = true;
                 const step = (endCol > startCol) ? 1 : -1;
                 // Check squares in between
                 for(let c = startCol + step; c !== endCol; c += step) {
                     // Path must be water AND empty
                     if(getTerrain(startRow, c) !== TERRAIN.WATER || board[startRow][c] !== null) {
                         pathClear = false;
                         break;
                     }
                 }
                  if(pathClear) isJump = true;
            }
        }

        // Must be standard move or valid jump
        if (!isStandardMove && !isJump) {
            return false;
        }

        // 4. Check Terrain Restrictions
        // Cannot enter own Den
        if (isOwnDen(targetTerrain, pieceInfo.color)) {
            return false;
        }

        // Water rules
        if (targetTerrain === TERRAIN.WATER) {
            if (pieceType !== 'R') {
                return false; // Only Rat can enter water
            }
        }

        // Lion/Tiger jump cannot land in water
         if(isJump && targetTerrain === TERRAIN.WATER) {
             return false;
         }

        // 5. Check Capture Rules if target is occupied by enemy
        if (targetPieceInfo) {
            if (!canCapture(pieceInfo, targetPieceInfo, startRow, startCol, targetTerrain)) {
                return false; // Invalid capture according to rules
            }
        }

        // If all checks pass
        return true;
    }


    function generateLegalMoves(color) {
        const legalMoves = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const pieceInfo = board[r][c];
                if (pieceInfo && pieceInfo.color === color) {
                    // Check standard orthogonal moves
                    const possibleTargets = [
                        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                        { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
                    ];

                    possibleTargets.forEach(move => {
                        const endRow = r + move.dr;
                        const endCol = c + move.dc;
                        if (isValidMove(r, c, endRow, endCol)) {
                            legalMoves.push({ from: { row: r, col: c }, to: { row: endRow, col: endCol } });
                        }
                    });

                    // Check jumps for Lion/Tiger
                     if (pieceInfo.piece === 'L' || pieceInfo.piece === 'T') {
                        const jumpTargets = [
                             // Vertical Jumps
                             {dr: 4, dc: 0}, {dr: -4, dc: 0},
                             // Horizontal Jumps
                             {dr: 0, dc: 3}, {dr: 0, dc: -3}
                        ];
                        jumpTargets.forEach(jump => {
                             const endRow = r + jump.dr;
                             const endCol = c + jump.dc;
                             // isValidMove already checks jump path validity
                             if (isValidMove(r, c, endRow, endCol)) {
                                 legalMoves.push({ from: { row: r, col: c }, to: { row: endRow, col: endCol } });
                             }
                        });
                    }
                }
            }
        }
        return legalMoves;
    }

    // --- Core Game Flow ---

    function makeMove(from, to) {
        const piece = board[from.row][from.col];
        if (!piece) return; // Should not happen if called with valid move

        const capturedPiece = board[to.row][to.col]; // For status message or logging

        // Update board state
        board[to.row][to.col] = piece;
        board[from.row][from.col] = null;

        // Check win condition: Entering opponent's den
        const targetTerrain = getTerrain(to.row, to.col);
        if ((targetTerrain === TERRAIN.BLACK_DEN && piece.color === PLAYER_RED) ||
            (targetTerrain === TERRAIN.RED_DEN && piece.color === PLAYER_BLACK)) {
            renderBoard(); // Show the final move
            statusElement.innerText = `${piece.color.toUpperCase()} wins by reaching the den!`;
            gameRunning = false;
            isPlayerTurn = false; // Stop further interaction
            boardElement.removeEventListener('click', handleCellClick); // Remove listener
            return;
        }

        // Check win condition: Capturing all opponent pieces
        let opponentPiecesLeft = 0;
        const opponentColor = (piece.color === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r][c] && board[r][c].color === opponentColor) {
                    opponentPiecesLeft++;
                }
            }
        }
         if (opponentPiecesLeft === 0) {
            renderBoard();
            statusElement.innerText = `${piece.color.toUpperCase()} wins by capturing all pieces!`;
            gameRunning = false;
            isPlayerTurn = false;
            boardElement.removeEventListener('click', handleCellClick); // Remove listener
            return;
        }

        // Switch player
        currentPlayer = (currentPlayer === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
        isPlayerTurn = (currentPlayer === playerSide); // Check if it's the human player's turn

        updateStatus();
        renderBoard(); // Render after state changes

        // Trigger AI move if it's now AI's turn
        if (!isPlayerTurn && gameRunning) {
            // Use setTimeout to allow the board to render before AI 'thinks'
            setTimeout(makeRandomAiMove, 250); // 250ms delay
        }
    }

    function makeRandomAiMove() {
        if (!gameRunning || isPlayerTurn) return; // Safety check

        statusElement.innerText = `AI (${aiSide.toUpperCase()}) is thinking...`; // Update status immediately

        const legalMoves = generateLegalMoves(aiSide);

        if (legalMoves.length === 0) {
            // Determine winner based on who has no moves
            const winner = (aiSide === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
            statusElement.innerText = `AI (${aiSide.toUpperCase()}) has no legal moves! ${winner.toUpperCase()} wins!`;
            gameRunning = false;
            boardElement.removeEventListener('click', handleCellClick); // Remove listener
            return;
        }

        // Select a random move
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const move = legalMoves[randomIndex];

        // Log AI move (optional)
        const movingPiece = board[move.from.row][move.from.col];
        console.log(`AI (${aiSide}) randomly moving ${movingPiece?.piece} from (${move.from.row},${move.from.col}) to (${move.to.row},${move.to.col})`);

        // Execute the move
        makeMove(move.from, move.to);
    }

    function updateStatus() {
        if (!gameRunning) {
             // Final win message is set in makeMove when game ends
             return;
        }

        if (isPlayerTurn) {
            if (selectedCell) {
                 const piece = board[selectedCell.row][selectedCell.col];
                 statusElement.innerText = `${playerSide.toUpperCase()}'s turn. Select destination for ${piece?.piece}.`;
            } else {
                statusElement.innerText = `${playerSide.toUpperCase()}'s turn. Select a piece to move.`;
            }
        } else {
            // Status set at the start of makeRandomAiMove
            // statusElement.innerText = `AI (${aiSide.toUpperCase()}) is thinking...`;
        }
    }

    // --- Event Handlers ---

    function handleCellClick(event) {
        if (!gameRunning || !isPlayerTurn) return; // Only handle clicks if game running and player's turn

        const cellElement = event.target.closest('td'); // Handle clicks on pieces inside cells too
        if (!cellElement || !cellElement.id.startsWith('cell-')) return; // Clicked outside a cell

        const parts = cellElement.id.split('-'); // "cell-r-c"
        const row = parseInt(parts[1], 10);
        const col = parseInt(parts[2], 10);

        const clickedPieceInfo = board[row][col];

        if (selectedCell) {
            // A piece was already selected, try to move
            const startRow = selectedCell.row;
            const startCol = selectedCell.col;

            if (startRow === row && startCol === col) {
                // Clicked the same piece again, deselect
                selectedCell = null;
                renderBoard(); // Remove highlight
                updateStatus();
                return;
            }

            if (isValidMove(startRow, startCol, row, col)) {
                const moveFrom = { row: startRow, col: startCol };
                const moveTo = { row: row, col: col };
                selectedCell = null; // Deselect BEFORE making the move
                makeMove(moveFrom, moveTo);
                // makeMove handles rendering, status update, and AI turn trigger
            } else {
                // Invalid move target
                console.log("Invalid move attempt.");
                // Optionally provide feedback to user in statusElement
                // Deselect the piece
                selectedCell = null;
                renderBoard(); // Remove highlight
                updateStatus(); // Reset status message
            }
        } else {
            // No piece selected yet, try to select
            if (clickedPieceInfo && clickedPieceInfo.color === playerSide) {
                selectedCell = { row: row, col: col };
                renderBoard(); // Highlight the selected cell
                updateStatus(); // Update status to show selected piece
            }
        }
    }

    // Side change just updates variables, doesn't restart
    function handleSideChange() {
        if (gameRunning) return; // Don't allow side change mid-game
        // Logic moved to handleStartGame to read selection just before starting
        console.log(`Side selection changed.`);
    }

    function handleThemeToggle() {
        document.body.classList.toggle('dark-mode');
        console.log("Theme toggled.");
    }

    function handleStartGame() {
        if (gameRunning) return; // Prevent starting multiple times
        console.log("Starting game...");

        // 1. Determine sides based on radio buttons *now*
        playerSide = sideRedRadio.checked ? PLAYER_RED : PLAYER_BLACK;
        aiSide = (playerSide === PLAYER_RED) ? PLAYER_BLACK : PLAYER_RED;
        console.log(`Player starts as ${playerSide}, AI is ${aiSide}. Red moves first.`);

        // 2. Setup board and initial state
        setupInitialBoard();
        currentPlayer = PLAYER_RED; // Red always moves first
        isPlayerTurn = (currentPlayer === playerSide);
        selectedCell = null;
        gameRunning = true;

        // 3. Disable setup controls
        sideSelectionFieldset.disabled = true;
        startGameButton.disabled = true;
        // Depth selector remains disabled for now
        depthSelector.disabled = true;
        depthSelector.style.opacity = 0.5;

        // 4. Add board click listener (remove first to avoid duplicates if buggy)
        boardElement.removeEventListener('click', handleCellClick);
        boardElement.addEventListener('click', handleCellClick);

        // 5. Render the starting position and update status
        renderBoard();
        updateStatus();

        // 6. If AI needs to make the first move
        if (!isPlayerTurn) {
            setTimeout(makeRandomAiMove, 500); // Give AI a moment
        }
    }

    // --- Initial Setup on Page Load ---
    function initialUISetup() {
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

        // Board listener is added ONLY when game starts
    }

    // --- Run Initial UI Setup ---
    initialUISetup();

}); // End DOMContentLoaded

