#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ChapterWriter {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
    this.chaptersPath = path.join(this.novelEnginePath, 'chapters');
  }

  run() {
    const plotGraph = this.loadJson('plot_graph.json');
    const novelConfig = this.loadJson('novel_config.json');
    const rewriteSetting = this.loadJson('rewrite_setting.json');
    const characters = this.loadJson('characters.json');
    const writingState = this.loadJson('writing_state.json');
    const rewriteRules = this.loadJson('rewrite_rules.json');

    if (!plotGraph || !rewriteSetting) {
      console.log('缺少必要数据文件，请先运行 start-novel-writer.js');
      return null;
    }

    const nextBeat = this.findNextBeat(plotGraph);
    if (!nextBeat) {
      console.log('所有Beat已完成');
      return null;
    }

    const chapterNum = (writingState && writingState.currentChapter) ? writingState.currentChapter + 1 : 1;
    const targetWords = novelConfig ? novelConfig.wordsPerChapter : 2122;

    console.log(`Beat: ${nextBeat.id} - ${nextBeat.description}`);
    console.log(`目标: 第${chapterNum}章, ${targetWords}字`);

    const prompt = this.buildPrompt(nextBeat, chapterNum, targetWords, rewriteSetting, characters, writingState, rewriteRules);
    const chapterTitle = this.inferChapterTitle(nextBeat, chapterNum);
    const chapterFileName = `${chapterTitle}.txt`;
    const chapterFilePath = path.join(this.chaptersPath, chapterFileName);

    if (!fs.existsSync(this.chaptersPath)) {
      fs.mkdirSync(this.chaptersPath, { recursive: true });
    }

    const promptFilePath = path.join(this.novelEnginePath, '_write_prompt.txt');
    fs.writeFileSync(promptFilePath, prompt, 'utf-8');
    console.log(`写作提示: ${promptFilePath}`);
    console.log(`待写章节: ${chapterFileName}`);

    return { chapterNum, chapterTitle, chapterFileName, chapterFilePath, beatId: nextBeat.id, targetWords, prompt };
  }

  saveAndProcess(chapterFilePath, content, beatId) {
    const saverPath = path.join(process.cwd(), 'save-chapter.js');
    const tempContentPath = path.join(this.novelEnginePath, '_temp_content.txt');

    fs.writeFileSync(tempContentPath, content, 'utf-8');

    try {
      const args = beatId ? `"${tempContentPath}" "${chapterFilePath}" "${beatId}"` : `"${tempContentPath}" "${chapterFilePath}"`;
      execSync(`node "${saverPath}" file ${args}`, { stdio: 'inherit' });
      return true;
    } catch (err) {
      console.log('保存+后处理失败:', err.message);
      return false;
    } finally {
      if (fs.existsSync(tempContentPath)) {
        fs.unlinkSync(tempContentPath);
      }
    }
  }

  findNextBeat(plotGraph) {
    for (const volume of plotGraph.volumes) {
      for (const beat of volume.beats) {
        if (!beat.resolved) {
          return { ...beat, volumeName: volume.name, volumeId: volume.id };
        }
      }
    }
    return null;
  }

  inferChapterTitle(beat, chapterNum) {
    const desc = beat.description;
    const colonIdx = desc.indexOf('：');
    const titlePart = colonIdx > -1 ? desc.slice(colonIdx + 1) : desc;
    const clean = titlePart.replace(/[，。！？、]/g, '').slice(0, 6);
    return `第${chapterNum}章 ${clean}`;
  }

  buildPrompt(beat, chapterNum, targetWords, setting, characters, state, rules) {
    const p = setting.protagonist;
    const h = setting.heroine;
    const ex = setting.ex_wife;
    const v = setting.villain;
    const el = setting.elder;
    const w = setting.world;
    const sc = setting.scenario;
    const wr = setting.writing_rules;

    const prevChapterContext = this.getPrevChapterContext(state);

    return `# 小说写作指令 - 第${chapterNum}章

## 当前Beat
ID: ${beat.id}
描述: ${beat.description}
所在卷: ${beat.volumeName}

## 人物设定
- ${p.name}(${p.identity}): 信念"${p.belief}", 恐惧"${p.fear}", 当前目标"${p.currentGoal}", 特质[${p.traits.join('/')}]
- ${h.name}(${h.identity}): 信念"${h.belief}", 恐惧"${h.fear}", 当前目标"${h.currentGoal}", 特质[${h.traits.join('/')}]
- ${ex.name}(${ex.identity}): 信念"${ex.belief}", 特质[${ex.traits.join('/')}]
- ${v.name}(${v.identity}): 信念"${v.belief}", 特质[${v.traits.join('/')}]
- ${el.name}(${el.identity}): 信念"${el.belief}", 特质[${el.traits.join('/')}]

## 世界观
${w.era}，${w.location}，${w.context}
阶层: ${w.social_structure.top} / ${w.social_structure.middle} / ${w.social_structure.bottom}
核心冲突: ${w.core_tension}

## 场景设定
相遇: ${sc.meeting} - ${sc.meeting_detail}
首秀: ${sc.first_show_skill}
关系: ${sc.relationship_type} - ${sc.relationship_detail}

## 写作规则（必须遵守）
1. ${wr.anti_summary}
2. ${wr.show_dont_tell}
3. ${wr.internal_monologue}
4. 节奏: ${wr.narrative_rhythm}
5. 打脸模式: ${wr.face_slap_pattern}
6. 感情推进: ${wr.emotion_progression}
7. 禁止总结性结尾（如"从此以后"、"这意味着"、"最终"）
8. 对话要真实，允许不完整言语、自我打断、沉默
9. 节奏应有混乱感，不要每场戏都流畅
10. 具体的笨拙 > 抽象的完美
11. 仿写≠抄袭：禁止使用原著人物名，禁止照搬具体情节

## 字数目标
${targetWords}字（偏差不超过20%）

## 对话比例
约40%为对话

${prevChapterContext}

## 任务
请根据以上设定和Beat描述，写出第${chapterNum}章的完整正文。直接输出正文，不要输出任何说明或标记。`;
  }

  getPrevChapterContext(state) {
    if (!state || !state.completedChapters || state.completedChapters.length === 0) {
      return '## 前情提要\n这是第一章，没有前情。';
    }

    const lastChapter = state.completedChapters[state.completedChapters.length - 1];
    const lastChapterPath = path.join(this.chaptersPath, `${lastChapter}.txt`);

    if (fs.existsSync(lastChapterPath)) {
      const text = fs.readFileSync(lastChapterPath, 'utf-8');
      const preview = text.slice(0, 300);
      return `## 前情提要\n上一章: ${lastChapter}\n${preview}...`;
    }

    return `## 前情提要\n上一章: ${lastChapter}`;
  }

  loadJson(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {}
    return null;
  }
}

