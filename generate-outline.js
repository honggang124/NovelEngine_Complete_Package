#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class OutlineGenerator {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
  }

  async run() {
    const rewriteSetting = this.loadJson('rewrite_setting.json');
    if (!rewriteSetting) {
      console.log('未找到仿写设定，请先运行 generate-rewrite-setting.js\n');
      return;
    }

    const plotGraph = this.loadJson('plot_graph.json');
    const novelConfig = this.loadJson('novel_config.json');

    console.log('生成小说大纲...');

    const outline = this.generateOutline(rewriteSetting, plotGraph, novelConfig);
    this.saveOutline(outline);

    console.log(`书名: ${outline.title}`);
    console.log(`字数: ${(outline.totalWords / 10000).toFixed(0)}万字`);
    console.log(`章节: ${outline.totalChapters}章\n`);
  }

  generateOutline(setting, plotGraph, novelConfig) {
    const totalChapters = novelConfig ? novelConfig.totalChapters : 235;
    const wordsPerChapter = novelConfig ? novelConfig.wordsPerChapter : 2122;
    
    const title = this.generateTitle(setting);
    const synopsis = this.generateSynopsis(setting);
    const volumes = this.generateVolumes(setting, plotGraph);
    const characters = this.generateCharacterProfiles(setting);
    const coreConflicts = this.generateCoreConflicts(setting);

    return {
      title, synopsis, volumes, characters, coreConflicts,
      totalChapters, totalWords: totalChapters * wordsPerChapter,
      generatedAt: new Date().toISOString()
    };
  }

  generateTitle(setting) {
    const templates = [
      `《${setting.heroine.name}的契约${setting.protagonist.name}》`,
      `《逆袭：从${setting.protagonist.identity}开始》`,
      `《${setting.protagonist.name}的翻身之路》`,
      `《软饭硬吃：${setting.protagonist.name}的逆袭》`,
      `《契约夫妻：${setting.protagonist.name}与${setting.heroine.name}》`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  generateSynopsis(setting) {
    return `${setting.world.era}，${setting.world.location}。

${setting.protagonist.name}，${setting.protagonist.identity_detail}。在被${setting.ex_wife.name}抛弃、走投无路之际，他意外遇到了${setting.heroine.name}——${setting.heroine.identity_detail}。

两人各怀目的，签下契约。${setting.heroine.name}需要一个挡箭牌，${setting.protagonist.name}需要一条出路。

原本只是一场交易，却在一次次危机中，两颗心渐渐靠近。

当${setting.villain.name}带着家族的滔天权势碾压而来，${setting.protagonist.name}能否守住这份来之不易的感情？

从底层蝼蚁到站在${setting.heroine.name}身侧的男人，这条路，他走得艰难却坚定。

软饭硬吃，也是一种本事。`;
  }

  generateVolumes(setting, plotGraph) {
    const volumes = [];
    if (plotGraph && plotGraph.volumes) {
      plotGraph.volumes.forEach((v, i) => {
        volumes.push({
          id: v.id, name: v.name, chapters: v.chapters,
          theme: this.getVolumeTheme(i, setting),
          summary: this.getVolumeSummary(i, setting),
          keyEvents: this.getKeyEvents(v.beats, setting),
          emotionalArc: this.getEmotionalArc(i, setting)
        });
      });
    }
    return volumes;
  }

  getVolumeTheme(index, setting) {
    const themes = [
      `从${setting.protagonist.identity}到契约丈夫，初露锋芒`,
      '多领域开花，身份反转，感情升温',
      '终极对决，登顶巅峰，真爱告白'
    ];
    return themes[index] || '待定';
  }

  getVolumeSummary(index, setting) {
    const summaries = [
      `${setting.protagonist.name}被${setting.ex_wife.name}抛弃后，意外与${setting.heroine.name}相遇并签下契约。在${setting.heroine.name}家中，他首次展示医术惊艳众人，引来质疑却被打脸。${setting.ex_wife.name}得知后破防闹事，${setting.heroine.name}第一次出面护短。${setting.villain.name}家族开始注意到这个"契约丈夫"。`,
      `${setting.villain.name}正式登场，以未婚夫身份施压。${setting.protagonist.name}解锁第二技能，在鉴宝领域大放异彩。经济实力飞跃，从负债到身家千万。${setting.heroine.name}生病，${setting.protagonist.name}照顾，感情升温。${setting.heroine.name}开始吃醋，假戏真做的信号出现。${setting.elder.name}亲临下最后通牒。`,
      `${setting.villain.name}家族全面施压，${setting.protagonist.name}被陷害遭封杀。至暗时刻后，${setting.protagonist.name}联动所有技能和人脉全面反击。${setting.heroine.name}当众告白，假戏真做。${setting.protagonist.name}揭露${setting.villain.name}黑幕，终极打脸。求婚，真婚换假婚。${setting.ex_wife.name}彻底后悔。大团圆。`
    ];
    return summaries[index] || '待定';
  }

  getKeyEvents(beats, setting) {
    if (!beats) return [];
    return beats.map(beat => ({
      beatId: beat.id,
      description: this.replaceNames(beat.description, setting),
      status: beat.status
    }));
  }

  replaceNames(text, setting) {
    return text.replace(/男主/g, setting.protagonist.name).replace(/女主/g, setting.heroine.name).replace(/前妻/g, setting.ex_wife.name);
  }

  getEmotionalArc(index, setting) {
    const arcs = [
      `互不信任 → 契约关系 → ${setting.heroine.name}首次护短 → 好感萌芽`,
      `${setting.heroine.name}生病破防 → ${setting.protagonist.name}照顾动容 → 吃醋出现 → 假戏真做信号`,
      `${setting.heroine.name}当众告白 → ${setting.protagonist.name}求婚 → 真爱确定`
    ];
    return arcs[index] || '待定';
  }

  generateCharacterProfiles(setting) {
    return [
      { name: setting.protagonist.name, role: '男主角', age: setting.protagonist.age, identity: `${setting.protagonist.identity}，${setting.protagonist.identity_detail}`, personality: setting.protagonist.traits.join('、'), belief: setting.protagonist.belief, fear: setting.protagonist.fear, arc: `从${setting.protagonist.identity}到站在${setting.heroine.name}身侧的男人` },
      { name: setting.heroine.name, role: '女主角', age: setting.heroine.age, identity: `${setting.heroine.identity}，${setting.heroine.identity_detail}`, personality: setting.heroine.traits.join('、'), belief: setting.heroine.belief, fear: setting.heroine.fear, arc: `从封闭内心到为${setting.protagonist.name}打破一切原则` },
      { name: setting.ex_wife.name, role: '前妻/反面角色', age: setting.ex_wife.age, identity: setting.ex_wife.identity_detail, personality: setting.ex_wife.traits.join('、'), arc: '从看不起到后悔，但为时已晚' },
      { name: setting.villain.name, role: '终极反派', age: setting.villain.age, identity: setting.villain.identity_detail, personality: setting.villain.traits.join('、'), arc: '从碾压蝼蚁到被反杀社死' },
      { name: setting.elder.name, role: '女主长辈', age: setting.elder.age, identity: setting.elder.identity_detail, personality: setting.elder.traits.join('、'), arc: '从强势阻拦到被迫接受' }
    ];
  }

  generateCoreConflicts(setting) {
    return [
      { type: '身份差距', description: `${setting.protagonist.name}是${setting.protagonist.identity}，${setting.heroine.name}是${setting.heroine.identity}，天壤之别`, resolution: `${setting.protagonist.name}通过能力证明自己，逐渐缩小差距` },
      { type: '家族压力', description: `${setting.elder.name}和${setting.villain.name}家族施压，要求${setting.heroine.name}嫁给${setting.villain.name}`, resolution: `${setting.protagonist.name}在对抗中证明自己，${setting.heroine.name}坚定选择` },
      { type: '前妻纠缠', description: `${setting.ex_wife.name}得知${setting.protagonist.name}傍上富婆，破防闹事`, resolution: `${setting.heroine.name}护短，${setting.ex_wife.name}彻底出局` },
      { type: '感情真伪', description: '契约关系，双方都宣称只是交易', resolution: '在一次次危机中，真心渐渐浮出水面' },
      { type: '能力质疑', description: `${setting.protagonist.name}的能力不断被质疑`, resolution: '每次质疑都是打脸的机会，越被打压越强' }
    ];
  }

  saveOutline(outline) {
    const md = this.generateMarkdown(outline);
    fs.writeFileSync(path.join(this.novelEnginePath, 'outline.md'), md, 'utf-8');
    fs.writeFileSync(path.join(this.novelEnginePath, 'outline.json'), JSON.stringify(outline, null, 2), 'utf-8');
  }

  generateMarkdown(outline) {
    let md = `# ${outline.title}\n\n## 作品简介\n\n${outline.synopsis}\n\n---\n\n## 作品信息\n\n- 总字数：约 ${(outline.totalWords / 10000).toFixed(0)} 万字\n- 总章节：${outline.totalChapters} 章\n\n---\n\n## 主要人物\n\n`;
    outline.characters.forEach(c => {
      md += `### ${c.name}（${c.role}）\n\n- 年龄：${c.age}岁\n- 身份：${c.identity}\n- 性格：${c.personality}\n- 成长线：${c.arc}\n\n`;
    });
    md += `---\n\n## 核心冲突\n\n`;
    outline.coreConflicts.forEach((c, i) => {
      md += `### 冲突${i + 1}：${c.type}\n\n- 冲突点：${c.description}\n- 解决方式：${c.resolution}\n\n`;
    });
    md += `---\n\n## 分卷大纲\n\n`;
    outline.volumes.forEach((v, i) => {
      md += `### 第${i + 1}卷：${v.name}\n\n章节范围：第${v.chapters}章\n\n卷主题：${v.theme}\n\n情感弧线：${v.emotionalArc}\n\n卷概述：\n\n${v.summary}\n\n关键事件：\n\n`;
      v.keyEvents.forEach(e => { md += `- [${e.status === 'resolved' ? '✓' : ' '}] ${e.description}\n`; });
      md += '\n';
    });
    return md;
  }

  loadJson(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {}
    return null;
  }
}

new OutlineGenerator().run();
