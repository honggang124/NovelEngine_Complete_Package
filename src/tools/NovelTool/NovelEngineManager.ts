import { narrativeVault } from './NarrativeVault.js';
import { CharTool } from './CharTool.js';
import { PlotTool } from './PlotTool.js';
import { NovelValidator } from './NovelValidator.js';
import { NOVEL_WRITER_AGENT } from '../AgentTool/built-in/novelWriterAgent.js';
import { execFile } from 'child_process';
import path from 'path';

/**
 * NovelEngineManager is the central orchestrator for the NovelEngine.
 * It binds the Agent, Tools, Memory, Validators and Detrace into a single manageable unit.
 */
export class NovelEngineManager {
  public readonly agent = NOVEL_WRITER_AGENT;
  public readonly tools = [CharTool, PlotTool];
  public readonly vault = narrativeVault;
  public readonly validator = NovelValidator;

  /**
   * Orchestrates the full drafting process:
   * Beat Extraction -> Generation -> Validation -> (Optional) Rewrite -> Auto Detrace.
   */
  async executeDraftingCycle(beatId: string, targetWords: number, generateFn: (beat: any) => Promise<string>) {
    const plotGraph = await this.vault.getPlotGraph();
    const beat = plotGraph.find(b => b.id === beatId);

    if (!beat) throw new Error(`Plot beat ${beatId} not found`);

    let draft = await generateFn(beat);
    let audit = await this.validator.audit(draft, targetWords);

    let iterations = 0;
    while (!audit.passed && iterations < 3) {
      console.log(`Audit failed: ${JSON.stringify(audit.issues)}. Triggering rewrite...`);
      draft = await generateFn({
        ...beat,
        rewriteInstruction: `Your previous draft failed audit: ${JSON.stringify(audit.issues)}. Please rewrite and fix these issues.`
      });
      audit = await this.validator.audit(draft, targetWords);
      iterations++;
    }

    return { draft, audit };
  }

  /**
   * Save chapter and auto-detrace AI traces.
   */
  async saveChapter(chapterName: string, content: string): Promise<string> {
    return await this.vault.saveChapter(chapterName, content, true);
  }
}

export const novelEngine = new NovelEngineManager();
