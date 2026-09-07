import van from "../../vendor/van-1.6.1.js";
import {rewrapVault} from "../crypto.js";

const {button, dialog, div, form, input, p} = van.tags;

// Password rotation is an optional feature with its own DOM and crypto/API
// effects. The workspace receives only its open capability; passwords never
// enter shared application state.
export function createPasswordFeature({key, api, tabSession}) {
  const first = input({type: "password", minlength: 16, autocomplete: "new-password", required: true, "aria-label": "新主密码"});
  const repeated = input({type: "password", minlength: 16, autocomplete: "new-password", required: true, "aria-label": "重复新主密码"});
  const error = p({class: "dialog-error", role: "alert"});
  const submit = button({type: "submit"}, "修改密码");
  const close = button({type: "button", onclick: () => element.close()}, "取消");
  const element = dialog({class: "password-dialog", onclose: clear}, form({method: "dialog", onsubmit: rotate}),
  );
  element.firstChild.append(
    div({class: "dialog-title"}, "修改主密码"),
    first,
    repeated,
    error,
    div({class: "dialog-actions"}, close, submit),
  );

  function open() {
    if (!element.open) element.showModal();
  }

  async function rotate(event) {
    event.preventDefault();
    const validation = validatePasswordChange(first.value, repeated.value);
    if (validation) {
      error.textContent = validation;
      return;
    }
    submit.disabled = true;
    error.textContent = "正在修改…";
    try {
      const rotated = await rewrapVault(first.value, key);
      await api.rekey(rotated.header, rotated.credential);
      tabSession.offer({key, csrfToken: api.csrfToken()});
      element.close();
    } catch (cause) {
      error.textContent = cause?.message || "修改失败";
    } finally {
      submit.disabled = false;
    }
  }

  function clear() {
    first.value = "";
    repeated.value = "";
    error.textContent = "";
  }

  function destroy() {
    element.remove();
  }

  return {element, open, destroy};
}

export function validatePasswordChange(first, repeated) {
  if (first.length < 16) return "主密码至少 16 个字符";
  if (first !== repeated) return "两次主密码不一致";
  return "";
}
