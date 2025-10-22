let InitModule: nkruntime.InitModule = function (ctx: any, logger: any, nk: any, initializer: any) {
  initializer.registerMatch('lobby', {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchSignal,
    matchTerminate,
  });
  initializer.registerMatchmakerMatched(matchmakerMatched);
  initializer.registerRpc("signal", signal);
  initializer.registerRpc("time", time);
  initializer.registerRpc("create_private_room", rpcCreateRoom);
  initializer.registerRpc("coinsHandler", coinsHandler);
  initializer.registerRpc("dailyAttendance", dailyAttendance);


  try {
          const res = nk.httpRequest(
      'https://raw.githubusercontent.com/SaiRamKonda9560/words/refs/heads/main/Words.json',
      'get',
      { 'Accept': 'application/json' }
      );
     wordsGenInstance = new wordsGen(res.body);

    logger.info("✅ Words cached to storage");
  } catch (err) {
    logger.error("❌ Failed to fetch words: %s", String(err));
  }
}
let wordsGenInstance:wordsGen;
const getWordoInstance=function():wordsGen{
 return wordsGenInstance;
}


const coinsHandler = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        logger.debug(`Received payload: ${payload}, Type: ${typeof payload}`);

        if (typeof payload !== "string") {
            throw new Error(`Payload must be a string. Received: ${typeof payload}`);
        }

        // Parse JSON
        let data: any;
        try {
            data = JSON.parse(payload);
        } catch (parseError) {
            throw new Error(`Failed to parse payload: ${parseError instanceof Error ? parseError.message : JSON.stringify(parseError)}`);
        }

        const userId = ctx.userId;
        if (!userId) throw new Error("User ID missing from context");

        if (!data.action || typeof data.action !== "string") {
            throw new Error(`Missing or invalid "action" field in payload`);
        }

        // --- COIN REWARD RULES (SERVER-CONTROLLED) ---
        const rewardTable: Record<string, number> = {
            spin: 20,    // player spins a wheel
            ad: 10,      // player watches an ad
            daily: 50,   // daily login reward
            mission: 100 // completing a mission
        };

        const action = data.action.toLowerCase();
        if (!rewardTable[action] && action !== "get") {
            throw new Error(`Unknown action: ${action}`);
        }

        const collection = "player_data";
        const key = "coins";
        let currentCoins = 0;

        // --- READ CURRENT COINS ---
        try {
            const objects = nk.storageRead([{ collection, key, userId }]);
            if (objects && objects.length > 0 && objects[0].value && typeof objects[0].value.coins === "number") {
                currentCoins = objects[0].value.coins;
            }
        } catch (readError) {
            logger.warn(`Failed to read coin data: ${readError}`);
        }

        let newCoinBalance = currentCoins;
        let rewardAmount = 0;

        // --- PROCESS ACTION ---
        if (action !== "get") {
            rewardAmount = rewardTable[action];
            newCoinBalance += rewardAmount;

            const writeObject: nkruntime.StorageWriteRequest = {
                collection,
                key,
                userId,
                value: {
                    coins: newCoinBalance,
                    lastAction: action,
                    lastUpdated: Date.now()
                },
                permissionRead: 1,
                permissionWrite: 1
            };
            nk.storageWrite([writeObject]);
            logger.debug(`User ${userId} action '${action}' added ${rewardAmount} coins. Total: ${newCoinBalance}`);
        }

        return JSON.stringify({
            success: true,
            action,
            reward: rewardAmount,
            coins: newCoinBalance
        });

    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in coinsHandler: ${errMsg}`);
        return JSON.stringify({
            success: false,
            error: errMsg
        });
    }
};


const dailyAttendance = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        const userId = ctx.userId;
        if (!userId) throw new Error("User ID missing from context");

        const collection = "player_data";
        const key = "daily_attendance";

        // --- READ CURRENT DATA ---
        let attendanceData: any = null;
        try {
            const objects = nk.storageRead([{ collection, key, userId }]);
            if (objects && objects.length > 0 && objects[0].value) {
                attendanceData = objects[0].value;
            }
        } catch (readError) {
            logger.warn(`Failed to read attendance data: ${readError}`);
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); // midnight timestamp
        let isNewPlayer = false;

        // --- NEW PLAYER CHECK ---
        if (!attendanceData) {
            isNewPlayer = true;
            attendanceData = {
                firstLogin: now.getTime(),
                lastLogin: 0,
                spinCount: 0,
                dailyRewards: [],
                dayIndex: 0 // tracks which day of the first week
            };
            // --- GIVE 5000 COINS TO NEW PLAYER ---
            const coinCollection = "player_data";
            const coinKey = "coins";

            const writeCoins: nkruntime.StorageWriteRequest = {
                collection: coinCollection,
                key: coinKey,
                userId,
                value: { coins: 5000 },  // first-time bonus
                permissionRead: 1,
                permissionWrite: 1
            };

            try {
                nk.storageWrite([writeCoins]);
                // Optional: store coins in attendanceData for immediate response
                attendanceData.initialCoins = 5000;
            } catch (err) {
                logger.error(`Failed to write initial coins for new player ${userId}: ${err}`);
            }
        }

        // --- DAILY LOGIN CHECK ---
        let firstLoginToday = false;
        if (attendanceData.lastLogin < today) {
            firstLoginToday = true;

            // Determine rewards for first-week players
            const firstWeekRewards = [
                { type: "coins", amount: 50, spins: 1 },   // day 1
                { type: "coins", amount: 60, spins: 1 },   // day 2
                { type: "coins", amount: 70, spins: 1 },   // day 3
                { type: "coins", amount: 80, spins: 2 },   // day 4
                { type: "coins", amount: 90, spins: 2 },   // day 5
                { type: "coins", amount: 100, spins: 2 },  // day 6
                { type: "coins", amount: 150, spins: 3 },  // day 7
            ];

            if (attendanceData.dayIndex < 7) {
                const todayReward = firstWeekRewards[attendanceData.dayIndex];
                attendanceData.dailyRewards = [todayReward];
                attendanceData.spinCount = todayReward.spins;
                attendanceData.dayIndex += 1; // move to next day
            } else {
                // after first week, default daily reward
                attendanceData.dailyRewards = [{ type: "coins", amount: 50 }];
                attendanceData.spinCount = 1;
            }
        }

        attendanceData.lastLogin = now.getTime();

        // --- WRITE BACK STORAGE ---
        nk.storageWrite([{
            collection,
            key,
            userId,
            value: attendanceData,
            permissionRead: 1,
            permissionWrite: 1
        }]);

        return JSON.stringify({
            success: true,
            isNewPlayer,
            firstLoginToday,
            spinCount: attendanceData.spinCount,
            dailyRewards: attendanceData.dailyRewards,
            dayIndex: attendanceData.dayIndex
        });

    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in dailyAttendance: ${errMsg}`);
        return JSON.stringify({ success: false, error: errMsg });
    }
};




