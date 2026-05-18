# NovelEngine 原著参考系统使用指南

## 快速开始

### 方法一：命令行直接使用

```bash
# 传入两个原著网址
node init-reference.js http://www.daishuzw.com/daishu/108811.html http://www.daishuzw.com/daishu/108837.html
```

### 方法二：交互式使用

```bash
# 无参数运行，会提示输入网址
node init-reference.js

# 然后按提示输入两本原著的网址
```

## 生成的文件

运行后会在 `.novelengine/` 目录生成：

1. **reference_books.json** - 原著模板库
   - 两本原著的元数据
   - 核心元素提取
   - 剧情模板
   - 技能解锁规划
   - 感情进展规划

2. **optimization_guide.md** - 创作流程指南
   - 原著分析对比
   - 融合创新点
   - 创作工作流程
   - 剧情模板说明
   - 质量控制标准

3. **plot_templates.json** - 剧情模式模板
   - 医术展示模板
   - 极品亲戚模板
   - 鉴宝捡漏模板
   - 感情进展模板

## 工作流程

### 1. 初始化（首次使用）

```bash
node init-reference.js <原著1网址> <原著2网址>
```

### 2. 写每一章

**写作前：**
```bash
# 查看当前进度
cat .novelengine/plot_graph.json

# 查看角色状态
cat .novelengine/characters.json

# 查看原著模板
cat .novelengine/reference_books.json
```

**写作中：**
- 遵循Beat的emotionalGoal和conflict
- 参考剧情模板
- 插入系统任务提示（如有新技能）
- 推进好感度

**写作后：**
- 更新 `plot_graph.json` 标记Beat完成
- 更新 `characters.json` 角色状态
- 更新好感度

## 代码集成

### TypeScript 使用

```typescript
import { NovelReferenceManager } from './src/tools/NovelTool/NovelReferenceManager';

const manager = new NovelReferenceManager('.novelengine');

// 从网址初始化
await manager.initFromUrls(
  'http://www.daishuzw.com/daishu/108811.html',
  'http://www.daishuzw.com/daishu/108837.html'
);

// 查看状态
const status = manager.getStatus();
console.log('当前章节:', status.currentChapter);
console.log('好感度:', status.favorability);
```

### JavaScript 使用

```javascript
const { NovelReferenceManager } = require('./src/tools/NovelTool/NovelReferenceManager');

const manager = new NovelReferenceManager('.novelengine');

manager.initFromUrls(url1, url2).then(() => {
  console.log('初始化完成！');
});
```

## 示例：当前项目

```bash
# 初始化（已执行过）
node init-reference.js \
  http://www.daishuzw.com/daishu/108811.html \
  http://www.daishuzw.com/daishu/108837.html

# 已生成：
# - reference_books.json（两本原著信息）
# - optimization_guide.md（创作流程）
# - plot_templates.json（剧情模板）

# 当前进度：
# - 已写章节：第1-11章
# - 当前好感度：60
# - 已解锁技能：国医圣手、透视眼、鉴宝、格斗
```

## 剧情模板使用

### 医术展示模板

```
Beat 1: 遇到疑难杂症（emotionalGoal: 焦急）
Beat 2: 众人质疑主角（emotionalGoal: 不被信任）
Beat 3: 主角出手治疗（emotionalGoal: 专注）
Beat 4: 一针见效震惊（emotionalGoal: 痛快）
```

### 极品亲戚模板

```
Beat 1: 极品亲戚上门（emotionalGoal: 厌恶）
Beat 2: 提出无理要求（emotionalGoal: 愤怒）
Beat 3: 撒泼打滚（emotionalGoal: 不耐）
Beat 4: 主角反击（emotionalGoal: 痛快）
```

### 鉴宝捡漏模板

```
Beat 1: 进入古玩市场（emotionalGoal: 期待）
Beat 2: 发现疑似真品（emotionalGoal: 兴奋）
Beat 3: 众人嘲讽不信（emotionalGoal: 冷静）
Beat 4: 鉴定证实价值（emotionalGoal: 得意）
```

## 质量控制检查清单

每章写作完成后检查：

- [ ] 完成了4个Beat
- [ ] 至少1次打脸情节
- [ ] 好感度推进合理（单章≤10点）
- [ ] 角色行为符合设定
- [ ] 系统提示正确（如有新技能）
- [ ] 已更新plot_graph.json
- [ ] 已更新characters.json

## 避免的问题

❌ **角色OOC**：角色行为突然改变
❌ **好感度跳跃**：单章好感度涨20+
❌ **重复爽点**：连续章节同类型打脸
❌ **遗忘伏笔**：重要线索消失太久
❌ **节奏失衡**：连续多章无爽点

## 进阶功能

### 批量Beat生成

可以基于reference_books.json自动生成多章Beat：

```typescript
// 根据原著模板批量生成
for (let ch = 12; ch <= 20; ch++) {
  const template = selectTemplate(ch); // 根据章节选择模板
  const beats = generateBeats(template);
  await saveBeats(ch, beats);
}
```

### 智能爽点推荐

```typescript
function recommendPlot(chapter) {
  if (chapter % 10 === 0) return '大打脸';
  if (chapter === 11) return '格斗技能';
  if (chapter === 30) return '篮球技能';
  return '小打脸';
}
```

---

**现在你可以运行：**

```bash
node init-reference.js http://www.daishuzw.com/daishu/108811.html http://www.daishuzw.com/daishu/108837.html
```

系统会自动：
1. 访问两个网址提取原著信息
2. 分析核心元素和剧情模式
3. 生成reference_books.json模板库
4. 生成optimization_guide.md流程指南
5. 生成plot_templates.json剧情模板
