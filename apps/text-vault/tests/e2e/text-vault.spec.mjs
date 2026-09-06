import {test, expect} from "@playwright/test";

test.describe.configure({mode: "serial"});

const firstPassword = "daily-vault-passphrase";
const secondPassword = "new-daily-vault-passphrase";

test("setup, keyboard search, URL query, and autosave", async ({page}) => {
  const runtimeErrors = captureRuntimeErrors(page, new Set(["GET /api/vault 404"]));
  await page.goto("/");
  await page.getByLabel("新主密码", {exact: true}).fill(firstPassword);
  await page.getByLabel("重复主密码", {exact: true}).fill(firstPassword);
  await page.getByRole("button", {name: "创建保险库"}).click();

  const search = page.getByRole("searchbox", {name: "搜索条目"});
  await expect(search).toBeVisible();
  await search.press("Enter");
  const editor = page.getByRole("textbox", {name: "条目内容"});
  await editor.fill("客户B 1.2.3.4 宝塔");
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "clean", {timeout: 5000});

  await search.fill("1.2.3.4");
  await expect(page).toHaveURL(/#q=1%2E2%2E3%2E4|#q=1.2.3.4/);
  await expect(page.getByRole("option", {name: /客户B/})).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(editor).toHaveValue("客户B 1.2.3.4 宝塔");
  await expect(page.getByRole("button", {name: "固定当前搜索"})).toHaveCount(0);
  await expect(page.locator(".sync-status")).toHaveCSS("height", "6px");
  expect(runtimeErrors).toEqual([]);
});

test("commands save and change the password", async ({page}) => {
  await page.goto("/");
  await page.getByLabel("主密码").fill(firstPassword);
  await page.getByRole("button", {name: "解锁"}).click();
  const input = page.getByRole("searchbox", {name: "搜索条目"});

  await input.fill("/s");
  await expect(page.getByRole("option", {name: /保存所有修改/})).toBeVisible();
  await input.press("Enter");
  await expect(input).toHaveValue("");

  await input.fill("/changepwd");
  await input.press("Enter");
  await expect(page.getByLabel("命令输入")).toHaveAttribute("type", "password");
  await page.getByLabel("命令输入").fill(secondPassword);
  await page.getByLabel("命令输入").press("Enter");
  await page.getByLabel("命令输入").fill(secondPassword);
  await page.getByLabel("命令输入").press("Enter");
  await expect(page.getByLabel("命令输入")).toHaveAttribute("placeholder", "确认修改？y/N");
  await page.getByLabel("命令输入").fill("y");
  await page.getByLabel("命令输入").press("Enter");
  await expect(page.getByRole("searchbox", {name: "搜索条目"})).toBeVisible({timeout: 5000});
});

test("mobile switches panes and a second tab unlocks automatically", async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const first = await context.newPage();
  await first.goto("/");
  await first.getByLabel("主密码").fill(secondPassword);
  await first.getByRole("button", {name: "解锁"}).click();
  await first.getByRole("searchbox", {name: "搜索条目"}).fill("1.2.3.4");
  await first.getByRole("option", {name: /客户B/}).click();
  await expect(first.getByRole("textbox", {name: "条目内容"})).toBeVisible();
  await expect(first.getByRole("button", {name: "返回结果"})).toBeVisible();
  await first.getByRole("button", {name: "返回结果"}).click();
  await expect(first.getByRole("searchbox", {name: "搜索条目"})).toBeVisible();

  const second = await context.newPage();
  await second.goto("/#q=1.2.3.4");
  await expect(second.getByRole("option", {name: /客户B/})).toBeVisible({timeout: 5000});
  await expect(second.getByLabel("主密码")).toHaveCount(0);

  await first.getByRole("option", {name: /客户B/}).click();
  await first.getByRole("textbox", {name: "条目内容"}).fill("客户B 1.2.3.4 宝塔 已更新");
  await expect(second.getByRole("option", {name: /已更新/})).toBeVisible({timeout: 7000});
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
