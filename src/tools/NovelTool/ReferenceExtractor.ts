import * as fs from 'fs';
import * as path from 'path';

interface NovelInfo {
  title: string;
  author: string;
  url: string;
  wordCount: number;
  status: string;
  coreElements: any;
  systemDesign?: any;
  toxicFamilyPlot?: any;
  skillProgression?: any;
  plotTemplates: any[];
  emotionProgression?: any[];
}

interface ReferenceConfig {
  primary: NovelInfo[];
  fusion: {
    background: string;
    innovation: any;
    characterMapping: any;
  };
}

export class ReferenceExtractor {
  private novelEnginePath: string;

  constructor(novelEnginePath: string) {
    this.novelEnginePath = novelEnginePath;
  }

  async extractFromUrls(url1: string, url2: string): Promise<ReferenceConfig> {
    console.log('开始提取原著信息...');
    console.log(`原著1: ${url1}`);
    console.log(`原著2: ${url2}`);

    const novel1 = await this.parseNovelUrl(url1);
    const novel2 = await this.parseNovelUrl(url2);

    const config: ReferenceConfig = {
      primary: [novel1, novel2],
      fusion: this.generateFusion(novel1, novel2)
    };

    return config;
  }

  private async parseNovelUrl(url: string): Promise<NovelInfo> {
    const novelId = this.extractNovelId(url);
    
    console.log(`\n正在分析小说 ID: ${novelId}`);
    console.log('提示：请提供以下信息（可从网页复制）：');
    console.log('1. 小说标题');
    console.log('2. 作者');
    console.log('3. 字数');
    console.log('4. 简介');
    console.log('5. 核心设定（主角、女主、系统、反派等）');

    return {
      title: '待填写',
      author: '待填写',
      url: url,
      wordCount: 0,
      status: '连载中',
      coreElements: {},
      plotTemplates: []
    };
  }

  private extractNovelId(url: string): string {
    const match = url.match(/\/(\d+)\.html/);
    return match ? match[1] : 'unknown';
  }

  generateFusion(novel1: NovelInfo, novel2: NovelInfo): any {
    return {
      background: '现代都市（需要根据原著调整）',
      innovation: {
        system: '原著1的系统设定',
        toxicFamily: '原著2的极品亲戚设定',
        emotion: '融合两本原著的感情线'
      },
      characterMapping: {
        protagonist: { from: '原著主角', to: '新主角名' },
        heroine: { from: '原著女主', to: '新女主名' }
      }
    };
  }

