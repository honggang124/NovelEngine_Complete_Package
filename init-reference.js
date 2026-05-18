#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

class NovelReferenceCLI {
  constructor() {
    this.novelEnginePath = process.cwd();
  }

  async run() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║         NovelEngine 原著参考系统 v1.0                   ║');
    console.log('║         仿写创作流程优化工具                             ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const args = process.argv.slice(2);

    if (args.length >= 2) {
      await this.initWithUrls(args[0], args[1]);
    } else {
      console.log('📌 用法: node init-reference.js <原著1网址> <原著2网址>\n');
      console.log('示例:');
      console.log('  node init-reference.js http://xxx.com/123.html http://yyy.com/456.html\n');
      console.log('或者使用交互模式:\n');
      await this.interactiveMode();
    }
  }

  async initWithUrls(url1, url2) {
    console.log('📖 原著1:', url1);
    console.log('📖 原著2:', url2);
    console.log('\n正在分析...\n');

    try {
      const meta1 = await this.fetchNovelInfo(url1);
      const meta2 = await this.fetchNovelInfo(url2);

      console.log('✓ 提取成功:\n');
      console.log(`  书1: ${meta1.title} - ${meta1.author} (${meta1.wordCount}字)`);
      console.log(`  书2: ${meta2.title} - ${meta2.author} (${meta2.wordCount}字)\n`);

      const config = this.buildReferenceConfig(meta1, meta2, url1, url2);
      this.saveFiles(config);

      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║                    初始化完成！                          ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      console.log('📄 已生成文件:');
      console.log('   • .novelengine/reference_books.json');
      console.log('   • .novelengine/optimization_guide.md');
      console.log('   • .novelengine/plot_templates.json\n');

    } catch (err) {
      console.error('❌ 错误:', err.message);
    }
  }

  async interactiveMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    const url1 = await question('请输入第一本原著网址: ');
    const url2 = await question('请输入第二本原著网址: ');

    rl.close();

