import {test, expect} from "@playwright/test";

test.describe.configure({mode: "serial"});

const firstPassword = "daily-vault-passphrase";
const secondPassword = "new-daily-vault-passphrase";

test("an insecure context shows guidance instead of crashing", async ({page}) => {
  const runtimeErrors = captureRuntimeErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "isSecureContext", {configurable: true, value: false});
  });
  await page.goto("/");
  await expect(page.getByRole("heading", {name: "需要安全连接"})).toBeVisible();
  await expect(page.getByText("Text Vault 需要 HTTPS 或 localhost 才能使用浏览器加密。")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("setup, add, edit, and live URL search use vim modes", async ({page}) => {
  const runtimeErrors = captureRuntimeErrors(page, new Set(["GET /api/vault 404"]));
  await page.goto("/");
  await page.getByLabel("新主密码", {exact: true}).fill(firstPassword);
  await page.getByLabel("重复主密码", {exact: true}).fill(firstPassword);
  await page.getByRole("button", {name: "创建保险库"}).click();

  const bottom = page.getByRole("textbox", {name: "输入"});
  await expect(bottom).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(246, 244, 239)");
  await expect(bottom).toHaveCSS("background-color", "rgb(238, 235, 228)");
  await page.keyboard.press("o");
  await bottom.fill("客户A 1.2.3.4");
  await bottom.press("Shift+Enter");
  await bottom.pressSequentially("宝塔");
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "editing");
  await bottom.press("Enter");
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "clean", {timeout: 5000});
  await expect(page.getByRole("listitem")).toContainText("客户A 1.2.3.4\n宝塔");

  await page.keyboard.press("o");
  await bottom.fill("客户B example.com");
  await bottom.press("Escape");
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "clean", {timeout: 5000});

  await page.keyboard.press("k");
  await page.keyboard.press("i");
  const editor = page.getByRole("textbox", {name: "编辑条目"});
  await editor.fill("客户A 1.2.3.4 已修改");
  await bottom.click();
  await expect(editor).toBeFocused();
  await page.locator(".river").click({position: {x: 3, y: 3}});
  await expect(editor).toBeVisible();
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "editing");
  await editor.press("Enter");
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "clean", {timeout: 5000});

  await page.keyboard.press("/");
  await bottom.fill("/EXAMPLE.com");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("listitem")).toContainText("客户B example.com");
  await expect(page).toHaveURL(/#q=EXAMPLE%2Ecom|#q=EXAMPLE.com/);
  await bottom.press("Escape");
  await expect(bottom).toHaveValue("/EXAMPLE.com");
  await bottom.blur();
  await bottom.click();
  await expect(page.locator(".river-shell")).toHaveAttribute("data-mode", "search");
  expect(runtimeErrors).toEqual([]);
});

test("a second tab unlocks and receives incremental changes", async ({browser}) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  await first.goto("/");
  await first.getByLabel("主密码").fill(firstPassword);
  await first.getByRole("button", {name: "解锁"}).click();
  await expect(first.getByRole("list", {name: "条目河流"})).toBeVisible();

  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("list", {name: "条目河流"})).toBeVisible();
  await expect(second.getByLabel("主密码", {exact: true})).toHaveCount(0);
  await expect(second.getByRole("listitem")).toHaveCount(2);

  await first.keyboard.press("j");
  await first.keyboard.press("i");
  await first.getByRole("textbox", {name: "编辑条目"}).fill("客户B example.com 已同步");
  await first.getByRole("textbox", {name: "编辑条目"}).press("Escape");
  await expect(second.getByRole("listitem").filter({hasText: "已同步"})).toBeVisible({timeout: 7000});

  await first.keyboard.press(":");
  await first.getByRole("textbox", {name: "输入"}).fill(":changepwd");
  await first.getByRole("textbox", {name: "输入"}).press("Enter");
  await expect(first.getByRole("dialog")).toBeVisible();
  await first.getByLabel("新主密码", {exact: true}).fill(secondPassword);
  await first.getByLabel("重复新主密码", {exact: true}).fill(secondPassword);
  await first.getByRole("button", {name: "修改密码"}).click();
  await expect(first.getByRole("dialog")).not.toBeVisible({timeout: 5000});
  await context.close();
});

test("mobile uses the same river after unlocking with the changed password", async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto("/");
  await page.getByLabel("主密码").fill(secondPassword);
  await page.getByRole("button", {name: "解锁"}).click();
  await expect(page.getByRole("list", {name: "条目河流"})).toBeVisible();
  await expect(page.getByRole("textbox", {name: "输入"})).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await context.close();
});

function captureRuntimeErrors(page, allowedResponses = new Set()) {
  const errors = [];
  page.on("console", message => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.status() < 400) return;
    const request = response.request();
    const url = new URL(response.url());
    const summary = `${request.method()} ${url.pathname} ${response.status()}`;
    if (!allowedResponses.has(summary)) errors.push(summary);
  });
  return errors;
}
