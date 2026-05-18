#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ManualReferenceSetup {
  constructor() {
    this.novelEnginePath = process.cwd();
  }

  async run() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║         NovelEngine 原著参考系统 v1.0                   ║');
    console.log('║         手动输入模式                                     ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('📌 说明：网站有反爬保护，请手动输入原著信息\n');
    console.log('💡 提示：可从网页复制信息后粘贴到下方\n');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    // 输入第一本原著
    console.log('═══════════════════ 原著1 ═══════════════════\n');
    const url1 = await question('网址: ');
    const title1 = await question('书名: ');
    const author1 = await question('作者: ');
    const words1 = await question('字数（如713536）: ');
    const intro1 = await question('简介（可选，回车跳过）: ');

    console.log('\n═══════════════════ 原著2 ═══════════════════\n');
    const url2 = await question('网址: ');
    const title2 = await question('书名: ');
    const author2 = await question('作者: ');
    const words2 = await question('字数（如1296326）: ');
    const intro2 = await question('简介（可选，回车跳过）: ');

    rl.close();

    console.log('\n正在生成配置文件...\n');

    const meta1 = {
      title: title1,
      author: author1,
      wordCount: parseInt(words1) || 0,
      status: '连载中',
      intro: intro1,
      url: url1
    };

    const meta2 = {
      title: title2,
      author: author2,
      wordCount: parseInt(words2) || 0,
      status: '连载中',
      intro: intro2,
      url: url2
    };

    this.generateConfig(meta1, meta2);

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    生成完成！                            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('📄 已生成文件:');
    console.log('   • .novelengine/reference_books.json');
    console.log('   • .novelengine/optimization_guide.md');
    console.log('   • .novelengine/plot_templates.json\n');
  }

  generateConfig(meta1, meta2) {
    const book1 = this.analyzeNovel(meta1, 1);
    const book2 = this.analyzeNovel(meta2, 2);

    const config = {
      primary: [book1, book2],
      fusion: {
        background: '现代都市',
        innovation: {
          fromBook1: book1.plotTemplates.map(t => t.name),
          fromBook2: book2.plotTemplates.map(t => t.name)
        },
        characterMapping: {
          protagonist: { from: '原著主角', to: '新主角' },
          heroine: { from: '原著女主', to: '新女主' }
        }
      },
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    this.saveFiles(config);
  }

  analyzeNovel(meta, index) {
    const intro = (meta.intro || '').toLowerCase();

    const templates = [];
    if (intro.includes('医') || intro.includes('医生')) {
      templates.push({ type: 'medical', name: '医术展示', pattern: '疑难杂症→质疑→治疗→震惊', examples: ['治阑尾炎', '治老寒腿', '治癌症'] });
    }
    if (intro.includes('鉴宝') || intro.includes('古玩') || intro.includes('捡漏')) {
      templates.push({ type: 'treasure', name: '鉴宝捡漏', pattern: '发现真品→嘲讽→购买→价值千万', examples: ['古玩捡漏', '翡翠大涨', '国宝发现'] });
    }
    if (intro.includes('极品') || intro.includes('亲戚') || intro.includes('偏心') || intro.includes('愚孝')) {
      templates.push({ type: 'toxic_family', name: '极品亲戚闹事', pattern: '上门闹事→撒泼打滚→主角反击→闹事失败', examples: ['上门要钱', '道德绑架', '断亲高潮'] });
    }
    if (intro.includes('系统') || intro.includes('觉醒') || intro.includes('金手指')) {
      templates.push({ type: 'system', name: '系统觉醒', pattern: '任务发布→完成任务→获得奖励', examples: ['技能解锁', '属性提升'] });
    }
    if (intro.includes('离婚') || intro.includes('前妻')) {
      templates.push({ type: 'ex_wife', name: '前妻后悔', pattern: '前妻出现→想复合→被打脸→后悔', examples: ['前妻上门', '前妻破防'] });
    }
    if (intro.includes('篮球') || intro.includes('游泳') || intro.includes('运动')) {
      templates.push({ type: 'sports', name: '运动碾压', pattern: '被质疑→展示实力→打破记录→震惊', examples: ['篮球比赛', '游泳破纪录'] });
    }

    if (templates.length === 0) {
      templates.push({ type: 'general', name: '通用打脸', pattern: '质疑→展示能力→震惊', examples: ['能力展示'] });
    }

    const hasSystem = intro.includes('系统') || intro.includes('觉醒');

    return {
      id: `book${index}`,
      title: meta.title,
      author: meta.author,
      url: meta.url,
      wordCount: meta.wordCount,
      status: meta.status,
      intro: meta.intro,
      coreElements: {
        protagonist: { name: '主角' },
        heroine: { name: '女主' }
      },
      systemDesign: hasSystem ? {
        name: '系统',
        trigger: intro.includes('离婚') ? '离婚后觉醒' : '开局觉醒',
        mechanism: '完成任务获得奖励',
        skills: [
          { name: '基础技能', level: '中级', chapter: 2 },
          { name: '进阶技能', level: '高级', chapter: 15 },
          { name: '终极技能', level: '神级', chapter: 50 }
        ]
      } : undefined,
      plotTemplates: templates,
      emotionProgression: [
        { chapter: 1, stage: '初次相遇', favorability: 0 },
        { chapter: 10, stage: '开始在意', favorability: 30 },
        { chapter: 30, stage: '确认心意', favorability: 60 },
        { chapter: 60, stage: '求婚', favorability: 90 }
      ],
      skillProgression: hasSystem ? [
        { name: '国医圣手', level: '神级', chapter: 2, trigger: '新手礼包' },
        { name: '透视眼', level: '初级', chapter: 6, trigger: '治老寒腿' },
        { name: '鉴宝技能', level: '中级', chapter: 7, trigger: '古玩捡漏' },
        { name: '格斗高手', level: '中级', chapter: 11, trigger: '保护弱者' },
        { name: '篮球之神', level: '神级', chapter: 30, trigger: '篮球比赛' },
        { name: '游泳天才', level: '神级', chapter: 50, trigger: '游泳比赛' }
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
        medical: {
          name: '医术展示模板',
          beats: [
            { id: 'b1', description: '遇到疑难杂症', emotionalGoal: '焦急' },
            { id: 'b2', description: '众人质疑主角', emotionalGoal: '不被信任' },
            { id: 'b3', description: '主角出手治疗', emotionalGoal: '专注' },
            { id: 'b4', description: '一针见效震惊全场', emotionalGoal: '痛快' }
          ]
        },
        toxic_family: {
          name: '极品亲戚闹事模板',
          beats: [
            { id: 'b1', description: '极品亲戚上门', emotionalGoal: '厌恶' },
            { id: 'b2', description: '提出无理要求', emotionalGoal: '愤怒' },
            { id: 'b3', description: '撒泼打滚', emotionalGoal: '不耐' },
            { id: 'b4', description: '主角反击闹事失败', emotionalGoal: '痛快' }
          ]
        },
        treasure: {
          name: '鉴宝捡漏模板',
          beats: [
            { id: 'b1', description: '进入古玩市场', emotionalGoal: '期待' },
            { id: 'b2', description: '发现疑似真品', emotionalGoal: '兴奋' },
            { id: 'b3', description: '众人嘲讽不信', emotionalGoal: '冷静' },
            { id: 'b4', description: '鉴定证实价值', emotionalGoal: '得意' }
          ]
        },
        romance: {
          name: '感情进展模板',
          beats: [
            { id: 'b1', description: '互动机会', emotionalGoal: '紧张' },
            { id: 'b2', description: '情感交流', emotionalGoal: '温暖' },
            { id: 'b3', description: '好感提升', emotionalGoal: '甜蜜' },
            { id: 'b4', description: '关系推进', emotionalGoal: '确定' }
          ]
        },
        faceSlap: {
          name: '打脸反转模板',
          beats: [
            { id: 'b1', description: '反派嘲讽', emotionalGoal: '愤怒' },
            { id: 'b2', description: '主角展示实力', emotionalGoal: '专注' },
            { id: 'b3', description: '震惊全场', emotionalGoal: '痛快' },
            { id: 'b4', description: '反派后悔', emotionalGoal: '得意' }
          ]
        }
      }, null, 2),
      'utf-8'
    );
  }

  generateGuide(config) {
    const book1 = config.primary[0];
    const book2 = config.primary[1];

    return `# NovelEngine 仿写创作优化流程

## 一、原著分析

### 主原著信息

| 项目 | 书1：${book1.title} | 书2：${book2.title} |
|------|---------------------|---------------------|
| 作者 | ${book1.author} | ${book2.author} |
| 字数 | ${book1.wordCount} | ${book2.wordCount} |
| 状态 | ${book1.status} | ${book2.status} |
| 链接 | [查看](${book1.url}) | [查看](${book2.url}) |

### 简介

**书1：** ${book1.intro || '暂无'}

**书2：** ${book2.intro || '暂无'}

### 融合创新点

**保留书1：**
${book1.plotTemplates.map(t => `- ${t.name}: ${t.pattern}`).join('\n')}

**融入书2：**
${book2.plotTemplates.map(t => `- ${t.name}: ${t.pattern}`).join('\n')}

---

## 二、创作工作流

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    NovelEngine 创作流程                      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        【规划阶段】      【写作阶段】     【审计阶段】
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ 1.参考原著模板   │ │ 1.读取Beat   │ │ 1.内容审计   │
    │ 2.生成Beat序列  │ │ 2.写作正文   │ │ 2.更新状态   │
    │ 3.角色状态预设  │ │ 3.系统提示   │ │ 3.存档备份   │
    │ 4.爽点节奏设计  │ │ 4.好感度推进 │ │ 4.质量检查   │
    └─────────────────┘ └──────────────┘ └──────────────┘
\`\`\`

### 每章操作流程

**写作前：**
1. 读取 \`plot_graph.json\` 查看当前Beat
2. 读取 \`reference_books.json\` 匹配原著模板
3. 读取 \`characters.json\` 确认角色状态
4. 设计本章爽点（至少1次打脸）

**写作中：**
1. 遵循Beat的emotionalGoal和conflict
2. 插入系统任务提示（如有新技能）
3. 推进好感度（参考emotionProgression）
4. 体现角色成长

**写作后：**
1. 更新 \`plot_graph.json\` 标记Beat完成
2. 更新 \`characters.json\` 角色状态
3. 更新好感度
4. 运行NovelValidator审计

---

## 三、剧情模板库

${this.generateTemplateSection(config)}

---

## 四、技能解锁规划

${this.generateSkillSection(config)}

---

## 五、感情进展规划

${this.generateEmotionSection(config)}

---

## 六、质量控制标准

### 必须满足：

- [x] 每章完成4个Beat
- [x] 每章至少1次打脸
- [x] 每5章至少1次大打脸
- [x] 好感度推进合理（单章不超过10点）
- [x] 技能解锁符合规划
- [x] 角色行为符合设定

### 避免问题：

- ❌ 角色OOC（行为突变）
- ❌ 好感度跳跃（单章涨20+）
- ❌ 重复爽点（连续同类型打脸）
- ❌ 遗忘伏笔（重要线索消失）

---

## 七、当前进度

- 原著1：${book1.title} (${book1.author})
- 原著2：${book2.title} (${book2.author})
- 融合背景：${config.fusion.background}

---

**使用此流程，确保：**
1. 剧情不跑偏
2. 节奏稳定
3. 角色一致
4. 感情合理
5. 技能合理

---

生成时间: ${config.createdAt}
`;
  }

  generateTemplateSection(config) {
    const allTemplates = [...config.primary[0].plotTemplates, ...config.primary[1].plotTemplates];
    const uniqueTypes = new Set();
    const uniqueTemplates = allTemplates.filter(t => {
      if (uniqueTypes.has(t.type)) return false;
      uniqueTypes.add(t.type);
      return true;
    });

    return uniqueTemplates.map(t => `
### ${t.name}

**触发类型：** ${t.type}

**流程模式：** ${t.pattern}

**示例场景：**
${t.examples.map(e => `- ${e}`).join('\n')}
`).join('\n');
  }

  generateSkillSection(config) {
    const skills = config.primary[0].skillProgression.length > 0 
      ? config.primary[0].skillProgression 
      : config.primary[1].skillProgression;

    if (skills.length === 0) {
      return `无系统设定，按原著节奏推进剧情即可。`;
    }

    return `| 章节 | 技能 | 等级 | 触发条件 |
|------|------|------|---------|
${skills.map(s => `| ${s.chapter} | ${s.name} | ${s.level} | ${s.trigger || '任务触发'} |`).join('\n')}`;
  }

  generateEmotionSection(config) {
    const emotion = config.primary[0].emotionProgression;

    return `| 章节 | 阶段 | 好感度 | 标志事件 |
|------|------|--------|---------|
${emotion.map(e => `| ${e.chapter} | ${e.stage} | ${e.favorability} | 关键事件 |`).join('\n')}`;
  }
}

const cli = new ManualReferenceSetup();
cli.run();
