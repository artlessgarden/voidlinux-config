const DEFINITIONS = [
  {name: "/s", description: "保存所有修改"},
  {name: "/changepwd", description: "修改主密码"},
];

export function createCommands({save, changePassword}) {
  let stage = "idle";
  let firstPassword = "";

  // Returning null distinguishes normal full-text search from command mode;
  // command text therefore never needs to touch the URL or repository.
  function search(input) {
    if (!String(input).startsWith("/")) return null;
    const needle = String(input).trim().toLocaleLowerCase();
    return DEFINITIONS.filter(command => command.name.startsWith(needle));
  }

  async function execute(name) {
    if (name === "/s") {
      await save();
      reset();
      return {ok: true};
    }
    if (name === "/changepwd") {
      firstPassword = "";
      stage = "new-password";
      return {ok: true};
    }
    throw new TypeError("unknown command");
  }

  async function submit(value) {
    if (stage === "new-password") {
      if (value.length < 16) return {ok: false, error: "主密码至少 16 个字符"};
      firstPassword = value;
      stage = "repeat-password";
      return {ok: true};
    }
    if (stage === "repeat-password") {
      if (value !== firstPassword) {
        reset();
        stage = "new-password";
        return {ok: false, error: "两次主密码不一致"};
      }
      stage = "confirm";
      return {ok: true};
    }
    if (stage === "confirm") {
      if (String(value).trim().toLocaleLowerCase() !== "y") {
        reset();
        return {ok: true, cancelled: true};
      }
      const password = firstPassword;
      try {
        await changePassword(password);
        return {ok: true};
      } finally {
        reset();
      }
    }
    return {ok: false, error: "没有正在执行的命令"};
  }

  function cancel() {
    reset();
  }

  function reset() {
    firstPassword = "";
    stage = "idle";
  }

  function state() {
    if (stage === "new-password") return {stage, inputType: "password", prompt: "新密码"};
    if (stage === "repeat-password") return {stage, inputType: "password", prompt: "重复新密码"};
    if (stage === "confirm") return {stage, inputType: "text", prompt: "确认修改？y/N"};
    return {stage: "idle", inputType: "search", prompt: "搜索 IP、域名、客户……"};
  }

  return {search, execute, submit, cancel, state};
}
