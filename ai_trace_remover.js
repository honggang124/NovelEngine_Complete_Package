#!/usr/bin/env node
/**
 * AI痕迹消除器 v2.0
 * 炼字·官方消痕100分（官场/现实向男频专用）
 */

const fs = require('fs');
const path = require('path');

const AI_WORDS = {
  '显著': '明显', '极为': '特别', '愈发': '越来越',
  '深入': '仔细', '基于': '因为', '因此': '所以',
  '从而': '这样', '表明': '说明', '大量': '不少',
  '诸多': '好些', '进行了': '', '做出了': '', '完成了': '',
  '综上所述': '', '由此可见': '', '值得注意的是': '',
  '显而易见': '明摆着', '毋庸置疑': '没得说',
  '众所周知': '都知道', '不言而喻': '不用多说',
  '恍然大悟': '一下明白了', '由衷地': '真心', '由衷': '真心',
  '颇为': '挺', '不禁': '忍不住', '顿时': '一下',
  '霎时': '一下', '顷刻间': '一下', '与此同时': '这时候',
  '毫无疑问': '肯定', '的确': '确实', '诚然': '话说回来',
  '换言之': '说白了', '简而言之': '简单说',
  '出乎意料': '没想到', '出乎意料地': '没想到',
  '情不自禁地': '忍不住', '若有所思': '像在想事',
  '意味深长': '有深意', '耐人寻味': '有意思',
  '令人瞩目': '引人注意', '令人叹为观止': '让人叫绝',
  '令人震撼': '震住了', '令人动容': '让人心软',
  '令人欣慰': '让人舒心', '令人感慨': '让人唏嘘',
  '令人惊叹': '让人吃惊', '引人深思': '让人琢磨',
  '醍醐灌顶': '一下点通', '如梦初醒': '一下醒过神',
  '刻骨铭心': '一辈子忘不了', '淋漓尽致': '透透的',
  '豁然开朗': '一下敞亮了', '茅塞顿开': '一下想通了',
  '坚定不移': '铁了心', '毫不犹豫': '没半点犹豫',
  '毫不犹豫地': '没半点犹豫', '义无反顾': '头也不回',
  '斩钉截铁': '干脆', '斩钉截铁地': '干脆',
  '天经地义': '理所当然', '自然而然': '自然',
  '不约而同': '都', '千篇一律': '一个模子',
  '截然不同': '完全不同', '大相径庭': '差远了',
  '判若两人': '像换了个人', '遥不可及': '够不着',
  '触手可及': '伸手就够着', '轻而易举': '不费劲',
  '轻而易举地': '不费劲', '易如反掌': '不费劲',
  '游刃有余': '绰绰有余', '出神入化': '神了',
  '叹为观止': '叫绝', '赞不绝口': '夸个不停',
  '大名鼎鼎': '出了名', '家喻户晓': '都知道',
  '广为流传': '传开了', '脍炙人口': '受欢迎',
};

