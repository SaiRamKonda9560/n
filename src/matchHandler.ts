interface Vector2Int {
  x: number;
  y: number;
}
const CloneUtility = {
  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T; // Simple deep clone; replace with a proper library if needed
  },
};
const JsonConvert = {
  deserializeObject<T>(json: string): T {
    return JSON.parse(json) as T; // Replace with actual JSON deserialization logic
  },
};
class LudoGameData {
  public BoardId: number = 0;
  public gameMode: string = '';
  public isGameStarted: boolean = false;
  public isGameComplected: boolean = false;
  public TilesSetData: number[] = [];
  public players: LudoPlayerData[] = [];
  public PathCommands: PathCommands = new PathCommands();
  public useWordsLogic: boolean = false;
  public IsLoop: boolean = false;
  public WhosTurn: number = 0;
  public rankCount: number = 0;
  public safeTiles: number[] = [];
  public tickCount: number = 0;
  public isWaitingForDiceRoll: boolean = false;
  public diceValue: number = 0;
  public PlayersWorldPositions: Vector2Int[][] = [];
  public tickCountForPlayer: number = 0;
  public useTimeOut: boolean = false;
  public WordGameState: WordGameState | null = null;
  public futureData: FutureData = new FutureData();
  public isWaitingForStealData: boolean = false;
  public stealData: stealData | null = null;
  public maxTurnOverCount:number=0;

  public getTotalPlayersCount(): number {
    return this.TilesSetData.length - 1;
  }
  public NextPlayer(): void {
    if (this.IsAllWin()) {
      return;
    }
    let who = this.WhosTurn;
    do {
      who++;
      if (who >= this.players.length) {
        who = 0;
      }
    } while (this.players[who].isWin);
    this.WhosTurn = who;
  }

  public IsAllWin(): boolean {
    for (const player of this.players) {
      if (!player.isWin) {
        return false;
      }
    }
    return true;
  }

