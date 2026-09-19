// Browser smoke tests with synthetic records; no live Supabase connection.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const aliases = Object.fromEntries([...readFileSync('vite.config.ts', 'utf8').matchAll(/'([^']+@[^']+)': '([^']+)'/g)].map(([, key, value]) => [key, value]));
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {MemoryRouter, Routes, Route, Outlet} from 'react-router-dom';
    import {CounselorReports} from './src/components/CounselorReports';
    import {Messages} from './src/components/Messages';
    import {StudentList} from './src/components/StudentList';
    import {PriorityReviewPanel} from './src/components/PriorityReviewPanel';
    const view = window.testView;
    createRoot(document.getElementById('root')).render(<MemoryRouter><Routes><Route element={<Outlet context={{refreshStudents:()=>{}, students:window.fixtureStudents}} />}><Route path="*" element={view==='students'?<StudentList/>:view==='reports'?<CounselorReports/>:view==='review'?<PriorityReviewPanel studentId="student" latestCheckIn={window.now}/>:<Messages/>}/></Route></Routes></MemoryRouter>);
  ` },
  bundle: true, write: false, jsx: 'automatic', alias: aliases,
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'fixtures', setup(build) {
    build.onResolve({ filter: /lib\/(supabase|AuthContext)$/ }, (args) => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({ contents: args.path.endsWith('AuthContext') ? `export function useAuth(){return {user:{id:window.testRole==='student'?'student':'counselor'},profile:{role:window.testRole}}}` : 'export const supabase = window.mockDB;', loader: 'js' }));
  } }],
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', (error) => { errors.push(error.message); console.log('Browser error:', error.message); });
  async function mount(view, role) {
    await page.goto('about:blank');
    await page.setContent('<html><body><div id="root"></div></body></html>');
    await page.evaluate(({ view, role }) => {
      window.testView = view; window.testRole = role; window.now = new Date().toISOString();
      window.sent = []; window.failSend = false;
      window.fixtureStudents = [
        { id:'student', name:'Maria Santos', lastCheckIn:window.now, alertLevel:'high', recentConcerns:[], concernCount:0, checkIns:[], prioritySource:'Provisional · needs counselor review' },
        { id:'second', name:'Daniel Cruz', lastCheckIn:'', alertLevel:'none', recentConcerns:[], concernCount:0, checkIns:[], prioritySource:'Counselor reviewed' },
      ];
      const data = window.records = {
        profiles: [{ id: 'student', name: '<img src=x> Student', role: 'student' }],
        check_ins: [{ id: 'checkin', student_id: 'student', created_at: window.now, score: 40, max_score: 50, mood: 'happy' }],
        follow_ups: [], priority_reviews: [], conversations: [], messages: [],
        counselor_availability: [{ counselor_id: 'counselor', accepting_requests: true }],
      };
      window.mockDB = {
        rpc: async (name, args) => {
          if (name === 'messaging_contacts') return { data: role === 'student' ? [{ id: 'counselor', name: 'Counselor Test', accepting_requests: true }, ...['Maria Santos', 'Daniel Cruz', 'Ana Reyes', 'Jasmine Garcia', 'Alex Rivera'].map((name, index) => ({ id: `counselor-${index}`, name, accepting_requests: index !== 1 }))] : [{ id: 'student', name: 'Student Test', accepting_requests: true }], error: null };
          if (name === 'start_conversation') { data.conversations.push({ id: 'conversation', student_id: 'student', counselor_id: 'counselor', created_at: window.now }); return { data: 'conversation', error: null }; }
          return { data: null, error: null };
        },
        from: (table) => {
          let filters = [], start = 0, end = Infinity, single = false, insert = null;
          const q = {
            select() { return q; }, eq(key, value) { filters.push(row => row[key] === value); return q; },
            neq(key, value) { filters.push(row => row[key] !== value); return q; },
            is(key, value) { filters.push(row => row[key] === value); return q; },
            lt(key, value) { filters.push(row => row[key] < value); return q; },
            order() { return q; }, range(from, to) { start = from; end = to; return q; },
            limit(n) { end = n - 1; return q; }, maybeSingle() { single = true; return q; },
            insert(row) { insert = row; return q; }, upsert(row) { insert = row; return q; },
            then(resolve, reject) {
              if (insert) {
                if (table === 'messages' && window.failSend) { window.failSend = false; return Promise.resolve({data:null,error:{message:'offline'}}).then(resolve, reject); }
                const row = { id: 'saved', created_at: window.now, read_at: null, sender_id: role === 'student' ? 'student' : 'counselor', reviewer_id: 'counselor', ...insert };
                data[table].push(row); window.sent.push(row);
                return Promise.resolve({data:null,error:null}).then(resolve, reject);
              }
              const rows = data[table].filter(row => filters.every(fn => fn(row))).slice(start, end + 1);
              return Promise.resolve({data:single?rows[0]??null:rows,error:null}).then(resolve,reject);
            },
          }; return q;
        },
      };
    }, { view, role });
    await page.addStyleTag({ content: readFileSync('dist/assets/' + readdirSync('dist/assets').find(file => file.endsWith('.css')), 'utf8') });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
  }
  await page.setViewportSize({width:1280,height:900});
  await mount('reports', 'counselor');
  await page.getByRole('button', { name: 'Generate report' }).click();
  await page.getByRole('cell', { name: '80%' }).waitFor();
  assert.equal(await page.locator('img').count(), 0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  assert.match((await download).suggestedFilename(), /ayo-report/);
  const popupEvent = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print / Save PDF' }).click();
  const popup = await popupEvent;
  await popup.getByRole('heading', { name: 'Ayo Counselor Report' }).waitFor();
  assert.equal(await popup.locator('img').count(), 0); await popup.close();
  await page.screenshot({ path: '/tmp/ayo-reports-desktop.png', fullPage: true });
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({ path: '/tmp/ayo-reports-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByLabel('Student', { exact: true }).selectOption('student');
  await page.getByText('No notes in this period.').waitFor();
  await mount('students', 'counselor');
  await page.getByRole('button', {name:'View Maria Santos',exact:true}).waitFor();
  await page.screenshot({path:'/tmp/ayo-students-mobile.png',fullPage:true});
  await page.getByRole('button', {name:/High priority/}).click();
  await page.getByRole('button', {name:'View Daniel Cruz',exact:true}).waitFor({state:'detached'});
  await page.getByRole('button', {name:'Clear filters',exact:true}).click();
  await page.getByLabel('Search students').fill('Daniel');
  await page.getByRole('button', {name:'View Maria Santos',exact:true}).waitFor({state:'detached'});
  await page.getByLabel('Search students').fill('');
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:'/tmp/ayo-students-desktop.png',fullPage:true});
  await page.getByRole('button', {name:'View Maria Santos',exact:true}).click();
  await page.getByRole('heading', {name:'Maria Santos',exact:true}).waitFor();
  await page.getByRole('button', {name:'All students',exact:true}).click();
  await page.getByRole('button', {name:'View Daniel Cruz',exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  await mount('messages', 'student');
  await page.getByRole('button', { name: /Start conversation with Counselor Test/ }).click();
  await page.getByLabel('Message', { exact: true }).fill('I would like to talk.');
  await page.evaluate(() => { window.failSend = true; });
  await page.getByRole('button', { name: 'Send message' }).click();
  assert.equal(await page.getByLabel('Message', { exact: true }).inputValue({timeout:2000}), 'I would like to talk.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByText('I would like to talk.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.records.messages.length), 1);
  await page.screenshot({ path: '/tmp/ayo-messages-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mount('review', 'counselor');
  await page.getByLabel('Follow-up priority').selectOption('follow_up');
  await page.getByLabel('Reason and planned follow-up').fill('Discuss support options at the next check-in.');
  await page.getByRole('button', { name: 'Save review' }).click();
  await page.getByText(/Last decision: Follow-up needed/).waitFor();
  assert.equal(await page.evaluate(() => window.records.priority_reviews.length), 1);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: report generation, CSV, print, safe text rendering, individual report, messaging retry, and counselor review.');
} finally { await browser.close(); }