const DIALOGUE_TAGS = [
  '他说道', '他表示', '他强调', '她说道', '她表示', '她强调',
  '沉声道', '沉声说道', '轻声道', '淡淡道', '冷声道',
  '颤声道', '急声道', '厉声道', '平静地道', '严肃地道',
  '语气平淡地道', '语气平静地道', '语气笃定地道',
  '语气笃定道', '语气坚定地道', '语气坚定道',
  '坦然道', '平静道', '肃然道', '正色道',
  '郑重道', '郑重地道', '认真道', '认真地道',
  '淡然道', '淡然地道', '冷然道', '冷然地道',
  '悠悠道', '悠悠地道', '缓缓道', '缓缓地道',
  '悠悠然道', '缓缓说道', '慢慢道', '慢慢说道',
  '喃喃道', '喃喃地道', '低声道', '低声说道',
  '高声道', '高声说道', '大声道', '大声说道',
  '小声道', '小声说道', '嗫嚅道', '嗫嚅地道',
  '哽咽道', '哽咽地道', '哭声道', '哭声说道',
  '笑声道', '笑声说道', '冷笑道', '冷笑地道',
  '嗤笑道', '嗤笑地道', '嘲弄道', '嘲弄地道',
  '讽刺道', '讽刺地道', '反问道', '反问地道',
  '质问道', '质问地道', '追问道', '追问地道',
  '逼问道', '逼问地道', '怒声道',
  '怒声说道', '吼道', '吼声道', '咆哮道', '咆哮地道',
  '怒吼道', '怒吼地道', '尖叫道', '尖叫地道',
  '惊呼道', '惊呼地道', '惊叫道', '惊叫地道',
  '感叹道', '感叹地道', '叹息道', '叹息地道',
  '叹道', '叹声道', '感慨道', '感慨地道',
  '欣慰道', '欣慰地道', '苦笑道', '苦笑地道',
  '无奈道', '无奈地道', '迟疑道', '迟疑地道',
  '犹豫道', '犹豫地道', '犹豫着道', '试探道',
  '试探地道', '商量道', '商量地道', '恳求道',
  '恳求地道', '哀求道', '哀求地道', '央求道',
  '央求地道', '乞求道', '乞求地道', '请求道',
  '请求地道', '提议道', '提议地道', '建议道',
  '建议地道', '劝道', '劝说道', '劝解道', '劝解地道',
  '安慰道', '安慰地道', '宽慰道', '宽慰地道',
  '解释道', '解释地道', '辩解道', '辩解地道',
  '争辩道', '争辩地道', '反驳道', '反驳地道',
  '回道', '回声道', '答道', '答声道',
  '应道', '应声道', '接口道', '接口地道',
  '接道', '接声道', '插嘴道', '插嘴地道',
  '打断道', '打断地道', '纠正道', '纠正地道',
  '补充道', '补充地道', '总结道', '总结地道',
  '宣布道', '宣布地道', '声明道', '声明地道',
  '发誓道', '发誓地道', '保证道', '保证地道',
  '承诺道', '承诺地道', '许诺道', '许诺地道',
  '威胁道', '威胁地道', '恐吓道', '恐吓地道',
  '警告道', '警告地道', '提醒道', '提醒地道',
  '吩咐道', '吩咐地道', '命令道', '命令地道',
  '指示道', '指示地道', '嘱咐道', '嘱咐地道', '叮咛道', '叮咛地道',
  '邀请道', '邀请地道', '召唤道', '召唤地道',
  '招呼道', '招呼地道', '问候道', '问候地道',
  '告别道', '告别地道', '欢迎道', '欢迎地道',
  '感谢道', '感谢地道', '致谢道', '致谢地道',
  '道歉道', '道歉地道', '致歉道', '致歉地道',
  '祝贺道', '祝贺地道', '恭喜道', '恭喜地道',
  '赞美道', '赞美地道', '夸奖道', '夸奖地道',
  '批评道', '批评地道', '指责道', '指责地道',
  '谴责道', '谴责地道', '控诉道', '控诉地道',
  '抱怨道', '抱怨地道', '埋怨道', '埋怨地道',
  '嘀咕道', '嘀咕地道', '嘟囔道', '嘟囔地道',
  '咕哝道', '咕哝地道', '念叨道', '念叨地道',
  '自语道', '自语地道', '自嘲道', '自嘲地道',
  '自言自语道', '自言自语地道',
];

const FILLER_WORDS = ['大概', '似乎', '可能', '差不多', '其实', '不过', '话说回来', '说白了'];

function cleanPunctuation(text) {
  return text
    .replace(/？{2,}/g, '？')
    .replace(/！{2,}/g, '！')
    .replace(/？！/g, '？')
    .replace(/！？/g, '？')
    .replace(/…{3,}/g, '……')
    .replace(/………+/g, '……')
    .replace(/——+/g, '')
    .replace(/—{2,}/g, '')
    .replace(/知道吗你/g, '你知道吗')
    .replace(/干什么你/g, '你干什么');
}

function replaceAIWords(text) {
  for (const [ai, human] of Object.entries(AI_WORDS)) {
    text = text.split(ai).join(human);
  }
  return text;
}

