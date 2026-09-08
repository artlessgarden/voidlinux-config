import {test, expect} from "@playwright/test";

test.describe.configure({mode: "serial"});

const firstPassword = "daily-vault-passphrase";

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

test("setup, add, edit outside-click save, search, and selection search", async ({page, context}) => {
  const runtimeErrors = captureRuntimeErrors(page, new Set(["GET /api/vault 404"]));
  await page.goto("/");
  await page.getByLabel("新主密码", {exact: true}).fill(firstPassword);
  await page.getByLabel("重复主密码", {exact: true}).fill(firstPassword);
  await page.getByRole("button", {name: "创建保险库"}).click();

  const search = page.getByRole("textbox", {name: "搜索"});
  const add = page.getByRole("button", {name: "新增"});
  await expect(search).toBeVisible();
  await expect(add).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(246, 244, 239)");
  await add.click();
  const editor = page.getByRole("textbox", {name: "编辑条目"});
  await editor.fill("客户A 1.2.3.4\n宝塔");
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "editing");
  await page.locator(".sync-status").click();
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "clean", {timeout: 5000});
  await expect(page.getByRole("listitem")).toContainText("客户A 1.2.3.4\n宝塔");

  await add.click();
  await editor.fill("客户B example.com @12-31");
  await page.locator(".sync-status").click();
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "clean", {timeout: 5000});

  await page.getByText("客户A 1.2.3.4", {exact: false}).click();
  await editor.fill("客户A 1.2.3.4 已修改");
  await page.locator(".sync-status").click();
  await expect(page.locator(".sync-status")).toHaveAttribute("data-state", "clean", {timeout: 5000});

  await search.fill("EXAMPLE.com");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("listitem")).toContainText("客户B example.com");
  await expect(page).toHaveURL(/#q=EXAMPLE%2Ecom|#q=EXAMPLE.com/);

  await search.fill("");
  await page.getByText("客户A 1.2.3.4 已修改").evaluate(node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  const selectionSearch = page.getByRole("button", {name: "在新标签搜索选中文字"});
  await expect(selectionSearch).toBeVisible();
  const opened = context.waitForEvent("page");
  await selectionSearch.click();
  const newTab = await opened;
  await expect(newTab).toHaveURL(/#q=/);
  await newTab.close();
  expect(runtimeErrors).toEqual([]);
});

test("agenda URL groups today and previews future date markers", async ({page}) => {
  await page.goto("/#view=agenda");
  await page.getByLabel("主密码").fill(firstPassword);
  await page.getByRole("button", {name: "解锁"}).click();

  await expect(page.locator(".agenda-view")).toBeVisible();
  await expect(page.locator(".date-heading").first()).toHaveText("2026-09-08");
  await expect(page.locator(".agenda-future")).toContainText("2026-12-31");
  await expect(page.locator(".agenda-future")).toContainText("客户B example.com @12-31");

  await page.getByRole("textbox", {name: "搜索"}).fill("客户B");
  await expect(page).toHaveURL(/#view=agenda&q=/);
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

  await first.getByText("客户B example.com", {exact: false}).click();
  await first.getByRole("textbox", {name: "编辑条目"}).fill("客户B example.com 已同步");
  await first.locator(".sync-status").click();
  await expect(second.getByRole("listitem").filter({hasText: "已同步"})).toBeVisible({timeout: 7000});
  await context.close();
});

test("mobile uses the same river and default controls", async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto("/");
  await page.getByLabel("主密码").fill(firstPassword);
  await page.getByRole("button", {name: "解锁"}).click();
  await expect(page.getByRole("list", {name: "条目河流"})).toBeVisible();
  await expect(page.getByRole("textbox", {name: "搜索"})).toBeVisible();
  await expect(page.getByRole("button", {name: "新增"})).toBeVisible();
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