  public PlayerWin(playerIndex: number): void {
    if (playerIndex >= 0 && playerIndex < this.players.length) {
      this.players[playerIndex].isWin = true;
      this.players[playerIndex].rank = this.rankCount;
      this.rankCount++;
    }

    let notWinCount = 0;
    let lastNotWinIndex = -1;

    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].isWin) {
        notWinCount++;
        lastNotWinIndex = i;
      }
    }

    if (notWinCount === 1 && lastNotWinIndex !== -1) {
      this.players[lastNotWinIndex].isWin = true;
      this.players[lastNotWinIndex].rank = this.rankCount;
      this.rankCount++;
    }
  }

  public getPlayersPositionsList(): number[][] | null {
    if (!this.players) return null;
    return this.players.map((p) => [...p.pawnPositions]);
  }

  public GetWorldPositionsOfPlayer(playerIndex: number): Vector2Int[] {
    return LudoGameData.GetWorldPositionsUsingCommands(
      this.PathCommands.commands,
      this.TilesSetData,
      playerIndex
    );
  }

  public getPlayersWorldPositions(): Vector2Int[][] {
    const playersWorldPositions: Vector2Int[][] = [];
    for (let i = 0; i < this.players.length; i++) {
      playersWorldPositions.push(
        this.GetWorldPositionsOfPlayer(this.players[i].PlayerBaseIndex)
      );
    }
    return playersWorldPositions;
  }

  public LocalPositionWorldPostioin(position: Vector2Int, playerIndex: number): Vector2Int {
    return LudoGameData.LocalPositionWorldPostioin(this.TilesSetData, position, playerIndex);
  }

  public GetCollectionWorldPositionsUsingCommands(playerIndex: number): Vector2Int[][] {
    return LudoGameData.GetCollectionWorldPositionsUsingCommands(this.TilesSetData, playerIndex);
  }

  public generateSafeTiles(): void {
    const numberOfBlocksForPlayer = this.TilesSetData[0] / this.getTotalPlayersCount();
    const nextSafe = numberOfBlocksForPlayer > 10 ? 8 : 5;
    this.safeTiles = [];
    for (let i = 0; i < this.getTotalPlayersCount(); i++) {
      const v = i * numberOfBlocksForPlayer;
      this.safeTiles.push(v);
      this.safeTiles.push(v + nextSafe);
    }
  }

  public generateDefaltCommands(): void {
    if (!this.PathCommands) {
      this.PathCommands = new PathCommands();
    }
    if (this.IsLoop) {
      this.PathCommands.commands = [`r(0,0,${this.TilesSetData[0] - 1})`];
    } else {
      this.PathCommands.commands = [
        `r(0,0,${this.TilesSetData[0] - 2})`,
        `r(1,0,${this.TilesSetData[1] - 1})`,
      ];
    }
  }

  public generatePlayersWorldPositions(): void {
    this.PlayersWorldPositions = this.getPlayersWorldPositions();
  }

  public clearAllMovebelPawns(): void {
    for (const p of this.players) {
      p.movebulPawnIds = [];
    }
  }



  public GenerateWordGameState(logger: any,nk: any,lengthOfWords: number,randomMissingCount: number,commonMissingCount: number,removeSafeTiles: boolean,comman: boolean,random: boolean,fill: boolean): void {
    const numberOfBlocksForPlayer = this.TilesSetData[0] / this.getTotalPlayersCount();
          const res = nk.httpRequest(
      'https://raw.githubusercontent.com/SaiRamKonda9560/words/refs/heads/main/Words.json',
      'get',
      { 'Accept': 'application/json' }
    );
    
    //const wordsGenInstance = getWordoInstance();

    const wordsGenInstance = new wordsGen(res.body);

    if (wordsGenInstance) {
      const selectedWordsData: WordData[] = [];
      const missingLettersWords: string[] = [];
      const commanRandomLettersList: string[] = [];
      const nonCommonLetters: string[][] = [];
      wordsGenInstance.generateWords(lengthOfWords,this.players.length,randomMissingCount,commonMissingCount,selectedWordsData,missingLettersWords,commanRandomLettersList,nonCommonLetters);


      const selectedWords = selectedWordsData.map((c) => c.EnglishWord);
      let allTilesPositionsDictionary: { [key: number]: number } = {};
      for (let i = 0; i < this.TilesSetData[0]; i++) {
        allTilesPositionsDictionary[i] = i;
      }
      const boardLetters: { [key: number]: string } = {};

      if (removeSafeTiles) {
        const allTilesPositionsDictionaryFiltered: { [key: number]: number } = {};
        for (const [key, value] of Object.entries(allTilesPositionsDictionary)) {
          let isSafeTile = false;
          for (const safeTile of this.safeTiles) {
            if (
              safeTile >= 0 &&
              safeTile < Object.keys(allTilesPositionsDictionary).length &&
              safeTile === value
            ) {
              isSafeTile = true;
              break;
            }
          }
          if (!isSafeTile) {
            allTilesPositionsDictionaryFiltered[parseInt(key)] = value;
          }
        }
        allTilesPositionsDictionary = allTilesPositionsDictionaryFiltered;
      }

      if (comman) {
        for (const s of commanRandomLettersList) {
          const keys = Object.keys(allTilesPositionsDictionary).map(Number);
          const randomIndex = Math.floor(Math.random() * keys.length);
          const keyValue = allTilesPositionsDictionary[keys[randomIndex]];
          boardLetters[keyValue] = s;
          delete allTilesPositionsDictionary[keys[randomIndex]];
        }
      }

      if (random) {
        for (let playerIndex = 0; playerIndex < this.players.length; playerIndex++) {
          const player = this.players[playerIndex];
          const playerBaseIndex = player.PlayerBaseIndex;
          const playerStartIndex = numberOfBlocksForPlayer * playerBaseIndex;
          const playerBackTilesPos: number[] = [];
          for (let i = 1; i < numberOfBlocksForPlayer; i++) {
            playerBackTilesPos.push(LudoGameData.Wrap(playerStartIndex - i, this.TilesSetData[0] - 1));
          }
          LudoGameData.ShuffleList(playerBackTilesPos);
          for (const c of nonCommonLetters[playerIndex]) {
            for (let i = 0; i < playerBackTilesPos.length; i++) {
              const pos = playerBackTilesPos[i];
              if (pos in allTilesPositionsDictionary) {
                delete allTilesPositionsDictionary[pos];
                boardLetters[pos] = c;
                break;
              }
            }
          }
        }
      }

      if (fill) {
        const randomLetters = this.GetUnusedLetters(commanRandomLettersList, nonCommonLetters);
        LudoGameData.ShuffleList(randomLetters);
        const keys = Object.keys(allTilesPositionsDictionary).map(Number);
        for (let i = 0; i < keys.length; i++) {
          const keyValue = allTilesPositionsDictionary[keys[i]];
          boardLetters[keyValue] = randomLetters[i % randomLetters.length];
        }
      }

      this.WordGameState = new WordGameState(selectedWordsData, missingLettersWords, boardLetters);

    }
  }

  public GetUnusedLetters(commonLetters: string[], nonCommonLetters: string[][]): string[] {
    const usedLetters = new Set<string>(commonLetters.map((c) => c.toLowerCase()));
    for (const wordLetters of nonCommonLetters) {
      for (const c of wordLetters) {
        usedLetters.add(c.toLowerCase());
      }
    }

    const unusedLetters: string[] = [];
    for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) {
      const char = String.fromCharCode(c);
      if (!usedLetters.has(char)) {
        unusedLetters.push(char);
      }
    }

    return unusedLetters;
  }

  public static ShuffleList<T>(list: T[]): void {
    const rng = Math.random;
    let n = list.length;
    while (n > 1) {
      n--;
      const k = Math.floor(rng() * (n + 1));
      const temp = list[k];
      list[k] = list[n];
      list[n] = temp;
    }
  }

  public GenerateFutureMoves(): FutureData {
    this.diceValue = Math.floor(Math.random() * 6) + 1;
    this.futureData = {
      diceValue: this.diceValue,
      whosTurn: this.WhosTurn,
      tickStart: this.tickCount,
      tickEnd: this.tickCount + this.tickCountForPlayer,
      futureMoves: [],
      aiMove: 0,
    };
    const playerPathLength = this.PlayersWorldPositions[this.WhosTurn].length;
    const totalPlayers = this.TilesSetData.length - 1;
    const numberOfBlocksForPlayer = playerPathLength / totalPlayers;
    for (let pawnId = 0; pawnId < this.players[this.WhosTurn].pawnPositions.length; pawnId++) {
      const pos = this.players[this.WhosTurn].pawnPositions[pawnId];
      if (
        (pos < 0 && this.diceValue === 6) ||
        (pos >= 0 && (pos + this.diceValue < playerPathLength || this.IsLoop))
      ) {
        const clonedPlayers = CloneUtility.deepClone<LudoPlayerData[]>(this.players);
        const currentPlayer = clonedPlayers[this.WhosTurn];
        let myStepsCount = 0;
        let newPos = currentPlayer.pawnPositions[pawnId];
        if (newPos < 0 && this.diceValue === 6) {
          newPos = 0;
          myStepsCount = 1;
        } else if (newPos >= 0) {
          newPos += this.diceValue;
          myStepsCount += this.diceValue;
        }
        const isPawnWin = newPos === playerPathLength - 1 && !this.IsLoop;
        currentPlayer.pawnPositions[pawnId] = newPos;
        const currentWorldPos = this.PlayersWorldPositions[this.WhosTurn][
          LudoGameData.Wrap(newPos, playerPathLength - 1)
        ];
        const isSafe = this.safeTiles.some(
          (s) =>
            this.PlayersWorldPositions[0][s].x === currentWorldPos.x &&
            this.PlayersWorldPositions[0][s].y === currentWorldPos.y
        );
        const movedPlayers = [currentPlayer];
        let deadPawnsStepsCount = 0;
        let killCount = 0;
        const killedPlayers: { [key: number]: number[] } = {};
        if (!isSafe) {
          for (let otherIndex = 0; otherIndex < clonedPlayers.length; otherIndex++) {
            if (otherIndex === this.WhosTurn) continue;
            const other = clonedPlayers[otherIndex];
            for (let pawnIndex = 0; pawnIndex < other.pawnPositions.length; pawnIndex++) {
              const otherPos = other.pawnPositions[pawnIndex];
              if (otherPos < 0) continue;
              if (
                this.PlayersWorldPositions[otherIndex][
                  LudoGameData.Wrap(otherPos, playerPathLength - 1)
                ].x === currentWorldPos.x &&
                this.PlayersWorldPositions[otherIndex][
                  LudoGameData.Wrap(otherPos, playerPathLength - 1)
                ].y === currentWorldPos.y
              ) {
                deadPawnsStepsCount += other.pawnPositions[pawnIndex] + 2;
                other.pawnPositions[pawnIndex] = -1;
                killCount++;
                if (killedPlayers[otherIndex]) {
                  killedPlayers[otherIndex].push(pawnIndex);
                } else {
                  killedPlayers[otherIndex] = [pawnIndex];
                }
                movedPlayers.push(other);
              }
            }
          }
        }

        if (this.gameMode === 'wordo') {
          if (this.WordGameState?.IsValidPlayer(this.WhosTurn)) {
            const localPos = LudoGameData.Wrap(newPos, playerPathLength - 1);
            const worldPosition = LudoGameData.Wrap(
              numberOfBlocksForPlayer * this.players[this.WhosTurn].PlayerBaseIndex + localPos,
              playerPathLength - 1
            );
            const isLetterPresent = worldPosition in this.WordGameState!.BoardLetters;
            if (isLetterPresent) {
              const letter = this.WordGameState!.BoardLetters[worldPosition];
            }
          }
        }
        this.futureData.futureMoves.push(
          new FutureMove(pawnId, myStepsCount + deadPawnsStepsCount, killedPlayers, isSafe, isPawnWin, movedPlayers)
        );
      }
    }

    if (this.futureData.futureMoves.length > 0) {
      this.futureData.aiMove = Math.floor(Math.random() * this.futureData.futureMoves.length);
    }
    return this.futureData;
  }
  public start(logger: any,nk: any): void {
    this.isGameStarted = true;
    this.tickCount = 0;
    this.isWaitingForDiceRoll = true;
    this.diceValue = 0;
    this.safeTiles = [];

    this.generateDefaltCommands();
    this.generateSafeTiles();
    this.generatePlayersWorldPositions();
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].PlayerTurn = i;
    }

    if (this.gameMode === 'wordo') {
      this.GenerateWordGameState(logger,nk,5, 1, 1, true, true, true, true);

    } else {
      this.WordGameState = null;
    }

    this.GenerateFutureMoves();
  }




