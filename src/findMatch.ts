/**
 * Finds a custom match in the Nakama server based on a room name.
 *
 * Expects a payload in the following format:
 * {
 *   "roomName": string   // The name of the room to search for.
 * }
 *
 * Returns the match ID if found, otherwise returns an error message.
 */
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