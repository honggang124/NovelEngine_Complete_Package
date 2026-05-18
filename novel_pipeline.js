#!/usr/bin/env node
/**
 * NovelEngine 全自动仿写流水线 (JS版)
 * 流程: 爬取原著 → 分析内容 → 生成叙事状态机 → 进入写作
 * 用法: node novel_pipeline.js --urls "url1" "url2" [--cookie cf值] [--analyze-only] [--write N]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { JSDOM } = require('jsdom');

const BASE_DIR = __dirname;
const ENGINE_DIR = path.join(BASE_DIR, '.novelengine');
const RAW_DIR = path.join(ENGINE_DIR, 'reference_raw');
const CHAPTERS_DIR = path.join(ENGINE_DIR, 'chapters');

const BASE_URL = 'http://www.daishuzw.com';
let CF_COOKIE = '';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'Upgrade-Insecure-Requests': '1',
};

function loadCookie() {
  const cookieFile = path.join(ENGINE_DIR, 'cf_cookie.txt');
  if (fs.existsSync(cookieFile)) {
    CF_COOKIE = fs.readFileSync(cookieFile, 'utf-8').trim();
    return CF_COOKIE.length > 0;
  }
  return false;
}

function saveCookie(value) {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  fs.writeFileSync(path.join(ENGINE_DIR, 'cf_cookie.txt'), value, 'utf-8');
}

function decodeBuffer(buf) {
  const encodings = ['gb18030', 'gbk', 'gb2312', 'utf-8', 'latin1'];
  for (const enc of encodings) {
    try {
      const iconv = require('iconv-lite');
      if (iconv.encodingExists(enc)) return iconv.decode(buf, enc);
    } catch {}
    try { return buf.toString(enc); } catch {}
  }
  return buf.toString('utf-8');
}

function extractChapterNum(name) {
  const m = name.match(/第(\d+)章/);
  return m ? parseInt(m[1]) : 999999;
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { ...HEADERS, Cookie: `cf_clearance=${CF_COOKIE}` } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(decodeBuffer(Buffer.concat(chunks))));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function getChapterLinks(bookId) {
  const url = `${BASE_URL}/daishu/${bookId}.html`;
  const html = await fetchPage(url);
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const h1 = doc.querySelector('h1');
  const h2 = doc.querySelector('h2');
  const bookTitle = (h1 || h2)?.textContent?.trim() || `book_${bookId}`;

  const allLinks = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^\/daishuz\/\d+\/\d+\.html$/.test(href)) {
      const name = a.textContent?.trim();
      if (name) allLinks.push([BASE_URL + href, name]);
    }
  }

  const seen = new Set();
  const unique = [];
  for (const [u, n] of allLinks) {
    if (!seen.has(u)) { seen.add(u); unique.push([u, n]); }
  }

  const bodyLinks = unique.filter(([u, n]) => extractChapterNum(n) < 999999);
  bodyLinks.sort((a, b) => extractChapterNum(a[1]) - extractChapterNum(b[1]));
  dom.window.close();
  return { bookTitle, chapters: bodyLinks };
}

const NOISE_KW = ['袋鼠小说', 'daishuzw', '首发域名', '请记住', '手机版', '本章未完', '点击下一页'];

async function fetchChapter(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const html = await fetchPage(url);
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      let contentDiv = doc.querySelector('div#booktxt') || doc.querySelector('div#content');
      if (!contentDiv) {
        const divs = [...doc.querySelectorAll('div')].filter(d => (d.textContent?.trim().length || 0) > 500);
        if (divs.length) contentDiv = divs.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0))[0];
      }
      if (contentDiv) {
        const lines = contentDiv.textContent.split('\n').map(l => l.trim()).filter(l => l.length >= 2 && !NOISE_KW.some(k => l.includes(k)));
        dom.window.close();
        return lines.join('\n');
      }
      dom.window.close();
    } catch {}
    if (i < retries - 1) await sleep(2000);
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function crawlBook(bookId, label) {
  console.log(`  [${label}] Fetching chapter list...`);
  const { bookTitle, chapters } = await getChapterLinks(bookId);
  console.log(`  [${label}] ${bookTitle} - ${chapters.length} chapters`);

  const bookDir = path.join(RAW_DIR, `book_${bookId}`);
  fs.mkdirSync(bookDir, { recursive: true });

  const progressFile = path.join(bookDir, '_progress.json');
  const existing = new Set();
  if (fs.existsSync(progressFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
      for (const u of data.done || []) existing.add(u);
    } catch {}
  }

  const todo = chapters.filter(([url]) => !existing.has(url));
  console.log(`  [${label}] Done: ${existing.size}, Todo: ${todo.length}`);
  if (!todo.length) { console.log(`  [${label}] Already complete!`); return bookDir; }

  let doneCount = existing.size, failCount = 0;
  const t0 = Date.now();

  for (let idx = 0; idx < todo.length; idx++) {
    const [url, name] = todo[idx];
    const chNum = extractChapterNum(name);
    const content = await fetchChapter(url);
    if (content && content.length > 100) {
      const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
      const fp = path.join(bookDir, `ch${String(chNum).padStart(4,'0')}_${safeName}.txt`);
      fs.writeFileSync(fp, `# ${name}\n\n${content}`, 'utf-8');
      existing.add(url);
      doneCount++;
      if (doneCount % 50 === 0) fs.writeFileSync(progressFile, JSON.stringify({ done: [...existing] }, null, 2), 'utf-8');
    } else {
      failCount++;
    }
    if ((idx + 1) % 50 === 0 || idx + 1 === todo.length) {
      const pct = ((idx + 1) / todo.length * 100).toFixed(1);
      const elapsed = (Date.now() - t0) / 1000;
      const speed = (idx + 1) / (elapsed || 1);
      const eta = (todo.length - idx - 1) / (speed || 1);
      console.log(`  [${label}] ${idx+1}/${todo.length} (${pct}%) OK:${doneCount} F:${failCount} ${speed.toFixed(1)}ch/s ETA:${eta.toFixed(0)}s`);
    }
    await sleep(200);
  }
  fs.writeFileSync(progressFile, JSON.stringify({ done: [...existing] }, null, 2), 'utf-8');
  console.log(`  [${label}] DONE! OK:${doneCount} FAIL:${failCount}`);
  return bookDir;
}

function analyzeBook(bookDir, label) {
  const files = fs.readdirSync(bookDir).filter(f => f.startsWith('ch') && f.endsWith('.txt')).sort();
  if (!files.length) { console.log(`  [${label}] No chapter files!`); return {}; }

  let totalChars = 0, totalDialogues = 0, totalParas = 0;
  const chapterLengths = [], dialogueRatios = [], chapterTitles = [];

  for (const fp of files) {
    const content = fs.readFileSync(path.join(bookDir, fp), 'utf-8');
    const lines = content.split('\n');
    const bodyLines = [];
    let title = '';
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith('# ')) { title = l.slice(2); continue; }
      bodyLines.push(l);
    }
    if (!bodyLines.length) continue;
    const chChars = bodyLines.reduce((s, l) => s + l.length, 0);
    const chDlg = bodyLines.filter(l => /[\u201c\u201d\u300c\u300d""]/.test(l)).length;
    totalChars += chChars;
    totalDialogues += chDlg;
    totalParas += bodyLines.length;
    chapterLengths.push(chChars);
    dialogueRatios.push(bodyLines.length ? chDlg / bodyLines.length : 0);
    chapterTitles.push(title);
  }

  const avgChLen = totalChars / files.length;
  const avgDlg = dialogueRatios.reduce((a, b) => a + b, 0) / dialogueRatios.length;
  console.log(`  [${label}] ${files.length}ch | ${totalChars}chars | avg ${avgChLen.toFixed(0)}ch/ch | dialog ${(avgDlg * 100).toFixed(1)}%`);
  return { label, total_chapters: files.length, total_chars: totalChars, avg_chapter_length: Math.round(avgChLen), avg_dialogue_ratio: Math.round(avgDlg * 1000) / 1000 };
}

function generateStateMachine(analyses) {
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  fs.mkdirSync(CHAPTERS_DIR, { recursive: true });
  const valid = analyses.filter(a => a && a.avg_chapter_length);
  const avgChLen = valid.length ? valid.reduce((s, a) => s + a.avg_chapter_length, 0) / valid.length : 3000;
  const avgDlg = valid.length ? valid.reduce((s, a) => s + a.avg_dialogue_ratio, 0) / valid.length : 0.4;
  const config = {
    totalChapters: 235,
    chaptersPerVolume: [50, 70, 115],
    volumeNames: ['断亲逆袭', '多领域开花', '登顶与真爱'],
    wordsPerChapter: Math.round(avgChLen),
    beatsPerChapter: 4,
    skillUnlockRate: 10,
    favorabilityGainPerChapter: 10,
    bigFaceSlapRate: 5,
    smallFaceSlapPerChapter: 1,
    avgDialogueRatio: Math.round(avgDlg * 1000) / 1000,
  };
  fs.writeFileSync(path.join(ENGINE_DIR, 'novel_config.json'), JSON.stringify(config, null, 2), 'utf-8');
  console.log(`  Config: ${config.wordsPerChapter}字/章, 对话比${(config.avgDialogueRatio * 100).toFixed(1)}%`);
  return config;
}

async function runPipeline(urls, cookie, analyzeOnly) {
  console.log('\n' + '='.repeat(60));
  console.log('  NovelEngine 仿写流水线 (JS版)');
  console.log('  爬取 → 分析 → 生成状态机 → 写作');
  console.log('='.repeat(60));

  if (cookie) saveCookie(cookie);
  else if (!loadCookie()) {
    console.log('\nERROR: 需要 Cloudflare cookie!');
    console.log('用法: node novel_pipeline.js --cookie "cf值" --urls "url1" "url2"');
    return;
  }

  console.log('\n[STEP 1/3] 爬取原著全文');
  const bookDirs = [];
  for (let i = 0; i < urls.length; i++) {
    const m = urls[i].match(/\/daishu\/(\d+)\.html/);
    if (!m) continue;
    const bookId = parseInt(m[1]);
    const label = `Book${i + 1}`;
    const bookDir = await crawlBook(bookId, label);
    bookDirs.push({ bookDir, label, bookId });
  }

  console.log('\n[STEP 2/3] 分析原著内容');
  const analyses = [];
  for (const { bookDir, label } of bookDirs) {
    analyses.push(analyzeBook(bookDir, label));
  }
  fs.writeFileSync(path.join(ENGINE_DIR, 'analysis_result.json'), JSON.stringify({ basic: analyses }, null, 2), 'utf-8');

  console.log('\n[STEP 3/3] 生成叙事状态机');
  generateStateMachine(analyses);

  console.log('\n' + '='.repeat(60));
  console.log('  流水线完成!');
  console.log('='.repeat(60));
  for (const { bookDir, label } of bookDirs) {
    const count = fs.readdirSync(bookDir).filter(f => f.endsWith('.txt')).length;
    console.log(`  ${label}: ${count} chapters -> ${bookDir}`);
  }
  console.log(`\n  配置: ${path.join(ENGINE_DIR, 'novel_config.json')}`);
  console.log(`  分析: ${path.join(ENGINE_DIR, 'analysis_result.json')}`);

  if (analyzeOnly) { console.log('\n  (--analyze-only 模式，不进入写作)'); return; }
  console.log('\n  状态机已就绪，可进入写作!');
  console.log('  执行: node novel_pipeline.js --write 1');
}

const args = process.argv.slice(2);
let urls = [], cookie = null, analyzeOnly = false, writeCh = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--urls') { while (args[++i] && !args[i].startsWith('--')) urls.push(args[i]); i--; }
  else if (args[i] === '--cookie') cookie = args[++i];
  else if (args[i] === '--analyze-only') analyzeOnly = true;
  else if (args[i] === '--write') writeCh = parseInt(args[++i]);
}

if (!urls.length) {
  console.log('用法: node novel_pipeline.js --urls "url1" "url2" [--cookie "cf值"] [--analyze-only] [--write N]');
  process.exit(1);
}

runPipeline(urls, cookie, analyzeOnly).catch(err => { console.error(err); process.exit(1); });