//#region game logic
public GameLogic(logger: any, signal: Signal | null): [string, any][] {
    const state: [string, any][] = [];

    if (!signal || !this.futureData) {
        return state; // Early return if prerequisites are missing
    }

    // Ensure valid turn index
    this.WhosTurn = this.normalizeTurnIndex(this.WhosTurn);
    const currentPlayer = this.players[this.WhosTurn];

    // Handle signal types
    const isDiceSignal = signal.type === 'dice';
    const isPawnSignal = signal.type === 'pawn';
    const diceSignal = isDiceSignal ? signal : null;
    const pawnSignal = isPawnSignal ? signal : null;

    // Process Wordo-specific signals
    if (signal.type.startsWith('wordo')) {
        this.handleWordoSignal(signal, state, logger);
    }

    // Handle tick signal
    if (signal.type === 'tick') {
        this.handleTickSignal(state);
    }

    // Handle dice roll
    if (this.isWaitingForDiceRoll && isDiceSignal && diceSignal) {
        this.handleDiceSignal(currentPlayer, state);
    }

    // Handle pawn movement
    if (isPawnSignal && pawnSignal) {
        this.handlePawnSignal(currentPlayer, pawnSignal, state);
    }

    // Handle custom wordo signals (w: prefix)
    if (this.gameMode === 'wordo' && signal.type.startsWith('w:')) {
        this.handleCustomWordoSignal(signal, logger);
    }

    return state;
}

// Helper method to normalize turn index
private normalizeTurnIndex(turn: number): number {
    if (turn < 0 || turn >= this.players.length) {
        return 0;
    }
    return turn;
}

// Handle Wordo-specific signals
private handleWordoSignal(signal: Signal, state: [string, any][], logger: any): void {
    const { type, value, who } = signal;
    const json = value;

    switch (type) {
        case 'wordoPlaceLetters':
            this.handlePlaceLetters(json, who, state, logger);
            break;
        case 'wordoUpdateSteal':
            if (this.isWaitingForStealData) {
                this.stealData!.stealLetters = JsonConvert.deserializeObject<number[]>(json);
            }
            break;
        case 'wordoSaveSteal':
            this.handleSaveSteal(json, state);
            break;
    }
}

// Handle placing letters in Wordo mode
private handlePlaceLetters(json: any, who: number, state: [string, any][], logger: any): void {
    const playerPlacement = JsonConvert.deserializeObject<number[]>(json);
    const missingLetters = this.WordGameState?.getMissingLettersListOfPlayer(who);
    logger.info(`${missingLetters?.size ?? 0}💡${playerPlacement.length}`);
    let isAnyPlacement = false;

    if (playerPlacement.length === (missingLetters?.size ?? 0)) {
        logger.info("playerPlacement.length 💡");
        let i = 0;
        for (const [wordIndex] of missingLetters ?? new Map<number, string>()) {
            const collectionIndex = playerPlacement[i];
            logger.info("TryPlaceLetter 💡");
            if (this.WordGameState?.TryPlaceLetter(logger, who, collectionIndex, wordIndex)) {
                isAnyPlacement = true;
            }
            i++;
        }
    }

    if (isAnyPlacement) {
        state.push(['updateWords', this.WordGameState]);
    }

    const isPlayerCompleted = this.WordGameState?.isPlayerCompleted(who) || false;
    if (!this.players[who].isWin && isPlayerCompleted) {
        this.PlayerWin(who);
        state.push(['UpdateMainPlayersData', this.players]);
    }

    if (isPlayerCompleted) {
        if (this.IsAllWin()) {
            this.completeGame(state);
        } else {
            this.isWaitingForDiceRoll = true;
            this.NextPlayer();
            state.push(['newFD', this.GenerateFutureMoves()]);
        }
    }
}

// Handle steal save in Wordo mode
private handleSaveSteal(json: any, state: [string, any][]): void {
    if (this.isWaitingForStealData) {
        this.stealData!.stealLetters = JsonConvert.deserializeObject<number[]>(json);
        this.WordGameState?.StealLettersFromPlayer(
            this.stealData!.whoStealingIndex,
            this.stealData!.fromWhoIndex,
            this.stealData!.stealLetters
        );
        state.push(['updateWords', this.WordGameState]);
        this.isWaitingForStealData = false;
    }
    state.push(['setDelay', 0]);
}

// Handle tick signal
private handleTickSignal(state: [string, any][]): void {
    if (this.tickCount === 0) {
        state.push(['startGame', this]);
        state.push(['newFD', this.futureData]);
        if (this.gameMode === 'wordo') {
            state.push(['updateWords', this.WordGameState]);
        }
    }
    this.tickCount++;

    if (this.useTimeOut && this.tickCount > this.futureData.tickEnd) {
        this.handleTimeout(state);
    }
}

// Handle timeout logic
private handleTimeout(state: [string, any][]): void {
    const player = this.players[this.futureData.whosTurn];
    player.turnOverCount++;
    state.push(['UpdateMainPlayersData', this.players]);

    if (this.maxTurnOverCount > 0 && player.turnOverCount > this.maxTurnOverCount) {
        player.isLost = true;
    }

    if (this.isWaitingForDiceRoll) {
        state.push(['roll', this.futureData.diceValue]);
        state.push(['addDelay', 1]);
        this.isWaitingForDiceRoll = false;
    }

    if (this.futureData.futureMoves.length > 0) {
        const pawnSignal = new Signal('pawn', this.WhosTurn, this.futureData.futureMoves[this.futureData.aiMove].movablePawnId.toString());
        this.handlePawnSignal(this.players[this.WhosTurn], pawnSignal, state);
    }
}

// Handle dice signal
private handleDiceSignal(currentPlayer: LudoPlayerData, state: [string, any][]): void {
    if (this.futureData.futureMoves.length > 0) {
        currentPlayer.movebulPawnIds = this.futureData.futureMoves.map((move) => move.movablePawnId);
        state.push(['UpdateMainPlayersData', [CloneUtility.deepClone<LudoPlayerData>(currentPlayer)]]);
        this.isWaitingForDiceRoll = false;
    } else {
        this.NextPlayer();
        state.push(['newFD', this.GenerateFutureMoves()]);
    }
}

