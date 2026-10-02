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
  locator = locator.filter({ visible: true });
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
    for (const scenario of ['returning', 'new', 'skip']) {
      const context = await browser.newContext({ viewport });
      let profile = { id:user.id,display_name:'',timezone:'Europe/Zurich',created_at:new Date().toISOString(),
        goals:[],modules:['tasks','habits'],wake_time:null,sleep_time:null,week_start:1,
        onboarding_completed_at:scenario==='returning'?new Date().toISOString():null,updated_at:new Date().toISOString() };
      let failSave = false;
      let failRead = false;
      let deletes = 0;
      let coachCalls = []; let failCoach = false; let taskWrites = 0;
      await context.route(cloudOrigin + '/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const headers = { 'access-control-allow-origin':'*', 'access-control-allow-headers':'*' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status:204, headers });
        let data;
        if (url.pathname === '/auth/v1/token') data = session;
        else if (url.pathname === '/auth/v1/user') data = user;
        else if (url.pathname === '/auth/v1/logout') data = {};
        else if (url.pathname === '/rest/v1/profiles') {
          if (request.method() === 'PATCH') {
            if (failSave) return route.fulfill({ status:500, headers, contentType:'application/json', body:JSON.stringify({message:'Save test failed'}) });
            profile = {...profile,...request.postDataJSON()};
          } else if (failRead) return route.fulfill({ status:400, headers, contentType:'application/json', body:JSON.stringify({code:'42703',message:'column profiles.goals does not exist'}) });
          data = profile;
        }
        else if (url.pathname === '/functions/v1/delete-account') { deletes++; data = {deleted:true}; }
        else if (url.pathname === '/functions/v1/ai-coach') {
          const input = request.postDataJSON(); coachCalls.push(input);
          assert.ok(request.headers().authorization?.startsWith('Bearer '));
          if (failCoach) return route.fulfill({status:502,headers,contentType:'application/json',body:JSON.stringify({code:'provider_unavailable'})});
          data = {answer:{summary:'Consider one focused block.',suggestions:[{title:'Start small',reason:'Make the first step manageable.',steps:['You could choose one task.']}]},
            usage:{allowed:true,remaining:19,limit:20,resetAt:new Date(Date.now()+86400000).toISOString(),retryAfterSeconds:10},
            contextIncluded:input.includeContext,contextSummary:{tasks:0,habits:0,truncated:false},generatedAt:new Date().toISOString()};
        }
        else if (url.pathname.startsWith('/rest/v1/')) {
          if (request.method() !== 'GET') taskWrites++;
          data = [];
        }
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
        if (scenario !== 'returning') {
          await visible(page.getByRole('heading', {name:'Make LifeFlow yours',exact:true}));
          // Direct private routes cannot bypass incomplete onboarding.
          await page.goto(origin + '/tasks');
          await visible(page.getByRole('heading', {name:'Make LifeFlow yours',exact:true}));
          if (scenario === 'skip') {
            await page.getByRole('button', {name:'Skip setup',exact:true}).click();
          } else {
            await page.getByRole('textbox', {name:'Display name',exact:true}).fill('Alex');
            await page.getByRole('checkbox', {name:'Consistency',exact:true}).click();
            await page.getByRole('button', {name:'Continue',exact:true}).click();
            await page.getByRole('textbox', {name:'Wake time (optional)',exact:true}).fill('25:00');
            await page.getByRole('button', {name:'Continue',exact:true}).click();
            await visible(page.getByText(/Wake time must use/));
            await page.getByRole('textbox', {name:'Wake time (optional)',exact:true}).fill('07:30');
            await page.getByRole('textbox', {name:'Sleep time (optional)',exact:true}).fill('23:00');
            await page.getByRole('button', {name:'Continue',exact:true}).click();
            await visible(page.getByRole('heading', {name:'Choose your focus',exact:true}));
            await page.screenshot({path:'browser-checks/onboarding-'+viewport.width+'.png',fullPage:true});
            failSave = true;
            await page.getByRole('button', {name:'Finish setup',exact:true}).click();
            await visible(page.getByText('Save test failed', {exact:true}));
            assert.equal(profile.onboarding_completed_at, null);
            failSave = false;
            await page.getByRole('button', {name:'Finish setup',exact:true}).click();
          }
        }
        for (const title of ['Today’s task progress','Today’s habit progress','Upcoming tasks','Today’s habits']) {
          await visible(page.getByText(title, { exact:true }));
        }
        assert.ok(profile.onboarding_completed_at);
        if (scenario === 'new') await visible(page.getByText(/Good (morning|afternoon|evening), Alex/));
        const dashboard = await visible(page.getByRole('link', { name:'Dashboard', exact:true }));
        if (viewport.width >= 900) assert.ok(dashboard.x < 232, 'Desktop sidebar must be on the left');
        else assert.ok(dashboard.y >= viewport.height - 150, 'Mobile navigation must stay near the viewport bottom');
        await page.screenshot({ path:'browser-checks/dashboard-' + scenario + '-' + viewport.width + '.png', fullPage:true });
        // Both palettes must apply immediately and persist across refresh/direct routes.
        for (const theme of ['Light','Dark']) {
          await page.getByRole('radio',{name:theme+' theme',exact:true}).first().click();
          await page.waitForFunction(expected=>localStorage.getItem('lifeflow:theme')===expected,theme.toLowerCase());
          const background=await page.getByRole('heading',{name:'Let’s make progress today.',exact:true}).evaluate(el=>getComputedStyle(el).color);
          assert.equal(background,theme==='Light'?'rgb(18, 33, 62)':'rgb(244, 247, 255)');
          await page.screenshot({path:'browser-checks/design-'+theme.toLowerCase()+'-'+scenario+'-'+viewport.width+'.png',fullPage:true});
          if (viewport.width < 700) { await page.getByText('Today’s habits',{exact:true}).scrollIntoViewIfNeeded(); await page.screenshot({path:'browser-checks/design-bottom-'+theme.toLowerCase()+'-'+scenario+'-'+viewport.width+'.png',fullPage:true}); await page.getByRole('heading',{name:'Let’s make progress today.',exact:true}).scrollIntoViewIfNeeded(); }
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
        }
        await page.getByRole('radio',{name:'Light theme',exact:true}).first().click();
        await page.waitForFunction(()=>localStorage.getItem('lifeflow:theme')==='light');
        await page.reload();
        await visible(page.getByText('Today’s task progress',{exact:true}));
        assert.equal(await page.getByRole('radio',{name:'Light theme',exact:true}).first().isChecked(),true);
        await page.getByRole('textbox',{name:'Search tasks and habits',exact:true}).fill('nonexistent');
        await visible(page.getByText('No matching tasks or habits.',{exact:true}));
        await page.getByRole('textbox',{name:'Search tasks and habits',exact:true}).fill('');

        await page.getByRole('link', { name:'Tasks', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Tasks', exact:true }));
        await page.getByRole('link', { name:'Habits', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Habits', exact:true }));
        await page.getByRole('link', { name:'AI Coach', exact:true }).click();
        await visible(page.getByRole('heading', {name:'AI Coach',exact:true}));
        assert.equal(await page.getByRole('switch',{name:'Share today’s context'}).isChecked(),false);
        await page.getByRole('button',{name:'Plan my day',exact:true}).click();
        assert.equal(coachCalls.length,0, 'Quick prompts must not send automatically');
        await page.getByRole('button',{name:'Get suggestions',exact:true}).click();
        await visible(page.getByText('AI-generated suggestions · Nothing has been changed',{exact:true}));
        assert.equal(coachCalls[0].includeContext,false);
        await page.getByRole('link',{name:'Tasks',exact:true}).click();
        await page.getByRole('link',{name:'AI Coach',exact:true}).click();
        await visible(page.getByText('Consider one focused block.',{exact:true}));
        await page.screenshot({path:'browser-checks/coach-'+scenario+'-'+viewport.width+'.png',fullPage:true});
        await page.getByRole('button',{name:'Clear history',exact:true}).click();
        await visible(page.getByText('What would make today easier?',{exact:true}));
        await page.getByRole('switch',{name:'Share today’s context'}).click();
        await page.getByRole('textbox',{name:'Ask AI Coach',exact:true}).fill('Suggest a routine');
        failCoach=true;
        await page.getByRole('button',{name:'Get suggestions',exact:true}).click();
        await visible(page.getByText('AI Coach is temporarily unavailable. Please try again later.',{exact:true}));
        assert.equal(await page.getByRole('textbox',{name:'Ask AI Coach',exact:true}).inputValue(),'Suggest a routine');
        failCoach=false; await page.getByRole('button',{name:'Retry request',exact:true}).click();
        await visible(page.getByText('Consider one focused block.',{exact:true}));
        assert.equal(coachCalls.at(-1).includeContext,true); assert.equal(taskWrites,0,'Coach must never mutate tasks or habits');
        await page.goto(origin+'/coach');
        await visible(page.getByText('What would make today easier?',{exact:true}));
        assert.equal(await page.getByRole('switch',{name:'Share today’s context'}).isChecked(),false);
        await page.getByRole('link', { name:'Settings', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Settings', exact:true }));
        await page.reload();
        await visible(page.getByRole('link', { name:'Dashboard', exact:true }));
        await page.getByRole('link', { name:'Open Welcome →', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Welcome', exact:true }));
        await page.getByRole('link', { name:'Continue to Dashboard →', exact:true }).click();
        await visible(page.getByText('Today’s task progress', { exact:true }));
        await page.getByRole('link', { name:'Settings', exact:true }).click();
        await page.getByRole('textbox',{name:'Display name',exact:true}).fill('Taylor');
        await page.getByRole('checkbox',{name:'Tasks summary',exact:true}).click();
        await page.getByRole('checkbox',{name:'Sunday',exact:true}).click();
        await page.getByRole('button',{name:'Save profile',exact:true}).click();
        await visible(page.getByText('Profile saved. Your dashboard is up to date.',{exact:true}));
        assert.equal(profile.display_name,'Taylor'); assert.equal(profile.week_start,0);
        await page.getByRole('link',{name:'Dashboard',exact:true}).click();
        await visible(page.getByText(/Good (morning|afternoon|evening), Taylor/));
        assert.equal(await page.getByText('Today’s task progress',{exact:true}).filter({visible:true}).count(),0);
        await visible(page.getByText('Today’s habit progress',{exact:true}));
        await page.getByRole('link',{name:'Tasks',exact:true}).click();
        await visible(page.getByRole('heading',{name:'Tasks',exact:true}));
        await page.goto(origin+'/settings');
        await visible(page.getByRole('heading',{name:'Settings',exact:true}));
        assert.equal(await page.getByRole('textbox',{name:'Display name',exact:true}).inputValue(),'Taylor');
        // Failed saves preserve the form and do not invent a cloud change.
        await page.getByRole('textbox',{name:'Display name',exact:true}).fill('Unsaved draft'); failSave=true;
        await page.getByRole('button',{name:'Save profile',exact:true}).click();
        await visible(page.getByText('Save test failed',{exact:true})); assert.equal(profile.display_name,'Taylor');
        assert.equal(await page.getByRole('textbox',{name:'Display name',exact:true}).inputValue(),'Unsaved draft'); failSave=false;
        await page.getByRole('button',{name:'Discard edits',exact:true}).click();
        assert.equal(await page.getByRole('textbox',{name:'Display name',exact:true}).inputValue(),'Taylor');
        await page.getByRole('button',{name:'Delete account…',exact:true}).click();
        await visible(page.getByRole('heading',{name:'Permanently delete your account?',exact:true}));
        assert.equal(await page.getByRole('button',{name:'Permanently delete account',exact:true}).isDisabled(),true);
        await page.getByRole('button',{name:'Cancel deletion',exact:true}).click(); assert.equal(deletes,0);
        // Missing migration offers an actionable retry, without rendering empty app data.
        failRead=true; await page.reload();
        await visible(page.getByText(/Profile setup is missing/));
        failRead=false; await page.getByRole('button',{name:'Retry',exact:true}).click();
        await visible(page.getByRole('heading',{name:'Settings',exact:true}));
        await page.getByRole('button', { name:'Log out', exact:true }).click();
        await visible(page.getByRole('heading', { name:'Welcome', exact:true }));
        await page.goto(origin + '/coach');
        await visible(page.getByRole('heading', { name:'Welcome', exact:true }));
        assert.deepEqual(errors, [], 'No uncaught browser runtime errors');
        console.log('PASS: '+scenario+' onboarding/profile, validation, saved preferences, protected routes, navigation, refresh and logout at width ' + viewport.width);
      } catch (cause) {
        await page.screenshot({ path:'browser-checks/failure-' + scenario + '-' + viewport.width + '.png', fullPage:true });
        console.error('Browser errors:', errors);
        console.error('Visible page text:', await page.locator('body').innerText());
        throw cause;
      } finally { await context.close(); }
    }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
