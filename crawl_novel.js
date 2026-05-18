#!/usr/bin/env node
/**
 * 袋鼠小说全本爬虫 (JS版)
 * 用法: node crawl_novel.js [--cookie cf_clearance值] [--book 108837,108811]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { JSDOM } = require('jsdom');

const BASE_URL = 'http://www.daishuzw.com';
const OUTPUT_DIR = path.join(__dirname, '.novelengine', 'reference_raw');

let CF_COOKIE = '';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'Upgrade-Insecure-Requests': '1',
};

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { ...HEADERS, Cookie: `cf_clearance=${CF_COOKIE}` } }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        const html = decodeBuffer(raw);
        resolve(html);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function decodeBuffer(buf) {
  const encodings = ['gb18030', 'gbk', 'gb2312', 'utf-8', 'latin1'];
  for (const enc of encodings) {
    try {
      const iconv = require('iconv-lite');
      if (iconv.encodingExists(enc)) {
        return iconv.decode(buf, enc);
      }
    } catch {}
    try {
      return buf.toString(enc);
    } catch {}
  }
  return buf.toString('utf-8');
}

function extractChapterNum(name) {
  const m = name.match(/第(\d+)章/);
  return m ? parseInt(m[1]) : 999999;
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
      const fullUrl = BASE_URL + href;
      const chapterName = a.textContent?.trim();
      if (chapterName) allLinks.push([fullUrl, chapterName]);
    }
  }

  const seen = new Set();
  const unique = [];
  for (const [u, n] of allLinks) {
    if (!seen.has(u)) { seen.add(u); unique.push([u, n]); }
  }

  const bodyLinks = [];
  for (const [u, n] of unique) {
    const chNum = extractChapterNum(n);
    if (chNum < 999999) bodyLinks.push([u, n, chNum]);
  }
  bodyLinks.sort((a, b) => a[2] - b[2]);
  const result = bodyLinks.map(([u, n]) => [u, n]);

  const bookDir = path.join(OUTPUT_DIR, `book_${bookId}`);
  fs.mkdirSync(bookDir, { recursive: true });
  const listFile = path.join(bookDir, '_chapter_list.json');
  fs.writeFileSync(listFile, JSON.stringify(result.map(([u, n]) => ({ url: u, name: n, num: extractChapterNum(n) })), null, 2), 'utf-8');

  dom.window.close();
  return { bookTitle, chapters: result };
}

const NOISE_KEYWORDS = ['袋鼠小说', 'daishuzw', '首发域名', '请记住', '手机版', '本章未完', '点击下一页'];

async function fetchChapter(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const html = await fetchPage(url);
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      let contentDiv = doc.querySelector('div#booktxt') || doc.querySelector('div#content');
      if (!contentDiv) {
        const divs = [...doc.querySelectorAll('div')];
        const candidates = divs.filter(d => (d.textContent?.trim().length || 0) > 500);
        if (candidates.length > 0) {
          candidates.sort((a, b) => (b.textContent?.trim().length || 0) - (a.textContent?.trim().length || 0));
          contentDiv = candidates[0];
        }
      }

      if (contentDiv) {
        const lines = contentDiv.textContent.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
        const cleanLines = lines.filter(l => !NOISE_KEYWORDS.some(k => l.includes(k)));
        dom.window.close();
        return cleanLines.join('\n');
      }
      dom.window.close();
      return null;
    } catch {
      if (attempt < retries - 1) await sleep(2000);
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function crawlBook(bookId, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${label}] book_id=${bookId}`);
  console.log('='.repeat(60));

  const bookDir = path.join(OUTPUT_DIR, `book_${bookId}`);
  fs.mkdirSync(bookDir, { recursive: true });

  const { bookTitle, chapters } = await getChapterLinks(bookId);
  console.log(`Title: ${bookTitle}`);
  console.log(`Body chapters: ${chapters.length}`);
  if (chapters.length > 0) {
    console.log(`  Ch1: ${chapters[0][1]}`);
    console.log(`  Last: ${chapters[chapters.length - 1][1]}`);
  } else {
    console.log('ERROR: 0 chapters found!');
    return bookDir;
  }

  const progressFile = path.join(bookDir, '_progress.json');
  const existing = new Set();
  if (fs.existsSync(progressFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
      for (const u of data.done || []) existing.add(u);
    } catch {}
  }

  const todo = chapters.filter(([url]) => !existing.has(url));
  console.log(`Done: ${existing.size}, Todo: ${todo.length}`);

  if (todo.length === 0) { console.log('All done!'); return bookDir; }

  let doneCount = existing.size;
  let failCount = 0;
  const t0 = Date.now();

  for (let idx = 0; idx < todo.length; idx++) {
    const [url, name] = todo[idx];
    const chNum = extractChapterNum(name);

    const content = await fetchChapter(url);
    if (content && content.length > 100) {
      const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
      const filepath = path.join(bookDir, `ch${String(chNum).padStart(4, '0')}_${safeName}.txt`);
      fs.writeFileSync(filepath, `# ${name}\n\n${content}`, 'utf-8');
      existing.add(url);
      doneCount++;

      if (doneCount % 50 === 0) {
        fs.writeFileSync(progressFile, JSON.stringify({ done: [...existing] }, null, 2), 'utf-8');
      }
    } else {
      failCount++;
      if (failCount <= 5) console.log(`  FAIL: ch${chNum} len=${content ? content.length : 0}`);
    }

    if ((idx + 1) % 50 === 0 || (idx + 1) === todo.length) {
      const pct = ((idx + 1) / todo.length * 100).toFixed(1);
      const elapsed = (Date.now() - t0) / 1000;
      const speed = (idx + 1) / (elapsed || 1);
      const eta = (todo.length - idx - 1) / (speed || 1);
      console.log(`  [${label}] ${idx + 1}/${todo.length} (${pct}%) OK:${doneCount} F:${failCount} ${speed.toFixed(1)}ch/s ETA:${eta.toFixed(0)}s`);
    }

    await sleep(200);
  }

  fs.writeFileSync(progressFile, JSON.stringify({ done: [...existing] }, null, 2), 'utf-8');
  console.log(`\n[${label}] DONE! OK:${doneCount} FAIL:${failCount}`);
  return bookDir;
}

async function main() {
  const args = process.argv.slice(2);
  let bookIds = [108837, 108811];
  const labels = { 108837: 'Book1-CS1976', 108811: 'Book2-RuanFan' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cookie' && args[i + 1]) { CF_COOKIE = args[++i]; }
    if (args[i] === '--book' && args[i + 1]) { bookIds = args[++i].split(',').map(Number); }
  }

  if (!CF_COOKIE) {
    const cookieFile = path.join(__dirname, '.novelengine', 'cf_cookie.txt');
    if (fs.existsSync(cookieFile)) CF_COOKIE = fs.readFileSync(cookieFile, 'utf-8').trim();
  }

  if (!CF_COOKIE) {
    console.log('ERROR: 需要 Cloudflare cookie!');
    console.log('用法: node crawl_novel.js --cookie "你的cf_clearance值"');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = {};
  for (const bookId of bookIds) {
    const label = labels[bookId] || `Book${bookId}`;
    const bookDir = await crawlBook(bookId, label);
    results[label] = bookDir;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('ALL CRAWL COMPLETE!');
  console.log('='.repeat(60));
  for (const [name, dir] of Object.entries(results)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'));
    console.log(`  ${name}: ${files.length} chapters`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