  async saveReferenceBooks(config: ReferenceConfig): Promise<void> {
    const filePath = path.join(this.novelEnginePath, 'reference_books.json');
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`\n已保存: ${filePath}`);
  }

  async generateOptimizationGuide(config: ReferenceConfig): Promise<void> {
    const guide = this.buildGuideContent(config);
    const filePath = path.join(this.novelEnginePath, 'optimization_guide.md');
    fs.writeFileSync(filePath, guide, 'utf-8');
    console.log(`已保存: ${filePath}`);
  }

  private buildGuideContent(config: ReferenceConfig): string {
    const novel1 = config.primary[0];
    const novel2 = config.primary[1];

    return `# NovelEngine 仿写创作优化流程

## 一、原著分析

### 主原著对比

| 维度 | 书1：${novel1.title} | 书2：${novel2.title} |
|------|---------------------|---------------------|
| 背景 | ${novel1.coreElements.background || '待分析'} | ${novel2.coreElements.background || '待分析'} |
| 金手指 | ${novel1.systemDesign?.name || '待分析'} | ${novel2.systemDesign?.name || '待分析'} |
| 开局 | ${novel1.coreElements.opening || '待分析'} | ${novel2.coreElements.opening || '待分析'} |
| 反派 | ${novel1.coreElements.antagonist || '待分析'} | ${novel2.coreElements.antagonist || '待分析'} |
| 爽点 | ${novel1.coreElements.sellingPoints || '待分析'} | ${novel2.coreElements.sellingPoints || '待分析'} |

### 融合创新点

**保留书1：**
- ${novel1.coreElements.keepElements || '待分析'}

**融入书2：**
- ${novel2.coreElements.keepElements || '待分析'}

---

## 二、NovelEngine 优化方案

### 1. 原著模板库（reference_books.json）

已创建，包含：
- 两本主原著的章节模板
- 剧情模式（医术展示、鉴宝捡漏、运动碾压等）
- 技能解锁进度参考
- 感情进展参考
- 角色映射表

### 2. 创作工作流

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

### 3. Beat驱动写作优化

**每章写作前：**
1. 从plot_graph.json读取当前Beat
2. 从reference_books.json匹配原著模板
3. 从characters.json读取角色状态
4. 设计本章爽点（至少1次小打脸，每5章1次大打脸）

**每章写作中：**
1. 遵循Beat描述的emotionalGoal和conflict
2. 插入系统任务提示（如有新技能解锁）
3. 推进好感度（参考emotionProgression）
4. 体现角色成长（arcProgress更新）

**每章写作后：**
1. 更新plot_graph.json（标记Beat完成）
2. 更新characters.json（角色状态）
3. 更新好感度（如有变化）
4. 审计内容（NovelValidator）

### 4. 剧情模式模板

#### 医术展示打脸
\`\`\`
触发条件：遇到疑难杂症
流程：
1. 病人情况危急/众人束手无策
2. 主角出手，施针/用药
3. 一针见效/当场痊愈
4. 众人震惊/反派打脸
5. 系统奖励（如有）
\`\`\`

#### 极品亲戚闹事
\`\`\`
触发条件：极品亲戚上门/要钱/撒泼
流程：
1. 极品亲戚出现，提出无理要求
2. 撒泼打滚/道德绑架
3. 主角反击/女主维护
4. 闹事失败/狼狈离去
5. 好感度提升（女主维护时）
\`\`\`

#### 鉴宝捡漏
\`\`\`
触发条件：进入古玩市场/拍卖会
流程：
1. 发现疑似赝品的真品
2. 众人嘲讽不信
3. 主角坚定购买
4. 鉴定证实价值
5. 震惊全场/捡漏成功
\`\`\`

### 5. 技能解锁规划

| 章节 | 技能 | 触发任务 | 打脸对象 |
|------|------|---------|---------|
| 2 | 国医圣手（神级） | 新手礼包 | 无 |
| 4 | 强化体质 | 救人任务 | 无 |
| 6 | 透视眼（初级） | 特殊任务 | 前同事 |
| 7 | 鉴宝技能（中级） | 捡漏任务 | 古玩圈 |
| 11 | 格斗高手（中级） | 保护弱者 | 流氓 |
| 20 | 书画大师（大师） | 鉴定任务 | 艺术圈 |
| 30 | 篮球之神（神级） | 比赛任务 | 体育圈 |

### 6. 感情进展规划

| 章节 | 阶段 | 好感度 | 标志事件 |
|------|------|--------|---------|
| 1 | 假结婚协议 | 0 | 初次相遇 |
| 5 | 开始在意 | 20 | 维护男主 |
| 10 | 确认心意 | 40 | 关键事件 |
| 20 | 假戏真做 | 60 | 表白确认 |
| 40 | 深入了解 | 80 | 见家长 |
| 60 | 求婚 | 90 | 当众求婚 |

---

## 三、实际操作步骤

### 写下一章时：

\`\`\`bash
# 1. 检查当前进度
read .novelengine/plot_graph.json  # 查看当前Beat
read .novelengine/characters.json   # 查看角色状态

# 2. 匹配原著模板
read .novelengine/reference_books.json  # 查找类似剧情

# 3. 设计Beat（如果未定义）
# 参考原著模板设计本章4个Beat

# 4. 写作正文
# 遵循Beat+模板+系统提示

# 5. 更新状态
# 更新plot_graph.json（标记完成）
# 更新characters.json（角色状态+好感度）
\`\`\`

---

## 四、质量控制

### NovelValidator 审计项：

1. **角色一致性**：角色行为符合characters.json设定
2. **好感度合理**：推进符合emotionProgression曲线
3. **爽点频率**：每章至少1次打脸
4. **技能进度**：符合技能解锁规划
5. **Beat完成**：每章完成4个Beat
6. **系统提示**：新技能解锁时插入系统消息

### 避免问题：

1. **角色OOC**：角色行为不能突然改变
2. **好感度跳跃**：不能一章涨太多好感
3. **重复爽点**：连续章节不能都是同类型打脸
4. **遗忘伏笔**：重要伏笔不能消失太久

---

## 五、当前进度

- 原著1：${novel1.title} (${novel1.url})
- 原著2：${novel2.title} (${novel2.url})
- 融合背景：${config.fusion.background}

---

**使用此优化流程，可确保：**
1. 剧情不跑偏（参考原著模板）
2. 节奏稳定（爽点频率控制）
3. 角色一致（状态追踪）
4. 感情合理（好感度曲线）
5. 技能合理（解锁规划）
`;
  }

  async quickSetup(url1: string, url2: string, novel1Data: Partial<NovelInfo>, novel2Data: Partial<NovelInfo>): Promise<void> {
    console.log('\n=== 快速设置原著参考 ===\n');

    const novel1: NovelInfo = {
      title: novel1Data.title || '原著1',
      author: novel1Data.author || '未知',
      url: url1,
      wordCount: novel1Data.wordCount || 0,
      status: novel1Data.status || '连载中',
      coreElements: novel1Data.coreElements || {},
      systemDesign: novel1Data.systemDesign,
      toxicFamilyPlot: novel1Data.toxicFamilyPlot,
      skillProgression: novel1Data.skillProgression,
      plotTemplates: novel1Data.plotTemplates || [],
      emotionProgression: novel1Data.emotionProgression
    };

    const novel2: NovelInfo = {
      title: novel2Data.title || '原著2',
      author: novel2Data.author || '未知',
      url: url2,
      wordCount: novel2Data.wordCount || 0,
      status: novel2Data.status || '连载中',
      coreElements: novel2Data.coreElements || {},
      systemDesign: novel2Data.systemDesign,
      toxicFamilyPlot: novel2Data.toxicFamilyPlot,
      skillProgression: novel2Data.skillProgression,
      plotTemplates: novel2Data.plotTemplates || [],
      emotionProgression: novel2Data.emotionProgression
    };

    const config: ReferenceConfig = {
      primary: [novel1, novel2],
      fusion: this.generateFusion(novel1, novel2)
    };

    await this.saveReferenceBooks(config);
    await this.generateOptimizationGuide(config);

    console.log('\n=== 设置完成 ===');
    console.log('已生成文件：');
    console.log('1. reference_books.json - 原著模板库');
    console.log('2. optimization_guide.md - 优化流程指南');
  }
}
