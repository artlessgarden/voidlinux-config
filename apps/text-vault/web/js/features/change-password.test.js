import test from "node:test";
import assert from "node:assert/strict";
import {validatePasswordChange} from "./change-password.js";

test("password feature validates its private form values", () => {
  assert.equal(validatePasswordChange("short", "short"), "主密码至少 16 个字符");
  assert.equal(validatePasswordChange("a sufficiently long password", "different long password"), "两次主密码不一致");
  assert.equal(validatePasswordChange("a sufficiently long password", "a sufficiently long password"), "");
});
