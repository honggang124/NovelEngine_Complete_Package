import { z } from 'zod';
import { buildTool, ToolUseContext } from '../../Tool.js';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';

/**
 * NarrativeVault handles structured I/O for the NovelEngine story bible.
 * It ensures that JSON files are managed safely and consistently.
 */
export class NarrativeVault {
  private readonly vaultDir = '.novelengine';

  async ensureVaultExists(): Promise<<voidvoid> {
    try {
      await fs.mkdir(this.vaultDir, { recursive: true });
    } catch (e) {
      // Directory already exists
    }
  }

  private async readJson<<TT>(fileName: string): Promise<<TT | null> {
    const filePath = path.join(this.vaultDir, fileName);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  private async writeJson(fileName: string, data: any): Promise<<voidvoid> {
    const filePath = path.join(this.vaultDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getCharacters(): Promise<<RecordRecord<<stringstring, any> | {}> {
    return (await this.readJson('characters.json')) || {};
  }

  async updateCharacter(id: string, updates: any): Promise<<voidvoid> {
    const chars = await this.getCharacters();
    chars[id] = { ...chars[id], ...updates };
    await this.writeJson('characters.json', chars);
  }

  async getPlotGraph(): Promise<<anyany[] | []> {
    return (await this.readJson('plot_graph.json')) || [];
  }

  async updatePlotGraph(graph: any[]): Promise<<voidvoid> {
    await this.writeJson('plot_graph.json', graph);
  }

  async readWorldRules(): Promise<<stringstring> {
    try {
      return await fs.readFile(path.join(this.vaultDir, 'world_rules.md'), 'utf-8');
    } catch (e) {
      return '';
    }
  }

  async writeWorldRules(content: string): Promise<<voidvoid> {
    await fs.writeFile(path.join(this.vaultDir, 'world_rules.md'), content, 'utf-8');
  }

  async getSessionMemory(): Promise<any> {
    const defaultMemory = {
      sessionId: `session_${Date.now()}`,
      startTime: new Date().toISOString(),
      agentType: 'novel-writer',
      currentPhase: 'init',
      currentBeat: null,
      completedBeats: [],
      operations: [],
      lastSummary: '',
      context: {
        novelTitle: '',
        targetChapters: 0,
        currentChapter: 0,
        writtenChapters: 0,
        totalWords: 0
      }
    };
    return (await this.readJson('session_memory.json')) || defaultMemory;
  }

  async updateSessionMemory(updates: Partial<any>): Promise<void> {
    const memory = await this.getSessionMemory();
    const updated = { ...memory, ...updates, lastUpdated: new Date().toISOString() };
    await this.writeJson('session_memory.json', updated);
  }

  async addOperation(action: string, status: string, details: string): Promise<void> {
    const memory = await this.getSessionMemory();
    memory.operations.push({
      timestamp: new Date().toISOString(),
      action,
      status,
      details
    });
    await this.writeJson('session_memory.json', memory);
  }

  async saveChapter(chapterName: string, content: string, autoDetrace: boolean = true): Promise<string> {
    const chaptersDir = path.join(this.vaultDir, 'chapters');
    try { await fs.mkdir(chaptersDir, { recursive: true }); } catch (e) {}
    const filePath = path.join(chaptersDir, `${chapterName}.txt`);
    await fs.writeFile(filePath, content, 'utf-8');
    if (autoDetrace) { await this.runDetrace(filePath); }
    await this.addOperation('save_chapter', 'completed', `保存章节: ${chapterName}`);
    return filePath;
  }

  private async runDetrace(filePath: string): Promise<void> {
    const detraceScript = path.resolve(process.cwd(), 'ai_trace_remover.js');
    try {
      await fs.access(detraceScript);
      await new Promise<void>((resolve) => {
        execFile('node', [detraceScript, filePath], { timeout: 30000 }, (err) => {
          if (err) { console.warn(`[Detrace] Warning: ${err.message}`); }
          else { console.log(`[Detrace] Auto-processed: ${path.basename(filePath)}`); }
          resolve();
        });
      });
    } catch (e) {
      console.warn('[Detrace] ai_trace_remover.js not found, skipping');
    }
  }
}

export const narrativeVault = new NarrativeVault();
