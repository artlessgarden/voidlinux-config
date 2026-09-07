export function createModes(initialQuery = "") {
  let current = normal(initialQuery);

  function state() {
    return {...current};
  }

  function enterEdit(id, text) {
    current = {name: "edit", id, original: text, draft: text, query: current.query};
  }

  function enterAdd() {
    current = {name: "add", id: "", original: "", draft: "", query: current.query};
  }

  function enterSearch(query = current.query) {
    current = {name: "search", id: "", original: "", draft: `/${query}`, query};
  }

  function enterCommand() {
    current = {name: "command", id: "", original: "", draft: ":", query: current.query};
  }

  function setDraft(draft) {
    current = {...current, draft: String(draft)};
    if (current.name === "search") current.query = withoutMarker(current.draft, "/");
  }

  function escape() {
    let action = {type: "cancel"};
    if (current.name === "edit") {
      action = current.draft === current.original ? {type: "none"} : {type: "edit", id: current.id, text: current.draft};
    } else if (current.name === "add") {
      action = current.draft.trim() ? {type: "add", text: current.draft} : {type: "cancel"};
    } else if (current.name === "search") {
      action = {type: "search", query: withoutMarker(current.draft, "/")};
    } else if (current.name === "normal") {
      action = {type: "none"};
    }
    const query = action.type === "search" ? action.query : current.query;
    current = normal(query);
    return action;
  }

  function executeCommand(value = current.draft) {
    if (current.name !== "command") return {type: "error", message: "未知命令"};
    if (withoutMarker(value.trim(), ":") === "changepwd") {
      current = normal(current.query);
      return {type: "change-password"};
    }
    return {type: "error", message: "未知命令"};
  }

  return {state, enterEdit, enterAdd, enterSearch, enterCommand, setDraft, escape, executeCommand};
}

function normal(query) {
  return {name: "normal", id: "", original: "", draft: "", query};
}

function withoutMarker(value, marker) {
  return value.startsWith(marker) ? value.slice(1) : value;
}
