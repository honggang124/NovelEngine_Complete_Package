#!/usr/bin/env node
/**
 * NovelEngine 小说配置工具
 * 修改 novel_config.json 中的创作参数
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, '.novelengine', 'novel_config.json');

const FIELDS = {
  totalChapters: { label: '总章节数', type: 'int' },
  chaptersPerVolume: { label: '每卷章节数（逗号分隔）', type: 'int_list' },
  volumeNames: { label: '卷名（逗号分隔）', type: 'str_list' },
  wordsPerChapter: { label: '每章字数', type: 'int' },
  beatsPerChapter: { label: '每章Beat数', type: 'int' },
  skillUnlockRate: { label: '每N章解锁新技能', type: 'int' },
  favorabilityGainPerChapter: { label: '每阶段好感度增量', type: 'int' },
  bigFaceSlapRate: { label: '每N章大打脸', type: 'int' },
  smallFaceSlapPerChapter: { label: '每章小打脸次数', type: 'int' },
};

const DEFAULT_CONFIG = {
  totalChapters: 235,
  chaptersPerVolume: [50, 70, 115],
  volumeNames: ['断亲逆袭', '多领域开花', '登顶与真爱'],
  wordsPerChapter: 3000,
  beatsPerChapter: 4,
  skillUnlockRate: 10,
  favorabilityGainPerChapter: 10,
  bigFaceSlapRate: 5,
  smallFaceSlapPerChapter: 1
};

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {}
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function showConfig(config) {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     NovelEngine 小说创作配置               ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`  总章节数:           ${config.totalChapters} 章`);
  const vols = config.chaptersPerVolume || [];
  const vnames = config.volumeNames || [];
  let start = 1;
  for (let i = 0; i < vols.length; i++) {
    const cnt = vols[i];
    const name = vnames[i] || `卷${i + 1}`;
    const end = start + cnt - 1;
    console.log(`  第${i + 1}卷 ${name}:     第${start}-${end}章 (${cnt}章)`);
    start = end + 1;
  }
  console.log(`  每章字数:           ${config.wordsPerChapter} 字`);
  console.log(`  每章Beat数:         ${config.beatsPerChapter} 个`);
  console.log(`  技能解锁间隔:       每 ${config.skillUnlockRate} 章`);
  console.log(`  好感度增量:         每 ${config.skillUnlockRate} 章 +${config.favorabilityGainPerChapter}-15`);
  console.log(`  大打脸间隔:         每 ${config.bigFaceSlapRate} 章`);
  console.log(`  小打脸:             每 ${config.smallFaceSlapPerChapter} 章`);
  console.log();
}

function parseValue(raw, type) {
  if (type === 'int') return parseInt(raw, 10);
  if (type === 'int_list') return raw.split(',').map(x => parseInt(x.trim(), 10));
  if (type === 'str_list') return raw.split(',').map(x => x.trim());
  return raw;
}

function quickSet(config, args) {
  for (const arg of args) {
    if (arg.includes('=')) {
      const [k, v] = arg.split('=');
      if (FIELDS[k]) {
        config[k] = parseValue(v, FIELDS[k].type);
        console.log(`✓ ${k} = ${JSON.stringify(config[k])}`);
      }
    }
  }
  if (config.chaptersPerVolume) {
    config.totalChapters = config.chaptersPerVolume.reduce((a, b) => a + b, 0);
  }
  return config;
}

function updateOutline(config) {
  const outlinePath = path.join(__dirname, '.novelengine', 'outline.md');
  if (!fs.existsSync(outlinePath)) return;
  const vols = config.chaptersPerVolume || [];
  const vnames = config.volumeNames || [];
  let start = 1;
  const volumeLines = [];
  for (let i = 0; i < vols.length; i++) {
    const cnt = vols[i];
    const name = vnames[i] || `卷${i + 1}`;
    const end = start + cnt - 1;
    volumeLines.push(`### 第${i + 1}卷：${name}（第${start}-${end}章）`);
    start = end + 1;
  }
  let content = fs.readFileSync(outlinePath, 'utf-8');
  content = content.replace(/### 第[一二三]卷[：:].+?（第\d+-\d+章）/g, m => volumeLines.shift() || m);
  fs.writeFileSync(outlinePath, content, 'utf-8');
  console.log('✓ outline.md 已同步更新');
}

async function interactiveSet(config) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = prompt => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n可修改的配置项：');
  const keys = Object.keys(FIELDS);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const label = FIELDS[k].label;
    console.log(`  ${i + 1}. ${label} (当前: ${JSON.stringify(config[k] || '-')})`);
  }
  console.log('  0. 全部重置为默认\n');

  const choice = await question('选择要修改的编号（多选用逗号分隔）: ');
  if (!choice.trim()) { rl.close(); return config; }

  if (choice.trim() === '0') {
    config = { ...DEFAULT_CONFIG };
    console.log('✓ 已重置为默认配置');
    rl.close();
    return config;
  }

  const indices = choice.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
  for (const idx of indices) {
    if (idx >= 1 && idx <= keys.length) {
      const k = keys[idx - 1];
      const label = FIELDS[k].label;
      const raw = await question(`  ${label} [${JSON.stringify(config[k] || '?')}]: `);
      if (raw.trim()) {
        config[k] = parseValue(raw.trim(), FIELDS[k].type);
        console.log(`  ✓ ${label} → ${JSON.stringify(config[k])}`);
      }
    }
  }

  if (config.chaptersPerVolume) {
    config.totalChapters = config.chaptersPerVolume.reduce((a, b) => a + b, 0);
    console.log(`  ✓ 总章节数已自动更新为 ${config.totalChapters}`);
  }

  rl.close();
  return config;
}

async function main() {
  let config = loadConfig();

  if (process.argv.length > 2) {
    if (process.argv[2] === '--show') {
      showConfig(config);
    } else {
      config = quickSet(config, process.argv.slice(2));
      saveConfig(config);
      updateOutline(config);
      console.log(`\n✓ 配置已保存到 ${CONFIG_PATH}`);
      showConfig(config);
    }
  } else {
    showConfig(config);
    config = await interactiveSet(config);
    saveConfig(config);
    updateOutline(config);
    console.log(`\n✓ 配置已保存到 ${CONFIG_PATH}`);
    showConfig(config);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
