const generateShortIdRpc =  function (ctx: any, logger: any, nk: any, payload: string): string {
    // Parse incoming payload safely
    let data: { longId: string };
    try {
        data = JSON.parse(payload);
    } catch (err) {
        logger.error("Invalid JSON payload: %v", err);
        return JSON.stringify({ success: false, error: "Invalid JSON" });
    }

    if (!data || !data.longId) {
        return JSON.stringify({ success: false, error: "Missing longId" });
    }

    // Create short ID (6 random characters)
    const shortId = Math.random().toString(36).substring(2, 8);

    // Prepare storage record
    const collection = "short_ids";
    const key = ctx.userId; // Each user has their own record
    
    const object= nk.StorageWrite = {
        collection,
        key,
        userId: ctx.userId,
        value: {
            longId: data.longId,
            shortId: shortId,
            updatedAt: Date.now()
        },
        permissionRead: 1,
        permissionWrite: 1
    };

    try {
        nk.storageWrite([object]);
        logger.info(`Stored shortId for user ${ctx.userId}: ${shortId}`);
        return JSON.stringify({ success: true, shortId });
    } catch (err) {
        logger.error("Error writing storage: %v", err);
        return JSON.stringify({ success: false, error: "Storage write failed" });
    }
};
const getLongIdRpc = function (ctx: any, logger: any, nk: any, payload: string): string {
    // Parse input
    let data: { shortId: string };
    try {
        data = JSON.parse(payload);
    } catch (err) {
        logger.error("Invalid JSON payload: %v", err);
        return JSON.stringify({ success: false, error: "Invalid JSON" });
    }

    if (!data || !data.shortId) {
        return JSON.stringify({ success: false, error: "Missing shortId" });
    }

    const collection = "short_ids";
    const key = "global_map"; // one global mapping key
    const userId = "00000000-0000-0000-0000-000000000000"; // empty = system-level object

    try {
        // Read the shared mapping object
        const result = nk.storageRead([{ collection, key, userId }]);

        if (!result || result.length === 0 || !result[0].value) {
            return JSON.stringify({ success: false, error: "No mapping data available." });
        }

        const map = result[0].value as Record<string, string>;
        const longId = map[data.shortId];

        if (!longId) {
            return JSON.stringify({ success: false, error: "Short ID not found." });
        }

        return JSON.stringify({ success: true, longId });
    } catch (err) {
        logger.error("Error reading storage: %v", err);
        return JSON.stringify({ success: false, error: "Storage read failed" });
    }
};

