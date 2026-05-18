import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

interface NovelMetadata {
  title: string;
  author: string;
  url: string;
  wordCount: number;
  status: string;
  intro: string;
  latestChapter: string;
  category: string;
}

interface PlotTemplate {
  type: string;
  name: string;
  pattern: string;
  examples: string[];
}

interface SkillProgress {
  name: string;
  level: string;
  chapter: number;
  trigger?: string;
}

interface EmotionProgress {
  chapter: number;
  stage: string;
  favorability: number;
  event?: string;
}

interface ReferenceBook {
  id: string;
  title: string;
  author: string;
  url: string;
  wordCount: number;
  status: string;
  intro: string;
  category: string;
  coreElements: {
    protagonist: any;
    heroine?: any;
    exWife?: any;
    antagonist?: any;
    toxicFamily?: any;
    [key: string]: any;
  };
  systemDesign?: {
    name: string;
    trigger: string;
    mechanism: string;
    skills: SkillProgress[];
  };
  plotTemplates: PlotTemplate[];
  emotionProgression?: EmotionProgress[];
  skillProgression?: SkillProgress[];
  toxicFamilyPlot?: any[];
}

interface NovelConfig {
  totalChapters: number;
  chaptersPerVolume: number[];
  volumeNames: string[];
  wordsPerChapter: number;
  beatsPerChapter: number;
  skillUnlockRate: number;
  favorabilityGainPerChapter: number;
  bigFaceSlapRate: number;
  smallFaceSlapPerChapter: number;
}

