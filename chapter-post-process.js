#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ChapterPostProcessor {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
    this.chaptersPath = path.join(this.novelEnginePath, 'chapters');
  }

  process(chapterPath, beatId) {
    const absPath = path.resolve(chapterPath);
    if (!fs.existsSync(absPath)) {
      console.log('文件不存在:', absPath);
      return { passed: false, errors: ['文件不存在'] };
    }

    let text = fs.readFileSync(absPath, 'utf-8');
    const novelConfig = this.loadJson('novel_config.json');
    const targetWords = novelConfig ? novelConfig.wordsPerChapter : 2122;

    console.log('--- 章节后处理 ---');

    const auditResult = this.audit(text, targetWords);

    if (!auditResult.passed) {
      console.log('审计未通过，尝试自动修复...');
      const fixResult = this.autoFixIssues(absPath, text, targetWords, auditResult.issues);
      if (fixResult.fixed) {
        text = fixResult.text;
        const reAudit = this.audit(text, targetWords);
        if (reAudit.passed) {
          console.log('自动修复成功，审计通过');
          auditResult.passed = true;
          auditResult.issues = [];
        } else {
          console.log('自动修复后仍存在问题:');
          reAudit.issues.forEach(i => console.log('  ' + i));
          auditResult.issues = reAudit.issues;
        }
      }
    }

    this.detrace(absPath);

    text = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf-8') : text;

    const settingCheck = this.detectSettingConflicts(text);
    const qualityCheck = this.qualityChecklist(text, targetWords);

    this.markBeatCompleted(beatId || this.inferBeatId());
    this.updateWritingState(absPath, text.replace(/\s/g, '').length, auditResult);
    this.updateCharacterArc(text);
    this.verifyPlotContinuity();

    console.log('--- 后处理完成 ---\n');

    return {
      passed: auditResult.passed && settingCheck.passed,
      audit: auditResult,
      setting: settingCheck,
      quality: qualityCheck
    };
  }

  autoFixIssues(filePath, text, targetWords, issues) {
    let modified = false;
    let result = text;

    for (const issue of issues) {
      if (issue.includes('总结性结尾')) {
        const lines = result.split('\n');
        const nonEmpty = [];
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim()) {
            nonEmpty.push(i);
            if (nonEmpty.length >= 2) break;
          }
        }
        if (nonEmpty.length > 0) {
          const lastIdx = nonEmpty[0];
          result = lines.slice(0, lastIdx).join('\n') + '\n';
          modified = true;
          console.log('  修复: 删除总结性结尾段落');
        }
      }

      if (issue.includes('星号内心独白')) {
        result = result.replace(/\*([^*]+)\*/g, (match, content) => {
          return content;
        });
        modified = true;
        console.log('  修复: 移除星号内心独白标记');
      }

      if (issue.includes('---') || issue.includes('场景分隔符')) {
        result = result.replace(/^---+\s*$/gm, '');
        modified = true;
        console.log('  修复: 移除---场景分隔符');
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, result, 'utf-8');
    }

    return { fixed: modified, text: result };
  }

  audit(text, targetWords) {
    const issues = [];

    const summaryCheck = this.detectSummaryEnding(text);
    if (summaryCheck.isSummary) {
      issues.push('总结性结尾: ' + summaryCheck.reason);
    }

    const countCheck = this.validateWordCount(text, targetWords);
    if (!countCheck.isValid) {
      issues.push(`字数偏差: 目标${targetWords}, 实际${countCheck.current}, 偏差${(countCheck.variance * 100).toFixed(1)}%`);
    }

    const aiCheck = this.detectAIStyle(text);
    if (aiCheck.score >= 50) {
      issues.push(`AI风格分数: ${aiCheck.score}/100`);
      aiCheck.issues.forEach(i => issues.push('  ' + i));
    }

    const asteriskCheck = this.detectAsteriskMonologue(text);
    if (asteriskCheck.found) {
      issues.push(`星号内心独白: 发现${asteriskCheck.count}处`);
    }

    const passed = issues.length === 0;

    if (passed) {
      console.log('审计: 通过');
    } else {
      console.log('审计: 未通过');
      issues.forEach(i => console.log('  ' + i));
    }

    return { passed, issues };
  }

  detectSettingConflicts(text) {
    const issues = [];
    const characters = this.loadJson('characters.json');
    const rewriteSetting = this.loadJson('rewrite_setting.json');
    const worldRules = this.loadFile('world_rules.md');

    if (characters && characters.characters) {
      const allNames = characters.characters.map(c => c.name);
      for (const name of allNames) {
        if (!text.includes(name)) continue;
      }
    }

    if (rewriteSetting && rewriteSetting.protagonist) {
      const originalNames = ['陈默', '林清音', '王芳', '顾霆川'];
      for (const orig of originalNames) {
        if (text.includes(orig)) {
          issues.push(`设定冲突: 发现原著人物名"${orig}"`);
        }
      }
    }

    if (worldRules) {
      const forbiddenWorlds = ['滨海市', '清和堂', '御景湾', '1998'];
      for (const fw of forbiddenWorlds) {
        if (text.includes(fw)) {
          issues.push(`设定冲突: 发现原著世界观"${fw}"`);
        }
      }
    }

    const settingKeywords = ['系统', '金手指', '技能'];
    const hasSettingKeyword = settingKeywords.some(k => text.includes(k));
    if (hasSettingKeyword && rewriteSetting && rewriteSetting.scenario) {
      // OK
    }

    const passed = issues.length === 0;
    if (passed) {
      console.log('设定检查: 通过');
    } else {
      console.log('设定检查: 未通过');
      issues.forEach(i => console.log('  ' + i));
    }

    return { passed, issues };
  }

  qualityChecklist(text, targetWords) {
    const novelConfig = this.loadJson('novel_config.json');
    const plotGraph = this.loadJson('plot_graph.json');
    const writingState = this.loadJson('writing_state.json');

    const checks = [];

    const charCount = text.replace(/\s/g, '').length;
    const variance = Math.abs(charCount - targetWords) / targetWords;
    checks.push({ item: '字数偏差≤20%', pass: variance <= 0.2, detail: `${charCount}/${targetWords}` });

    const faceSlapWords = ['打脸', '震惊', '折服', '傻眼', '不敢相信', '目瞪口呆', '啪啪', '哑口无言'];
    const hasFaceSlap = faceSlapWords.some(w => text.includes(w));
    checks.push({ item: '至少1次打脸情节', pass: true, detail: hasFaceSlap ? '检测到打脸' : '未检测到(人工确认)' });

    const dialogueMatches = text.match(/[""][^""]{1,}[""]/g) || [];
    const dialogueRatio = dialogueMatches.length / Math.max(text.length / 50, 1);
    checks.push({ item: '对话比例合理', pass: dialogueRatio > 0.1, detail: `${(dialogueRatio * 100).toFixed(0)}%` });

    const sensoryWords = ['气味', '声音', '触感', '温度', '光线', '颜色', '味道', '咸', '冷', '热', '湿', '干', '疼', '痛', '酸', '辣'];
    const sensoryCount = sensoryWords.reduce((c, w) => c + (text.match(new RegExp(w, 'g')) || []).length, 0);
    checks.push({ item: '感官细节≥3处', pass: sensoryCount >= 3, detail: `${sensoryCount}处` });

    const paragraphCount = text.split('\n').filter(p => p.trim()).length;
    checks.push({ item: '段落节奏合理(15-80段)', pass: paragraphCount >= 15 && paragraphCount <= 80, detail: `${paragraphCount}段` });

    console.log('质量检查:');
    checks.forEach(c => {
      const mark = c.pass ? '✓' : '✗';
      console.log(`  ${mark} ${c.item}: ${c.detail}`);
    });

    return checks;
  }

  markBeatCompleted(beatId) {
    if (!beatId) {
      console.log('Beat标记: 未指定beatId，跳过');
      return;
    }

    const plotGraph = this.loadJson('plot_graph.json');
    if (!plotGraph || !plotGraph.volumes) return;

    let found = false;
    for (const volume of plotGraph.volumes) {
      for (const beat of volume.beats) {
        if (beat.id === beatId) {
          beat.resolved = true;
          beat.status = 'resolved';
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) {
      const filePath = path.join(this.novelEnginePath, 'plot_graph.json');
      fs.writeFileSync(filePath, JSON.stringify(plotGraph, null, 2), 'utf-8');
      console.log(`Beat标记: ${beatId} 已完成`);
    }
  }

  inferBeatId() {
    const writingState = this.loadJson('writing_state.json');
    return writingState ? writingState.currentBeat : null;
  }

  updateCharacterArc(text) {
    const characters = this.loadJson('characters.json');
    if (!characters || !characters.characters) return;

    const protagonist = characters.characters.find(c => c.id === 'protagonist');
    const heroine = characters.characters.find(c => c.id === 'heroine');

    if (protagonist) {
      protagonist.arcProgress = Math.min(1, (protagonist.arcProgress || 0) + 0.02);
    }
    if (heroine) {
      heroine.arcProgress = Math.min(1, (heroine.arcProgress || 0) + 0.01);
    }

    const filePath = path.join(this.novelEnginePath, 'characters.json');
    fs.writeFileSync(filePath, JSON.stringify(characters, null, 2), 'utf-8');
    console.log('人物弧光: 已更新');
  }

  verifyPlotContinuity() {
    try {
      const { PlotToolJS } = require('./char-plot-tools.js');
      const plotTool = new PlotToolJS();
      const result = plotTool.verifyContinuity();
      if (!result.valid) {
        result.issues.forEach(i => console.log('  连续性问题: ' + i));
      }
    } catch (err) {
      // char-plot-tools.js not available, skip
    }
  }

  detectSummaryEnding(text) {
    const keywords = ['从此以后', '总而言之', '意识到', '这意味着', 'eventually', 'in the end', 'finally', 'marked the beginning', 'realized that'];
    const lastParagraph = text.split('\n').filter(p => p.trim()).pop() || '';
    const lowerText = lastParagraph.toLowerCase();
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return { isSummary: true, reason: keyword };
      }
    }
    return { isSummary: false };
  }

  validateWordCount(text, target) {
    const current = text.replace(/\s/g, '').length;
    const variance = Math.abs(current - target) / target;
    return { isValid: variance <= 0.2, current, variance };
  }

  detectAIStyle(text) {
    const issues = [];
    let score = 0;

    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    const shortRatio = sentences.filter(s => s.length < 15).length / Math.max(sentences.length, 1);
    if (shortRatio > 0.4) { issues.push('短句过多(' + (shortRatio * 100).toFixed(1) + '%)'); score += 20; }

    const dashCount = (text.match(/——/g) || []).length;
    if (dashCount / (text.length / 100) > 2) { issues.push('破折号过多(' + dashCount + '次)'); score += 15; }

    const sensoryWords = ['气味', '声音', '触感', '温度', '光线', '颜色', '味道', '咸', '冷', '热', '湿', '干'];
    const sensoryCount = sensoryWords.reduce((c, w) => c + (text.match(new RegExp(w, 'g')) || []).length, 0);
    if (text.length > 2000 && sensoryCount < 3) { issues.push('缺乏感官细节'); score += 15; }

    const clicheMetaphors = ['如铁钉', '如潮水', '如暴雨', '如惊雷', '如利剑', '狠狠', '疯狂', '剧烈', '恐怖', '窒息'];
    let metaphorCount = 0;
    for (const m of clicheMetaphors) {
      metaphorCount += (text.match(new RegExp(m, 'g')) || []).length;
    }
    if (metaphorCount > 5) { issues.push('陈词滥调比喻过多(' + metaphorCount + '次)'); score += 15; }

    const dialogueLines = text.match(/[""][^""]{1,}[""]/g) || [];
    const directDialogueCount = dialogueLines.filter(d => {
      const content = d.slice(1, -1);
      return content.includes('我') && content.includes('你') && content.length < 20;
    }).length;
    if (dialogueLines.length > 0 && directDialogueCount / dialogueLines.length > 0.5) {
      issues.push('对话过于直白，缺乏潜台词');
      score += 20;
    }

    const sentenceStarters = sentences.map(s => s.trim().slice(0, 5));
    const uniqueStarters = new Set(sentenceStarters);
    if (sentenceStarters.length > 10 && uniqueStarters.size / sentenceStarters.length < 0.6) {
      issues.push('句式结构重复，建议变化句式开头');
      score += 15;
    }

    const ellipsisCount = (text.match(/\.\.\.\.|……/g) || []).length;
    if (ellipsisCount > 10) { issues.push('省略号过多(' + ellipsisCount + '次)'); score += 10; }

    return { issues, score: Math.min(score, 100) };
  }

  detectAsteriskMonologue(text) {
    const matches = text.match(/\*[^*]+\*/g) || [];
    return { found: matches.length > 0, count: matches.length };
  }

  detrace(chapterPath) {
    const absPath = path.resolve(chapterPath);
    if (!fs.existsSync(absPath)) {
      console.log('消痕: 文件不存在');
      return false;
    }

    try {
      const scriptPath = path.join(process.cwd(), 'ai_trace_remover.js');
      if (!fs.existsSync(scriptPath)) {
        console.log('消痕: 跳过(脚本不存在)');
        return false;
      }

      const { execSync } = require('child_process');
      execSync(`node "${scriptPath}" "${absPath}"`, {
        stdio: 'pipe',
        timeout: 30000,
        shell: true
      });
      console.log('消痕: 已执行');
      return true;
    } catch (err) {
      try {
        let text = fs.readFileSync(absPath, 'utf-8');
        const before = text;
        text = this._inlineDetrace(text);
        if (text !== before) {
          fs.writeFileSync(absPath, text, 'utf-8');
          console.log('消痕: 已执行(内联)');
          return true;
        }
        console.log('消痕: 无需处理');
        return true;
      } catch (err2) {
        console.log('消痕: 失败 - ' + err2.message);
        return false;
      }
    }
  }

  _inlineDetrace(text) {
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
    };

    for (const [ai, human] of Object.entries(AI_WORDS)) {
      text = text.split(ai).join(human);
    }

    text = text
      .replace(/？{2,}/g, '？')
      .replace(/！{2,}/g, '！')
      .replace(/？！/g, '？')
      .replace(/！？/g, '？')
      .replace(/…{3,}/g, '……')
      .replace(/——+/g, '')
      .replace(/—{2,}/g, '');

    while (text.includes('\n\n\n')) {
      text = text.split('\n\n\n').join('\n\n');
    }

    return text;
  }

  updateWritingState(chapterPath, wordCount, auditResult) {
    const stateFile = path.join(this.novelEnginePath, 'writing_state.json');
    if (!fs.existsSync(stateFile)) return;

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    const chapterName = path.basename(chapterPath, '.txt');

    state.totalWordsWritten = (state.totalWordsWritten || 0) + wordCount;
    state.currentChapter = (state.currentChapter || 0) + 1;
    state.lastWriteAt = new Date().toISOString();
    if (!state.completedChapters) state.completedChapters = [];
    if (!state.completedChapters.includes(chapterName)) {
      state.completedChapters.push(chapterName);
    }

    const plotGraph = this.loadJson('plot_graph.json');
    if (plotGraph && plotGraph.volumes) {
      for (const volume of plotGraph.volumes) {
        for (const beat of volume.beats) {
          if (!beat.resolved) {
            state.currentBeat = beat.id;
            break;
          }
        }
        if (state.currentBeat) break;
      }
    }

    if (!state.completedBeats) state.completedBeats = [];

    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
    console.log('状态: 已更新');
  }

  loadJson(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {}
    return null;
  }

  loadFile(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {}
    return null;
  }
}

const chapterPath = process.argv[2];
const beatId = process.argv[3];

if (!chapterPath) {
  console.log('用法: node chapter-post-process.js <章节文件路径> [beatId]');
  process.exit(1);
}

const processor = new ChapterPostProcessor();
const result = processor.process(chapterPath, beatId);

if (!result.passed) {
  console.log('警告: 审计未完全通过，请检查上述问题');
}
