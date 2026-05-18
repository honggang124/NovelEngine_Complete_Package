#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class NovelWriterAuto {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
    this.chaptersPath = path.join(this.novelEnginePath, 'chapters');
  }

  async run() {
    const mode = process.argv[2];

    if (mode === 'write') {
      return this.writeNextChapter();
    }
    if (mode === 'save') {
      const chapterPath = process.argv[3];
      const contentPath = process.argv[4];
      const beatId = process.argv[5];
      if (!chapterPath || !contentPath) {
        console.log('用法: node start-novel-writer.js save <章节路径> <内容文件> [beatId]');
        return;
      }
      return this.saveAndProcess(chapterPath, contentPath, beatId);
    }
    if (mode === 'post') {
      const chapterPath = process.argv[3];
      const beatId = process.argv[4];
      if (!chapterPath) {
        console.log('用法: node start-novel-writer.js post <章节路径> [beatId]');
        return;
      }
      return this.postProcess(chapterPath, beatId);
    }

    console.log('NovelEngine 自动化写作流程\n');

    if (!this.checkFile('reference_books.json')) {
      console.log('未找到原著分析数据');
      console.log('请运行: node init-reference.js <原著1网址> <原著2网址>\n');
      return;
    }
    console.log('[1/4] 原著分析: 已完成');

    if (!this.checkFile('rewrite_setting.json')) {
      console.log('[2/4] 仿写设定: 生成中...');
      this.runScript('generate-rewrite-setting.js');
    } else {
      console.log('[2/4] 仿写设定: 已存在');
    }

    if (!this.checkFile('outline.md')) {
      console.log('[3/4] 小说大纲: 生成中...');
      this.runScript('generate-outline.js');
    } else {
      console.log('[3/4] 小说大纲: 已存在');
    }

    console.log('[4/4] 写作准备: 就绪\n');
    this.showCurrentState();
    this.showNextBeat();

    console.log('\n--- 完整闭环流程 ---');
    console.log('1) node start-novel-writer.js write          # 生成写作提示词');
    console.log('2) 将提示词发给AI，获取正文，保存到文件');
    console.log('3) node start-novel-writer.js save <章节> <内容文件> <beatId>');
    console.log('   → 自动执行: 审计→消痕→设定检查→质量检查→Beat标记→人物更新→状态更新');
    console.log('\n其他:');
    console.log('node start-novel-writer.js post <章节> [beatId]  # 仅后处理');
  }

  writeNextChapter() {
    this.runScript('write-chapter.js');
  }

  saveAndProcess(chapterPath, contentPath, beatId) {
    const savePath = path.join(process.cwd(), 'save-chapter.js');
    try {
      const args = beatId
        ? `file "${contentPath}" "${chapterPath}" "${beatId}"`
        : `file "${contentPath}" "${chapterPath}"`;
      execSync(`node "${savePath}" ${args}`, { stdio: 'inherit' });
    } catch (err) {
      console.log('保存失败:', err.message);
    }
  }

  postProcess(chapterPath, beatId) {
    const processorPath = path.join(process.cwd(), 'chapter-post-process.js');
    try {
      const args = beatId ? `"${chapterPath}" "${beatId}"` : `"${chapterPath}"`;
      execSync(`node "${processorPath}" ${args}`, { stdio: 'inherit' });
    } catch (err) {
      console.log('后处理存在问题（见上方），但章节已保存');
    }
  }

  checkFile(filename) {
    return fs.existsSync(path.join(this.novelEnginePath, filename));
  }

  runScript(scriptName) {
    const scriptPath = path.join(process.cwd(), scriptName);
    try {
      execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    } catch (err) {
      console.log(`运行 ${scriptName} 失败: ${err.message}`);
    }
  }

  showCurrentState() {
    const characters = this.loadJson('characters.json');
    const plotGraph = this.loadJson('plot_graph.json');
    const rewriteSetting = this.loadJson('rewrite_setting.json');
    const novelConfig = this.loadJson('novel_config.json');
    const writingState = this.loadJson('writing_state.json');

    if (rewriteSetting && rewriteSetting.world) {
      console.log(`世界观: ${rewriteSetting.world.era}，${rewriteSetting.world.location}`);
    }

    if (characters && characters.characters) {
      console.log('人物:');
      characters.characters.forEach(c => {
        console.log(`  ${c.name} (${c.role}) 弧光${((c.arcProgress || 0) * 100).toFixed(0)}%`);
      });
    }

    if (plotGraph && plotGraph.volumes) {
      console.log('进度:');
      plotGraph.volumes.forEach(v => {
        const resolved = v.beats.filter(b => b.resolved).length;
        const total = v.beats.length;
        console.log(`  ${v.name}: ${resolved}/${total}`);
      });
    }

    if (writingState) {
      console.log(`已完成: ${writingState.currentChapter || 0}章, ${(writingState.totalWordsWritten || 0).toLocaleString()}字`);
      console.log(`当前Beat: ${writingState.currentBeat || '未开始'}`);
    }

    if (novelConfig) {
      console.log(`参数: ${novelConfig.totalChapters}章, 每章${novelConfig.wordsPerChapter}字`);
    }
  }

  showNextBeat() {
    const plotGraph = this.loadJson('plot_graph.json');
    const novelConfig = this.loadJson('novel_config.json');

    if (!plotGraph || !plotGraph.volumes) return;

    let nextBeat = null;
    for (const volume of plotGraph.volumes) {
      for (const beat of volume.beats) {
        if (!beat.resolved) {
          nextBeat = { ...beat, volumeName: volume.name };
          break;
        }
      }
      if (nextBeat) break;
    }

    if (nextBeat) {
      const targetWords = novelConfig ? novelConfig.wordsPerChapter : 2122;
      console.log(`\n下一个Beat: ${nextBeat.id}`);
      console.log(`描述: ${nextBeat.description}`);
      console.log(`字数: ${targetWords}字`);
    } else {
      console.log('\n所有Beat已完成');
    }
  }

  loadJson(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {}
    return null;
  }
}

new NovelWriterAuto().run();