function cleanDialogueTags(text) {
  for (const tag of DIALOGUE_TAGS) {
    text = text.split(tag).join('说');
  }
  const extra = ['尖声道','惊叫道','惊叹道','惊愕道','嗤笑道','冷哼道','嘀咕道',
    '低喃道','嘶声道','颤声道','哽声道','泣声道','嘶吼道','咆哮道',
    '怒喝道','厉喝道','低喝道','断喝道','娇声道','嗲声道',
    '颤声说','哽声说','泣声说','嘶声说','尖声说','冷声说',
    '小声说','低声说','高声说','大声说','轻声说','柔声说',
    '嗫嚅说','嘀咕说','嘟囔说','咕哝说','喃喃说','自语说',
    '叹息说','感叹说','感慨说','苦笑说','无奈说','迟疑说',
    '犹豫说','试探说','商量说','恳求说','哀求说','央求说',
    '乞求说','请求说','提议说','建议说','劝说','劝解说',
    '安慰说','宽慰说','解释说','辩解说','争辩说','反驳说',
    '追问说','逼问说','质问说','反问说','威胁说','恐吓说',
    '警告说','提醒说','吩咐说','命令说','嘱咐说','叮咛说',
    '邀请说','召唤说','招呼说','问候说','告别说','欢迎说',
    '感谢说','致谢说','道歉说','致歉说','祝贺说','恭喜说',
    '赞美说','夸奖说','批评说','指责说','谴责说','抱怨说',
    '埋怨说','嘟囔说','念叨说','自嘲说','冷哼一声说',
    '一字一句道','一字一句说','一字一顿道','一字一顿说'];
  for (const tag of extra) {
    text = text.split(tag).join('说');
  }
  text = text.replace(/([^"])道"/g, '$1"');
  text = text.replace(/道"$/gm, '"');
  text = text.replace(/，说"/g, '，"');
  text = text.replace(/，说"/g, '，"');
  text = text.replace(/\b说"/g, '"');
  return text;
}

function breakLongSentences(text) {
  const paragraphs = text.split('\n');
  const result = [];
  for (const para of paragraphs) {
    if (!para.trim() || para.startsWith('【') || para.startsWith('-')) {
      result.push(para);
      continue;
    }
    const parts = para.split(/([。！？])/);
    const newSentences = [];
    for (let i = 0; i < parts.length; i += 2) {
      const s = parts[i] || '';
      const punct = parts[i + 1] || '';
      const full = s + punct;
      if (full.length > 40 && s.includes('，')) {
        const commaIdx = s.indexOf('，');
        if (commaIdx > 5) {
          newSentences.push(s.slice(0, commaIdx) + '。');
          newSentences.push(s.slice(commaIdx + 1) + punct);
        } else {
          newSentences.push(full);
        }
      } else {
        newSentences.push(full);
      }
    }
    result.push(newSentences.join(''));
  }
  return result.join('\n');
}

function removeParallel(text) {
  return text.replace(/嫌他(.+?)，嫌他(.+?)，嫌他(.+?)/g, '嫌他$1，又嫌$2，还嫌$3');
}

function injectHumanFeel(text) {
  const paragraphs = text.split('\n');
  const result = [];
  for (const para of paragraphs) {
    if (!para.trim() || para.startsWith('【') || para.startsWith('-')) {
      result.push(para);
      continue;
    }
    let p = para;
    if (Math.random() < 0.04) {
      if (!p.startsWith('"') && !p.startsWith('"') && !p.startsWith('第')) {
        const filler = FILLER_WORDS[Math.floor(Math.random() * FILLER_WORDS.length)];
        p = filler + '，' + p;
      }
    }
    if (Math.random() < 0.015) {
      if (p.includes('。') && !p.startsWith('"')) {
        const pos = p.indexOf('。');
        if (pos > 10 && pos < p.length - 5) {
          p = p.slice(0, pos) + '……' + p.slice(pos + 1);
        }
      }
    }
    result.push(p);
  }
  return result.join('\n');
}

function shuffleParagraphs(text) {
  const paragraphs = text.split('\n');
  const result = [];
  let i = 0;
  while (i < paragraphs.length) {
    const p = paragraphs[i];
    if (!p.trim() || p.startsWith('【') || p.startsWith('-')) {
      result.push(p);
      i++;
      continue;
    }
    if (i + 2 < paragraphs.length &&
        p.length < 12 &&
        paragraphs[i + 1].trim() === '' &&
        paragraphs[i + 2].length < 12 &&
        !paragraphs[i + 2].startsWith('【') &&
        !paragraphs[i + 2].startsWith('"') &&
        !paragraphs[i + 2].startsWith('"') &&
        Math.random() < 0.25) {
      result.push(p + paragraphs[i + 2]);
      i += 3;
    } else {
      result.push(p);
      i++;
    }
  }
  return result.join('\n');
}

function removeAIClosings(text) {
  return text.replace(/这就够了。\s*$/gm, '');
}

function fixXXX(text) {
  return text
    .split('XXX').join('……')
    .replace(/^---+\s*$/gm, '')
    .split('---').join('');
}

function process(text) {
  text = cleanPunctuation(text);
  text = replaceAIWords(text);
  text = cleanDialogueTags(text);
  text = removeParallel(text);
  text = breakLongSentences(text);
  text = shuffleParagraphs(text);
  text = injectHumanFeel(text);
  text = removeAIClosings(text);
  text = fixXXX(text);
  while (text.includes('\n\n\n')) {
    text = text.split('\n\n\n').join('\n\n');
  }
  return text;
}

function processFile(filepath) {
  const original = fs.readFileSync(filepath, 'utf-8');
  const processed = process(original);
  if (processed !== original) {
    fs.writeFileSync(filepath, processed, 'utf-8');
    return true;
  }
  return false;
}

function processDirectory(dirpath) {
  const results = [];
  const files = fs.readdirSync(dirpath).sort();
  for (const filename of files) {
    if (filename.endsWith('.txt') && filename.startsWith('第')) {
      const filepath = path.join(dirpath, filename);
      const changed = processFile(filepath);
      results.push([filename, changed]);
    }
  }
  return results;
}

function main() {
  const argv = Array.isArray(process.argv) ? process.argv : [];
  const target = argv[2] || path.join(process.cwd(), '.novelengine', 'chapters');

  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    const changed = processFile(target);
    const name = path.basename(target);
    console.log(changed ? `✓ ${name} 已消痕` : `- ${name} 无需处理`);
  } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    const results = processDirectory(target);
    const c = results.filter(([_, ch]) => ch).length;
    for (const [name, ch] of results) {
      console.log(ch ? `✓ ${name}` : `- ${name}`);
    }
    console.log(`\n处理完成：${c}/${results.length} 个文件已更新`);
  } else {
    console.log(`路径不存在: ${target}`);
    console.log('用法:');
    console.log('  node ai_trace_remover.js                 # 默认处理章节目录');
    console.log('  node ai_trace_remover.js <文件路径>       # 处理单个文件');
    console.log('  node ai_trace_remover.js <目录路径>       # 处理目录');
  }
}

main();