// --- Utility: generate unique short referral code ---
function generateReferralCode(length = 6): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
// --- RPC: generate or retrieve referral code ---
const generateReferralCodeRpc = function (ctx: any, logger: any, nk: any, payload: string): string {
    const collection = "referral_codes";
    const userId = ctx.userId;
    const key = userId; // One record per user

    try {
        // Step 1 — Check if user already has a referral code
        const existing = nk.storageRead([{ collection, key, userId }]);
        if (existing && existing.length > 0 && existing[0].value && existing[0].value.code) {
            logger.info(`Referral code already exists for ${userId}: ${existing[0].value.code}`);
            return JSON.stringify({ success: true, referralCode: existing[0].value.code });
        }

        // Step 2 — Generate unique referral code (check for duplicates)
        let referralCode: string="";
        let isUnique = false;

        while (!isUnique) {
            referralCode = generateReferralCode(8);
            const result = nk.storageList(collection, 100, "");
            isUnique = !result.objects.some((obj: nkruntime.StorageObject) => {
                return obj.value && obj.value.code === referralCode;
            });
        }


        // Step 3 — Store permanently for this user
        const record = {
            collection,
            key,
            userId,
            value: {
                code: referralCode,
                createdAt: Date.now()
            },
            permissionRead: 2, // Public read (optional)
            permissionWrite: 0 // No client write
        };

        nk.storageWrite([record]);

        logger.info(`✅ Created referral code for ${userId}: ${referralCode}`);
        return JSON.stringify({ success: true, referralCode });
    } catch (err) {
        logger.error("Error in referral code generation: %v", err);
        return JSON.stringify({ success: false, error: "Internal server error" });
    }
};
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
  addWord(nk,"00000000-0000-0000-0000-000000000000","word1");
  addWord(nk,"00000000-0000-0000-0000-000000000000","word2");
  initializer.registerMatchmakerMatched(matchmakerMatched);
  initializer.registerRpc("signal", signal);
  initializer.registerRpc("time", time);
  initializer.registerRpc("create_private_room", rpcCreateRoom);
  initializer.registerRpc("coinsHandler", coinsHandler);
  initializer.registerRpc("dailyAttendance", dailyAttendance);
  initializer.registerRpc("collectDailyReward", collectDailyReward);
  initializer.registerRpc("spin", spin);
  initializer.registerRpc("rpc", rpc);
  initializer.registerRpc("getLongIdRpc", getLongIdRpc);
  initializer.registerRpc("generateShortIdRpc", generateShortIdRpc);
  initializer.registerRpc("generateReferralCodeRpc", generateReferralCodeRpc);
  initializer.registerRpc("wordo", wordo);
  initializer.registerRpc("getPlayerCoins", getPlayerCoins);
}
let wordsGenInstance:wordsGen;
const getWordoInstance=function():wordsGen{
 return wordsGenInstance;
}
const rpc = function (ctx: any, logger: any, nk: any, payload: string): string {
  try {
    const res = nk.httpRequest(
      "http://127.0.0.1:8000/ping",
      "get",
      { "Accept": "application/json" }
    )

    logger.info("Ping server response: " + res.body);
    return res.body; // returns {"reply":"pong"}
  } catch (error) {
    logger.error("Ping RPC error: " + error);
    throw new Error("Ping failed");
  }
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

        // --- READ CURRENT DATA ---
        let attendanceData: any = null;
        try {
            const collection = "player_data";
            const key = "daily_attendance";
            const objects = nk.storageRead([{ collection, key, userId }]);
            if (objects && objects.length > 0 && objects[0].value) {
                attendanceData = objects[0].value;
            }
        } catch (readError) {
            logger.warn(`Failed to read attendance data: ${readError}`);
        }
        // --- COIN REWARD RULES (SERVER-CONTROLLED) ---
        const rewardTable: Record<string, number> = {
            spin: 20,    // player spins a wheel
            ad: 500,      // player watches an ad
            daily: 50,   // daily login reward
            mission: 100, // completing a mission
            dublespin:0
        };
        if(attendanceData && attendanceData.DubleSpin)
        rewardTable["dublespin"] = attendanceData.DubleSpin;

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
const getPlayerCoins = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        logger.debug(`📩 Received payload: ${payload}`);

        if (typeof payload !== "string") {
            throw new Error(`Invalid payload type: ${typeof payload}. Expected a string.`);
        }

        // Parse payload
        let data: { userId?: string };
        try {
            data = JSON.parse(payload);
        } catch (err) {
            throw new Error(`Failed to parse payload JSON: ${(err as Error).message}`);
        }

        if (!data.userId) {
            throw new Error("Missing required field: userId");
        }

        const userId = data.userId;
        const collection = "player_data";
        const key = "coins";

        let currentCoins = 0;

        // Read from Nakama storage
        try {
            const objects = nk.storageRead([{ collection, key, userId }]);

            if (objects && objects.length > 0) {
                const value = objects[0].value;
                if (value && typeof value.coins === "number") {
                    currentCoins = value.coins;
                } else {
                    logger.debug(`No valid 'coins' field found for user ${userId}. Defaulting to 0.`);
                }
            } else {
                logger.debug(`No storage object found for user ${userId}.`);
            }

        } catch (readError) {
            logger.warn(`⚠️ Failed to read coin data for user ${userId}: ${(readError as Error).message}`);
        }

        return JSON.stringify({
            success: true,
            coins: currentCoins
        });

    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`❌ RPC Error in getPlayerCoins: ${errMsg}`);
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
                dayIndex: 0,
                dailyReward: null,
                killCount:0,
                wins:0,
                losses:0,
                houseOfWords:[]
            };

            // --- GIVE 5000 COINS TO NEW PLAYER ---
            const coinCollection = "player_data";
            const coinKey = "coins";
            const writeCoins: nkruntime.StorageWriteRequest = {
                collection: coinCollection,
                key: coinKey,
                userId,
                value: { coins: 5000 },
                permissionRead: 1,
                permissionWrite: 1
            };

            try {
                nk.storageWrite([writeCoins]);
                attendanceData.initialCoins = 5000;
            } catch (err) {
                logger.error(`Failed to write initial coins for new player ${userId}: ${err}`);
            }
        }

        // --- DAILY REWARD GENERATION FUNCTION ---
        function generateDailyRewards(currentDay: number) {
            const rewards: any[] = [];
            const startDay = Math.floor((currentDay - 1) / 9) * 9 + 1;
            const endDay = startDay + 8;

            for (let i = startDay; i <= endDay; i++) {
                const rewardAmount = Math.min(500 + (i - 1) * 100, 5000);
                rewards.push({
                    day: i,
                    amount: rewardAmount,
                    isCollected: false
                });
            }

            return {
                today: currentDay,
                dailyRewardDatas: rewards
            };
        }

        // --- DAILY LOGIN CHECK ---
        let firstLoginToday = false;
        if (attendanceData.lastLogin < today) {
            firstLoginToday = true;
            // Increment day index
            attendanceData.dayIndex = (attendanceData.dayIndex || 0) + 1;

            // Original spins array
            let spins = [350, 300, 500, 350, 300, 250, 500, 400, 1000, 2000];
            // Shuffle function (Fisher–Yates shuffle)
            function shuffleArray<T>(array: T[]): T[] {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }
            // Shuffle spins before assigning
            let shuffledSpins = shuffleArray(spins);
            // Generate random spin indexes (for example, 3 random indexes)
            function getRandomIndexes(count: number, max: number): number[] {
                let indexes: number[] = [];
                while (indexes.length < count) {
                    let rand = Math.floor(Math.random() * max);
                    if (!indexes.includes(rand)) indexes.push(rand);
                }
                return indexes;
            }
            let spinData = {
                spins: shuffledSpins,
                spinCount: getRandomIndexes(3, spins.length) // returns something like [1, 7, 4]
            };
            attendanceData.spinData = spinData;

            // Check if new 9-day cycle is needed
            if (!attendanceData.dailyReward ||
                attendanceData.dayIndex > attendanceData.dailyReward.dailyRewardDatas.length) {
                attendanceData.dailyReward = generateDailyRewards(attendanceData.dayIndex);
            }
            attendanceData.dailyReward.today = attendanceData.dayIndex;
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
            dayIndex: attendanceData.dayIndex,
            dailyReward: attendanceData.dailyReward,
            todayReward: attendanceData.dailyRewards?.[0] || null
        });

    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in dailyAttendance: ${errMsg}`);
        return JSON.stringify({ success: false, error: errMsg });
    }
};
const collectDailyReward = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        const userId = ctx.userId;
        if (!userId) throw new Error("User ID missing from context");

        const collection = "player_data";
        const attendanceKey = "daily_attendance";
        const coinsKey = "coins";

        // --- PARSE PAYLOAD ---
        const request = payload ? JSON.parse(payload) : {};
        const mode = request.mode || "read"; // "read" or "collect"

        // --- READ ATTENDANCE DATA ---
        const attendanceObjects = nk.storageRead([{ collection, key: attendanceKey, userId }]);
        if (!attendanceObjects || attendanceObjects.length === 0 || !attendanceObjects[0].value) {
            throw new Error("No attendance data found for this player");
        }

        const attendanceData = attendanceObjects[0].value;
        if (!attendanceData.dailyReward || !attendanceData.dailyReward.today) {
            throw new Error("Daily reward data missing");
        }

        const today = attendanceData.dailyReward.today;
        const todayReward = attendanceData.dailyReward.dailyRewardDatas.find((r: any) => r.day === today);
        if (!todayReward) throw new Error(`Reward for day ${today} not found`);

        // --- READ CURRENT COINS ---
        let currentCoins = 0;
        try {
            const coinObjects = nk.storageRead([{ collection, key: coinsKey, userId }]);
            if (coinObjects && coinObjects.length > 0 && coinObjects[0].value) {
                currentCoins = coinObjects[0].value.coins || 0;
            }
        } catch (err) {
            logger.warn(`Failed to read coin data for ${userId}: ${err}`);
        }

        // --- IF MODE IS "read" ---
        if (mode === "read") {
            return JSON.stringify({
                success: true,
                message: "attendanceData",
                coinsAdded: 0,
                currentCoins,
                attendanceData
            });
        }

        // --- IF MODE IS "collect" ---
        if (todayReward.isCollected) {
            return JSON.stringify({
                success: false,
                message: "Reward already collected",
                coinsAdded: 0,
                currentCoins,
                attendanceData
            });
        }

        const rewardAmount = todayReward.amount;
        const newBalance = currentCoins + rewardAmount;

        // --- UPDATE COINS ---
        nk.storageWrite([{
            collection,
            key: coinsKey,
            userId,
            value: { coins: newBalance },
            permissionRead: 1,
            permissionWrite: 1
        }]);

        // --- MARK REWARD AS COLLECTED ---
        todayReward.isCollected = true;

        nk.storageWrite([{
            collection,
            key: attendanceKey,
            userId,
            value: attendanceData,
            permissionRead: 1,
            permissionWrite: 1
        }]);

        logger.debug(`User ${userId} collected ${rewardAmount} coins for day ${today}. New total: ${newBalance}`);

        return JSON.stringify({
            success: true,
            message: "Reward collected successfully",
            coinsAdded: rewardAmount,
            currentCoins: newBalance,
            attendanceData
        });

    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in collectDailyReward: ${errMsg}`);
        return JSON.stringify({ success: false, error: errMsg });
    }
};
const spin = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        const userId = ctx.userId;
        if (!userId) throw new Error("User ID missing from context");
        const collection = "player_data";
        const attendanceKey = "daily_attendance";
        const coinsKey = "coins";
        // --- PARSE PAYLOAD ---
        const request = payload ? JSON.parse(payload) : {};

        const mode = request.mode || "read"; // "read" or "collect"
        // --- READ ATTENDANCE DATA ---
        const attendanceObjects = nk.storageRead([{ collection, key: attendanceKey, userId }]);
        if (!attendanceObjects || attendanceObjects.length === 0 || !attendanceObjects[0].value) {
            throw new Error("No attendance data found for this player");
        }

        const attendanceData = attendanceObjects[0].value;
        if (!attendanceData.spinData || !attendanceData.spinData.spins || !attendanceData.spinData.spinCount) {
            throw new Error("spinData missing or invalid");
        }


        function getRandomIndexes(count: number, max: number): number[] {
                let indexes: number[] = [];
                while (indexes.length < count) {
                    let rand = Math.floor(Math.random() * max);
                    if (!indexes.includes(rand)) indexes.push(rand);
                }
                return indexes;
        }

        if (request.add) {
            const newIndexes = getRandomIndexes(request.add, attendanceData.spinData.spins.length);
            // Add each number individually, not replace
            attendanceData.spinData.spinCount.push(...newIndexes);

            nk.storageWrite([{
            collection,
            key: attendanceKey,
            userId,
            value: attendanceData,
            permissionRead: 1,
            permissionWrite: 1
        }]);
        
        }




        // --- READ CURRENT COINS ---
        let currentCoins = 0;
        try {
            const coinObjects = nk.storageRead([{ collection, key: coinsKey, userId }]);
            if (coinObjects && coinObjects.length > 0 && coinObjects[0].value) {
                currentCoins = coinObjects[0].value.coins || 0;
            }
        } catch (err) {
            logger.warn(`Failed to read coin data for ${userId}: ${err}`);
        }
        // --- READ MODE ---
        if (mode === "read") {
            return JSON.stringify({
                success: true,
                message: "attendanceData",
                coinsAdded: 0,
                currentCoins,
                attendanceData
            });
        }
        // --- COLLECT MODE ---
        const spinIndexes = attendanceData.spinData.spinCount;
        const spinValues = attendanceData.spinData.spins;
        if (!spinIndexes || spinIndexes.length === 0) {
            return JSON.stringify({
                success: false,
                message: "No spins available",
                coinsAdded: 0,
                currentCoins,
                attendanceData
            });
        }
        // --- TAKE FIRST SPIN INDEX ---
        const nextIndex = spinIndexes.shift(); // remove first index
        const rewardAmount = spinValues[nextIndex] || 0;
        const newBalance = currentCoins + rewardAmount;
        attendanceData.DubleSpin = rewardAmount;
        // --- SAVE UPDATED COINS ---
        nk.storageWrite([{
            collection,
            key: coinsKey,
            userId,
            value: { coins: newBalance },
            permissionRead: 1,
            permissionWrite: 1
        }]);
        // --- SAVE UPDATED ATTENDANCE ---
        nk.storageWrite([{
            collection,
            key: attendanceKey,
            userId,
            value: attendanceData,
            permissionRead: 1,
            permissionWrite: 1
        }]);
        return JSON.stringify({
            success: true,
            message: "Reward collected successfully",
            coinsAdded: rewardAmount,
            currentCoins: newBalance,
            attendanceData
        });
    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in spin: ${errMsg}`);
        return JSON.stringify({ success: false, error: errMsg });
    }
};
const wordo = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        const userId = "00000000-0000-0000-0000-000000000000";
        if (!userId) throw new Error("User ID missing from context");
        const collection = "player_data";
        const key = "wordo";
        const request = payload ? JSON.parse(payload) : {};
        if(request.read){
          return  nk.storageRead([{ collection, key: key, userId }]);
        }
        else{
            nk.storageWrite([{collection,key: key,userId,value: request.data,permissionRead: 1,permissionWrite: 1}]);
            return "storageWrite success";
        }
        return "nun";

    } catch (e) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in spin: ${errMsg}`);
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
};
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
  const fee = data.fee ?? 0;

  try {
    const matchId = nk.matchCreate("lobby", { boardIndex, numberOfPlayers, gameMode,fee, isPrivate: true });
    logger.info(`✅ Private match created: ${matchId}`);
    return JSON.stringify({ matchId });
  } catch (err: any) {
    logger.error("❌ Failed to create match: " + err.message);
    throw err;
  }
};
const addWord = function (nk: any,userId: string,word: string) {

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
  }
  // --- IF DATA DOESN’T EXIST, CREATE A DEFAULT STRUCTURE ---
  if (!attendanceData) {
    attendanceData = {
      houseOfWords: []
    };
  }
  // --- ENSURE ALL REQUIRED FIELDS EXIST ---
  attendanceData.houseOfWords = attendanceData.houseOfWords ?? [];
  // --- UPDATE STATS ---
  attendanceData.houseOfWords.push(word);
  // --- SAVE UPDATED DATA BACK TO STORAGE ---
  try {
    nk.storageWrite([{collection,key,userId,value: attendanceData,permissionRead: 1,permissionWrite: 1}]);
  } catch (writeError) {
  }
};

