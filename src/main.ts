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