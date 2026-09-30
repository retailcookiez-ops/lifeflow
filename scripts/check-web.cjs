const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

// Test-only fake cloud: these requests never reach Supabase or real user records.
const cloudOrigin = 'https://lifeflow-ci.supabase.co';
const now = Math.floor(Date.now() / 1000);
const user = {
  id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated',
  email: 'browser-check@example.com', role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {}, created_at: new Date().toISOString(),
};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = encode({ alg: 'HS256', typ: 'JWT' }) + '.' +
  encode({ sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email,
    iat: now, exp: now + 3600, iss: cloudOrigin + '/auth/v1' }) + '.ci-signature';
const session = { access_token: accessToken, refresh_token: 'ci-refresh-token', token_type: 'bearer',
  expires_in: 3600, expires_at: now + 3600, user };
const root = path.resolve('dist');
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml',
  '.ttf':'font/ttf', '.woff':'font/woff', '.woff2':'font/woff2' };
const server = http.createServer((request, response) => {
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep)) throw new Error('Invalid path');
    if (!fs.existsSync(filename) && !path.extname(filename)) filename += '.html';
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) throw new Error('Missing file');
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' });
    fs.createReadStream(filename).pipe(response);
  } catch { response.writeHead(404); response.end('Not found'); }
});
async function visible(locator) {
  await locator.waitFor({ state: 'visible', timeout: 20000 });
  const box = await locator.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, 'Element needs a nonzero layout');
  return box;
}
(async () => {
  let browser;
  fs.mkdirSync('browser-checks', { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await chromium.launch();
    for (const viewport of [{ width:1280,height:900 }, { width:390,height:844 }]) {
      const context = await browser.newContext({ viewport });
      await context.route(cloudOrigin + '/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const headers = { 'access-control-allow-origin':'*', 'access-control-allow-headers':'*' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status:204, headers });
        let data;
        if (url.pathname === '/auth/v1/token') data = session;
        else if (url.pathname === '/auth/v1/user') data = user;
        else if (url.pathname === '/auth/v1/logout') data = {};
        else if (url.pathname.startsWith('/rest/v1/')) data = [];
        else throw new Error('Unexpected mock request: ' + url.pathname);
        return route.fulfill({ status:200, headers, contentType:'application/json', body:JSON.stringify(data) });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + '/tasks');
        await visible(page.getByRole('heading', { name:'Welcome', exact:true }));
        await page.getByRole('link', { name:'Log in →', exact:true }).click();
        await page.getByLabel('Email', { exact:true }).fill(user.email);
        await page.getByLabel('Password', { exact:true }).fill('test-password-123');
        await page.getByRole('button', { name:'Log in', exact:true }).click();
        for (const title of ['TODAY’S TASK PROGRESS','TODAY’S HABIT PROGRESS','Upcoming tasks','Today’s habits']) {
          await visible(page.getByText(title, { exact:true }));
        }
        const dashboard = await visible(page.getByRole('link', { name:'Dashboard', exact:true }));
        if (viewport.width >= 900) assert.ok(dashboard.x < 232, 'Desktop sidebar must be on the left');
        else assert.ok(dashboard.y >= viewport.height - 150, 'Mobile navigation must stay near the viewport bottom');
        await page.screenshot({ path:'browser-checks/dashboard-' + viewport.width + '.png', fullPage:true });
        await page.getByRole('link', { name:'Tasks', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Tasks', exact:true }));
        await page.getByRole('link', { name:'Habits', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Habits', exact:true }));
        await page.getByRole('link', { name:'Settings', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Settings', exact:true }));
        await page.reload();
        await visible(page.getByRole('link', { name:'Dashboard', exact:true }));
        await page.getByRole('link', { name:'Open Welcome →', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Welcome', exact:true }));
        await page.getByRole('link', { name:'Continue to Dashboard →', exact:true }).click();
        await visible(page.getByText('TODAY’S TASK PROGRESS', { exact:true }));
        await page.getByRole('link', { name:'Settings', exact:true }).click();
        await page.getByRole('button', { name:'Log out', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Welcome', exact:true }));
        await page.goto(origin + '/habits');
        await visible(page.getByRole('heading', { name:'Welcome', exact:true }));
        assert.deepEqual(errors, [], 'No uncaught browser runtime errors');
        console.log('PASS: login, dashboard sections, navigation, refresh, Welcome and logout at width ' + viewport.width);
      } catch (cause) {
        await page.screenshot({ path:'browser-checks/failure-' + viewport.width + '.png', fullPage:true });
        console.error('Browser errors:', errors);
        console.error('Visible page text:', await page.locator('body').innerText());
        throw cause;
      } finally { await context.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