// Handle pawn signal
private handlePawnSignal(currentPlayer: LudoPlayerData, pawnSignal: Signal, state: [string, any][]): void {
    const pawnId = parseInt(pawnSignal.value);
    const futureMove = this.futureData.futureMoves.find((move) => move?.movablePawnId === pawnId);
    if (!futureMove) {
        return;
    }

    this.updatePlayerPositions(futureMove, state);
    if (this.IsAllWin()) {
        this.completeGame(state);
        return;
    }

    currentPlayer.movebulPawnIds = [];
    this.isWaitingForDiceRoll = true;

    const killCount = futureMove.killedPlayers ? Object.keys(futureMove.killedPlayers).length : 0;
    const gotBonus = (this.diceValue === 6 || killCount > 0 || futureMove.isWin) && !currentPlayer.isWin;
    if (!gotBonus) {
        this.NextPlayer();
    }

    const addDelay = futureMove.stepsCount > 0 ? Math.ceil(futureMove.stepsCount * 0.07) : 0;
    state.push(['UpdateMainPlayersData', futureMove.playerDatas]);
    state.push(['addDelay', addDelay]);

    if (this.gameMode === 'wordo') {
        this.handleWordoPawnMove(futureMove, pawnId, state);
    }

    state.push(['newFD', this.GenerateFutureMoves()]);
}

// Update player positions based on move
private updatePlayerPositions(futureMove: FutureMove, state: [string, any][]): void {
    for (const updated of futureMove.playerDatas) {
        const realPlayer = this.players.find((p) => p.UserId === updated.UserId);
        if (realPlayer) {
            realPlayer.pawnPositions = [...updated.pawnPositions];
            const isAllPawnsReached = realPlayer.pawnPositions.every(
                (pos) => pos === this.PlayersWorldPositions[realPlayer.PlayerTurn].length - 1
            );
            if (isAllPawnsReached && !this.IsLoop) {
                this.PlayerWin(realPlayer.PlayerTurn);
                state.push(['UpdateMainPlayersData', this.players]);
            }
        }
    }
}

// Handle Wordo-specific pawn movement
private handleWordoPawnMove(futureMove: FutureMove, pawnId: number, state: [string, any][]): void {
    state.push(['updateWords', this.WordGameState]);
    const whosTurn = this.futureData.whosTurn;
    if (!this.WordGameState?.IsValidPlayer(whosTurn)) {
        return;
    }

    const playerPathLength = this.PlayersWorldPositions[whosTurn].length;
    const totalPlayers = this.TilesSetData.length - 1;
    const numberOfBlocksForPlayer = playerPathLength / totalPlayers;
    const localPos = LudoGameData.Wrap(futureMove.playerDatas[0].pawnPositions[pawnId], playerPathLength - 1);
    const worldPosition = LudoGameData.Wrap(
        numberOfBlocksForPlayer * this.players[whosTurn].PlayerBaseIndex + localPos,
        playerPathLength - 1
    );

    if (worldPosition in this.WordGameState.BoardLetters) {
        this.WordGameState.TryCollectBoardLetter(whosTurn, worldPosition);
        state.push(['updateWords', this.WordGameState]);
    }

    const killCount = futureMove.killedPlayers ? Object.keys(futureMove.killedPlayers).length : 0;
    if (killCount > 0) {
        this.handleStealOnKill(futureMove, state);
    }
}

// Handle steal logic on kill
private handleStealOnKill(futureMove: FutureMove, state: [string, any][]): void {
    for (const [playerIndex, killedPawnsList] of Object.entries(futureMove.killedPlayers || {})) {
        const howManyKilled = killedPawnsList.length;
        const collectionCount = this.WordGameState?.GetPlayerCollectionCount(parseInt(playerIndex)) || 0;
        if (collectionCount > 0) {
            const time = 60 + howManyKilled * 5;
            this.isWaitingForStealData = true;
            this.stealData = {
                whoStealingIndex: this.WhosTurn,
                fromWhoIndex: parseInt(playerIndex),
                timeUp: time,
                maxLettersToPick: howManyKilled,
                stealLetters: [],
            };
            state.push(['updateWords', this.WordGameState]);
            state.push(['stealWords', this.stealData]);
            state.push(['addDelay', time]);
            state.push(['endStealWords', this.WordGameState]);
        }
    }
}

// Complete the game
private completeGame(state: [string, any][]): void {
    this.isGameComplected = true;
    this.clearAllMovebelPawns();
    state.push(['complected', this]);
}

// Handle custom Wordo signal (w: prefix)
private handleCustomWordoSignal(signal: Signal, logger: any): void {
    const value = signal.type.slice(2).split(',');
    if (value.length !== 2) {
        return;
    }

    try {
        const collectionIndex = parseInt(value[0]);
        const wordIndex = parseInt(value[1]);
        if (this.WordGameState?.TryPlaceLetter(logger, signal.who, collectionIndex, wordIndex)) {
            this.WordGameState.isPlayerCompleted(this.WhosTurn);
        }
    } catch {
        // Handle parsing error silently
    }
}
//#endregion



  public static Wrap(value: number, length: number = 360): number {
    length++;
    if (length <= 0) return 0;
    return ((value % length) + length) % length;
  }

  public static GetWorldPositionsUsingCommands(
    commands: string[],
    TilesSetData: number[],
    playerIndex: number
  ): Vector2Int[] {
    const worldPositions: Vector2Int[] = [];
    const mainPathLength = TilesSetData[0];
    const totalPlayersCount = TilesSetData.length - 1;
    const tilesPerPlayer = mainPathLength / totalPlayersCount;
    const startIndex = tilesPerPlayer * playerIndex;
    for (const command of commands) {
      const startParen = command.indexOf('(');
      const endParen = command.lastIndexOf(')');
      if (startParen === -1 || endParen === -1) continue;

      const inside = command.slice(startParen + 1, endParen);
      const parts = inside.split(',').map((p) => p.trim());

      if (command.startsWith('r(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const start = parseInt(parts[1]);
        const end = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(start) && !isNaN(end)) {
          const steps = end >= start ? end - start + 1 : start - end + 1;
          for (let i = 0; i < steps; i++) {
            if (collectionIndex === 0) {
              const rotatedIndex = (startIndex + i) % mainPathLength;
              worldPositions.push({ x: collectionIndex, y: rotatedIndex });
            } else {
              const adjustedX = 1 + ((playerIndex - 1 + collectionIndex) % totalPlayersCount);
              const tileIndex = end >= start ? start + i : start - i;
              worldPositions.push({ x: adjustedX, y: tileIndex });
            }
          }
        }
      } else if (command.startsWith('rc(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const startIndexRC = parseInt(parts[1]);
        const count = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(startIndexRC) && !isNaN(count)) {
          for (let i = 0; i < count; i++) {
            if (collectionIndex === 0) {
              const rotatedIndex = (startIndex + i) % mainPathLength;
              worldPositions.push({ x: collectionIndex, y: rotatedIndex });
            } else {
              const adjustedX = 1 + ((playerIndex - 1 + collectionIndex) % totalPlayersCount);
              const tileIndex = startIndexRC + i;
              worldPositions.push({ x: adjustedX, y: tileIndex });
            }
          }
        }
      }
    }
    return worldPositions;
  }

  public static GetCollectionWorldPositionsUsingCommands(
    TilesSetData: number[],
    playerIndex: number
  ): Vector2Int[][] {
    const worldPositionsCollection: Vector2Int[][] = [];
    const mainPathLength = TilesSetData[0];
    const totalPlayersCount = TilesSetData.length - 1;
    const tilesPerPlayer = mainPathLength / totalPlayersCount;
    const startIndex = tilesPerPlayer * playerIndex;
    for (let s = 0; s < TilesSetData.length; s++) {
      const command = `r(${s},0,${TilesSetData[s] - 1})`;
      const worldPositions: Vector2Int[] = [];
      const startParen = command.indexOf('(');
      const endParen = command.lastIndexOf(')');
      if (startParen === -1 || endParen === -1) continue;
      const inside = command.slice(startParen + 1, endParen);
      const parts = inside.split(',').map((p) => p.trim());
      if (command.startsWith('r(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const start = parseInt(parts[1]);
        const end = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(start) && !isNaN(end)) {
          const steps = end >= start ? end - start + 1 : start - end + 1;
          for (let i = 0; i < steps; i++) {
            if (collectionIndex === 0) {
              const rotatedIndex = (startIndex + i) % mainPathLength;
              worldPositions.push({ x: collectionIndex, y: rotatedIndex });
            } else {
              const adjustedX = 1 + ((playerIndex - 1 + collectionIndex) % totalPlayersCount);
              const tileIndex = end >= start ? start + i : start - i;
              worldPositions.push({ x: adjustedX, y: tileIndex });
            }
          }
        }
      } else if (command.startsWith('rc(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const startIndexRC = parseInt(parts[1]);
        const count = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(startIndexRC) && !isNaN(count)) {
          for (let i = 0; i < count; i++) {
            if (collectionIndex === 0) {
              const rotatedIndex = (startIndex + i) % mainPathLength;
              worldPositions.push({ x: collectionIndex, y: rotatedIndex });
            } else {
              const adjustedX = 1 + ((playerIndex - 1 + collectionIndex) % totalPlayersCount);
              const tileIndex = startIndexRC + i;
              worldPositions.push({ x: adjustedX, y: tileIndex });
            }
          }
        }
      }
      worldPositionsCollection.push(worldPositions);
    }
    return worldPositionsCollection;
  }

  public static LocalPositionWorldPostioin(
    TilesSetData: number[],
    position: Vector2Int,
    playerIndex: number
  ): Vector2Int {
    const mainPathLength = TilesSetData[0];
    const totalPlayersCount = TilesSetData.length - 1;
    const tilesPerPlayer = mainPathLength / totalPlayersCount;
    const startIndex = tilesPerPlayer * playerIndex;
    const collectionIndex = position.x;
    if (collectionIndex === 0) {
      const rotatedIndex = (startIndex + position.y) % mainPathLength;
      return { x: collectionIndex, y: rotatedIndex };
    } else {
      const adjustedX = 1 + ((playerIndex - 1 + collectionIndex) % totalPlayersCount);
      return { x: adjustedX, y: position.y };
    }
  }
}
class LudoPlayerData {
  public PlayerBaseIndex: number = 0;
  public PlayerTurn: number = 0;
  public UserId: string = '';
  public UserName: string = '';
  public isWin: boolean = false;
  public isOffline: boolean = false;
  public rank: number = 0;
  public pawnPositions: number[] = [];
  public movebulPawnIds: number[] = [];
  public isLost : boolean = false;
  public turnOverCount : number =0;

