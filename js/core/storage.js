export const STORAGE_KEYS = Object.freeze({ theme: "theme", voter: "mcsr_browser_id", votes: "mcsr_vote_snapshot" });
export const VOTER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// A disabled/full storage area is an optional persistence failure, never an app failure.
export function createStorage(getStorage = () => globalThis.localStorage) {
    return {
        read(key) { try { return getStorage().getItem(key); } catch { return null; } },
        write(key, value) { try { getStorage().setItem(key, value); return true; } catch { return false; } },
        remove(key) { try { getStorage().removeItem(key); } catch { /* Storage may be blocked. */ } },
        readJSON(key) { try { return JSON.parse(getStorage().getItem(key)); } catch { return null; } },
        writeJSON(key, value) { try { getStorage().setItem(key, JSON.stringify(value)); } catch { /* Persistence is optional. */ } }
    };
}

export function createVoterIdentity(storage, createID = () => crypto.randomUUID()) {
    let current;
    return () => {
        if (current) return current;
        const saved = storage.read(STORAGE_KEYS.voter);
        current = VOTER_ID_PATTERN.test(saved || "") ? saved.toLowerCase() : createID();
        if (!VOTER_ID_PATTERN.test(current)) throw new Error("A valid random browser UUID is required.");
        storage.write(STORAGE_KEYS.voter, current);
        return current;
    };
}