function main() {
  const mode = process.argv[2];

  if (mode === 'save') {
    const chapterFilePath = process.argv[3];
    const sourceFilePath = process.argv[4];
    const beatId = process.argv[5];
    if (!chapterFilePath || !sourceFilePath) {
      console.log('用法: node write-chapter.js save <章节路径> <内容文件路径> [beatId]');
      process.exit(1);
    }
    const writer = new ChapterWriter();
    writer.saveAndProcess(chapterFilePath, fs.readFileSync(sourceFilePath, 'utf-8'), beatId);
    return;
  }

  if (mode === 'save-stdin') {
    const chapterFilePath = process.argv[3];
    const beatId = process.argv[4];
    if (!chapterFilePath) {
      console.log('用法: node write-chapter.js save-stdin <章节路径> [beatId]');
      process.exit(1);
    }
    let content = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { content += chunk; });
    process.stdin.on('end', () => {
      const writer = new ChapterWriter();
      writer.saveAndProcess(chapterFilePath, content, beatId);
    });
    return;
  }

  const writer = new ChapterWriter();
  const result = writer.run();

  if (!result) {
    process.exit(1);
  }

  console.log('\n--- 写作指令就绪 ---');
  console.log('方式1: AI写完后保存+自动后处理:');
  console.log(`  node write-chapter.js save "${result.chapterFilePath}" <内容文件> ${result.beatId}`);
  console.log('方式2: 管道输入:');
  console.log(`  cat content.txt | node write-chapter.js save-stdin "${result.chapterFilePath}" ${result.beatId}`);
}

main();