  public isAllPawnsReached(length: number): boolean {
    for (const pos of this.pawnPositions) {
      if (pos !== length) {
        return false;
      }
    }
    return true;
  }

  constructor(diceRollStartTime: number, diceValue: number, isWin: boolean, pawnPositions: number[]) {
    this.isWin = isWin;
    this.pawnPositions = pawnPositions;
  }
}
class PathCommands {
  public commands: string[] = [];
  private pathLength: number = -1;
  private worldPositions: Vector2Int[] = [];
  private indexToPos: { [key: number]: Vector2Int } = {};
  private posToIndex: { [key: string]: number } = {};

  public GetPathLength(): number {
    if (this.pathLength >= 0) {
      return this.pathLength;
    }

    let length = 0;

    for (const command of this.commands) {
      const startParen = command.indexOf('(');
      const endParen = command.lastIndexOf(')');
      if (startParen === -1 || endParen === -1) continue;

      const inside = command.slice(startParen + 1, endParen);
      const parts = inside.split(',');

      if (command.startsWith('r(') && parts.length === 3) {
        const start = parseInt(parts[1]);
        const end = parseInt(parts[2]);
        if (!isNaN(start) && !isNaN(end)) {
          length += Math.abs(end - start) + 1;
        }
      } else if (command.startsWith('rc(') && parts.length === 3) {
        const count = parseInt(parts[2]);
        if (!isNaN(count)) {
          length += count;
        }
      }
    }

    this.pathLength = length;
    this.setWorldPositions();
    return this.pathLength;
  }

  public GetCommandLength(commandIndex: number): number {
    if (commandIndex < 0 || commandIndex >= this.commands.length) {
      return 0;
    }

    const command = this.commands[commandIndex];
    const startParen = command.indexOf('(');
    const endParen = command.lastIndexOf(')');
    if (startParen === -1 || endParen === -1) return 0;

    const inside = command.slice(startParen + 1, endParen);
    const parts = inside.split(',');

    if (command.startsWith('r(') && parts.length === 3) {
      const start = parseInt(parts[1]);
      const end = parseInt(parts[2]);
      if (!isNaN(start) && !isNaN(end)) {
        return Math.abs(end - start) + 1;
      }
    } else if (command.startsWith('rc(') && parts.length === 3) {
      const count = parseInt(parts[2]);
      if (!isNaN(count)) {
        return count;
      }
    }

    return 0;
  }

  private setWorldPositions(): void {
    this.worldPositions = new Array<Vector2Int>(this.GetPathLength());
    this.indexToPos = {};
    this.posToIndex = {};
    let globalIndex = 0;
    for (const command of this.commands) {
      const startParen = command.indexOf('(');
      const endParen = command.lastIndexOf(')');
      if (startParen === -1 || endParen === -1) continue;

      const inside = command.slice(startParen + 1, endParen);
      const parts = inside.split(',');

      if (command.startsWith('r(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const start = parseInt(parts[1]);
        const end = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(start) && !isNaN(end)) {
          if (end >= start) {
            for (let i = start; i <= end; i++) {
              const pos = { x: collectionIndex, y: i };
              this.worldPositions[globalIndex] = pos;
              this.indexToPos[globalIndex] = pos;
              this.posToIndex[`${pos.x},${pos.y}`] = globalIndex;
              globalIndex++;
            }
          } else {
            for (let i = start; i >= end; i--) {
              const pos = { x: collectionIndex, y: i };
              this.worldPositions[globalIndex] = pos;
              this.indexToPos[globalIndex] = pos;
              this.posToIndex[`${pos.x},${pos.y}`] = globalIndex;
              globalIndex++;
            }
          }
        }
      } else if (command.startsWith('rc(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const startIndex = parseInt(parts[1]);
        const count = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(startIndex) && !isNaN(count)) {
          for (let i = 0; i < count; i++) {
            const pos = { x: collectionIndex, y: startIndex + i };
            this.worldPositions[globalIndex] = pos;
            this.indexToPos[globalIndex] = pos;
            this.posToIndex[`${pos.x},${pos.y}`] = globalIndex;
            globalIndex++;
          }
        }
      }
    }
  }

