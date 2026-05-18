#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class CharToolJS {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
  }

  getCharacters() {
    return this.loadJson('characters.json');
  }

  getArc(characterId) {
    const data = this.getCharacters();
    if (!data || !data.characters) return null;
    return data.characters.find(c => c.id === characterId) || null;
  }

  updateState(characterId, updates) {
    const data = this.getCharacters();
    if (!data || !data.characters) return false;

    const char = data.characters.find(c => c.id === characterId);
    if (!char) return false;

    Object.assign(char, updates);
    this.saveJson('characters.json', data);
    console.log(`CharTool: 更新 ${char.name || characterId}`);
    return true;
  }

  addTrait(characterId, trait) {
    const data = this.getCharacters();
    if (!data || !data.characters) return false;

    const char = data.characters.find(c => c.id === characterId);
    if (!char) return false;

    if (!char.traits) char.traits = [];
    if (!char.traits.includes(trait)) {
      char.traits.push(trait);
      this.saveJson('characters.json', data);
      console.log(`CharTool: ${char.name} 添加特质 "${trait}"`);
    }
    return true;
  }

  addSkill(characterId, skill) {
    const data = this.getCharacters();
    if (!data || !data.characters) return false;

    const char = data.characters.find(c => c.id === characterId);
    if (!char) return false;

    if (!char.skills) char.skills = [];
    if (!char.skills.includes(skill)) {
      char.skills.push(skill);
      this.saveJson('characters.json', data);
      console.log(`CharTool: ${char.name} 添加技能 "${skill}"`);
    }
    return true;
  }

  updateAfterBeat(characterId, beatId, changes) {
    const result = this.updateState(characterId, changes);
    if (result) {
      console.log(`CharTool: ${characterId} 在 ${beatId} 后状态更新`);
    }
    return result;
  }

  loadJson(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {}
    return null;
  }

  saveJson(filename, data) {
    const filePath = path.join(this.novelEnginePath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

class PlotToolJS {
  constructor() {
    this.novelEnginePath = path.join(process.cwd(), '.novelengine');
  }

  getPlotGraph() {
    return this.loadJson('plot_graph.json');
  }

  addBeat(volumeId, beatId, description, foreshadows) {
    const data = this.getPlotGraph();
    if (!data || !data.volumes) return false;

    const volume = data.volumes.find(v => v.id === volumeId);
    if (!volume) return false;

    if (volume.beats.find(b => b.id === beatId)) return false;

    volume.beats.push({
      id: beatId,
      description,
      status: 'unresolved',
      foreshadows: foreshadows || [],
      resolved: false
    });

    this.saveJson('plot_graph.json', data);
    console.log(`PlotTool: 添加Beat ${beatId}`);
    return true;
  }

  markResolved(beatId) {
    const data = this.getPlotGraph();
    if (!data || !data.volumes) return false;

    for (const volume of data.volumes) {
      for (const beat of volume.beats) {
        if (beat.id === beatId) {
          beat.resolved = true;
          beat.status = 'resolved';
          this.saveJson('plot_graph.json', data);
          console.log(`PlotTool: ${beatId} 标记为完成`);
          return true;
        }
      }
    }
    return false;
  }

  linkBeats(fromBeatId, toBeatId, linkType) {
    const data = this.getPlotGraph();
    if (!data || !data.volumes) return false;

    if (!data.causal_links) data.causal_links = [];
    data.causal_links.push({
      from: fromBeatId,
      to: toBeatId,
      type: linkType || 'enables'
    });

    this.saveJson('plot_graph.json', data);
    console.log(`PlotTool: ${fromBeatId} → ${toBeatId} (${linkType || 'enables'})`);
    return true;
  }

  verifyContinuity() {
    const data = this.getPlotGraph();
    if (!data || !data.volumes) return { valid: false, issues: ['无剧情图谱'] };

    const issues = [];
    const allBeatIds = new Set();
    const allForeshadowTargets = new Set();

    for (const volume of data.volumes) {
      for (const beat of volume.beats) {
        allBeatIds.add(beat.id);
        if (beat.foreshadows) {
          for (const f of beat.foreshadows) {
            allForeshadowTargets.add(f);
          }
        }
      }
    }

    for (const target of allForeshadowTargets) {
      if (!allBeatIds.has(target)) {
        issues.push(`伏笔目标 ${target} 不存在`);
      }
    }

    if (data.causal_links) {
      for (const link of data.causal_links) {
        if (!allBeatIds.has(link.from)) {
          issues.push(`因果链接源 ${link.from} 不存在`);
        }
        if (!allBeatIds.has(link.to)) {
          issues.push(`因果链接目标 ${link.to} 不存在`);
        }
      }
    }

    if (issues.length > 0) {
      console.log('PlotTool: 连续性检查发现问题');
      issues.forEach(i => console.log('  ' + i));
    } else {
      console.log('PlotTool: 连续性检查通过');
    }

    return { valid: issues.length === 0, issues };
  }

  getNextBeat() {
    const data = this.getPlotGraph();
    if (!data || !data.volumes) return null;

    for (const volume of data.volumes) {
      for (const beat of volume.beats) {
        if (!beat.resolved) {
          return { ...beat, volumeName: volume.name, volumeId: volume.id };
        }
      }
    }
    return null;
  }

  loadJson(filename) {
    try {
      const filePath = path.join(this.novelEnginePath, filename);
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {}
    return null;
  }

  saveJson(filename, data) {
    const filePath = path.join(this.novelEnginePath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

module.exports = { CharToolJS, PlotToolJS };

if (require.main === module) {
  const tool = process.argv[2];
  const action = process.argv[3];

  if (tool === 'char') {
    const ct = new CharToolJS();
    if (action === 'get') {
      const char = ct.getArc(process.argv[4]);
      console.log(char ? JSON.stringify(char, null, 2) : '未找到');
    } else if (action === 'update') {
      ct.updateState(process.argv[4], JSON.parse(process.argv[5] || '{}'));
    } else if (action === 'trait') {
      ct.addTrait(process.argv[4], process.argv[5]);
    } else {
      console.log('用法: node char-plot-tools.js char get|update|trait <id> [args]');
    }
  } else if (tool === 'plot') {
    const pt = new PlotToolJS();
    if (action === 'next') {
      const beat = pt.getNextBeat();
      console.log(beat ? `${beat.id}: ${beat.description}` : '全部完成');
    } else if (action === 'resolve') {
      pt.markResolved(process.argv[4]);
    } else if (action === 'verify') {
      const r = pt.verifyContinuity();
      console.log(r.valid ? '连续性: 通过' : '连续性: 未通过');
    } else if (action === 'link') {
      pt.linkBeats(process.argv[4], process.argv[5], process.argv[6]);
    } else {
      console.log('用法: node char-plot-tools.js plot next|resolve|verify|link <args>');
    }
  } else {
    console.log('用法: node char-plot-tools.js char|plot <action> <args>');
  }
}
