import { strict as assert } from "assert";
import fs from "node:fs";
import calculateDataRoot from "../index.mjs";

const blob = fs.readFileSync(
  "test/JKEh_VBlcDtYm04PptoN_DSkdAdRLrbvvJBvHwAglnY"
);

// https://arweave.net/tx/JKEh_VBlcDtYm04PptoN_DSkdAdRLrbvvJBvHwAglnY
assert.deepEqual(
  calculateDataRoot(blob),
  "6pJfsmP7YBOD2wvwU8AMTZh-1s5Es2fdhcpzybc6SLI"
);