  public static GetWorldPositionsUsingCommands(
    commands: string[],
    CollectionData: number[],
    playersCount: number,
    playerIndex: number
  ): Vector2Int[] {
    const worldPositions: Vector2Int[] = [];
    const pathLength = CollectionData[0];
    const tilesPerPlayer = pathLength / playersCount;
    const startIndex = tilesPerPlayer * playerIndex;

    for (const command of commands) {
      const startParen = command.indexOf('(');
      const endParen = command.lastIndexOf(')');
      if (startParen === -1 || endParen === -1) continue;

      const inside = command.slice(startParen + 1, endParen);
      const parts = inside.split(',').map((p) => p.trim());

      if (command.startsWith('r(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const start = parseInt(parts[1]);
        const end = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(start) && !isNaN(end)) {
          const steps = end >= start ? end - start + 1 : start - end + 1;
          for (let i = 0; i < steps; i++) {
            if (collectionIndex === 0) {
              const rotatedIndex = (startIndex + i) % pathLength;
              worldPositions.push({ x: collectionIndex, y: rotatedIndex });
            } else {
              const adjustedX = 1 + ((playerIndex - 1 + collectionIndex) % playersCount);
              const tileIndex = end >= start ? start + i : start - i;
              worldPositions.push({ x: adjustedX, y: tileIndex });
            }
          }
        }
      } else if (command.startsWith('rc(') && parts.length === 3) {
        const collectionIndex = parseInt(parts[0]);
        const startIndexRC = parseInt(parts[1]);
        const count = parseInt(parts[2]);
        if (!isNaN(collectionIndex) && !isNaN(startIndexRC) && !isNaN(count)) {
          for (let i = 0; i < count; i++) {
            if (collectionIndex === 0) {
              const rotatedIndex = (startIndex + i) % pathLength;
              worldPositions.push({ x: collectionIndex, y: rotatedIndex });
            } else {
              const adjustedX = 1 + ((playerIndex - 1 + collectionIndex) % playersCount);
              const tileIndex = startIndexRC + i;
              worldPositions.push({ x: adjustedX, y: tileIndex });
            }
          }
        }
      }
    }

    return worldPositions;
  }

  public GetWorldPositions(
    CollectionData: number[],
    playersCount: number,
    playerIndex: number
  ): Vector2Int[] {
    if (!this.worldPositions || this.worldPositions.length === 0) {
      this.setWorldPositions();
    }
    return PathCommands.GetWorldPositionsUsingCommands(
      this.commands,
      CollectionData,
      playersCount,
      playerIndex
    );
  }

  public GetPositionAt(index: number): Vector2Int {
    if (!this.indexToPos || Object.keys(this.indexToPos).length === 0) {
      this.setWorldPositions();
    }

    if (index < 0 || index >= this.pathLength) {
      throw new Error(`Index ${index} out of path range 0..${this.pathLength - 1}`);
    }

    return this.indexToPos[index];
  }

  constructor(commands?: string[]) {
    if (commands) {
      this.SetCommands(commands);
    }
  }

  public SetCommands(commands: string[]): void {
    this.commands = commands;
    this.pathLength = -1;
    this.GetPathLength();
  }
}
class Signal {
  public type: string;
  public who: number;
  public value: string;

  constructor(type: string, who: number, value: string) {
    this.type = type;
    this.who = who;
    this.value = value;
  }
}
class FutureData {
  public whosTurn: number = 0;
  public tickStart: number = 0;
  public tickEnd: number = 0;
  public diceValue: number = 0;
  public aiMove: number = 0;
  public futureMoves: FutureMove[] = [];
}
class FutureMove {
  public movablePawnId: number;
  public stepsCount: number;
  public isSafe: boolean;
  public isWin: boolean;
  public killedPlayers: { [key: number]: number[] };
  public playerDatas: LudoPlayerData[];

  constructor(
    movablePawnId: number,
    stepsCount: number,
    killedPlayers: { [key: number]: number[] },
    isSafe: boolean,
    isWin: boolean,
    playerDatas: LudoPlayerData[]
  ) {
    this.movablePawnId = movablePawnId;
    this.stepsCount = stepsCount;
    this.killedPlayers = killedPlayers;
    this.isSafe = isSafe;
    this.isWin = isWin;
    this.playerDatas = playerDatas;
  }
}
class WordGameState {
  public PlayersFullWordsData: WordData[] = [];
  public PlayersMissingWords: string[] = [];
  public PlayerLetterPlacement: number[][] = [];
  public PlayerLetterCollections: string[][] = [];
  public BoardLetters: { [key: number]: string } = {};

  constructor();
  constructor(fullWords: WordData[], missingWords: string[], boardLetters: { [key: number]: string });
  constructor(fullWords?: WordData[], missingWords?: string[], boardLetters?: { [key: number]: string }) {
    if (fullWords && missingWords && boardLetters) {
      this.PlayersFullWordsData = fullWords;
      this.PlayersMissingWords = missingWords;
      this.BoardLetters = boardLetters;
      this.PlayerLetterCollections = new Array(fullWords.length).fill(null).map(() => []);
      this.PlayerLetterPlacement = new Array(fullWords.length).fill(null).map((_, i) => new Array(this.getMissingLettersListOfPlayer(i).size).fill(-1));
    }
  }

  TryPlaceLetter(logger: any,playerIndex: number, collectionIndex: number, wordIndex: number): boolean {
    if (!this.IsValidPlayer(playerIndex)) return false;
    const collection = this.PlayerLetterCollections[playerIndex];
    const missingDic = this.getMissingLettersListOfPlayer(playerIndex);
    if (collectionIndex < 0 ||collectionIndex >= collection.length ||wordIndex < 0 ||wordIndex >= this.PlayersMissingWords[playerIndex].length ||!missingDic.has(wordIndex))
    return false;
    const missingKeys = Array.from(missingDic.keys());
    const missingIndex = missingKeys.indexOf(wordIndex);
    if (this.PlayerLetterPlacement[playerIndex].length <= missingIndex) {
      this.PlayerLetterPlacement[playerIndex] = new Array(missingDic.size).fill(-1);
    }
    if (collection[collectionIndex].toLowerCase() === missingDic.get(wordIndex)!.toLowerCase())
     {
      this.PlayerLetterPlacement[playerIndex][missingIndex] = collectionIndex;
      logger.info("placed ✅");
      return true;
     }
    return false;
  }

  public ValidatePlayerPlacements(playerIndex: number): void {
    if (!this.IsValidPlayer(playerIndex)) return;

    const placements = this.PlayerLetterPlacement[playerIndex];
    const collection = this.PlayerLetterCollections[playerIndex];
    const missingDic = this.getMissingLettersListOfPlayer(playerIndex);

    for (let i = 0; i < placements.length && i < missingDic.size; i++) {
      const collectionIndex = placements[i];
      const missingEntry = Array.from(missingDic.entries())[i];
      if (
        collectionIndex < 0 ||
        collectionIndex >= collection.length ||
        collection[collectionIndex].toLowerCase() !== missingEntry[1].toLowerCase()
      ) {
        placements[i] = -1;
      }
    }
  }