function time(ctx: any, logger: any, nk: any, payload: string): string {
    try {
      const nowMs = Date.now();
      // Build JSON object
      const result = {
        server_time: nowMs,
        iso: new Date(nowMs).toISOString(),
      };
      // Must return as string
      return JSON.stringify(result);
    } catch (error) {
      logger.error(`Failed to get server time: ${error}`);
      throw new Error("Failed to retrieve server time");
    }
}
const signal = function(ctx: any, logger: any, nk: any, payload: string): string {
    try {
        // Log the raw payload and its type for debugging
        logger.debug(`Received payload: ${payload}, Type: ${typeof payload}`);
        // Ensure payload is a string
        if (typeof payload !== 'string') {
            throw new Error(`Payload is not a string, received type: ${typeof payload}`);
        }

        // Parse the string payload
        let data: any;
        try {
            data = JSON.parse(payload);
        } catch (parseError) {
            throw new Error(`Failed to parse payload: ${parseError instanceof Error ? parseError.message : JSON.stringify(parseError)}`);
        }

        // Validate matchId and state
        if (!data.matchId || typeof data.matchId !== 'string') {
            throw new Error('matchId is missing or not a string');
        }
        if (data.state === undefined || data.state === null) {
            throw new Error('state is missing or null');
        }

        const matchId: string = data.matchId;
        const signalPayload: string = data.state;

        // Log the signal payload for debugging
        logger.debug(`Sending signal payload: ${signalPayload}, Type: ${typeof signalPayload}`);

        // Send the signal and capture result
        try {
            const signalResult = nk.matchSignal(matchId,signalPayload);
            logger.debug(`matchSignal result: ${JSON.stringify(signalResult)}`);
        } catch (signalError) {
            throw new Error(`matchSignal failed: ${signalError instanceof Error ? signalError.message : JSON.stringify(signalError)}`);
        }
        return JSON.stringify({ success: true });
    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error: ${errMsg}`);
        return JSON.stringify({ success: false, error: errMsg });
    }
};
const rpcCreateRoom = function (ctx: any, logger: any, nk: any, payload: string) {
  const data = JSON.parse(payload || "{}");
  const boardIndex = data.boardIndex ?? 0;
  const numberOfPlayers = data.numberOfPlayers ?? 2;
  const gameMode = data.gameMode ?? "classic";
  try {
    const matchId = nk.matchCreate("lobby", { boardIndex, numberOfPlayers, gameMode, isPrivate: true });
    logger.info(`✅ Private match created: ${matchId}`);
    return JSON.stringify({ matchId });
  } catch (err: any) {
    logger.error("❌ Failed to create match: " + err.message);
    throw err;
  }
};
