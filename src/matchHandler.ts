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
  public CurrentPackWords: { [playerIndex: number]: string } = {};
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
    } while (this.players[who].isWin || this.players[who].isLost);
    this.WhosTurn = who;
  }
  public IsAllWin(): boolean {
    this.checkPlayers();
    for (const player of this.players) {
      if (!player.isWin && !player.isLost) {
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
    this.checkPlayers();

  }
  public checkPlayers(){
    let notWinCount = 0;
    let lastNotWinIndex = -1;

    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].isWin&&!this.players[i].isLost) {
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
  public GenerateWordGameState(logger: any,nk: any,removeSafeTiles: boolean,comman: boolean,random: boolean,fill: boolean): void {
    const numberOfBlocksForPlayer = this.TilesSetData[0] / this.getTotalPlayersCount();
    const collection = "words";
    const key = "main";
    //const key = "Class_6_Eng_Ch_1";
    const user = "00000000-0000-0000-0000-000000000000";
    const objects = nk.storageRead([{ collection, key, user }]);
    let wordData:WordData[] = objects[0].value.wordData;
    const wordsGenInstance = new wordsGen(wordData);
    if (wordsGenInstance) {
    let lengthOfWords :number= 0;
    let randomMissingCount :number= 0;
    let commonMissingCount:number = 0;
const selectedWordsData: WordData[] = [];
const missingLettersWords: string[] = [];
const commanRandomLettersList: string[] = [];
const nonCommonLetters: string[][] = [];

// initial level index (random once)
let levelIndex = Math.floor(Math.random() * 60); // 0–59
let success = false;

for (let attempt = 0; attempt < 100; attempt++) {

    // clear old data before retry
    selectedWordsData.length = 0;
    missingLettersWords.length = 0;
    commanRandomLettersList.length = 0;
    nonCommonLetters.length = 0;

    // downgrade level safely (never below 0)
    const level = LEVEL_DATA[Math.max(0, levelIndex)];
    levelIndex--;

     lengthOfWords = level.wordLength;
     randomMissingCount = level.uncommon;
     commonMissingCount = level.common;

    try {
        wordsGenInstance.generateWords(
            lengthOfWords,
            this.players.length,
            randomMissingCount,
            commonMissingCount,
            selectedWordsData,
            missingLettersWords,
            commanRandomLettersList,
            nonCommonLetters
        );

        // validation check
        if (selectedWordsData.length === this.players.length) {
            success = true;
            break;
        }

    } catch (e) {
        // silently retry (no crash)
    }
}

// final safety check
if (!success) {
    console.error("generateWords failed after 100 attempts");
    // optional: fallback logic here
}

      // After generate section…
for (const player of this.players) {
    if(player.isBot) continue;
    const playerId = player.UserId;
    const playerIndex = player.PlayerTurn;

    try {
        // 1. Read player's word packs
        //const playerPackObj = nk.storageRead([{ collection: "player_data", key: "wordpacks", userId: playerId }]);
        //let packData = (playerPackObj.length > 0 &&playerPackObj[0].value && Array.isArray(playerPackObj[0].value.packs)) ? playerPackObj[0].value.packs : [];
        let activePackData=getActiveWordPackWithData(nk,playerId);
        if(activePackData && activePackData.hasActivePack && activePackData.pack){
        let packData:WordPack[] = [activePackData.pack];
        let replaced = false;
        // 2. Loop each purchased pack
        for (const pack of packData) {
            const packId = pack.packId;
            const completedArr = pack.completed || [];
            // 3. Load actual pack words
            const packWordsObj = nk.storageRead([{collection: "words",key: packId,user: "00000000-0000-0000-0000-000000000000"}]);
            if (!packWordsObj.length || !packWordsObj[0].value) continue;
            const allWords: WordData[] = packWordsObj[0].value.wordData;
            // 4. Loop through all words (with their actual index)
            for (let wIndex = 0; wIndex < allWords.length; wIndex++) {
                if (completedArr.includes(wIndex)) continue;
                const w = allWords[wIndex];
                // Check if word contains all common letters for this player
                const tempLetters = w.EnglishWord.toLowerCase().split("");
                let containsAll = true;
                for (const c of commanRandomLettersList) {
                    const idx = tempLetters.indexOf(c.toLowerCase());
                    if (idx === -1) {
                        containsAll = false;
                        break;
                    }
                    tempLetters.splice(idx, 1);
                }
                if (!containsAll) continue;
                // ✅ FOUND PLAYER WORD → REPLACE GENERATED WORD
                selectedWordsData[playerIndex] = w;
                // Recalculate missingLettersWords and nonCommonLetters for this player
                const missing = wordsGenInstance.ReplaceWithMissingAndStars(
                    w.EnglishWord,
                    commanRandomLettersList,
                    randomMissingCount
                );
                missingLettersWords[playerIndex] = missing;
                const nonCommon: string[] = [];
                for (let i = 0; i < missing.length; i++) {
                    if (missing[i] === '*') nonCommon.push(w.EnglishWord[i]);
                }
                nonCommonLetters[playerIndex] = nonCommon;
                replaced = true;
                if (replaced) {
                  // 🔥 STORE WORD INFO IN PUBLIC GAME VARIABLE
                  this.CurrentPackWords[playerIndex] = JSON.stringify({packId: packId,wordIndex: wIndex,wordData: w});
                }
                break; // stop after first valid word
            }

            if (replaced) break; // stop after first pack that contains valid word
        }
      }

    } catch (err) {
        logger.error("Failed loading packs for player " + playerId + ": " + err);
    }
}

      //const selectedWords = selectedWordsData.map((c) => c.EnglishWord);
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
        LudoGameData.ShuffleList(keys); // Shuffle keys for random placement
        const numLettersToFill = 13; // Specify the number of letters to fill (adjust as needed)
        const fillCount = Math.min(keys.length, randomLetters.length, numLettersToFill); // Limit to available letters, positions, or desired count
        for (let i = 0; i < fillCount; i++) {
          const keyValue = allTilesPositionsDictionary[keys[i]];
          boardLetters[keyValue] = randomLetters[i]; // Assign without repeating 
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
        let letter ="";
        if (this.gameMode === 'wordo') {
          if (this.WordGameState?.IsValidPlayer(this.WhosTurn)) {
            const localPos = LudoGameData.Wrap(newPos, playerPathLength - 1);
            const worldPosition = LudoGameData.Wrap(numberOfBlocksForPlayer * this.players[this.WhosTurn].PlayerBaseIndex + localPos,playerPathLength - 1);
            const isLetterPresent = worldPosition in this.WordGameState!.BoardLetters;
            if (isLetterPresent) {
               letter = this.WordGameState!.BoardLetters[worldPosition];
            }
          }
        }
        this.futureData.futureMoves.push(
          new FutureMove(pawnId, myStepsCount + deadPawnsStepsCount, killedPlayers, isSafe, isPawnWin, movedPlayers,letter)
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
        // Generate a random integer between min and max (inclusive)
        function getRandomInt(min: number, max: number): number {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        // Use it in your function call
        this.GenerateWordGameState(logger, nk, true, true, true, true);
    } else {
      this.WordGameState = null;
    }

    this.GenerateFutureMoves();
  }
//#region game logic
      public GameLogic(logger: any, signal: Signal | null): [string, any][] {
          const state: [string, any][] = [];
          if (!signal || !this.futureData || this.isGameComplected) {
              return state; // Early return if prerequisites are missing
          }
          // Handle tick signal form loop
          if (signal.type === 'tick') {
            this.handleTickSignal(state);
          }
          else{
            // Ensure valid turn index
            this.WhosTurn = this.normalizeTurnIndex(this.WhosTurn);
            const currentPlayer = this.players[this.WhosTurn];
            // Process Wordo-specific signals
            if (signal.type.startsWith('wordo')) {
              this.handleWordoSignal(signal, state);
            }
            // Handle dice roll
            if (this.isWaitingForDiceRoll && signal.type === 'dice') {
              this.handleDiceSignal(currentPlayer, state);
            }
            // Handle pawn movement
            if (signal.type === 'pawn') {
              this.handlePawnSignal(currentPlayer, signal, state);
            }
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
      private handleWordoSignal(signal: Signal, state: [string, any][]): void {
          const { type, value, who } = signal;
          const json = value;
          switch (type) {
              case 'wordoPlaceLetters':
                this.handlePlaceLetters(json, who, state);
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
      private handlePlaceLetters(json: any, who: number, state: [string, any][]): void {
          const playerPlacement = JsonConvert.deserializeObject<number[]>(json);
          const missingLetters = this.WordGameState?.getMissingLettersListOfPlayer(who);
          let isAnyPlacement = false;
          if (playerPlacement.length === (missingLetters?.size ?? 0)) {
              let i = 0;
              for (const [wordIndex] of missingLetters ?? new Map<number, string>()) {
                  const collectionIndex = playerPlacement[i];
                  if (this.WordGameState?.TryPlaceLetter(who, collectionIndex, wordIndex)) {
                      isAnyPlacement = true;
                  }
                  i++;
              }
          }
          const isPlayerCompleted = this.WordGameState?.isPlayerCompleted(who) || false;
          if (!this.players[who].isWin && isPlayerCompleted) {
             let player= this.players[who];
              for(let i = 0;i<player.pawnPositions.length;i++){
                player.pawnPositions[i]=-1;
              }
              if (this.gameMode === "wordo" && this.WordGameState) {
                let BoardLetters = this.WordGameState.BoardLetters;
                let allTilesPositionsDictionary: { [key: number]: number } = {};
                // Initialize dictionary with tile positions
                for (let i = 0; i < this.TilesSetData[0]; i++) {
                  allTilesPositionsDictionary[i] = i;
                }
                // Remove safe tiles
                if (this.safeTiles && this.safeTiles.length > 0) {
                  const filteredDictionary: { [key: number]: number } = {};
                  for (const [key, value] of Object.entries(allTilesPositionsDictionary)) {
                    const numKey = parseInt(key);
                    if (!this.safeTiles.includes(value)) {
                      filteredDictionary[numKey] = value;
                    }
                  }
                  allTilesPositionsDictionary = filteredDictionary;
                }
                // Remove positions already occupied in BoardLetters
                const boardLetterKeys = Object.keys(BoardLetters).map(Number);
                if (boardLetterKeys.length > 0) {
                  const filteredDictionary: { [key: number]: number } = {};
                  for (const [key, value] of Object.entries(allTilesPositionsDictionary)) {
                    const numKey = parseInt(key);
                    if (!boardLetterKeys.includes(value)) {
                      filteredDictionary[numKey] = value;
                    }
                  }
                  allTilesPositionsDictionary = filteredDictionary;
                }
                // Collect and remove pawn positions
                let playersPos: number[] = [];
                for (let player of this.players) {
                  const PlayersWorldPosition = this.PlayersWorldPositions[player.PlayerTurn];
                  for (let pos of player.pawnPositions) {
                    if (PlayersWorldPosition[pos] && PlayersWorldPosition[pos].y !== undefined) {
                      playersPos.push(PlayersWorldPosition[pos].y);
                    }
                  }
                }
                if (playersPos.length > 0) {
                  const filteredDictionary: { [key: number]: number } = {};
                  for (const [key, value] of Object.entries(allTilesPositionsDictionary)) {
                    const numKey = parseInt(key);
                    if (!playersPos.includes(value)) {
                      filteredDictionary[numKey] = value;
                    }
                  }
                  allTilesPositionsDictionary = filteredDictionary;
                }
                // Shuffle available positions
                const availablePositions = Object.values(allTilesPositionsDictionary);
                for (let i = availablePositions.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
                }
                // Assign player letters to available board positions
                const PlayerLetterCollection = this.WordGameState.PlayerLetterCollections[player.PlayerTurn] || [];
                let i = 0;
                for (const letter of PlayerLetterCollection) {
                  if (i < availablePositions.length) {
                    BoardLetters[availablePositions[i]] = letter;
                    i++;
                  } else {
                    console.warn("Not enough available positions for all player letters.");
                    break;
                  }
                }
              }
              if (this.WordGameState && Array.isArray(this.WordGameState.PlayerLetterCollections[player.PlayerTurn])) {
                this.WordGameState.PlayerLetterCollections[player.PlayerTurn].length = 0;
              }
              this.PlayerWin(who);
              state.push(['playerWin', player]);
              state.push(['UpdateMainPlayersData', {fun:"handlePlaceLetters",players:[player]}]);
          }
          if (isAnyPlacement) {
              state.push(['updateWords', this.WordGameState]);
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
          if (this.useTimeOut && this.tickCount >= this.futureData.tickEnd) {
            //time out
            this.autoMove(state,1);
          }
          else{
            const currentPlayer = this.players[this.WhosTurn];
            const move = (currentPlayer.isBot ) && (this.tickCount >(this.futureData.tickEnd-(this.tickCountForPlayer -1)));
            if(move || true){ 
              //bot
              this.autoMove(state,0);
            }
          }
      }
      // Handle timeout logic
      private autoMove(state: [string, any][] , addTurnOverCount:number): void {
          const player = this.players[this.futureData.whosTurn];
          player.turnOverCount+=addTurnOverCount;
          let nextPlayer = false;
          if (this.maxTurnOverCount > 0 && player.turnOverCount > this.maxTurnOverCount) {
              //player lost
              player.isLost = true;
              nextPlayer = true;
              for(let i = 0;i<player.pawnPositions.length;i++){
                player.pawnPositions[i]=-1;
              }

              if (this.gameMode === "wordo" && this.WordGameState) {
                let BoardLetters = this.WordGameState.BoardLetters;
                let allTilesPositionsDictionary: { [key: number]: number } = {};
                // Initialize dictionary with tile positions
                for (let i = 0; i < this.TilesSetData[0]; i++) {
                  allTilesPositionsDictionary[i] = i;
                }
                // Remove safe tiles
                if (this.safeTiles && this.safeTiles.length > 0) {
                  const filteredDictionary: { [key: number]: number } = {};
                  for (const [key, value] of Object.entries(allTilesPositionsDictionary)) {
                    const numKey = parseInt(key);
                    if (!this.safeTiles.includes(value)) {
                      filteredDictionary[numKey] = value;
                    }
                  }
                  allTilesPositionsDictionary = filteredDictionary;
                }
                // Remove positions already occupied in BoardLetters
                const boardLetterKeys = Object.keys(BoardLetters).map(Number);
                if (boardLetterKeys.length > 0) {
                  const filteredDictionary: { [key: number]: number } = {};
                  for (const [key, value] of Object.entries(allTilesPositionsDictionary)) {
                    const numKey = parseInt(key);
                    if (!boardLetterKeys.includes(value)) {
                      filteredDictionary[numKey] = value;
                    }
                  }
                  allTilesPositionsDictionary = filteredDictionary;
                }
                // Collect and remove pawn positions
                let playersPos: number[] = [];
                for (let player of this.players) {
                  const PlayersWorldPosition = this.PlayersWorldPositions[player.PlayerTurn];
                  for (let pos of player.pawnPositions) {
                    if (PlayersWorldPosition[pos] && PlayersWorldPosition[pos].y !== undefined) {
                      playersPos.push(PlayersWorldPosition[pos].y);
                    }
                  }
                }
                if (playersPos.length > 0) {
                  const filteredDictionary: { [key: number]: number } = {};
                  for (const [key, value] of Object.entries(allTilesPositionsDictionary)) {
                    const numKey = parseInt(key);
                    if (!playersPos.includes(value)) {
                      filteredDictionary[numKey] = value;
                    }
                  }
                  allTilesPositionsDictionary = filteredDictionary;
                }
                // Shuffle available positions
                const availablePositions = Object.values(allTilesPositionsDictionary);
                for (let i = availablePositions.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
                }
                // Assign player letters to available board positions
                const PlayerLetterCollection = this.WordGameState.PlayerLetterCollections[player.PlayerTurn] || [];
                let i = 0;
                for (const letter of PlayerLetterCollection) {
                  if (i < availablePositions.length) {
                    BoardLetters[availablePositions[i]] = letter;
                    i++;
                  } else {
                    console.warn("Not enough available positions for all player letters.");
                    break;
                  }
                }
              }

              if (this.WordGameState && Array.isArray(this.WordGameState.PlayerLetterCollections[player.PlayerTurn])) {
                this.WordGameState.PlayerLetterCollections[player.PlayerTurn].length = 0;
              }
              state.push(['updateWords', this.WordGameState]);

          }
          if (this.isWaitingForDiceRoll){
              state.push(['roll', this.futureData.diceValue]);
              state.push(['addDelay', 1]);
              this.isWaitingForDiceRoll = false;
          }
          if (this.futureData.futureMoves.length > 0 && !player.isLost) {
                const pawnSignal = new Signal(
                  'pawn',
                  this.WhosTurn,
                  this.futureData.futureMoves[0].movablePawnId.toString()
                );

                if (this.futureData.futureMoves.length !== 1) {

                  let letterMoves: FutureMove[] = [];
                  let killMoves: FutureMove[] = [];
                  let winsMoves: FutureMove[] = [];
                  let safeMoves: FutureMove[] = [];
                  // ✔ One loop for everything
                  for (let p of this.futureData.futureMoves) {
                    if(p.letter!==""){
                      let missingLetters = this.WordGameState?.getMissingLettersListOfPlayer(this.WhosTurn);
                      if(missingLetters)
                      for (let missingLetter of missingLetters.values()) {
                         if(missingLetter.toLowerCase()===p.letter.toLowerCase()){
                            letterMoves.push(p);
                         }
                      }                     
                    }
                    // killed players?
                    if (Object.keys(p.killedPlayers).length > 0) {
                      killMoves.push(p);
                      continue;
                    }
                    // win move?
                    if (p.isWin) {
                      winsMoves.push(p);
                      
                      continue;
                    }
                    // safe move?
                    if (p.isSafe) {
                        const currentPos = player.movebulPawnIds[p.movablePawnId];
                        const isInSafe = this.safeTiles.includes(currentPos);
                        if (!isInSafe) {
                            safeMoves.push(p);
                        }
                    }
                  }
                  // priority: kill → win → safe
                  if (letterMoves.length > 0) {
                    pawnSignal.value = letterMoves[0].movablePawnId.toString();
                  } 
                  else if (killMoves.length > 0) {
                    pawnSignal.value = killMoves[0].movablePawnId.toString();
                  } 
                  else if (winsMoves.length > 0) {
                    pawnSignal.value = winsMoves[0].movablePawnId.toString();
                  } 
                  else if (safeMoves.length > 0) {
                    pawnSignal.value = safeMoves[0].movablePawnId.toString();
                  }
                }

                // send to server / handler
                this.handlePawnSignal(this.players[this.WhosTurn], pawnSignal, state);

          }
          else{
            nextPlayer = true;
          }
          if(nextPlayer){
              if (this.IsAllWin()) {
                this.completeGame(state);
                return;
              }
            this.isWaitingForDiceRoll = true;
            this.NextPlayer();
            state.push(['newFD', this.GenerateFutureMoves()]);
          }
          state.push(['UpdateMainPlayersData', {fun:"auto",players:this.players}]);
      }
      // Handle dice signal
      private handleDiceSignal(currentPlayer: LudoPlayerData, state: [string, any][]): void {
          if (this.futureData.futureMoves.length > 0) {
              currentPlayer.movebulPawnIds = this.futureData.futureMoves.map((move) => move.movablePawnId);
              state.push(['UpdateMainPlayersData', {fun:"handleDiceSignal",players:[CloneUtility.deepClone<LudoPlayerData>(currentPlayer)]}]);
              this.isWaitingForDiceRoll = false;
          } else {
                  this.isWaitingForDiceRoll = true;
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
          currentPlayer.killCount += killCount;
          const gotBonus = (this.diceValue === 6 || killCount > 0 || futureMove.isWin) && !currentPlayer.isWin;
          if (!gotBonus) {
              this.NextPlayer();
          }
          const addDelay = futureMove.stepsCount > 0 ? Math.ceil(futureMove.stepsCount * 0.07) : 0;
          state.push(['UpdateMainPlayersData', {fun:"handlePawnSignal",players:futureMove.playerDatas}]);
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
                      state.push(['UpdateMainPlayersData',{ fun:"updatePlayerPositions",players:this.players}]);
                      state.push(['playerWin', realPlayer]);

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
                  const time = 25 + howManyKilled * 5;
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
  public isBot : boolean = false;
  public locks : number[][] = [];
  public turnOverCount : number =0;
  public killCount : number = 0;
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
  public letter:string="";
  constructor(movablePawnId: number,stepsCount: number,killedPlayers: { [key: number]: number[] },isSafe: boolean,isWin: boolean,playerDatas: LudoPlayerData[],letter : string) {
    this.movablePawnId = movablePawnId;
    this.stepsCount = stepsCount;
    this.killedPlayers = killedPlayers;
    this.isSafe = isSafe;
    this.isWin = isWin;
    this.playerDatas = playerDatas;
    this.letter = letter
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

  TryPlaceLetter(playerIndex: number, collectionIndex: number, wordIndex: number): boolean {
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
        dic.set(i, (fullWord[i].toLowerCase()));
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
function genLudoGameData(posMode:number,boardIndex: number | string,numberOfPlayers: number | string,gameMode: string,tickCountForPlayer: number = 0): LudoGameData {
  const gameData = new LudoGameData();
  // Basic settings
  gameData.BoardId = typeof boardIndex === 'string' ? parseInt(boardIndex) : boardIndex;
  let mode = gameMode;

  gameData.gameMode = mode;
  gameData.isGameStarted = false;
  gameData.isGameComplected = false;
  gameData.IsLoop = gameMode === 'wordo';
  gameData.useTimeOut = tickCountForPlayer > 0;
  gameData.WhosTurn = 0;
  gameData.rankCount = 1;
  gameData.tickCount = 0;
  gameData.tickCountForPlayer = tickCountForPlayer;
  gameData.maxTurnOverCount = 5;
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
      getInitialPawnPositions((gameData.BoardId === 0 ? 9 : 13),2,posMode)
    );
   if(player.locks.length!=gameData.players.length && gameMode==="wordo"){
      player.locks=[];
      for(let index = 0;index<gameData.players.length;index++){
      player.locks.push([0,0]);
     }
    }
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
function getInitialPawnPositions(lengthForEachPlayer: number,numberOfPlayers:number,positionMode:number): number[] {
    // 0 = your home
    // 1 = next player
    // 2 = diagonal
    // 3 = previous player

    switch (positionMode) {

        case 0:
          //all in
          return [-1,-1,-1,-1];
        case 1:
            // old behaviour
            return [0, 0, -1, -1];
        case 2:  
            // 2 at your home, 2 at diagonal
            var p = (lengthForEachPlayer*2);
            return [0,0,p,p];
        case 3:
            // one pawn in each player's home
            return [0,lengthForEachPlayer,(lengthForEachPlayer*2),(lengthForEachPlayer*3)];
    }
    return [-1,-1,-1,-1];

}
// Main match loop – runs every tick.
const matchLoop = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, messages: any[]) {
    // Convert presences dictionary → array
    const presences: nkruntime.Presence[] = [];
    for (const key in state.presences) {
        if (state.presences.hasOwnProperty(key)) {
            presences.push(state.presences[key]);
        }
    }
    if(state.quit){
      try{
        dispatcher.match_kick(presences);
      }
      catch (error){
        logger.info( "dispatcher.match_kick error"+error);
      }
      return null;
    }
    // ============================
    // 🔵 GAME RUNNING SECTION
    // ============================
    if (state.gameData.isGameStarted) {
        if(tick===10){
          throw "quit"
        }
        if(tick===30 ){
          let selectedPlayer = 0;
          for(let p of state.gameData.players as LudoPlayerData[]){
            if(p.UserId==="7a820663-d91a-41f8-8393-848fe356917f"){
              selectedPlayer = p.PlayerTurn;
            }
          }
          let player = state.gameData.players[selectedPlayer] as LudoPlayerData;
          //player.rank = 1;
          //applyCommend(["playerWin",p],state,dispatcher,nk,ctx);  
          nk.matchSignal(state.matchToMatchSignal,JSON.stringify({type:"playerWin",player,gameData:state.gameData,matchId:ctx.matchId}));
        }
        // Reconstruct class instance (required because Nakama serializes objects)
        let gameData: LudoGameData = Object.assign(new LudoGameData(), state.gameData);
        // Reconstruct WordGameState instance
        gameData.WordGameState = Object.assign(new WordGameState(), gameData.WordGameState);

        // Auto terminate match if:
        // 1. No players
        // 2. Tick too high
        // 3. End-game timeout finished
        if (Object.keys(state.presences).length === 0 || state.tickCount > 3600 || state.endGameTimeOut <= 0) {
          return null;
        }

        // ============================
        // 🤖 WORDO BOT LOGIC (every 5 ticks)
        // ============================
        try{
            if (state.bots &&gameData.gameMode === "wordo" && state.tickCount % 5 === 0 && !gameData.isGameComplected)
            {
                const players = gameData.players;
                if (players) {
                    players.forEach((player, index) => {

                        // Skip non-bot players
                        if (!player.isBot) return;

                        const WordGameSt: WordGameState | null = gameData.WordGameState;
                        if (!WordGameSt) return;

                        const collection = WordGameSt.PlayerLetterCollections[index];
                        const placement = WordGameSt.PlayerLetterPlacement[index];

                        // Get missing letters to fill
                        let missingLetters = WordGameSt.getMissingLettersListOfPlayer(index);

                        let loopIndex = 0;
                        for (let missingLetter of missingLetters.values()) {

                            // If this placement spot is empty
                            if ((placement[loopIndex]) < 0) {

                                // Find letter in collection
                                let indexInCollection = collection.findIndex(
                                    c => c.toLowerCase() === missingLetter.toLowerCase()
                                );

                                if (indexInCollection !== -1) {

                                    // Fill the placement
                                    placement[loopIndex] = indexInCollection;

                                    // Send update signal
                                    const signal = new Signal("wordoPlaceLetters", index, JSON.stringify(placement));
                                    matchSignal("", logger, nk, dispatcher, tick,state, JSON.stringify(signal));
                                    gameData = Object.assign(new LudoGameData(), state.gameData);
                                    gameData.WordGameState = Object.assign(new WordGameState(), gameData.WordGameState);

                                    break;
                                }
                            }
                            loopIndex++;
                        }
                    });
                }
            }
        }
        catch (error){
          logger.info( "WORDO BOT 🙊🙊🙊"+error);
        }


        // ============================
        // 🕒 BOT ACTION DELAY SYSTEM
        // ============================
        if ((state.delay as number) > 0) {

            // Bot only triggers on specific delay values
            try{
                let WhosTurn = gameData.WhosTurn;
                let currentPlayer: LudoPlayerData = gameData.players[WhosTurn];
                if (currentPlayer && currentPlayer.isBot && (state.delay === 25 || state.delay === 28) && !gameData.isGameComplected) {

                    // If bot is stealing letters
                    if (gameData.isWaitingForStealData) {

                        let stealData: stealData | null = gameData.stealData;
                        if (stealData) {

                            let fromWhoIndex = stealData.fromWhoIndex ?? 0;
                            let maxLettersToPick = stealData.maxLettersToPick;
                            let whoStealingIndex = stealData.whoStealingIndex;

                            // Only steal on bot's turn
                            if (whoStealingIndex === WhosTurn) {

                                let WordState: WordGameState = gameData.WordGameState;
                                let collection: string[] = WordState.PlayerLetterCollections[fromWhoIndex];
                                let missingLetters = WordState.getMissingLettersListOfPlayer(whoStealingIndex);

                                let stealLetters: number[] = [];

                                // Try to steal missing letters
                                for (let missingLetter of missingLetters.values()) {
                                    let indexInCollection = collection.findIndex(
                                        c => c.toLowerCase() === missingLetter.toLowerCase()
                                    );

                                    if (indexInCollection !== -1) {
                                        stealLetters.push(indexInCollection);
                                        if (stealLetters.length === maxLettersToPick) break;
                                    }
                                }

                                // If bot found letters OR it's forced by delay
                                if (stealLetters.length > 0 || state.delay === 25) {
                                  let isUpdate = (state.delay === 28) ;
                                    let signal = new Signal((isUpdate?"wordoUpdateSteal":"wordoSaveSteal"), WhosTurn, JSON.stringify(stealLetters));
                                    matchSignal("", logger, nk, dispatcher, tick, state, JSON.stringify(signal));
                                    gameData = Object.assign(new LudoGameData(), state.gameData);
                                    gameData.WordGameState = Object.assign(new WordGameState(), gameData.WordGameState);
                                }
                            }
                        }
                    }
                }
            }
            catch (error){
              logger.info( "BOT ACTION 🙊🙊🙊"+error);

            }

            // decrease delay each tick
            state.delay = (state.delay as number) - 1;
        }

        // ============================
        // 🧠 GAME LOGIC EXECUTION
        // ============================
        else {
            state.commends.push(
                ...gameData.GameLogic(logger, new Signal("tick", 0, "0"))
            );
        }

        // Execute commands from queue
        while (state.commends.length > 0) {
            if ((state.delay as number) > 0) break;

            const commend = state.commends.shift()!;
            applyCommend(commend, state, dispatcher, nk,ctx);
        }

        // Update tick count
        state.tickCount++;

        // Send tick counter to players
        dispatcher.broadcastMessage( 0,nk.stringToBinary("tc:" + state.tickCount + "," + gameData.tickCount),Object.values(state.presences));
        //applyCommend(["tc",(state.tickCount + "," + gameData.tickCount)],state,dispatcher,nk);
        // Save updated game state
        state.gameData = gameData;

        // If game finished → decrease end timer
        if (gameData.isGameComplected) {
            state.endGameTimeOut--;
            return { state };
        }
    }

    // ============================
    // 🔒 PRIVATE ROOM BEFORE GAME START
    // ============================
    if (state.isPrivate && !state.gameData.isGameStarted) {

        if (Object.keys(state.presences).length === 0) {
            logger.info("⭐⭐matchTerminate Object.keys(state.presences).length===0");
            nk.matchTerminate();
        }

        // Send room info to players
        const roomInfo = {
            playerIds: Object.keys(state.presences).map(pid => state.presences[pid].userId),
            playerUserNames: Object.keys(state.presences).map(pid => state.presences[pid].username),
            boardIndex: state.boardIndex,
            gameMode: state.gameMode,
            fee: state.fee
        };

        applyCommend(["roomInfo", roomInfo], state, dispatcher, nk,ctx);
    }

    return { state };
};
// Handles any signal coming from players/bots and updates game state.
const matchSignal = function (ctx: any,logger: any,nk: any,dispatcher: any,tick: number,state: any,data: string)
{
    try {
        // 🔹 Send the raw JSON signal to all connected players
        dispatcher.broadcastMessage(1, data, null, null);
        // 🔹 Re-create gameData and WordGameState classes (important for class methods)
        let gameData: LudoGameData = Object.assign(new LudoGameData(), state.gameData);
        gameData.WordGameState = Object.assign(new WordGameState(), gameData.WordGameState);
        // -------------------------------------------------------
        // 1️⃣ Parse incoming JSON → create a Signal instance
        // -------------------------------------------------------
        let signalData: any;
        try {
            signalData = JSON.parse(data);
            
            if(signalData.type === "quit"){
              state.quit = true;
              return null;
            }
        } catch (e) {
            throw new Error("Invalid JSON in matchSignal: " + e);
        }
        const signal = new Signal(
            signalData.type ?? "tick",
            signalData.who ?? 0,
            signalData.value ?? ""
        );
        // -------------------------------------------------------
        // 2️⃣ GAME STARTED → process dice, pawn, and wordo signals
        // -------------------------------------------------------
        if (gameData.isGameStarted) {
            const commends = state.commends as [string, any][];
            // Handle dice/pawn/wordo signals
            if (signal && (signal.type === "dice" || signal.type === "pawn" || signal.type.startsWith("wordo"))) {
                const newCommends = gameData.GameLogic(logger, signal);
                if (signal.type.startsWith("wordo")) {
                  // 🔹 wordo commands are applied immediately
                  while (newCommends.length > 0) {
                    logger.info("😂 new commend: " + newCommends[0][0]);
                    applyCommend(newCommends.shift()!, state, dispatcher, nk,ctx);
                  }
                }
                else {
                  // 🔹 dice and pawn commands go to state.commends queue
                  commends.push(...newCommends);
                }
                // 🔹 Apply queued commends unless delay is active
                while (commends.length > 0) {
                    if (state.delay > 0) break;
                    applyCommend(commends.shift()!, state, dispatcher, nk,ctx);
                }
            }
            // -------------------------------------------------------
            // 3️⃣ Handle lock / unlock requests for Audio + Meaning
            // -------------------------------------------------------
            if (signal && signal.type === "lock") {

                const player = gameData.players[signal.who];

                // Ensure locks array matches number of players
                if (player.locks.length !== gameData.players.length) {
                    player.locks = Array(gameData.players.length)
                        .fill(null)
                        .map(() => [0, 0]);
                }

                let data;
                try {
                    data = JSON.parse(signal.value);
                } catch (e) {
                    // Can't use return, so just skip everything else
                    data = null;
                }

                if (data !== null) {
                    const fee : number = state.fee;
                    const type : unlockType =data.type;
                    const whoms = data.whoms;
                    const unlock_With:unlockWith = data.unlockWith;
                    const AUDIO = 0;
                    const MEANING = 1;
                    let COST = 100;
                    if (type===unlockType.audio) {
                      COST = Math.round(fee * 0.2);   // 20%
                    }
                    if (type===unlockType.meaning) {
                      COST = Math.round(fee * 0.1);   // 10%
                    }
                    // Validate whoms index
                    if (whoms >= 0 && whoms < player.locks.length) {

                        switch(unlock_With){
                          case unlockWith.ad:
                            if ((type===unlockType.audio) && player.locks[whoms][AUDIO] === 0) {
                                player.locks[whoms][AUDIO] = 1;
                                applyCommend(["unLock", { whoms:whoms, who: signal.who,locks:player.locks,type,unlockWith:unlock_With }], state, dispatcher, nk,ctx);
                            }
                            if ((type===unlockType.meaning) && player.locks[whoms][MEANING] === 0) {
                                player.locks[whoms][MEANING] = 1;
                                applyCommend(["unLock", {whoms:whoms, who: signal.who, locks:player.locks,type,unlockWith:unlock_With}], state, dispatcher, nk,ctx);
                            }
                            break;
                          case unlockWith.card:
                            let attendanceData= loadAttendanceData(player.UserId,nk);
                            if(attendanceData!==null){
                              let cardsData:cards = (attendanceData.cards ||  new cards());
                              let SpeechCards = (cardsData.SpeechCards??0);
                              let MeaningCards = (cardsData.MeaningCards??0);
                              if ((type===unlockType.audio) && player.locks[whoms][AUDIO] === 0 && SpeechCards>0) {
                                  cardsData.SpeechCards = (SpeechCards-1); 
                                  player.locks[whoms][AUDIO] = 1;
                                  applyCommend(["unLock", { whoms:whoms, who: signal.who,locks:player.locks, type,unlockWith:unlock_With }], state, dispatcher, nk,ctx);
                              }
                              if ((type===unlockType.meaning) && player.locks[whoms][MEANING] === 0&& MeaningCards>0) {
                                  cardsData.MeaningCards = (MeaningCards-1); 
                                  player.locks[whoms][MEANING] = 1;
                                  applyCommend(["unLock", {whoms:whoms, who: signal.who, locks:player.locks,type,unlockWith:unlock_With}], state, dispatcher, nk,ctx);
                              }
                              attendanceData.cards = cardsData;
                              saveAttendanceData(player.UserId,nk,attendanceData);
                            }
                            break;
                          case unlockWith.coins:
                             // ---- NON-AD (coins unlock) ----
                            const coins = playerCoins(nk, player.UserId, player.UserName, 0);
                            if (coins >= COST) {
                                let unlocked = false;
                                if ((type===unlockType.audio) && player.locks[whoms][AUDIO] === 0) {
                                    player.locks[whoms][AUDIO] = 1;
                                    unlocked = true;
                                    applyCommend(["unLock", {whoms:whoms, who: signal.who,locks:player.locks, type,unlockWith:unlock_With }], state, dispatcher, nk,ctx);
                                }
                                if ((type===unlockType.meaning) && player.locks[whoms][MEANING] === 0) {
                                    player.locks[whoms][MEANING] = 1;
                                    unlocked = true;
                                    applyCommend(["unLock", {whoms:whoms, who: signal.who,locks:player.locks, type,unlockWith:unlock_With }], state, dispatcher, nk,ctx);
                                }
                                // Deduct coins only once
                                if (unlocked) {
                                    playerCoins(nk, player.UserId, player.UserName, -COST);
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
        // -------------------------------------------------------
        // 4️⃣ PRIVATE ROOM → handle updateRoom and startRoom
        // -------------------------------------------------------
        if (state.isPrivate && !gameData.isGameStarted) {

            // -------- updateRoom --------
            if (signal.type === "updateRoom") {

                const values = signal.value.split(",");
                if (values.length === 3) {
                    state.boardIndex = parseInt(values[0]);
                    state.gameMode = values[1];
                    state.fee = values[2];
                }

                logger.info(`🛠 Room updated: boardIndex=${state.boardIndex}, gameMode=${state.gameMode}`);

                // 🔥 Kick players with low coins
                for (const pid of Object.keys(state.presences)) {

                    const player = state.presences[pid];
                    const coins = playerCoins(nk, player.userId, player.username, 0);

                    if (coins < state.fee) {
                        logger.info(`💸 Kicking ${player.username}, coins=${coins}`);
                        
                        const result = dispatcher.matchKick([player]);
                        if (!result) delete state.presences[pid];
                    }
                }

                // Broadcast updated room info
                const roomInfo = {
                    playerIds: Object.keys(state.presences).map(pid => state.presences[pid].userId),
                    playerUserNames: Object.keys(state.presences).map(pid => state.presences[pid].username),
                    boardIndex: state.boardIndex,
                    gameMode: state.gameMode,
                    fee: state.fee
                };

                applyCommend(["roomInfo", roomInfo], state, dispatcher, nk,ctx);
            }

            // -------- startRoom --------
            if (signal.type === "startRoom") {

                const playerCount = Object.keys(state.presences).length;

                const values = signal.value.split(",");
                if (values.length === 3) {
                    state.boardIndex = parseInt(values[0]);
                    state.gameMode = values[1];
                    state.fee = values[2];
                    let posMode = (state.gameMode === 'wordo'||state.gameMode === 'quick')?1:0;
                        switch(state.gameMode){
                          case "m1":
                          state.gameMode = "wordo";
                          posMode = 2;
                          break;
                          case "m2":
                          state.gameMode = "wordo";
                          posMode = 3;
                          break;
                          case "m3":
                          state.gameMode = "wordo";
                          break;
                        }
                      state.posMode = posMode;
                }

                logger.info(`🎮 StartRoom: players=${playerCount}`);

                // AUTO MODE (all real players)
                if (playerCount > 1) {

                    state.gameData = genLudoGameData(state.posMode,state.boardIndex, playerCount, state.gameMode, 30);

                    // Start when full
                    if (playerCount === state.gameData.players.length) {

                        logger.info("🔔 All players connected → starting match");

                        const GameData = Object.assign(new LudoGameData(), state.gameData);

                        Object.values(state.presences).forEach((p: any, idx: number) => {
                            if (GameData.players[idx]) {
                                GameData.players[idx].UserId = p.userId;
                                GameData.players[idx].UserName = p.username;

                                if (state.fee)
                                    playerCoins(nk, p.userId, p.username, -state.fee);
                            }
                        });

                        GameData.start(logger, nk);
                        gameData = GameData;

                        applyCommend(["roomStarted", gameData], state, dispatcher, nk,ctx);
                    }
                }
                // BOT MODE
                else {

                    state.gameData = genLudoGameData(state.posMode,state.boardIndex, state.numberOfPlayers, state.gameMode, 30);

                    if (state.numberOfPlayers === state.gameData.players.length) {

                        logger.info("🔔 Starting bot match");

                        const GameData = Object.assign(new LudoGameData(), state.gameData);

                        for (let i = 0; i < state.numberOfPlayers; i++) {

                            if (i === 0) {
                                const p: any = Object.values(state.presences)[0];
                                GameData.players[i].UserId = p.userId;
                                GameData.players[i].UserName = p.username;

                                if (state.fee)
                                    playerCoins(nk, p.userId, p.username, -state.fee);
                            } else {
                                GameData.players[i].isBot = true;
                            }
                        }

                        GameData.start(logger, nk);
                        gameData = GameData;

                        applyCommend(["roomStarted", gameData], state, dispatcher, nk,ctx);
                    }
                }
            }
        }
        // Save updated gameData
        state.gameData = gameData;
        return { state };
    }
    catch (e) {
        logger.error("matchSignal error: " + e);
        throw e;
    }
};
const getGameModeName =function(mode:string):string{

  return mode;
}
const matchInit = function (ctx: any, logger: any, nk: any, params: any) {
    let posMode = (params.gameMode === 'wordo'||params.gameMode === 'quick')?1:0;
    switch(params.gameMode){
      case "m1":
      params.gameMode = "wordo";
      posMode = 2;
      break;
      case "m2":
      params.gameMode = "wordo";
      posMode = 3;
      break;
      case "m3":
      params.gameMode = "wordo";
      break;
    }
    const state = {
        presences: {} as Record<string, any>,
        delay: 0,
        tickCount: 0,
        endGameTimeOut: 15,
        commends: [] as [string, any][],
        boardIndex:params.boardIndex,
        bots:params.bots??false,
        numberOfPlayers:params.numberOfPlayers,
        gameMode:params.gameMode,
        fee:params.fee,
        posMode:posMode,
        matchToMatchSignal:params.matchToMatchSignal,
        gameData: genLudoGameData(posMode,params.boardIndex, params.numberOfPlayers, params.gameMode,30),
        isPrivate:params.isPrivate
    }; 
    return { state, tickRate: 1, label: JSON.stringify(params) };
};
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
      var coins = playerCoins(nk,presence.userId,presence.username,0);
      if(coins<state.fee){
      return { state, accept: false };
    }
    else{
      return { state, accept: true }; // allow join before game starts
    }
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
    dispatcher.broadcastMessage(0,nk.stringToBinary(`startGame:${JSON.stringify(state.gameData)}`),Object.values(addP));
  } 
  else {
    // Start game when all players are connected
    if (state.bots) {
                      // Create game data
                      state.gameData = genLudoGameData(state.posMode,state.boardIndex, state.numberOfPlayers, state.gameMode, 30);
                      // Start when enough players are connected
                      if (state.numberOfPlayers === state.gameData.players.length) {
                          logger.info("🔔✅ All players connected, starting private match...");
                          const GameData = Object.assign(new LudoGameData(), state.gameData);
                          // Assign user info to players
                          for(let i =0;i<state.numberOfPlayers;i++){
                                  if (GameData.players[i]) {
                                    if(i===0){
                                      let p :any= Object.values(state.presences)[0];
                                      let userId = p.userId;
                                      let username = p.username;
                                      GameData.players[i].UserId = userId;
                                      GameData.players[i].UserName = username;
                                      //GameData.players[idx].isBot = state.bots;
                                      if(state.fee)
                                        playerCoins(nk,userId,username,-state.fee);
                                    }
                                    else{
                                      GameData.players[i].isBot = true;

                                    }
                              }
                          }
                          GameData.start(logger, nk);
                          state.gameData = GameData;
                          applyCommend(["roomStarted", state.gameData], state, dispatcher, nk,ctx);
                      } else {
                      }
    }
    else{
      if (Object.keys(state.presences).length === state.gameData.players.length && !state.isPrivate) {
        const GameData = Object.assign(new LudoGameData(), state.gameData);
        logger.info("🔔✅ All players connected 🎉");
        Object.values(state.presences).forEach((p: any, idx: number) => {
          if (state.gameData.players[idx]) 
          {
            state.gameData.players[idx].UserId = p.userId;
            state.gameData.players[idx].UserName = p.username;
            if(state.fee)
            playerCoins(nk,p.userId,p.username,-state.fee);
          }
          
        });
        GameData.start(logger, nk);
        state.gameData = GameData;
      }
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
  applyCommend(["UpdateMainPlayersData",{fun:"matchLeave",players:state.gameData.players}],state,dispatcher,nk,ctx);
  return { state };
};
const matchTerminate = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, graceSeconds: number) {
  logger.info("⭐⭐matchTerminate called, tick:", tick, "graceSeconds:", graceSeconds);
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
    let fee = matches[0].properties.fee;
    logger.info("⭐ "+(boardIndex+"❌"+numberOfPlayers+"❌"+gameMode));
  try {
    // Create match with label
    const matchId = nk.matchCreate("lobby", {boardIndex,numberOfPlayers,gameMode,fee,isPrivate: false});
    logger.info(`Match created successfully with ID: ${matchId}`);
    return matchId;
  } catch (err: any) {
    logger.error("Error creating match:", err.message);
    throw err;
  }
};
function applyCommend(commend: [string, any], state: any, dispatcher: any, nk: any,ctx:any) {
    const [commendName, obj] = commend;
    if (commendName !== "addDelay" && commendName !== "setDelay") {
        dispatcher.broadcastMessage(0,nk.stringToBinary(`${commendName}:${JSON.stringify(obj)}`, Object.values(state.presences))
        );
    }
    switch (commendName) {
        case "addDelay":
            state.delay = (state.delay as number) + (obj as number);
            break;
        case "setDelay":
            state.delay = obj as number;
            break;
        case "complected":
          for(let player of state.gameData.players as LudoPlayerData[]){
              const isWin: boolean = player.rank > 0 && player.rank < state.gameData.players.length;
              if(!isWin && !player.isBot){
                playerLost(nk,player,state.gameData);
              }
          }
            if(state.matchToMatchSignal){
              try{
                nk.matchSignal(state.matchToMatchSignal,JSON.stringify({type:"complected",gameData:state.gameData,matchId:ctx.matchId}));
              }
              catch(e){

              }
            }
            break;
case "playerWin":
{
    let fee = state.fee;
    let gameData:LudoGameData = Object.assign(new LudoGameData(), state.gameData);
    // Player we are rewarding
    let p = obj as LudoPlayerData;
    if (p.isBot) return;
    if(gameData.gameMode==="wordo"){
        // --- WORD PACK COMPLETION LOGIC ---
        try {
            const playerIndex = p.PlayerTurn;  // The player who won
            const jsonString = gameData.CurrentPackWords[playerIndex];

            // If no pack word was used for this player → skip
            if (jsonString) {
                const info = JSON.parse(jsonString);

                const packId: string = info.packId;
                const wordIndex: number = info.wordIndex;
                const userId: string = p.UserId;

                // Mark this word as completed
                const result = completeSingleWord(nk, userId, packId, wordIndex);
            }
        } catch (err) {
        }
    }
    // Assign rank to player
    playerWin(nk, p, gameData);
    if (p.rank <= 0) return;
    const playerCount = gameData.players.length;
    // Total Pool
    const totalPool = fee * playerCount;
    // =====================================================
    // PAYOUT TABLES - EXACTLY FROM YOUR SHEET
    // =====================================================
    // 3-player payouts
    const map3: Record<number, { r1: number; r2: number }> = {
        500: { r1: 900, r2: 500 },
        1000: { r1: 1800, r2: 1000 },
        2000: { r1: 3400, r2: 2000 },
        5000: { r1: 8000, r2: 5000 },
        10000: { r1: 16000, r2: 10000 },
        50000: { r1: 70000, r2: 50000 },
    };

    // 4-player payouts
    const map4: Record<number, { r1: number; r2: number }> = {
        500: { r1: 1400, r2: 500 },
        1000: { r1: 2800, r2: 1000 },
        2000: { r1: 5400, r2: 2000 },
        5000: { r1: 13000, r2: 5000 },
        10000: { r1: 26000, r2: 10000 },
        50000: { r1: 120000, r2: 50000 },
    };

    let reward = 0;

    // =====================================================
    // 2 PLAYERS → 90% to Rank1, Rank2 = 0
    // =====================================================
    if (playerCount === 2)
    {
        if (p.rank === 1)
            reward = Math.floor(totalPool * 0.90);
    }

    // =====================================================
    // 3 PLAYERS → Use table
    // =====================================================
    else if (playerCount === 3)
    {
        const x = map3[fee];
        if (x)
        {
            if (p.rank === 1) reward = x.r1;
            else if (p.rank === 2) reward = x.r2;
        }
    }

    // =====================================================
    // 4 PLAYERS → Use table
    // =====================================================
    else if (playerCount === 4)
    {
        const x = map4[fee];
        if (x)
        {
            if (p.rank === 1) reward = x.r1;
            else if (p.rank === 2) reward = x.r2;
        }
    }

    // =====================================================
    // CREDIT PLAYER
    // =====================================================
    if (reward > 0){
        playerCoins(nk, p.UserId, p.UserName, reward);
    }
    if(state.matchToMatchSignal){
      try{
        nk.matchSignal(state.matchToMatchSignal,JSON.stringify({type:"playerWin",player:obj,gameData:state.gameData,matchId:ctx.matchId}));
      }
        catch(e){
      }
    }
}
break;

    }

}
const playerCoins =function(nk: any,userId:any,username:any,addMoney:any):number{
        const collection = "player_data";
        const key = "coins";
        let currentCoins = 0;
        if(userId!==""&&username===""){
          username = nk.usersGetId([userId])[0].username;
        }
        if(userId===""||username === ""){
          return 0;
        }
        // --- READ CURRENT COINS ---
        try {
            const objects = nk.storageRead([{ collection, key, userId }]);
            if (objects && objects.length > 0 && objects[0].value && typeof objects[0].value.coins === "number") {
                currentCoins = objects[0].value.coins;
            }
        } catch (readError) {
            
        }
        if(addMoney===0){
              UpdateCoins(userId,username,nk,currentCoins);

              return currentCoins;
        }
        else{
              const newBalance = currentCoins + addMoney;
              // --- UPDATE COINS ---
              nk.storageWrite([{
                  collection,
                  key: key,
                  userId,
                  value: { coins: newBalance },
                  permissionRead: 1,
                  permissionWrite: 1
              }]);
              UpdateCoins(userId,username,nk,newBalance);
              return newBalance;
        }

}
const playerWin = function (nk: any, player: LudoPlayerData, gameData: LudoGameData) {
  const userId: string = player.UserId;
  const UserName: string = player.UserName;
  if(player.isBot){
    return;
  }
  const isWin: boolean = player.rank > 0 && player.rank < gameData.players.length;
  const killCount: number = player.killCount;
  const PlayerTurn: number = player.PlayerTurn;
  const collection = "player_data";
  const key = "daily_attendance";

  // --- READ EXISTING PLAYER DATA ---
  let attendanceData: any = null;
  try {
    const objects = nk.storageRead([{ collection, key, userId }]);
    if (objects && objects.length > 0 && objects[0].value) {
      attendanceData = objects[0].value;
    }
  } catch (readError) {
    nk.logger.error("Error reading storage: " + readError);
  }

  // --- IF DATA DOESN’T EXIST, CREATE DEFAULT STRUCTURE ---
  if (!attendanceData) {
    attendanceData = {
      wins: 0,
      losses: 0,
      killCount: 0
    };
  }

  // --- ENSURE REQUIRED FIELDS EXIST ---
  attendanceData.wins = attendanceData.wins ?? 0;
  attendanceData.losses = attendanceData.losses ?? 0;
  attendanceData.killCount = attendanceData.killCount ?? 0;
  attendanceData.words = attendanceData.words ?? [];
  
  // --- UPDATE STATS ---
  attendanceData.killCount = (attendanceData.killCount+killCount);
  // Update win/loss counts
  if (isWin) {
    attendanceData.wins++;
    UpdateWins(userId,UserName,nk,attendanceData.wins);

    // Add a new word (if available in gameData)
    try {
      const WordGameState: WordGameState | null = gameData?.WordGameState ?? null;
      if(WordGameState!=null){
          if(WordGameState.PlayersFullWordsData!=null && WordGameState.PlayersFullWordsData[PlayerTurn].EnglishWord){
            let EnglishWord = WordGameState.PlayersFullWordsData[PlayerTurn].EnglishWord;
            let words : string[] = attendanceData.words;
            words.push(EnglishWord);
            attendanceData.words = words;
          }
      }
      else{

      }
    } catch (wordError) {
      
    }
  } else {
    attendanceData.losses++;
  }

  // --- SAVE UPDATED DATA BACK TO STORAGE ---
  try {
    nk.storageWrite([
      {
        collection,
        key,
        userId,
        value: attendanceData,
        permissionRead: 1,
        permissionWrite: 1
      }
    ]);
  } catch (writeError) {
    nk.logger.error("Error writing storage: " + writeError);
  }
};
const playerLost = function (nk: any, player: LudoPlayerData, gameData: LudoGameData) {
  const userId: string = player.UserId;
  const UserName: string = player.UserName;
  if(player.isBot){
    return;
  }
  const isWin: boolean = player.rank > 0 && player.rank < gameData.players.length;
  const killCount: number = player.killCount;
  const PlayerTurn: number = player.PlayerTurn;
  const collection = "player_data";
  const key = "daily_attendance";

  // --- READ EXISTING PLAYER DATA ---
  let attendanceData: any = null;
  try {
    const objects = nk.storageRead([{ collection, key, userId }]);
    if (objects && objects.length > 0 && objects[0].value) {
      attendanceData = objects[0].value;
    }
  } catch (readError) {
    nk.logger.error("Error reading storage: " + readError);
  }

  // --- IF DATA DOESN’T EXIST, CREATE DEFAULT STRUCTURE ---
  if (!attendanceData) {
    attendanceData = {
      wins: 0,
      losses: 0,
      killCount: 0
    };
  }

  // --- ENSURE REQUIRED FIELDS EXIST ---
  attendanceData.wins = attendanceData.wins ?? 0;
  attendanceData.losses = attendanceData.losses ?? 0;
  attendanceData.killCount = attendanceData.killCount ?? 0;
  attendanceData.words = attendanceData.words ?? [];
  
  // --- UPDATE STATS ---
  attendanceData.killCount = (attendanceData.killCount+killCount);
  // Update win/loss counts
  if (isWin) {
    attendanceData.wins++;
    UpdateWins(userId,UserName,nk,attendanceData.wins);

    // Add a new word (if available in gameData)
    try {
      const WordGameState: WordGameState | null = gameData?.WordGameState ?? null;
      if(WordGameState!=null){
          if(WordGameState.PlayersFullWordsData!=null && WordGameState.PlayersFullWordsData[PlayerTurn].EnglishWord){
            let EnglishWord = WordGameState.PlayersFullWordsData[PlayerTurn].EnglishWord;
            let words : string[] = attendanceData.words;
            words.push(EnglishWord);
            attendanceData.words = words;
          }
      }
      else{
        attendanceData.losses++;
      }
    } catch (wordError) {
      
    }
  } else {
    attendanceData.losses++;
  }

  // --- SAVE UPDATED DATA BACK TO STORAGE ---
  try {
    nk.storageWrite([
      {
        collection,
        key,
        userId,
        value: attendanceData,
        permissionRead: 1,
        permissionWrite: 1
      }
    ]);
  } catch (writeError) {
    nk.logger.error("Error writing storage: " + writeError);
  }
};
function getRandomLevelData(min: number, max: number) {
    const randomLevel = Math.floor(Math.random() * (max - min + 1)) + min;
    return LEVEL_DATA[randomLevel - 1];
}
type LevelInfo = {
    level: number;
    wordLength: number;
    missing: number;
    common: number;
    uncommon: number;
};
const LEVEL_DATA = [
  { level: 1,  wordLength: 5,  common: 1, uncommon: 1 },
  { level: 2,  wordLength: 5,  common: 1, uncommon: 2 },

  { level: 3,  wordLength: 6,  common: 1, uncommon: 1 },
  { level: 4,  wordLength: 6,  common: 1, uncommon: 2 },
  { level: 5,  wordLength: 6,  common: 1, uncommon: 3 },

  { level: 6,  wordLength: 7,  common: 1, uncommon: 1 },
  { level: 7,  wordLength: 7,  common: 1, uncommon: 2 },
  { level: 8,  wordLength: 7,  common: 1, uncommon: 3 },
  { level: 9,  wordLength: 7,  common: 2, uncommon: 3 },

  { level: 10, wordLength: 8,  common: 1, uncommon: 1 },
  { level: 11, wordLength: 8,  common: 1, uncommon: 2 },
  { level: 12, wordLength: 8,  common: 1, uncommon: 3 },
  { level: 13, wordLength: 8,  common: 2, uncommon: 3 },

  { level: 14, wordLength: 9,  common: 1, uncommon: 1 },
  { level: 15, wordLength: 9,  common: 1, uncommon: 2 },
  { level: 16, wordLength: 9,  common: 1, uncommon: 3 },
  { level: 17, wordLength: 9,  common: 2, uncommon: 3 },
  { level: 18, wordLength: 9,  common: 2, uncommon: 4 },

  { level: 19, wordLength: 10, common: 1, uncommon: 2 },
  { level: 20, wordLength: 10, common: 1, uncommon: 3 },
  { level: 21, wordLength: 10, common: 1, uncommon: 3 },
  { level: 22, wordLength: 10, common: 2, uncommon: 3 },
  { level: 23, wordLength: 10, common: 2, uncommon: 4 },
  { level: 24, wordLength: 10, common: 2, uncommon: 5 },

  { level: 25, wordLength: 11, common: 1, uncommon: 2 },
  { level: 26, wordLength: 11, common: 1, uncommon: 3 },
  { level: 27, wordLength: 11, common: 2, uncommon: 3 },
  { level: 28, wordLength: 11, common: 1, uncommon: 4 },
  { level: 29, wordLength: 11, common: 2, uncommon: 4 },
  { level: 30, wordLength: 11, common: 2, uncommon: 5 },

  { level: 31, wordLength: 12, common: 1, uncommon: 2 },
  { level: 32, wordLength: 12, common: 1, uncommon: 3 },
  { level: 33, wordLength: 12, common: 2, uncommon: 3 },
  { level: 34, wordLength: 12, common: 1, uncommon: 4 },
  { level: 35, wordLength: 12, common: 2, uncommon: 4 },
  { level: 36, wordLength: 12, common: 2, uncommon: 5 },

  { level: 37, wordLength: 13, common: 1, uncommon: 2 },
  { level: 38, wordLength: 13, common: 1, uncommon: 3 },
  { level: 39, wordLength: 13, common: 2, uncommon: 3 },
  { level: 40, wordLength: 13, common: 1, uncommon: 4 },
  { level: 41, wordLength: 13, common: 2, uncommon: 4 },
  { level: 42, wordLength: 13, common: 2, uncommon: 5 },

  { level: 43, wordLength: 14, common: 1, uncommon: 2 },
  { level: 44, wordLength: 14, common: 1, uncommon: 3 },
  { level: 45, wordLength: 14, common: 1, uncommon: 3 },
  { level: 46, wordLength: 14, common: 2, uncommon: 3 },
  { level: 47, wordLength: 14, common: 2, uncommon: 4 },
  { level: 48, wordLength: 14, common: 2, uncommon: 5 },

  { level: 49, wordLength: 15, common: 1, uncommon: 2 },
  { level: 50, wordLength: 15, common: 1, uncommon: 3 },
  { level: 51, wordLength: 15, common: 2, uncommon: 3 },
  { level: 52, wordLength: 15, common: 1, uncommon: 4 },
  { level: 53, wordLength: 15, common: 2, uncommon: 4 },
  { level: 54, wordLength: 15, common: 2, uncommon: 5 },

  { level: 55, wordLength: 16, common: 1, uncommon: 2 },
  { level: 56, wordLength: 16, common: 1, uncommon: 3 },
  { level: 57, wordLength: 16, common: 2, uncommon: 3 },
  { level: 58, wordLength: 16, common: 1, uncommon: 4 },
  { level: 59, wordLength: 16, common: 2, uncommon: 4 },
  { level: 60, wordLength: 16, common: 2, uncommon: 5 }
];
enum unlockWith
{
    ad=0,
    coins=1,
    card=2
}
enum unlockType
{
    audio=0,
    meaning=1
}
class unlockResponce{

}