  public isPlayerCompleted(playerIndex: number): boolean {
    if (!this.IsValidPlayer(playerIndex)) return false;
    this.ValidatePlayerPlacements(playerIndex);
    return (
      this.PlayersFullWordsData[playerIndex].EnglishWord.toLowerCase() ===
      this.GetPlayerCurrentWord(playerIndex).toLowerCase()
    );
  }

  public GetPlayerCurrentWord(playerIndex: number): string {
    if (!this.IsValidPlayer(playerIndex)) return '';

    const template = this.PlayersMissingWords[playerIndex].split('');
    const placements = this.PlayerLetterPlacement[playerIndex];
    const missingDic = this.getMissingLettersListOfPlayer(playerIndex);
    const collection = this.PlayerLetterCollections[playerIndex];

    let i = 0;
    for (const [wordIndex, value] of missingDic) {
      if (i < placements.length && placements[i] >= 0 && placements[i] < collection.length) {
        const givenLetter = collection[placements[i]].toLowerCase();
        if (givenLetter === value.toLowerCase()) {
          template[wordIndex] = value;
        } else {
          placements[i] = -1;
        }
      }
      i++;
    }

    return template.join('');
  }

  public StealLetterFromPlayer(thiefIndex: number, victimIndex: number, letter: string): boolean {
    if (!this.IsValidPlayer(thiefIndex) || !this.IsValidPlayer(victimIndex)) return false;

    const victimCollection = this.PlayerLetterCollections[victimIndex];
    const letterIndex = victimCollection.indexOf(letter);

    if (letterIndex >= 0) {
      victimCollection.splice(letterIndex, 1);
      this.PlayerLetterCollections[thiefIndex].push(letter);
      this.ValidatePlayerPlacements(victimIndex);
      return true;
    }
    return false;
  }

  public StealLettersFromPlayer(
    thiefIndex: number,
    victimIndex: number,
    victimCollectionIndexes: number[]
  ): boolean {
    if (
      !this.IsValidPlayer(thiefIndex) ||
      !this.IsValidPlayer(victimIndex) ||
      !victimCollectionIndexes ||
      victimCollectionIndexes.length === 0
    )
      return false;

    const victimCollection = this.PlayerLetterCollections[victimIndex];
    victimCollectionIndexes.sort((a, b) => b - a);
    let success = false;

    for (const idx of victimCollectionIndexes) {
      if (idx >= 0 && idx < victimCollection.length) {
        this.PlayerLetterCollections[thiefIndex].push(victimCollection[idx]);
        victimCollection.splice(idx, 1);
        success = true;
      }
    }

    if (success) this.ValidatePlayerPlacements(victimIndex);
    return success;
  }

  public getMissingLettersListOfPlayer(playerIndex: number): Map<number, string> {
    const dic = new Map<number, string>();
    const fullWord = this.PlayersFullWordsData[playerIndex].EnglishWord;
    const missingWord = this.PlayersMissingWords[playerIndex];

    for (let i = 0; i < missingWord.length; i++) {
      if (missingWord[i] === '*' || missingWord[i] === '_') {
        dic.set(i, fullWord[i]);
      }
    }
    return dic;
  }

  public GetPlayerCollectionCount(playerIndex: number): number {
    return this.IsValidPlayer(playerIndex) ? this.PlayerLetterCollections[playerIndex].length : 0;
  }

  public TryCollectBoardLetter(playerIndex: number, boardPos: number): boolean {
    if (!this.CanCollectBoardLetter(playerIndex, boardPos)) return false;
    this.PlayerLetterCollections[playerIndex].push(this.BoardLetters[boardPos]);
    delete this.BoardLetters[boardPos];
    return true;
  }

  public CanCollectBoardLetter(playerIndex: number, boardPos: number): boolean {
    return this.IsValidPlayer(playerIndex) && boardPos in this.BoardLetters;
  }

  public IsValidPlayer(playerIndex: number): boolean {
    return (
      playerIndex >= 0 &&
      playerIndex < this.PlayersFullWordsData.length &&
      this.PlayersFullWordsData.length === this.PlayersMissingWords.length &&
      this.PlayersFullWordsData.length === this.PlayerLetterCollections.length
    );
  }
}
class stealData {
  public timeUp: number = 0;
  public whoStealingIndex: number = 0;
  public fromWhoIndex: number = 0;
  public maxLettersToPick: number = 0;
  public stealLetters: number[] = [];
}
function genLudoGameData(boardIndex: number | string,numberOfPlayers: number | string,gameMode: string,tickCountForPlayer: number = 0): LudoGameData {
  const gameData = new LudoGameData();
  // Basic settings
  gameData.BoardId = typeof boardIndex === 'string' ? parseInt(boardIndex) : boardIndex;
  gameData.gameMode = gameMode;
  gameData.isGameStarted = false;
  gameData.isGameComplected = false;
  gameData.IsLoop = gameMode === 'wordo';
  gameData.useTimeOut = tickCountForPlayer > 0;
  gameData.WhosTurn = 0;
  gameData.rankCount = 1;
  gameData.tickCount = 0;
  gameData.tickCountForPlayer = tickCountForPlayer;

  const board_Players = [4, 4, 5, 6];
  const totalPlayersCount = board_Players[gameData.BoardId];

  // Tiles setup
  gameData.TilesSetData = [];
  const mainPathLength = (gameData.BoardId === 0 ? 9 : 13) * totalPlayersCount; // example: 13 tiles per player
  gameData.TilesSetData.push(mainPathLength);

  for (let i = 0; i < totalPlayersCount; i++) {
    gameData.TilesSetData.push(gameData.BoardId === 0 ? 4 : 6); // inner home path
  }

  // Player placement rule
  const baseIndexes: number[] = [];
  const totalBases = totalPlayersCount; // default board has 4 bases (change if you have 6 or 8 base boards)
  const numPlayers = typeof numberOfPlayers === 'string' ? parseInt(numberOfPlayers) : numberOfPlayers;

  // if only 2 players → opposite
  if (numPlayers === 2) {
    baseIndexes.push(0);
    baseIndexes.push(totalBases / 2); // opposite side
  } else {
    // Normal placement for 3+ players
    for (let i = 0; i < numPlayers; i++) {
      baseIndexes.push(i);
    }
  }

  // Create players
  for (let i = 0; i < numPlayers; i++) {
    const player = new LudoPlayerData(
      0,
      0,
      false,
      gameMode === 'wordo' || gameMode === 'quick' ? [0, 0, -1, -1] : [-1, -1, -1, -1] // all pawns in base
    );
    player.PlayerBaseIndex = baseIndexes[i];
    player.PlayerTurn = i;
    player.UserId = i.toString();
    player.UserName = `player ${i}`;
    player.isWin = false;
    player.isOffline = false;
    player.rank = 0;
    player.movebulPawnIds = [];
    gameData.players.push(player);
  }

  return gameData;
}

