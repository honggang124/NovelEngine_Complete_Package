#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class RewriteSettingGenerator {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
  }

  async run() {
    const refBooks = this.loadJson('reference_books.json');
    if (!refBooks || !refBooks.source_novels) {
      console.log('未找到原著分析数据，请先运行 init-reference.js\n');
      return;
    }

    const existingSetting = this.loadJson('rewrite_setting.json');
    if (existingSetting && existingSetting.generated) {
      console.log('仿写设定已存在:');
      console.log(`  主角: ${existingSetting.protagonist.name}`);
      console.log(`  女主: ${existingSetting.heroine.name}`);
      console.log(`  时代: ${existingSetting.world.era}`);
      console.log(`  地点: ${existingSetting.world.location}\n`);
      return;
    }

    console.log('生成仿写设定...');

    const setting = this.generateSetting(refBooks);
    
    // 问题3: 检测原著名字冲突
    const conflicts = this.checkNameConflicts(setting, refBooks);
    if (conflicts.length > 0) {
      console.log('名字冲突（与原著重复）:');
      conflicts.forEach(c => console.log(`  ${c}`));
      console.log('重新生成...\n');
      return this.run();
    }
    
    this.saveSetting(setting);
    
    console.log(`主角: ${setting.protagonist.name} (${setting.protagonist.identity})`);
    console.log(`女主: ${setting.heroine.name} (${setting.heroine.identity})`);
    console.log(`时代: ${setting.world.era}`);
    console.log(`地点: ${setting.world.location}`);
    console.log(`相遇: ${setting.scenario.meeting}\n`);
  }

  checkNameConflicts(setting, refBooks) {
    const conflicts = [];
    const originalNames = ['陈默', '林清音', '王芳', '顾霆川', '徐老太', '吴鸣', '沈怜芸', '贾兰英'];
    const newNames = [setting.protagonist.name, setting.heroine.name, setting.ex_wife.name, setting.villain.name, setting.elder.name];
    newNames.forEach(name => {
      if (originalNames.includes(name)) conflicts.push(name);
    });
    return conflicts;
  }

  generateSetting(refBooks) {
    return {
      generated: true, generatedAt: new Date().toISOString(),
      protagonist: this.generateProtagonist(),
      heroine: this.generateHeroine(),
      ex_wife: this.generateExWife(),
      villain: this.generateVillain(),
      elder: this.generateElder(),
      world: this.generateWorld(),
      scenario: this.generateScenario(),
      writing_rules: {
        narrative_rhythm: '快节奏，每2-3章一个爽点，每5章一个大打脸',
        face_slap_pattern: '质疑→展示→震惊→打脸',
        emotion_progression: '契约→同居→微妙关注→护短→动心→表白',
        anti_summary: '禁止总结性结尾，用动作/对话收尾',
        show_dont_tell: '情绪用生理反应表现',
        internal_monologue: '禁止星号(*)，用破折号或直接融入叙述'
      }
    };
  }

  generateProtagonist() {
    const names = ['江枫', '陆尘', '萧寒', '顾远', '楚云', '秦越', '沈渊', '林渊', '叶辰', '苏牧'];
    const identities = [
      { identity: '破产小老板', detail: '公司倒闭，负债累累' },
      { identity: '落魄程序员', detail: '35岁被裁员，房贷压顶' },
      { identity: '失意编剧', detail: '作品被盗，维权失败，行业封杀' },
      { identity: '退伍军人', detail: '退役后找不到工作' },
      { identity: '落榜医学生', detail: '考试失利，行医资格被吊销' }
    ];
    const name = names[Math.floor(Math.random() * names.length)];
    const id = identities[Math.floor(Math.random() * identities.length)];
    return {
      name, age: 28 + Math.floor(Math.random() * 5), identity: id.identity, identity_detail: id.detail,
      belief: '只要有机会，我就能翻身', fear: '重蹈覆辙，再次失去一切', currentGoal: '先活下来，再证明自己',
      traits: ['骨子里不服输', '嘴硬心软', '有底线'], skills: ['待觉醒'],
      relationships: { heroine: '契约关系→?', ex_wife: '前妻', system: '金手指系统，待激活' }
    };
  }

  generateHeroine() {
    const names = ['沈清月', '苏念', '顾倾城', '林宛白', '叶清歌', '楚烟萝', '秦晚晴', '陆离', '江晚', '白洛'];
    const identities = [
      { identity: '财团继承人', detail: '家族企业接班人，被催婚' },
      { identity: '娱乐圈女王', detail: '顶流女星，被黑道威胁' },
      { identity: '科技女总裁', detail: '独角兽公司CEO，被资本围剿' },
      { identity: '神秘世家女', detail: '古老家族嫡女，身负血仇' },
      { identity: '房产女大亨', detail: '地产集团董事长，被家族逼婚' }
    ];
    const name = names[Math.floor(Math.random() * names.length)];
    const id = identities[Math.floor(Math.random() * identities.length)];
    return {
      name, age: 25 + Math.floor(Math.random() * 5), identity: id.identity, identity_detail: id.detail,
      belief: '感情不可信，只有利益是真实的', fear: '被感情绑架失去自由', currentGoal: '应付家族压力',
      traits: ['外冷内热', '极度独立', '护短'], skills: ['商业手腕', '社交能力'],
      relationships: { protagonist: '契约关系→?', family: '施压来源', villain: '家族安排的联姻对象' }
    };
  }

  generateExWife() {
    const names = ['周琳', '徐薇', '李曼', '陈菲', '杨雪', '赵雅', '刘婷', '王倩'];
    const name = names[Math.floor(Math.random() * names.length)];
    return {
      name, age: 27 + Math.floor(Math.random() * 3), identity: '前妻', identity_detail: '势利眼，嫌贫爱富',
      belief: '男人没钱就没用', fear: '如果前夫真的翻盘了怎么办', currentGoal: '证明离开他是正确的',
      traits: ['势利', '嘴毒', '见不得前夫好'],
      relationships: { protagonist: '前夫', new_boyfriend: '现任，有钱人' }
    };
  }

  generateVillain() {
    const names = ['顾凌霄', '萧天阔', '陆远航', '秦傲天', '楚风华', '叶霸天', '沈东来'];
    const name = names[Math.floor(Math.random() * names.length)];
    return {
      name, age: 30 + Math.floor(Math.random() * 8), identity: '终极反派', identity_detail: '家族嫡子，权势滔天',
      belief: '想要的就必须得到', fear: '失去女主，失去利益', currentGoal: '逼女主就范，碾压男主',
      traits: ['表面儒雅实则阴狠', '掌控欲强', '看不起底层'], skills: ['资本运作', '人脉网络'],
      relationships: { heroine: '势在必得的联姻对象', protagonist: '必须碾碎的蝼蚁' }
    };
  }

  generateElder() {
    const names = ['沈老太', '顾老太', '秦老太', '叶老太', '楚老太'];
    const name = names[Math.floor(Math.random() * names.length)];
    return {
      name, age: 70 + Math.floor(Math.random() * 10), identity: '女主长辈', identity_detail: '家族话语权掌控者',
      belief: '门当户对是天理', fear: '晚辈重蹈覆辙', currentGoal: '逼迫女主接受家族安排',
      traits: ['强势', '精明', '认钱认权'],
      relationships: { heroine: '必须管住的晚辈', villain: '最佳联姻对象' }
    };
  }

  generateWorld() {
    const eras = [
      { era: '2008年', context: '金融海啸，实体经济受挫' },
      { era: '2015年', context: '创业热潮，独角兽涌现' },
      { era: '2020年', context: '疫情冲击，百业萧条' },
      { era: '现代', context: '都市丛林，金钱至上' },
      { era: '架空都市', context: '平行世界，资本为王' }
    ];
    const locations = ['江城', '海州', '临城', '滨江', '深城', '蓉城', '杭城', '宁城'];
    const era = eras[Math.floor(Math.random() * eras.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    return {
      era: era.era, context: era.context, location,
      social_structure: { top: '财团家族/上市老板', middle: '企业高管', bottom: '破产者/待业者', special: '隐世高人' },
      core_tension: '底层逆袭 vs 阶层固化'
    };
  }

  generateScenario() {
    const scenarios = [
      { meeting: '医院偶遇', detail: '男主在医院，女主突发急症', trigger: '女主家人注意到男主医术' },
      { meeting: '宴会救美', detail: '男主被拉来充数，女主被骚扰', trigger: '女主注意到男主的不凡' },
      { meeting: '相亲场合', detail: '男主被逼相亲，女主也在相亲，误配', trigger: '女主提出合作' },
      { meeting: '危机求助', detail: '男主走投无路，女主需要人手', trigger: '女主提出雇佣' },
      { meeting: '意外撞车', detail: '男主撞了女主的豪车', trigger: '女主提出打工抵债' }
    ];
    const firstShowSkills = ['宴会上救治急症贵客', '路上偶遇车祸急救', '医院疑难会诊', '女主亲人病重男主出手'];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    return {
      meeting: scenario.meeting, meeting_detail: scenario.detail, meeting_trigger: scenario.trigger,
      first_show_skill: firstShowSkills[Math.floor(Math.random() * firstShowSkills.length)],
      relationship_type: '契约合作', relationship_detail: '假扮情侣/假订婚/雇佣合作'
    };
  }

  saveSetting(setting) {
    fs.writeFileSync(path.join(this.novelEnginePath, 'rewrite_setting.json'), JSON.stringify(setting, null, 2), 'utf-8');
    this.updateCharactersJson(setting);
    this.updateWorldRules(setting);
    this.updatePlotGraph(setting);  // 问题1+2: 自动替换plot_graph人物名
    this.ensureChaptersDir();       // 问题4: 创建chapters目录
    this.initWritingState(setting); // 问题5: 初始化写作状态
  }

  updateCharactersJson(setting) {
    const characters = {
      characters: [
        { id: 'protagonist', name: setting.protagonist.name, role: '男主角', age: setting.protagonist.age, identity: `${setting.protagonist.identity}，${setting.protagonist.identity_detail}`, belief: setting.protagonist.belief, fear: setting.protagonist.fear, currentGoal: setting.protagonist.currentGoal, arcProgress: 0.0, traits: setting.protagonist.traits, skills: setting.protagonist.skills, relationships: setting.protagonist.relationships },
        { id: 'heroine', name: setting.heroine.name, role: '女主角', age: setting.heroine.age, identity: `${setting.heroine.identity}，${setting.heroine.identity_detail}`, belief: setting.heroine.belief, fear: setting.heroine.fear, currentGoal: setting.heroine.currentGoal, arcProgress: 0.0, traits: setting.heroine.traits, skills: setting.heroine.skills, relationships: setting.heroine.relationships },
        { id: 'ex_wife', name: setting.ex_wife.name, role: '前妻/反面角色', age: setting.ex_wife.age, identity: setting.ex_wife.identity_detail, belief: setting.ex_wife.belief, fear: setting.ex_wife.fear, currentGoal: setting.ex_wife.currentGoal, arcProgress: 0.0, traits: setting.ex_wife.traits, skills: [], relationships: setting.ex_wife.relationships },
        { id: 'villain', name: setting.villain.name, role: '终极反派', age: setting.villain.age, identity: setting.villain.identity_detail, belief: setting.villain.belief, fear: setting.villain.fear, currentGoal: setting.villain.currentGoal, arcProgress: 0.0, traits: setting.villain.traits, skills: setting.villain.skills, relationships: setting.villain.relationships },
        { id: 'elder', name: setting.elder.name, role: '女主长辈', age: setting.elder.age, identity: setting.elder.identity_detail, belief: setting.elder.belief, fear: setting.elder.fear, currentGoal: setting.elder.currentGoal, arcProgress: 0.0, traits: setting.elder.traits, skills: [], relationships: setting.elder.relationships }
      ]
    };
    fs.writeFileSync(path.join(this.novelEnginePath, 'characters.json'), JSON.stringify(characters, null, 2), 'utf-8');
  }

  updateWorldRules(setting) {
    const worldRules = `# 世界规则

## 时代背景
- 时间：${setting.world.era}
- 地点：${setting.world.location}
- 背景：${setting.world.context}

## 社会结构
- 顶层：${setting.world.social_structure.top}
- 中层：${setting.world.social_structure.middle}
- 底层：${setting.world.social_structure.bottom}

## 核心张力
- ${setting.world.core_tension}

## 人物身份
- 男主：${setting.protagonist.identity}，${setting.protagonist.identity_detail}
- 女主：${setting.heroine.identity}，${setting.heroine.identity_detail}

## 开篇场景
- 相遇方式：${setting.scenario.meeting}
- 场景细节：${setting.scenario.meeting_detail}
- 首秀技能：${setting.scenario.first_show_skill}

## 写作规则
- 叙事节奏：${setting.writing_rules.narrative_rhythm}
- 打脸模式：${setting.writing_rules.face_slap_pattern}
- 感情推进：${setting.writing_rules.emotion_progression}

## 绝对禁止
- 禁止使用原著人物名字
- 禁止照搬原著情节
- 禁止总结性结尾
- 禁止星号内心独白
`;
    fs.writeFileSync(path.join(this.novelEnginePath, 'world_rules.md'), worldRules, 'utf-8');
  }

  updatePlotGraph(setting) {
    const p = setting.protagonist.name;
    const h = setting.heroine.name;
    const e = setting.ex_wife.name;
    const v = setting.villain.name;
    const el = setting.elder.name;

    const plotGraph = this.loadJson('plot_graph.json');
    if (!plotGraph || !plotGraph.volumes) return;

    plotGraph.novel_title = `《${h}的契约${p}》`;

    const replaceMap = { '男主': p, '女主': h, '前妻': e, '反派': v, '反派家族': v + '家族', '家族长辈': el };
    const replaceFn = (text) => {
      let result = text;
      for (const [key, val] of Object.entries(replaceMap)) {
        result = result.replace(new RegExp(key, 'g'), val);
      }
      return result;
    };

    plotGraph.volumes.forEach(vol => {
      vol.beats.forEach(beat => {
        beat.description = replaceFn(beat.description);
      });
    });

    fs.writeFileSync(path.join(this.novelEnginePath, 'plot_graph.json'), JSON.stringify(plotGraph, null, 2), 'utf-8');
  }

  ensureChaptersDir() {
    const chaptersDir = path.join(this.novelEnginePath, 'chapters');
    if (!fs.existsSync(chaptersDir)) {
      fs.mkdirSync(chaptersDir, { recursive: true });
    }
  }

  initWritingState(setting) {
    const stateFile = path.join(this.novelEnginePath, 'writing_state.json');
    if (fs.existsSync(stateFile)) return;

    const state = {
      currentChapter: 0,
      currentBeat: 'v1_b01',
      totalWordsWritten: 0,
      lastWriteAt: null,
      heroineFavorability: 0,
      protagonistArcProgress: 0,
      completedBeats: [],
      completedChapters: []
    };
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
  }

  loadJson(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {}
    return null;
  }
}

new RewriteSettingGenerator().run();
