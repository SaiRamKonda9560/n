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

    initializer.registerMatch('tournament', {
        matchInit: matchInit_Tournament,
        matchJoinAttempt: matchJoinAttempt_Tournament,
        matchJoin: matchJoin_Tournament,
        matchLeave: matchLeave_Tournament,
        matchLoop: matchLoop_Tournament,
        matchSignal: matchSignal_Tournament,
        matchTerminate: matchTerminate_Tournament,
    });

    initializer.registerRpc("createTournament", createTournament);
    initializer.registerRpc("readTournaments", readTournaments);



    initLeaderBoards(logger,nk,'');
    initializer.registerRpc("GetTopPlayers", GetTopPlayers);

    //UpdateCoinsAndWins("00000000-0000-0000-0000-000000000000","hi",nk,200,20);
    //UpdateCoinsAndWins("07c20630-8898-42a5-9ae6-03c4a80fcb80","vivo",nk,200,20);

    initializer.registerMatchmakerMatched(matchmakerMatched);

    initializer.registerRpc("signal", signal);
    initializer.registerRpc("time", time);
    initializer.registerRpc("create_private_room", rpcCreateRoom);
    initializer.registerRpc("coinsHandler", coinsHandler);
    initializer.registerRpc("dailyAttendance", dailyAttendance);
    initializer.registerRpc("collectDailyReward", collectDailyReward);
    initializer.registerRpc("spin", spin);
    initializer.registerRpc("mystery", mystery);

    initializer.registerRpc("rpc", rpc);
    initializer.registerRpc("getLongIdRpc", getLongIdRpc);
    initializer.registerRpc("generateShortIdRpc", generateShortIdRpc);
    initializer.registerRpc("generateReferralCodeRpc", generateReferralCodeRpc);
    initializer.registerRpc("wordo", wordo);
    initializer.registerRpc("getPlayerCoins", getPlayerCoins);
    initializer.registerRpc("rpcStoreWords", rpcStoreWords);
    initializer.registerRpc("getCardsData", getCardsData);
    
    initializer.registerRpc("rpcAddWordPack", rpcAddWordPack);
    initializer.registerRpc("rpcUpdateWordPackProgress", rpcUpdateWordPackProgress);
    initializer.registerRpc("rpcGetWordPacks", rpcGetWordPacks);
    initializer.registerRpc("rpcRemoveWordPack", rpcRemoveWordPack);
    initializer.registerRpc("rpcBuyPackWithCoins", rpcBuyPackWithCoins);
    initializer.registerRpc("rpcResetProgress", rpcResetProgress);
    initializer.registerRpc("rpcCompleteSingleWord", rpcCompleteSingleWord);
    initializer.registerRpc("rpcCheckIfUnlocked", rpcCheckIfUnlocked);
    initializer.registerRpc("rpcGetWordPackStoreData", rpcGetWordPackStoreData);
    initializer.registerRpc("rpcSetActiveWordPack", rpcSetActiveWordPack);
    initializer.registerRpc("rpcDeactivateWordPack", rpcDeactivateWordPack);
    deleteAllTournaments(logger,nk);
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
const player_data = "player_data";
const daily_attendance = "daily_attendance";
const dailyAttendance = function (ctx: any,logger: any,nk: any,payload: string): string {
    try {
        const userId = ctx.userId;
        if (!userId) throw new Error("User ID missing from context");


        // ================= READ EXISTING DATA =================
        let attendanceData: any = null;
        try {
            const objects = nk.storageRead([{ collection: player_data, key: daily_attendance, userId }]);
            if (objects?.length && objects[0].value) {
                attendanceData = objects[0].value;
            }
        } catch (err) {
            logger.warn(`Failed to read attendance data: ${err}`);
        }


        let isNewPlayer = false;
        const now = new Date();

        // ================= NEW PLAYER SETUP =================
        if (!attendanceData) {
            isNewPlayer = true;
            attendanceData = {
                firstLogin: now.getTime(),
                lastLogin: 0,
                dayIndex: 0,
                dailyReward: null,
                killCount: 0,
                wins: 0,
                losses: 0,
                houseOfWords: []
            };
            // Give initial coins
            try {
                playerCoins(nk,ctx.userId,ctx.username,5000);
            } catch (err) {
                logger.error(`Failed to write initial coins: ${err}`);
            }
        }

        // ================= DAILY REWARD GENERATOR =================
        function shuffleArray<T>(array: T[]): T[] {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }
        function generateDailyRewards() {
            return {
                today: 0,
                dailyRewardDatas: [
                    {amount: 500, isCollected: false },
                    {amount: 700, isCollected: false },
                    {amount: 900, isCollected: false },
                    {amount: 1200, isCollected: false },
                    {amount: 1500, isCollected: false },
                    {amount: 2000, isCollected: false },
                    {amount: 3000, isCollected: false }
                ]
            };
        }
        function generateSpinData() {
            // ---------- Spin Data ----------
            const spins = [350, 300, 500, 350, 300, 250, 500, 400, 1000, 2000];

            function getRandomIndexes(count: number, max: number): number[] {
                const indexes: number[] = [];
                while (indexes.length < count) {
                    const r = Math.floor(Math.random() * max);
                    if (!indexes.includes(r)) indexes.push(r);
                    }
                    return indexes;
                }
                    attendanceData.spinData = {
                        spins: shuffleArray(spins),
                        spinCount: getRandomIndexes(3, spins.length)
                    };
        }
        function generateMysteryBox(){
            const mysterys = [1,2];
            attendanceData.m = {type:shuffleArray(mysterys)[0],Collected:false};
        }
        // ================= DAILY LOGIN CHECK =================
        let firstLoginToday = false;
        //for testing use useMin = true 
        const useMin = false; // true = 1 minute = 1 day, false = real day 
        // choose "day" length
        const DAY_MS = useMin ? 60 * 1000 : 24 * 60 * 60 * 1000;
        // normalize "today"
        const todayMidnight = useMin? Math.floor(now.getTime() / DAY_MS) * DAY_MS: new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (attendanceData.lastLogin < todayMidnight || isNewPlayer) {
            firstLoginToday = true;
            attendanceData.dayIndex = (attendanceData.dayIndex || 0) + 1;
            const lastLoginMidnight =attendanceData.lastLogin > 0? useMin? Math.floor(attendanceData.lastLogin / DAY_MS) * DAY_MS: new Date(attendanceData.lastLogin).setHours(0, 0, 0, 0): 0;
            const lastLoginDay = lastLoginMidnight? Math.floor(lastLoginMidnight / DAY_MS): 0;
            const todayDay = Math.floor(todayMidnight / DAY_MS);
            const dayDiff = lastLoginDay > 0 ? todayDay - lastLoginDay : 0;
            const missedDays = Math.max(0, dayDiff - 1);
            generateSpinData();
            generateMysteryBox();
            // ---------- Daily Reward Cycle (INDEX BASED) ----------
            if (!attendanceData.dailyReward || missedDays > 0 || attendanceData.dailyReward.today >= (attendanceData.dailyReward.dailyRewardDatas.length-1))
            {
                // reset reward cycle
                attendanceData.dailyReward = generateDailyRewards();
            } else {
                // move to next reward
                attendanceData.dailyReward.today += 1;
            }
        }
        if(!attendanceData.m){
            generateMysteryBox();
        }
        attendanceData.lastLogin = now.getTime();
        // ================= SAVE BACK =================
        nk.storageWrite([{collection: player_data,key: daily_attendance,userId,value: attendanceData,permissionRead: 1,permissionWrite: 1}]);
    return JSON.stringify({success: true, isNewPlayer,firstLoginToday,data: attendanceData,dayIndex: attendanceData.dayIndex,dailyReward: attendanceData.dailyReward,todayReward: attendanceData.dailyRewards?.[0] || null});
    } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in dailyAttendance: ${msg}`);
        return JSON.stringify({ success: false, error: msg });
    }
};
const collectDailyReward = function (ctx: any,logger: any,nk: any,payload: string): string {
    try {
        const userId = ctx.userId;
        const username = ctx.username;
        if (!userId) throw new Error("User ID missing from context"); 
        // ================= PARSE REQUEST =================
        const request = payload ? JSON.parse(payload) : {};
        const read = request.read;
        // ================= READ ATTENDANCE =================
        const attendanceObjects = nk.storageRead([
            { collection: player_data, key: daily_attendance, userId }
        ]);
        if (!attendanceObjects?.length || !attendanceObjects[0].value) {
            throw new Error("No attendance data found");
        }
        const attendanceData = attendanceObjects[0].value;
        const today = attendanceData.dailyReward.today;
        const todayReward = attendanceData.dailyReward.dailyRewardDatas[today];
        if (!todayReward) {
            throw new Error(`Reward for day ${today} not found`);
        }
        // ================= READ COINS =================
        let currentCoins = playerCoins(nk,userId,username, 0);
        // ================= READ MODE =================
        if (read) {
            return JSON.stringify({success: true,message: "attendanceData",coinsAdded: 0,currentCoins,attendanceData});
        }
        // ================= COLLECT MODE =================
        if (todayReward.isCollected) {
            return JSON.stringify({success: false,message: "Reward already collected",coinsAdded: 0,currentCoins,attendanceData});
        }
        const rewardAmount = todayReward.amount;
        const newBalance = playerCoins(nk,userId,username, rewardAmount);
        todayReward.isCollected = true;
        nk.storageWrite([{collection: player_data,key: daily_attendance,userId,value: attendanceData,permissionRead: 1,permissionWrite: 1}]);
        return JSON.stringify({success: true,message: "Reward collected successfully",coinsAdded: rewardAmount,currentCoins: newBalance,attendanceData});

    } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(`RPC Error in collectDailyReward: ${msg}`);
        return JSON.stringify({ success: false, error: msg });
    }
};
const rpcStoreWords = function (ctx: any, logger: any, nk: any, payload: string) {
  const collection = "words";
  const userId = "00000000-0000-0000-0000-000000000000";
  if (!payload) {
    return JSON.stringify({ success: false, error: "Empty payload" });
  }
  const data = JSON.parse(payload);
  const key = data.key;
  const valueJsonString = data.value;
  if (!key || !valueJsonString) {
    return JSON.stringify({ success: false, error: "key and value required" });
  }
  // Read existing data
  let existingValue: any = {};
  try {
    const objects = nk.storageRead([{ collection, key, userId }]);
    if (objects && objects.length > 0 && objects[0].value) {
      existingValue = objects[0].value;
    }
  } catch (readError) {
    logger.error("Error reading storage: " + readError);
  }
  // Parse JSON string
  let parsedValue: any;
  try {
    parsedValue = JSON.parse(valueJsonString);
  } catch (e) {
    logger.error("Invalid JSON string: " + e);
    return JSON.stringify({ success: false, error: "Invalid JSON string" });
  }
  // Overwrite value
  existingValue = parsedValue;
  // Write new value
  try {
    nk.storageWrite([
      {
        collection,
        key,
        userId,
        value: existingValue,
        permissionRead: 2,   // public readable
        permissionWrite: 0,  // only server writes
      },
    ]);
  } catch (writeError) {
    logger.error("Error writing storage: " + writeError);
    return JSON.stringify({ success: false, error: "Write failed" });
  }

  return JSON.stringify({ success: true });
};
const spin = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        const userId = ctx.userId;
        const username = ctx.username;

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
        attendanceData.DubleSpin = rewardAmount;
        // --- SAVE UPDATED COINS ---
        const newBalance = playerCoins(nk,userId,username,rewardAmount);
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
const mystery = function (ctx: any, logger: any, nk: any, payload: string): string {
    try {
        const userId = ctx.userId;
        const username = ctx.username;
        if (!userId) throw new Error("User ID missing from context");
        const collection = "player_data";
        const attendanceKey = "daily_attendance";
        const coinsKey = "coins";
        // --- PARSE PAYLOAD ---
        const request = payload ? JSON.parse(payload) : {};
        const collect = request.collect || false; // "read" or "collect"
        // --- READ ATTENDANCE DATA ---
        const attendanceObjects = nk.storageRead([{ collection, key: attendanceKey, userId }]);
        if (!attendanceObjects || attendanceObjects.length === 0 || !attendanceObjects[0].value) {
            throw new Error("No attendance data found for this player");
        }
        const attendanceData = attendanceObjects[0].value;
        if (!attendanceData.m) {
            throw new Error("mystery missing or invalid");
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
        let cardsData :cards = (attendanceData.cards ||  new cards());
        var m = attendanceData.m;
        // --- READ MODE ---
        if (!collect) {
            return JSON.stringify({
                success: true,
                message: "mysteryData read",
                mysteryData : m
            });
        }
        // --- COLLECT MODE ---
        if (m.Collected) {
            return JSON.stringify({
                success: false,
                message: "mystery already collected",
                mysteryData : m,

            });
        }
        attendanceData.m.Collected = true;
        let message = "";
        switch(m.type){
            case 1:
                cardsData.MeaningCards = (cardsData.MeaningCards ?? 0) + 1; + 1;
                message = "meaning Unlock Cards";
                break;
            case 2:
                cardsData.SpeechCards = (cardsData.SpeechCards ?? 0) + 1; + 1;
                message = "pronounciation Unlock Cards";
                break;
        }
        attendanceData.cards = cardsData;
        // --- SAVE UPDATED COINS ---
        //const newBalance = playerCoins(nk,userId,username,rewardAmount);
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
            message: message,
            mysteryData : m

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
  const bots = data.bots ?? false;
  const fee = data.fee ?? 0;
  try {
    const matchId = nk.matchCreate("lobby", { boardIndex, numberOfPlayers, gameMode,fee, isPrivate: true,bots});
    logger.info(`✅ Private match created: ${matchId}`);
    return JSON.stringify({ matchId });
  } catch (err: any) {
    logger.error("❌ Failed to create match: " + err.message);
    throw err;
  }
};
const addWord = function (nk: any, userId: string, word: string) {
  const collection = "player_data";
  const key = "daily_attendance";

  let attendanceData: any = { houseOfWords: [] };

  try {
    const objects = nk.storageRead([{ collection, key, userId }]);
    if (objects && objects.length > 0 && objects[0].value) {
      attendanceData = objects[0].value;
      if (!Array.isArray(attendanceData.houseOfWords)) {
        attendanceData.houseOfWords = [];
      }
    }
  } catch (readError) {
    nk.logger.error("Error reading storage: " + readError);
  }

  // Add the new word
  attendanceData.houseOfWords.push(word);

  // Save updated data
  try {
    nk.storageWrite([
      {
        collection,
        key,
        userId,
        value: attendanceData,
        permissionRead: 1,
        permissionWrite: 1,
      },
    ]);
  } catch (writeError) {
    nk.logger.error("Error writing storage: " + writeError);
  }
};
const leaderboardCoinsId = "leaderboard_coins";
const leaderboardWinsId = "leaderboard_wins";
// RPC function to initialize both leaderboards
const initLeaderBoards = function (logger: any,nk: any,payload: string): string {
  try {
    // Create "coins" leaderboard (set = replaces score)
    nk.leaderboardCreate(leaderboardCoinsId,false,"desc","set","0 0 * * 0",{ type: "coins" },true);
    // Create "wins" leaderboard (incr = adds score)
    nk.leaderboardCreate(leaderboardWinsId,false,"desc","set","0 0 * * 0",{ type: "wins" },true);
    logger.info("Leaderboards initialized successfully.");
    return JSON.stringify({ success: true, message: "Leaderboards created." });
  } catch (error) {
    logger.error("Leaderboard init failed: " + error);
    return JSON.stringify({ success: false, message: error });
  }
};
function UpdateCoinsAndWins(userId: string,username: string,nk: any,coins: number,wins: number) {
  try {
    // Update coins leaderboard (SET total)
    nk.leaderboardRecordWrite(leaderboardCoinsId,userId,username,coins,0,{ note: "updated coins" });
    // Update wins leaderboard (INCR only if player won)
    nk.leaderboardRecordWrite(leaderboardWinsId,userId,username,wins,0,{ note: "player wins" });
  } catch (error) {
  }
}
function UpdateWins(userId: string,username: string,nk: any,wins: number) {
  try {
        if(userId===""||username === ""){
          return;
        }
    // Update wins leaderboard (INCR only if player won)
    nk.leaderboardRecordWrite(leaderboardWinsId,userId,username,wins,0,{ note: "player wins" });
  } catch (error) {
  }
}
function UpdateCoins(userId: string,username: string,nk: any,coins: number) {
  try {
        // Update coins leaderboard (SET total)
        if(userId===""||username === ""){
          return;
        }
    nk.leaderboardRecordWrite(leaderboardCoinsId,userId,username,coins,0,{ note: "updated coins" });

  } catch (error) {
  }
}
function GetTopPlayers(ctx: any, logger: any, nk: any, payload: string): string  {
  try {
    let leaderboardCoins = nk.leaderboardRecordsList(leaderboardCoinsId, [], 20, "", 0);
    let leaderboardWins = nk.leaderboardRecordsList(leaderboardWinsId, [], 20, "", 0);
    return JSON.stringify({leaderboardCoins,leaderboardWins,success : true});
  } catch (error) {
    logger.error("Error getting leaderboard: " + error);
    return JSON.stringify({success : false});
  }
}
function loadAttendanceData(userId: string, nk: any): any {
    try {
        const objects = nk.storageRead([{
            collection: player_data,
            key: daily_attendance,
            userId
        }]);

        if (objects && objects.length > 0 && objects[0].value) {
            return objects[0].value;
        }
    } catch (err) {
        nk.logger.error("loadAttendanceData error: %s", err);
    }

    return null; // not found
}
function saveAttendanceData(userId: string, nk: any, attendanceData: any): void {
    try {
        nk.storageWrite([{
            collection: player_data,
            key: daily_attendance,
            userId,
            value: attendanceData,
            permissionRead: 1,  // public read (ok for client)
            permissionWrite: 0  // only server can write (IMPORTANT)
        }]);
    } catch (err) {
        nk.logger.error("saveAttendanceData error: %s", err);
    }
}
const getCardsData = function (ctx: any, logger: any, nk: any, payload: string) {
  
  try {
    return JSON.stringify(loadCardsData(ctx.userId,nk));
  } catch (err: any) {
    logger.error("❌ Failed to create match: " + err.message);
    throw err;
  }
};
function loadCardsData(userId: string, nk: any): any {
    try {
        const objects = nk.storageRead([{
            collection: player_data,
            key: daily_attendance,
            userId
        }]);

        if (objects && objects.length > 0 && objects[0].value) {
            return objects[0].value.cards;
        }
    } catch (err) {
        nk.logger.error("loadAttendanceData error: %s", err);
    }

    return null; // not found
}
function saveCardsData(userId: string, nk: any, cardsdata: any): void {
    try {
            const objects = nk.storageRead([{
            collection: player_data,
            key: daily_attendance,
            userId
        }]);

        if (objects && objects.length > 0 && objects[0].value) {
            let data = objects[0].value;
            data.cards = cardsdata;
            nk.storageWrite([{
            collection: player_data,
            key: daily_attendance,
            userId,
            value: data,
            permissionRead: 1,  // public read (ok for client)
            permissionWrite: 0  // only server can write (IMPORTANT)
        }]);
        }

    } catch (err) {
        nk.logger.error("saveAttendanceData error: %s", err);
    }
}
//#region words pack
// --------------------------------------------------------
// TYPES
// --------------------------------------------------------
interface WordPack {
    packId: string;
    boughtOn: number;
    completed: number[];
}

interface WordPackData {
    activePack: string;
    packs: WordPack[]; 
}

const COLLECTION = "player_data";
const KEY = "wordpacks";
const COINS_KEY = "coins"; // optional for buyPackWithCoins

// --------------------------------------------------------
// STORAGE HELPERS
// --------------------------------------------------------
function loadWordPacks(nk: any, userId: string): WordPackData {
    try {
        const objs = nk.storageRead([{ collection: COLLECTION, key: KEY, userId }]);
        if (objs.length > 0 && objs[0].value) {
            return objs[0].value as WordPackData;
        }
    } catch (_) {}
    return { packs: [] ,activePack:""};
}

function saveWordPacks(nk: any, userId: string, data: WordPackData) {
    nk.storageWrite([{
        collection: COLLECTION,
        key: KEY,
        userId,
        value: data,
        permissionRead: 1,
        permissionWrite: 1
    }]);
}

// --------------------------------------------------------
// HELPER METHODS (REAL LOGIC)
// --------------------------------------------------------

// 1. Add pack
function addWordPack(nk: any, userId: string, packId: string) {
    const packData = loadWordPacks(nk, userId);

    if (packData.packs.some(p => p.packId === packId)) {
        return { success: true, alreadyOwned: true };
    }

    packData.packs.push({
        packId,
        boughtOn: Date.now(),
        completed: []
    });

    saveWordPacks(nk, userId, packData);
    return { success: true,  packId };
}

// 2. Update completed array fully
function updateWordPackProgress(nk: any, userId: string, packId: string, completed: number[]) {
    const packData = loadWordPacks(nk, userId);
    const pack = packData.packs.find(p => p.packId === packId);

    if (!pack) return { success: false, error: "Pack not owned" };

    pack.completed = completed;
    saveWordPacks(nk, userId, packData);

    return { success: true };
}

// 3. Get all packs
function getWordPacks(nk: any, userId: string) {
    return loadWordPacks(nk, userId);
}

// 4. Remove pack
function removeWordPack(nk: any, userId: string, packId: string) {
    const packData = loadWordPacks(nk, userId);
    const before = packData.packs.length;

    packData.packs = packData.packs.filter(p => p.packId !== packId);

    if (before === packData.packs.length) {
        return { success: false, error: "Pack not found" };
    }

    saveWordPacks(nk, userId, packData);
    return { success: true, removed: true };
}

// 5. Buy pack with coins
function buyPackWithCoins(nk: any, userId: string,username:string, packId: string, price: number) {
    // read coins
    let coins = playerCoins(nk,userId,username,0);
    if (coins < price) {
        return { success: false, error: "Not enough coins "};
    }
    try {
    // save coins
    playerCoins(nk,userId,username,-price);
    } catch (_) {
        return { success: false, error: "storageWrite coins" ,username,userId,price,packId };

    }
    // add pack
    return addWordPack(nk, userId, packId);
}

// 6. Reset progress
function resetProgress(nk: any, userId: string, packId: string) {
    const packData = loadWordPacks(nk, userId);
    const pack = packData.packs.find(p => p.packId === packId);
    if (!pack) return { success: false, error: "Pack not owned" };

    pack.completed = [];
    saveWordPacks(nk, userId, packData);

    return { success: true };
}

// 7. Complete single index
function completeSingleWord(nk: any, userId: string, packId: string, index: number) {
    const packData = loadWordPacks(nk, userId);
    const pack = packData.packs.find(p => p.packId === packId);
    if (!pack) return { success: false, error: "Pack not owned" };

    if (!pack.completed.includes(index)) {
        pack.completed.push(index);
    }

    saveWordPacks(nk, userId, packData);
    return { success: true };
}

// 8. Check if unlocked
function checkIfUnlocked(nk: any, userId: string, packId: string) {
    const packData = loadWordPacks(nk, userId);
    const pack = packData.packs.find(p => p.packId === packId);
    return { unlocked: !!pack };
}
function getOwnedPackMap(nk: any, userId: string): Map<string, any> {
    const data = loadWordPacks(nk, userId);
    const ownedMap = new Map<string, any>();
    for (const p of data.packs) {
        ownedMap.set(p.packId, p);
    }
    return ownedMap;
}
function getStoreData(nk: any, userId: string) {
    const STORE_USER = "00000000-0000-0000-0000-000000000000";
    const WORDS_COLLECTION = "words";
    const PRICE = 1000;

    // 1. Owned packs
    let data = loadWordPacks(nk, userId);
    const ownedMap = new Map<string, any>();
    for (const p of data.packs) {
        ownedMap.set(p.packId, p);
    }

    // 2. Read all word packs
    const allPacks = nk.storageList(STORE_USER,WORDS_COLLECTION, 100);

    const result: any[] = [];

    for (const obj of allPacks.objects) {
        if (!obj.value || !obj.value.wordData) continue;

        const packId = obj.key;
        const totalWords = obj.value.wordData.length;

        const owned = ownedMap.get(packId);

        result.push({
            packId,
            totalWords,
            completedCount: owned ? owned.completed.length : 0,
            isBought: !!owned,
            price: PRICE,
            boughtOn: owned ? owned.boughtOn : 0
        });
    }
    return { packs: result, activePack:data.activePack};
}
function setActiveWordPack(nk: any, userId: string, packId: string) {
    const data = loadWordPacks(nk, userId);

    // Check ownership
    const ownsPack = data.packs.some(p => p.packId === packId);
    if (!ownsPack) {
        return { success: false, error: "Pack not owned" };
    }

    // Set active pack
    data.activePack = packId;

    saveWordPacks(nk, userId, data);
    return { success: true, activePack: packId };
}
function deactivateWordPack(nk: any, userId: string) {
    const data = loadWordPacks(nk, userId);

    if (!data.activePack || data.activePack === "") {
        return { success: false, error: "No active pack" };
    }

    data.activePack = "";

    saveWordPacks(nk, userId, data);
    return { success: true };
}
function getActiveWordPackWithData(nk: any, userId: string) {
    const data = loadWordPacks(nk, userId);
    if (!data.activePack || data.activePack === "") {
        return {
            hasActivePack: false,
            pack: null
        };
    }
    const pack = data.packs.find(p => p.packId === data.activePack);
    if (!pack) {
        // safety: activePack exists but pack missing
        return {
            hasActivePack: false,
            pack: null
        };
    }

    return {
        hasActivePack: true,
        pack
    };
}
function getActiveWordPack(nk: any, userId: string) {
    const data = loadWordPacks(nk, userId);

    if (!data.activePack || data.activePack === "") {
        return {
            hasActivePack: false,
            activePack: ""
        };
    }

    return {
        hasActivePack: true,
        activePack: data.activePack
    };
}



// --------------------------------------------------------
// RPC WRAPPERS (Use helper functions only)
// --------------------------------------------------------
const rpcAddWordPack = (ctx: any, logger: any, nk: any, payload: string) => {
    const { packId } = JSON.parse(payload);
    return JSON.stringify(addWordPack(nk, ctx.userId, packId));
};
const rpcUpdateWordPackProgress = (ctx: any, logger: any, nk: any, payload: string) => {
    const { packId, completed } = JSON.parse(payload);
    return JSON.stringify(updateWordPackProgress(nk, ctx.userId, packId, completed));
};
const rpcGetWordPacks = (ctx: any, logger: any, nk: any, payload: string) => {
    return JSON.stringify(getWordPacks(nk, ctx.userId));
};
const rpcRemoveWordPack = (ctx: any, logger: any, nk: any, payload: string) => {
    const { packId } = JSON.parse(payload);
    return JSON.stringify(removeWordPack(nk, ctx.userId, packId));
};
const rpcBuyPackWithCoins = (ctx: any, logger: any, nk: any, payload: string) => {
    //const { packId, price } = JSON.parse(payload);
    const data = JSON.parse(payload);
    return JSON.stringify(buyPackWithCoins(nk, ctx.userId,ctx.username, data.packId,data.price));
};
const rpcResetProgress = (ctx: any, logger: any, nk: any, payload: string) => {
    const { packId } = JSON.parse(payload);
    return JSON.stringify(resetProgress(nk, ctx.userId, packId));
};
const rpcCompleteSingleWord = (ctx: any, logger: any, nk: any, payload: string) => {
    const { packId, index } = JSON.parse(payload);
    return JSON.stringify(completeSingleWord(nk, ctx.userId, packId, index));
};
const rpcCheckIfUnlocked = (ctx: any, logger: any, nk: any, payload: string) => {
    const { packId } = JSON.parse(payload);
    return JSON.stringify(checkIfUnlocked(nk, ctx.userId, packId));
};
const rpcGetWordPackStoreData = (ctx: any, logger: any, nk: any, payload: string) => {
    return JSON.stringify(getStoreData(nk, ctx.userId));
    //return JSON.stringify({s:"hello"});

};
const rpcSetActiveWordPack = (ctx: any,logger: any,nk: any,payload: string) => {
    const { packId } = JSON.parse(payload);
    return JSON.stringify(setActiveWordPack(nk, ctx.userId, packId));
};
const rpcDeactivateWordPack = (ctx: any,logger: any,nk: any,payload: string) => {
    return JSON.stringify(deactivateWordPack(nk, ctx.userId));
};
const rpcGetActiveWordPackWithData = (ctx: any,logger: any,nk: any,payload: string) => {
    return JSON.stringify(getActiveWordPackWithData(nk, ctx.userId));
};
const rpcGetActiveWordPack = (ctx: any,logger: any,nk: any,payload: string) => {
    return JSON.stringify(getActiveWordPack(nk, ctx.userId));
};

//#endregion

// ==============================
// #region Tournament Support + RPCs (Clean)
// ==============================

/* ============================
   SUPPORTING METHODS
   ============================ */
class tournament{
    isStarted:boolean=false;
    fee:number =0;
    win:number =0;
    totalPlayers:number =0;
    joinedPlayers:number =0;
    name:string="";
    description:string="";
    id:string="";
    constructor(isStarted:boolean,fee:number,win:number,totalPlayers:number,name:string,description:string,id:string){
        this.isStarted=isStarted;
        this.fee =fee;
        this.win =win;
        this.totalPlayers =totalPlayers;
        this.name=name;
        this.description=description;
        this.id=id;
    }
}
enum tournamentSignalType{
    quit
}
class tournamentSignal{
    type:tournamentSignalType=tournamentSignalType.quit;
    payload:string="";
}
// Create tournament
const createTournament = function (ctx: any,logger: any,nk: any,payload: string): string {
    const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
    let matchId: string | null = null;
    try {
        // 1️⃣ Parse payload
        const data = JSON.parse(payload);
        // 2️⃣ Validate required fields
        if (typeof data.fee !== "number") {
            throw "Invalid or missing field: fee";
        }
        if (typeof data.win !== "number") {
            throw "Invalid or missing field: win";
        }
        if (typeof data.totalPlayers !== "number" || data.totalPlayers <= 0) {
            throw "Invalid or missing field: totalPlayers";
        }
        if (typeof data.name !== "string" || data.name.trim() === "") {
            throw "Invalid or missing field: name";
        }
        if (typeof data.description !== "string") {
            throw "Invalid or missing field: description";
        }
        // 3️⃣ Create match
        matchId = nk.matchCreate("tournament", {});
        if (!matchId) {
            throw "matchCreate failed: matchId is null";
        }
        // 4️⃣ Prepare storage object
        const storageObject = {
            collection: "tournament",
            key: matchId,
            userId: SYSTEM_USER_ID,
            value: new tournament(
                false,
                data.fee,
                data.win,
                data.totalPlayers,
                data.name,
                data.description,
                matchId
            ),
            permissionRead: 0,
            permissionWrite: 0
        };

        // 5️⃣ Write to storage
        nk.storageWrite([storageObject]);

        return JSON.stringify({ matchId });

    } catch (error) {

        // Cleanup only if match was created
        if (matchId) {
            try {
                nk.matchSignal(matchId, { action: "terminate" });
            } catch (cleanupError) {
                logger.error("Match cleanup failed: %s", cleanupError);
            }
        }

        logger.error("Create tournament failed: %s", error);
        throw error;
    }
};


const readTournaments = function (ctx: any, logger: any, nk: any, payload: string): string {
    let user_id = '00000000-0000-0000-0000-000000000000';
    try {
        return JSON.stringify({data:nk.storageList(user_id, 'tournament', JSON.parse(payload).Limit??10)});
    } catch (error) {
        throw error;
    }
}
const deleteAllTournaments = function (logger: any,nk: any) {
    const userId = "00000000-0000-0000-0000-000000000000";
    const collection = "tournament";
    const limit = 1000;
        const result = nk.storageList(userId,collection,limit);
        const deletes:any = [];
        for (const obj of result.objects) {
            logger.info("💡"+obj);
            logger.info("💡"+obj.key);
            logger.info("💡"+obj.value.key);
            deletes.push({
                collection: collection,
                key: obj.key,
                userId: userId
            });
        }
        if (deletes.length > 0 ) {
            nk.storageDelete(deletes);
        }

};

const tournamentQuit = function(ctx:any,nk: any){
    try {
        nk.storageDelete([{ collection: 'tournament', key:ctx.matchId ,userId:"00000000-0000-0000-0000-000000000000"}]);
        ctx.matchTerminate();

    } catch (error) {
            
    }
}
const matchSignal_Tournament = function (ctx: any,logger: any,nk: any,dispatcher: any,tick: number,state: any,data: string): { state: any } 
{
    try {
        const signal = JSON.parse(data);
        switch(signal){
            case tournamentSignalType.quit:
                tournamentQuit(ctx,nk);
            break;
        }
        return { state };
    }
    catch (e) {
        logger.error("matchSignal error: " + e);
        throw e;
    }
};
const matchInit_Tournament = function (ctx: any, logger: any, nk: any, params: any) {
    return { state:{}, tickRate: 1};
};
const matchJoinAttempt_Tournament = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, presence: any, metadata: any) {
    return { state, accept: true }; 
};
const matchJoin_Tournament = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, presences: any[]) {
  // Store new presences

  return { state };
};
const matchLeave_Tournament = function (ctx: any,logger: any,nk: any,dispatcher: any,tick: number,state: any,presences: any[]){
  presences.forEach(p => {
    delete state.presences[p.sessionId];
  });
  return { state };
};
const matchLoop_Tournament = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, messages: any[]) {
    const presences: nkruntime.Presence[] = [];
    for (const key in state.presences) {
        if (state.presences.hasOwnProperty(key)) {
            presences.push(state.presences[key]);
        }
    }
    state.matchId=ctx.matchId;
    if(tick>30){
        try{
            nk.storageDelete([{ collection: 'tournament', key:state.matchId ,userId:"00000000-0000-0000-0000-000000000000"}]);
        }
        catch(e){
            state.storageDeleteError = e;
        }
    }
    if(tick>32){
        try{
            dispatcher.matchTerminate(); 

            ctx.matchTerminate(); 
        }
        catch(e){
            state.matchTerminateError = e;

        }
    }
    return { state };
};
const matchTerminate_Tournament = function (ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, graceSeconds: number) {

  return { state };
};
// ==============================
// #endregion Tournament Support + RPCs
// ==============================


class cards{
    public MeaningCards : number = 0;
    public SpeechCards : number = 0;
}