const matchInit = function (ctx: any, logger: any, nk: any, params: any) {
    const state = {
        presences: {} as Record<string, any>,
        delay: 0,
        tickCount: 0,
        commends: [] as [string, any][],
        gameData: genLudoGameData(params.boardIndex, params.numberOfPlayers, params.gameMode,30)
    };
    return { state, tickRate: 1, label: JSON.stringify(params) };
};
function applyCommend(commend: [string, any], state: any, dispatcher: any, nk: any) {
    const [commendName, obj] = commend;
    switch (commendName) {
        case "addDelay":
            state.delay = (state.delay as number) + (obj as number);
            break;
        case "setDelay":
            state.delay = obj as number;
            break;
    }
if (commendName !== "addDelay" && commendName !== "setDelay") {
    dispatcher.broadcastMessage(0,nk.stringToBinary(`${commendName}:${JSON.stringify(obj)}`, Object.values(state.presences))
    );
}
}
const matchJoinAttempt = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, presence: any, metadata: any) {
  logger.info("matchJoinAttempt called for user:", presence.userId);

  if (state.gameData.isGameStarted) {
    const players = state.gameData.players;
    const matchedPlayer = players.find((player: any) => player.UserId === presence.userId);
    if (matchedPlayer) {
      return { state, accept: true };
    }
    return { state, accept: false }; // reject new players after game started
  } else {
    return { state, accept: true }; // allow join before game starts
  }
};
const matchJoin = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, presences: any[]) {
  // Store new presences
  presences.forEach(p => {
    state.presences[p.sessionId] = p;
  });

  logger.info("matchJoin called, players now:", Object.keys(state.presences));

  if (state.gameData.isGameStarted) {
    // Broadcast updated player info to joining players
    let addP: any[]=[];
    presences.forEach(p => {
      const matchedPlayer = state.gameData.players.find((player: any) => player.UserId === p.userId);
      if(matchedPlayer){
      if(matchedPlayer.isOffline){
        matchedPlayer.isOffline = false;
        addP.push(p);
      }
      }
    });
    dispatcher.broadcastMessage(0,nk.stringToBinary(`startGame:${JSON.stringify(state.gameData)}`, Object.values(addP)));
  } 
  else {
    // Start game when all players are connected
    if (Object.keys(state.presences).length === state.gameData.players.length ) {
      const GameData = Object.assign(new LudoGameData(), state.gameData);
      logger.info("🔔✅ All players connected 🎉");
      Object.values(state.presences).forEach((p: any, idx: number) => {
        if (state.gameData.players[idx]) 
        {
          state.gameData.players[idx].UserId = p.userId;
        }
      });
      GameData.start(logger, nk);
      state.gameData = GameData;
    }
  }

  return { state };
};
const matchLeave = function (ctx: any,logger: any,nk: any,dispatcher: any,tick: number,state: any,presences: any[]){
  presences.forEach(p => {
    // Find the player in gameData and mark as offline
    const player = state.gameData.players.find((pl: any) => pl.UserId === p.userId || pl.id === p.userId);  
    if (player) {
      player.isOffline = true;
    }
    // Remove from active presences
    delete state.presences[p.sessionId];
  });
  logger.info("matchLeave called, players now:", Object.keys(state.presences));
  // Broadcast updated player status to all remaining players   
  dispatcher.broadcastMessage(0,nk.stringToBinary(`UpdateMainPlayersData:${JSON.stringify(state.gameData.players)}`, Object.values(state.presences)));
  return { state };
};
const matchLoop = function (ctx: any,logger: any,nk: any,dispatcher: any,tick: number,state: any,messages: any[]) {
    const presences: nkruntime.Presence[] = [];
    for (const key in state.presences) {
        if (state.presences.hasOwnProperty(key)) {
            presences.push(state.presences[key]);
        }
    }

    if (state.gameData.isGameStarted) {

          let gameData = Object.assign(new LudoGameData(), state.gameData);
          if (Object.keys(state.presences).length === 0 || state.tickCount>1800 || gameData.isGameComplected) {
            ctx.matchTerminate();
          }
          gameData.WordGameState = Object.assign(new WordGameState(), gameData.WordGameState);
            if ((state.delay as number) > 0) {
                state.delay = (state.delay as number) - 1;
            }
            else{
                state.commends.push(...gameData.GameLogic(logger,new Signal("tick", 0, "0")));

            }
            while (state.commends.length > 0) {
                if ((state.delay as number) > 0) break;

                const commend = state.commends.shift()!;
                applyCommend(commend, state,dispatcher,nk);
            }
        state.tickCount++;
        dispatcher.broadcastMessage(0,nk.stringToBinary("tc:"+state.tickCount+","+gameData.tickCount),Object.values(state.presences));

        state.gameData = gameData;
    }
    return { state };
};
const matchSignal = function (ctx: any,logger: any,nk: any,dispatcher: any,tick: number,state: any,data: string): { state: any } 
{
    try {
        // Broadcast the raw message
        dispatcher.broadcastMessage(1, data, null, null);
        const gameData = Object.assign(new LudoGameData(), state.gameData);
                  gameData.WordGameState = Object.assign(new WordGameState(), gameData.WordGameState);


        // Parse and create Signal instance
        let signalData: any;
        try {
            signalData = JSON.parse(data);
        } catch (e) {
            throw new Error(`Invalid JSON data: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
        }
        const signal = new Signal(
            signalData.type ?? "tick",
            signalData.who ?? 0,
            signalData.value ?? ""
        );

        if(gameData.isGameStarted){
            const commends = state.commends as [string, any][];
            if (signal && (signal.type === "dice" || signal.type === "pawn" || signal.type.startsWith("wordo"))) {
    
                if (signal.type.startsWith("wordo")) {
                    logger.info("😂 "+signal.type+"-"+signal.value);
                    const newCommends = gameData.GameLogic(logger,signal);
                    while (newCommends.length > 0) {
                        logger.info("😂 new commend "+newCommends[0][0]);
                        applyCommend(newCommends.shift()!, state,dispatcher,nk);
                    }
                } else {
                    commends.push(...gameData.GameLogic(logger,signal));
                }
                while (commends.length > 0) {
                    if ((state["delay"] as number) > 0) break;
                    applyCommend(commends.shift()!, state,dispatcher,nk);
                }
            }
        }
        state.gameData = gameData;



        return { state };
    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`MatchSignal Error: tick=${tick}, data=${data}, error=${errMsg}`);
        throw new Error(`matchSignal failed: ${errMsg}`);
    }
};
const matchTerminate = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, graceSeconds: number) {
  logger.info("matchTerminate called, tick:", tick, "graceSeconds:", graceSeconds);
  return { state };
};
const matchmakerMatched = function (ctx: any, logger: any, nk: any, matches: any[]): string {
  matches.forEach((match) => {
    logger.info("Matched user '%s' with username '%s'", match.presence.userId, match.presence.username);
  });

    // Access string_properties instead of properties
    let boardIndex = matches[0].properties.boardIndex;
    let numberOfPlayers = matches[0].properties.numberOfPlayers;
    let gameMode = matches[0].properties.gameMode;
    logger.info("⭐ "+(boardIndex+"❌"+numberOfPlayers+"❌"+gameMode));

  try {
    // Create match with label
    const matchId = nk.matchCreate("lobby", {boardIndex,numberOfPlayers,gameMode});
    logger.info(`Match created successfully with ID: ${matchId}`);
    return matchId;
  } catch (err: any) {
    logger.error("Error creating match:", err.message);
    throw err;
  }
};