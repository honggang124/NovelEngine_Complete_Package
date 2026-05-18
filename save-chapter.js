#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ChapterSaver {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
    this.chaptersPath = path.join(this.novelEnginePath, 'chapters');
  }

  save(chapterFilePath, content, beatId) {
    if (!fs.existsSync(this.chaptersPath)) {
      fs.mkdirSync(this.chaptersPath, { recursive: true });
    }

    const absPath = path.resolve(chapterFilePath);
    const chapterName = path.basename(absPath, '.txt');

    if (!content || content.trim().length < 100) {
      console.log('内容过短，无法保存');
      return false;
    }

    let cleanContent = content.trim();
    if (!cleanContent.startsWith('# ')) {
      cleanContent = `# ${chapterName}\n\n${cleanContent}`;
    }

    fs.writeFileSync(absPath, cleanContent, 'utf-8');
    const wordCount = cleanContent.replace(/\s/g, '').length;
    console.log(`已保存: ${chapterName}`);
    console.log(`字数: ${wordCount}`);

    console.log('\n--- 自动后处理 ---');
    const processorPath = path.join(process.cwd(), 'chapter-post-process.js');
    try {
      const args = beatId ? `"${absPath}" "${beatId}"` : `"${absPath}"`;
      execSync(`node "${processorPath}" ${args}`, { stdio: 'inherit' });
      console.log(`\n完成: ${chapterName} 已保存+审计+消痕+状态更新`);
      return true;
    } catch (err) {
      console.log('后处理出现问题（见上方），章节已保存但需要手动修复');
      return false;
    }
  }

  saveFromStdin(chapterFilePath, beatId) {
    let content = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { content += chunk; });
    process.stdin.on('end', () => {
      this.save(chapterFilePath, content, beatId);
    });
  }
}

const mode = process.argv[2];

if (mode === 'stdin') {
  const chapterFilePath = process.argv[3];
  const beatId = process.argv[4];
  if (!chapterFilePath) {
    console.log('用法: node save-chapter.js stdin <章节文件路径> [beatId]');
    process.exit(1);
  }
  new ChapterSaver().saveFromStdin(chapterFilePath, beatId);
} else if (mode === 'file') {
  const sourcePath = process.argv[3];
  const chapterFilePath = process.argv[4];
  const beatId = process.argv[5];
  if (!sourcePath || !chapterFilePath) {
    console.log('用法: node save-chapter.js file <源文件路径> <章节文件路径> [beatId]');
    process.exit(1);
  }
  const content = fs.readFileSync(sourcePath, 'utf-8');
  new ChapterSaver().save(chapterFilePath, content, beatId);
} else {
  const chapterFilePath = process.argv[2];
  const content = process.argv[3];
  const beatId = process.argv[4];
  if (!chapterFilePath) {
    console.log('用法:');
    console.log('  node save-chapter.js <章节路径> <内容> [beatId]');
    console.log('  node save-chapter.js stdin <章节路径> [beatId]    # 从stdin读取');
    console.log('  node save-chapter.js file <源文件> <章节路径> [beatId]');
    process.exit(1);
  }
  new ChapterSaver().save(chapterFilePath, content, beatId);
}
