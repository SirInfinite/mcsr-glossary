import test from "node:test";
import assert from "node:assert/strict";
import { createStorage, createVoterIdentity, STORAGE_KEYS } from "../../js/core/storage.js";

const validID = "10000000-0000-4000-8000-000000000001";
test("blocked storage remains non-fatal and keeps one in-memory voter identity", () => {
    const storage = createStorage(() => { throw new Error("Storage blocked"); });
    const identity = createVoterIdentity(storage, () => validID);
    assert.equal(identity(), validID);
    assert.equal(identity(), validID);
    assert.equal(storage.write("theme", "light"), false);
    assert.equal(storage.readJSON("invalid"), null);
});
test("corrupt JSON and voter identity self-heal without affecting the saved theme", () => {
    const values = new Map([[STORAGE_KEYS.voter, "bad UUID"], [STORAGE_KEYS.votes, "{bad JSON"], [STORAGE_KEYS.theme, "light"]]);
    const storage = createStorage(() => ({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }));
    assert.equal(storage.readJSON(STORAGE_KEYS.votes), null);
    assert.equal(createVoterIdentity(storage, () => validID)(), validID);
    assert.equal(values.get(STORAGE_KEYS.voter), validID);
    assert.equal(values.get(STORAGE_KEYS.theme), "light");
});
