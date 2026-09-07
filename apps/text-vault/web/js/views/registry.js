// The registry is the small seam between view data and trusted renderer code.
// It owns one mounted renderer and its cleanup, not application state or DOM.
export function createViewRegistry(renderers) {
  let cleanup = null;

  function mount(spec, context) {
    const renderer = renderers?.[spec?.type];
    if (typeof renderer !== "function") throw new TypeError(`unknown view renderer: ${spec?.type}`);
    cleanup?.();
    cleanup = renderer(context);
    if (typeof cleanup !== "function") cleanup = null;
  }

  function destroy() {
    cleanup?.();
    cleanup = null;
  }

  return {mount, destroy};
}
