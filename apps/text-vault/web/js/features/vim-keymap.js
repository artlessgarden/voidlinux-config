// This feature translates physical keys into Text Vault actions. It knows the
// interaction vocabulary, but it never reads DOM state or performs an action.
export function actionForKey(event, mode) {
  if (event.isComposing) return null;
  if (mode === "normal") return normalAction(event);
  if ((mode === "edit" || mode === "add") && event.key === "Escape") return {type: "draft/submit"};
  if ((mode === "edit" || mode === "add") && event.key === "Enter" && !event.shiftKey) return {type: "draft/submit"};
  if (mode === "search" && event.key === "Escape") return {type: "input/close"};
  if (mode === "search" && event.key === "Enter") return {type: "input/block-newline"};
  if (mode === "command" && event.key === "Escape") return {type: "input/close"};
  if (mode === "command" && event.key === "Enter") return {type: "command/execute"};
  return null;
}

function normalAction(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") return {type: "selection/search"};
  if (["INPUT", "TEXTAREA", "SELECT"].includes(String(event.targetTag).toUpperCase())) return null;
  if (event.key === "j") return {type: "selection/move", offset: 1};
  if (event.key === "k") return {type: "selection/move", offset: -1};
  if (event.key === "i" || event.key === "Enter") return {type: "entry/edit-start"};
  if (event.key === "o") return {type: "entry/add-start"};
  if (event.key === "/") return {type: "input/search-start"};
  if (event.key === ":") return {type: "input/command-start"};
  return null;
}