    await this.initWithUrls(url1, url2);
  }

  async fetchNovelInfo(url) {
    const http = require(url.startsWith('https') ? 'https' : 'http');
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const info = this.parseHtml(data, url);
          resolve(info);
        });
      }).on('error', (err) => {
        console.log(`⚠ 无法访问 ${url}, 使用URL提取信息`);
        resolve(this.extractFromUrl(url));
      });
    });
  }

  parseHtml(html, url) {
    // 检测反爬虫保护
    if (html.includes('Just a moment') || html.includes('Cloudflare')) {
      console.log('⚠ 检测到网站反爬保护，使用URL提取ID');
      return this.extractFromUrl(url);
    }

    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    
    // 更灵活的匹配
    let title = '未知';
    if (h1Match && h1Match[1]) {
      title = h1Match[1].trim();
    } else if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].split('_')[0].split('-')[0].trim();
    }

    const authorMatch = html.match(/作者[：:]\s*([^<\s]+)/);
    const wordMatch = html.match(/(\d+)\s*字/);
    const introMatch = html.match(/简介[：:]?\s*([^<]{20,300})/);

    return {
      title: title,
      author: (authorMatch?.[1] || '未知').trim(),
      wordCount: wordMatch ? parseInt(wordMatch[1]) : 0,
      status: html.includes('完本') ? '完本' : '连载中',
      intro: (introMatch?.[1] || '').trim(),
      url: url
    };
  }

  extractFromUrl(url) {
    const idMatch = url.match(/\/(\d+)\.html/);
    return {
      title: `小说${idMatch?.[1] || '未知'}`,
      author: '未知',
      wordCount: 0,
      status: '连载中',
      intro: '',
      url: url
    };
  }

  buildReferenceConfig(meta1, meta2, url1, url2) {
    const book1 = this.analyzeNovel(meta1, url1, 1);
    const book2 = this.analyzeNovel(meta2, url2, 2);

    return {
      primary: [book1, book2],
      fusion: {
        background: '现代都市',
        innovation: {
          fromBook1: book1.plotTemplates.map(t => t.name),
          fromBook2: book2.plotTemplates.map(t => t.name)
        },
        characterMapping: {
          protagonist: { from: book1.coreElements.protagonist?.name || '主角', to: '新主角' },
          heroine: { from: book1.coreElements.heroine?.name || '女主', to: '新女主' }
        }
      },
      createdAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  analyzeNovel(meta, url, index) {
    const intro = meta.intro.toLowerCase();

    const templates = [];
    if (intro.includes('医') || intro.includes('医生')) {
      templates.push({ type: 'medical', name: '医术展示', pattern: '疑难杂症→质疑→治疗→震惊', examples: ['治阑尾炎', '治老寒腿'] });
    }
    if (intro.includes('鉴宝') || intro.includes('古玩')) {
      templates.push({ type: 'treasure', name: '鉴宝捡漏', pattern: '发现真品→嘲讽→购买→价值千万', examples: ['古玩捡漏', '翡翠大涨'] });
    }
    if (intro.includes('极品') || intro.includes('亲戚') || intro.includes('断亲')) {
      templates.push({ type: 'toxic_family', name: '极品亲戚', pattern: '上门闹事→撒泼→反击→失败', examples: ['要钱', '断亲'] });
    }
    if (intro.includes('系统') || intro.includes('觉醒')) {
      templates.push({ type: 'system', name: '系统觉醒', pattern: '任务→完成→奖励', examples: ['技能解锁'] });
    }

    if (templates.length === 0) {
      templates.push({ type: 'general', name: '通用打脸', pattern: '质疑→展示→震惊', examples: ['能力展示'] });
    }

    return {
      id: `book${index}`,
      title: meta.title,
      author: meta.author,
      url: url,
      wordCount: meta.wordCount,
      status: meta.status,
      intro: meta.intro,
      coreElements: {
        protagonist: { name: '主角' },
        heroine: { name: '女主' }
      },
      plotTemplates: templates,
      emotionProgression: [
        { chapter: 1, stage: '相遇', favorability: 0 },
        { chapter: 10, stage: '在意', favorability: 30 },
        { chapter: 30, stage: '确定', favorability: 60 },
        { chapter: 60, stage: '求婚', favorability: 90 }
      ],
      skillProgression: intro.includes('系统') ? [
        { name: '基础技能', level: '中级', chapter: 2 },
        { name: '进阶技能', level: '高级', chapter: 15 },
        { name: '终极技能', level: '神级', chapter: 50 }
      ] : []
    };
  }

  saveFiles(config) {
    const dir = path.join(this.novelEnginePath, '.novelengine');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dir, 'reference_books.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(dir, 'optimization_guide.md'),
      this.generateGuide(config),
      'utf-8'
    );

    fs.writeFileSync(
      path.join(dir, 'plot_templates.json'),
      JSON.stringify({
        medical: { name: '医术展示', beats: ['疑难杂症', '质疑', '治疗', '震惊'] },
        toxic_family: { name: '极品亲戚', beats: ['上门', '闹事', '反击', '失败'] },
        treasure: { name: '鉴宝捡漏', beats: ['发现', '嘲讽', '购买', '证实'] },
        romance: { name: '感情进展', beats: ['互动', '交流', '好感', '推进'] }
      }, null, 2),
      'utf-8'
    );
  }

  generateGuide(config) {
    const book1 = config.primary[0];
    const book2 = config.primary[1];

    return `# NovelEngine 仿写创作优化流程

## 一、原著分析

| 项目 | 书1 | 书2 |
|------|-----|-----|
| 书名 | ${book1.title} | ${book2.title} |
| 作者 | ${book1.author} | ${book2.author} |
| 字数 | ${book1.wordCount} | ${book2.wordCount} |
| 链接 | [查看](${book1.url}) | [查看](${book2.url}) |

### 融合创新

**书1贡献:**
${book1.plotTemplates.map(t => `- ${t.name}: ${t.pattern}`).join('\n')}

**书2贡献:**
${book2.plotTemplates.map(t => `- ${t.name}: ${t.pattern}`).join('\n')}

---

## 二、创作流程

\`\`\`
规划 → Beat设计 → 参考模板
写作 → Beat驱动 → 系统提示
审计 → 状态更新 → 存档备份
\`\`\`

### 每章操作

1. 读取 plot_graph.json 查看当前Beat
2. 参考 reference_books.json 匹配模板
3. 按Beat写作正文（至少1次打脸）
4. 更新 plot_graph.json 和 characters.json

---

## 三、剧情模板

${config.primary.flatMap(b => b.plotTemplates).map(t => `
### ${t.name}
- 模式: ${t.pattern}
- 示例: ${t.examples.join(', ')}
`).join('\n')}

---

## 四、进度规划

### 感情进展
| 章节 | 阶段 | 好感度 |
|------|------|--------|
${book1.emotionProgression.map(e => `| ${e.chapter} | ${e.stage} | ${e.favorability} |`).join('\n')}

${book1.skillProgression.length > 0 ? `### 技能解锁
| 章节 | 技能 | 等级 |
|------|------|------|
${book1.skillProgression.map(s => `| ${s.chapter} | ${s.name} | ${s.level} |`).join('\n')}` : ''}

---

## 五、质量控制

✓ 每章4个Beat
✓ 每章至少1次打脸
✓ 好感度合理推进
✓ 角色行为一致

---

生成时间: ${config.createdAt}
`;
  }
}

const cli = new NovelReferenceCLI();
cli.run();