const DEFAULT_CONFIG: NovelConfig = {
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

export class NovelReferenceManager {
  private novelEnginePath: string;
  private config: NovelConfig;

  constructor(novelEnginePath: string) {
    this.novelEnginePath = novelEnginePath;
    this.config = this.loadConfig();
  }

  private loadConfig(): NovelConfig {
    const configPath = path.join(this.novelEnginePath, 'novel_config.json');
    if (fs.existsSync(configPath)) {
      try {
        const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...saved };
      } catch {
        return { ...DEFAULT_CONFIG };
      }
    }
    return { ...DEFAULT_CONFIG };
  }

  getConfig(): NovelConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<NovelConfig>): void {
    this.config = { ...this.config, ...updates };
    const configPath = path.join(this.novelEnginePath, 'novel_config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    console.log(`✓ 配置已更新：${Object.keys(updates).join(', ')}`);
  }

  async initFromUrls(url1: string, url2: string): Promise<void> {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   NovelEngine 原著参考系统初始化          ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('正在分析原著...');
    console.log(`📖 原著1: ${url1}`);
    console.log(`📖 原著2: ${url2}\n`);

    const meta1 = await this.fetchNovelMetadata(url1);
    const meta2 = await this.fetchNovelMetadata(url2);

    console.log('\n提取到的信息：');
    console.log(`✓ ${meta1.title} - ${meta1.author} (${meta1.wordCount}字)`);
    console.log(`✓ ${meta2.title} - ${meta2.author} (${meta2.wordCount}字)\n`);

    const book1 = await this.analyzeNovel(meta1, 1);
    const book2 = await this.analyzeNovel(meta2, 2);

    const fusion = this.createFusionPlan(book1, book2);

    const referenceConfig = {
      primary: [book1, book2],
      fusion: fusion,
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    await this.saveConfig(referenceConfig);
    await this.generateGuide(referenceConfig);
    await this.generateTemplates(referenceConfig);

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║            初始化完成！                    ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log('已生成文件：');
    console.log('  📄 reference_books.json    - 原著模板库');
    console.log('  📄 optimization_guide.md   - 创作流程指南');
    console.log('  📄 plot_templates.json     - 剧情模板库\n');
  }

  private async fetchNovelMetadata(url: string): Promise<NovelMetadata> {
    const novelId = this.extractId(url);
    
    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const metadata = this.parseHtmlMetadata(data, url);
          resolve(metadata);
        });
      }).on('error', () => {
        console.log(`⚠ 无法访问 ${url}，使用默认信息`);
        resolve({
          title: `小说${novelId}`,
          author: '未知',
          url: url,
          wordCount: 0,
          status: '连载中',
          intro: '',
          latestChapter: '',
          category: '都市'
        });
      });
    });
  }

  private extractId(url: string): string {
    const match = url.match(/\/(\d+)\.html/);
    return match ? match[1] : Date.now().toString();
  }

  private parseHtmlMetadata(html: string, url: string): NovelMetadata {
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const authorMatch = html.match(/作者[：:]?\s*([^<\s]+)/);
    const wordMatch = html.match(/(\d+)\s*字/);
    const introMatch = html.match(/简介[：:]?\s*([^<]{20,200})/);
    const categoryMatch = html.match(/分类[：:]?\s*([^<\s]+)/);

    return {
      title: titleMatch ? titleMatch[1].trim() : '未知',
      author: authorMatch ? authorMatch[1].trim() : '未知',
      url: url,
      wordCount: wordMatch ? parseInt(wordMatch[1]) : 0,
      status: html.includes('完本') ? '完本' : '连载中',
      intro: introMatch ? introMatch[1].trim() : '',
      latestChapter: '',
      category: categoryMatch ? categoryMatch[1].trim() : '都市'
    };
  }

  private async analyzeNovel(meta: NovelMetadata, index: number): Promise<ReferenceBook> {
    console.log(`\n分析《${meta.title}》的核心元素...\n`);

    const isSystemNovel = meta.intro.includes('系统') || meta.intro.includes('觉醒');
    const isToxicFamily = meta.intro.includes('极品') || meta.intro.includes('偏心') || 
                          meta.intro.includes('愚孝') || meta.intro.includes('亲戚');

    const book: ReferenceBook = {
      id: `book${index}`,
      title: meta.title,
      author: meta.author,
      url: meta.url,
      wordCount: meta.wordCount,
      status: meta.status,
      intro: meta.intro,
      category: meta.category,
      coreElements: {},
      plotTemplates: []
    };

    if (isSystemNovel) {
      book.systemDesign = this.extractSystemDesign(meta.intro);
      book.coreElements.system = book.systemDesign.name;
    }

    if (isToxicFamily) {
      book.toxicFamilyPlot = this.extractToxicFamilyPlot(meta.intro);
      book.coreElements.toxicFamily = true;
    }

    book.plotTemplates = this.inferPlotTemplates(meta.intro, meta.category);
    book.emotionProgression = this.createDefaultEmotionProgress();
    book.skillProgression = book.systemDesign?.skills || [];

    return book;
  }

  private extractSystemDesign(intro: string): any {
    const systemNames = ['系统', '金手指', '外挂', '觉醒'];
    let systemName = '未知系统';
    
    for (const name of systemNames) {
      if (intro.includes(name)) {
        const match = intro.match(new RegExp(`([\\u4e00-\\u9fa5]+${name})`));
        if (match) {
          systemName = match[1];
          break;
        }
      }
    }

    return {
      name: systemName,
      trigger: intro.includes('离婚') ? '离婚后觉醒' : '穿越时觉醒',
      mechanism: '完成任务获得奖励',
      skills: [
        { name: '基础技能', level: '中级', chapter: 2 },
        { name: '进阶技能', level: '高级', chapter: 10 },
        { name: '终极技能', level: '神级', chapter: 50 }
      ]
    };
  }

  private extractToxicFamilyPlot(intro: string): any[] {
    const types = [];
    
    if (intro.includes('奶奶') || intro.includes('爷爷')) {
      types.push({ type: '偏心长辈', intensity: '高' });
    }
    if (intro.includes('堂兄') || intro.includes('堂姐')) {
      types.push({ type: '恶毒堂亲', intensity: '中' });
    }
    if (intro.includes('父亲') && intro.includes('愚孝')) {
      types.push({ type: '愚孝父亲', intensity: '高' });
    }

    return types.length > 0 ? types : [{ type: '极品亲戚', intensity: '高' }];
  }

  private inferPlotTemplates(intro: string, category: string): PlotTemplate[] {
    const templates: PlotTemplate[] = [];

    if (intro.includes('医') || intro.includes('医生')) {
      templates.push({
        type: 'medical_showoff',
        name: '医术展示打脸',
        pattern: '疑难杂症→众人质疑→一针见效→震惊全场',
        examples: ['治阑尾炎', '治老寒腿', '治癌症']
      });
    }

    if (intro.includes('鉴宝') || intro.includes('古玩') || intro.includes('捡漏')) {
      templates.push({
        type: 'treasure_identification',
        name: '鉴宝捡漏',
        pattern: '发现真品→众人嘲讽→坚定购买→价值千万',
        examples: ['古玩捡漏', '翡翠大涨', '国宝发现']
      });
    }

    if (category.includes('都市')) {
      templates.push({
        type: 'status_showoff',
        name: '身份地位打脸',
        pattern: '被看不起→展示实力→震惊全场→反派后悔',
        examples: ['豪门聚会', '商业谈判', '公开场合']
      });
    }

    if (intro.includes('极品') || intro.includes('断亲')) {
      templates.push({
        type: 'toxic_family',
        name: '极品亲戚闹事',
        pattern: '上门要钱→撒泼打滚→主角反击→闹事失败',
        examples: ['上门要钱', '道德绑架', '断亲高潮']
      });
    }

    return templates.length > 0 ? templates : [{
      type: 'general',
      name: '通用打脸',
      pattern: '被质疑→展示能力→震惊全场',
      examples: ['能力展示']
    }];
  }

  private createDefaultEmotionProgress(): EmotionProgress[] {
    return [
      { chapter: 1, stage: '初次相遇', favorability: 0 },
      { chapter: 5, stage: '开始在意', favorability: 20 },
      { chapter: 10, stage: '确认心意', favorability: 40 },
      { chapter: 20, stage: '假戏真做', favorability: 60 },
      { chapter: 40, stage: '深入了解', favorability: 80 },
      { chapter: 60, stage: '求婚', favorability: 95 }
    ];
  }

  private createFusionPlan(book1: ReferenceBook, book2: ReferenceBook): any {
    const hasSystem = book1.systemDesign || book2.systemDesign;
    const hasToxicFamily = book1.toxicFamilyPlot || book2.toxicFamilyPlot;

    return {
      background: book1.category.includes('都市') ? '现代都市' : 
                  book1.category.includes('历史') ? '年代文' : '现代都市',
      innovation: {
        system: hasSystem ? '保留系统设定' : '无系统',
        toxicFamily: hasToxicFamily ? '融入极品亲戚线' : '无极品亲戚',
        emotion: '融合两本原著感情线'
      },
      characterMapping: {
        protagonist: { from: `${book1.title}主角`, to: '待设定' },
        heroine: { from: `${book1.title}女主`, to: '待设定' }
      },
      suggestedProgress: {
        totalChapters: this.config.totalChapters || Math.max(book1.wordCount, book2.wordCount) / this.config.wordsPerChapter,
        skillUnlockRate: hasSystem ? `每${this.config.skillUnlockRate}章解锁新技能` : '无系统技能',
        favorabilityRate: `每${this.config.skillUnlockRate}章提升${this.config.favorabilityGainPerChapter}-15点好感`
      }
    };
  }

  private async saveConfig(config: any): Promise<void> {
    const filePath = path.join(this.novelEnginePath, 'reference_books.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✓ 已保存 reference_books.json');
  }

  private async generateGuide(config: any): Promise<void> {
    const guide = this.buildGuide(config);
    const filePath = path.join(this.novelEnginePath, 'optimization_guide.md');
    fs.writeFileSync(filePath, guide, 'utf-8');
    console.log('✓ 已保存 optimization_guide.md');
  }

  private async generateTemplates(config: any): Promise<void> {
    const templates: any = {
      medical: {
        name: '医术展示模板',
        beats: [
          { id: 'b1', description: '遇到疑难杂症', emotionalGoal: '焦急' },
          { id: 'b2', description: '众人质疑主角', emotionalGoal: '不被信任' },
          { id: 'b3', description: '主角出手治疗', emotionalGoal: '专注' },
          { id: 'b4', description: '一针见效震惊全场', emotionalGoal: '痛快' }
        ]
      },
      toxicFamily: {
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
    };

    const filePath = path.join(this.novelEnginePath, 'plot_templates.json');
    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
    console.log('✓ 已保存 plot_templates.json');
  }

  private buildGuide(config: any): string {
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
| 分类 | ${book1.category} | ${book2.category} |
| 链接 | [查看](${book1.url}) | [查看](${book2.url}) |

### 简介

**书1：** ${book1.intro || '暂无'}

**书2：** ${book2.intro || '暂无'}

### 融合创新点

**保留书1：**
${book1.systemDesign ? `- 系统设定：${book1.systemDesign.name}` : ''}
${book1.plotTemplates.map(t => `- ${t.name}`).join('\n')}

**融入书2：**
${book2.toxicFamilyPlot ? '- 极品亲戚设定' : ''}
${book2.plotTemplates.map(t => `- ${t.name}`).join('\n')}

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

${this.generateTemplateSection(book1, book2)}

---

## 四、技能解锁规划

${this.generateSkillSection(book1, book2)}

---

## 五、感情进展规划

${this.generateEmotionSection(book1, book2)}

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

- 原著1：${book1.title}
- 原著2：${book2.title}
- 融合背景：${config.fusion.background}
- 建议总章节：约 ${Math.round(config.fusion.suggestedProgress?.totalChapters || this.config.totalChapters)} 章

---

**使用此流程，确保：**
1. 剧情不跑偏
2. 节奏稳定
3. 角色一致
4. 感情合理
5. 技能合理
`;
  }

  private generateTemplateSection(book1: ReferenceBook, book2: ReferenceBook): string {
    const allTemplates = [...book1.plotTemplates, ...book2.plotTemplates];
    const uniqueTemplates = allTemplates.filter((t, i, arr) => 
      arr.findIndex(x => x.type === t.type) === i
    );

    return uniqueTemplates.map(t => `
### ${t.name}

**触发类型：** ${t.type}

**流程模式：** ${t.pattern}

**示例场景：**
${t.examples.map(e => `- ${e}`).join('\n')}
`).join('\n');
  }

  private generateSkillSection(book1: ReferenceBook, book2: ReferenceBook): string {
    const skills1 = book1.skillProgression || [];
    const skills2 = book2.skillProgression || [];
    const allSkills = [...skills1, ...skills2];

    if (allSkills.length === 0) {
      return `| 章节 | 技能 | 等级 | 触发条件 |
|------|------|------|---------|
| 2 | 基础技能 | 中级 | 新手任务 |
| 10 | 进阶技能 | 高级 | 特殊任务 |
| 30 | 终极技能 | 神级 | 重大挑战 |`;
    }

    return `| 章节 | 技能 | 等级 | 触发条件 |
|------|------|------|---------|
${allSkills.map(s => `| ${s.chapter} | ${s.name} | ${s.level} | ${s.trigger || '任务触发'} |`).join('\n')}`;
  }

  private generateEmotionSection(book1: ReferenceBook, book2: ReferenceBook): string {
    const emotion = book1.emotionProgression || book2.emotionProgression || 
      this.createDefaultEmotionProgress();

    return `| 章节 | 阶段 | 好感度 | 标志事件 |
|------|------|--------|---------|
${emotion.map(e => `| ${e.chapter} | ${e.stage} | ${e.favorability} | ${e.event || '关键事件'} |`).join('\n')}`;
  }

  getStatus(): any {
    const refPath = path.join(this.novelEnginePath, 'reference_books.json');
    const plotPath = path.join(this.novelEnginePath, 'plot_graph.json');
    const charPath = path.join(this.novelEnginePath, 'characters.json');

    const status: any = {
      hasReference: fs.existsSync(refPath),
      hasPlot: fs.existsSync(plotPath),
      hasCharacters: fs.existsSync(charPath),
      currentChapter: 0,
      totalBeats: 0,
      favorability: 0
    };

    if (status.hasPlot) {
      const plot = JSON.parse(fs.readFileSync(plotPath, 'utf-8'));
      status.totalBeats = plot.length;
      const completedBeats = plot.filter((b: any) => b.status === 'completed').length;
      status.currentChapter = Math.floor(completedBeats / this.config.beatsPerChapter);
    }

    if (status.hasCharacters) {
      const chars = JSON.parse(fs.readFileSync(charPath, 'utf-8'));
      status.favorability = chars.su_qinglan?.favorability || 0;
    }

    return status;
  }
}
