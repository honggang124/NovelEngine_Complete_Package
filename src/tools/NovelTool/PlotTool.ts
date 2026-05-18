import { z } from 'zod';
import { buildTool } from '../../Tool.js';
import { narrativeVault } from './NarrativeVault.js';

export const PlotTool = buildTool({
  name: 'PlotTool',
  searchHint: 'manage plot beats, causality, and continuity',
  inputSchema: z.object({
    action: z.enum(['add_beat', 'link_beats', 'verify_continuity', 'mark_resolved']),
    beatId: z.string(),
    description: z.string().optional(),
    connectedBeatId: z.string().optional(),
    foreshadows: z.string().optional(),
    expectedOutcome: z.string().optional(),
  }),
  async call(args, context) {
    const { action, beatId, description, connectedBeatId, foreshadows, expectedOutcome } = args;
    let graph = await narrativeVault.getPlotGraph();

    switch (action) {
      case 'add_beat':
        const exists = graph.find(b => b.id === beatId);
        if (exists) return { data: `Beat ${beatId} already exists` };
        graph.push({ id: beatId, description, status: 'pending', foreshadows: [], resolved: false });
        await narrativeVault.updatePlotGraph(graph);
        return { data: `Added plot beat: ${beatId}` };

      case 'link_beats':
        if (!connectedBeatId) throw new Error('connectedBeatId is required for link_beats');
        const beat = graph.find(b => b.id === beatId);
        if (!beat) return { data: `Beat ${beatId} not found` };
        beat.links = beat.links || [];
        beat.links.push(connectedBeatId);
        await narrativeVault.updatePlotGraph(graph);
        return { data: `Linked beat ${beatId} to ${connectedBeatId}` };

      case 'verify_continuity':
        // In a real implementation, this would analyze the current draft text
        // For now, it returns the current state of the plot graph for the agent to compare
        return { data: JSON.stringify(graph, null, 2) };

      case 'mark_resolved':
        const targetBeat = graph.find(b => b.id === beatId);
        if (!targetBeat) return { data: `Beat ${beatId} not found` };
        targetBeat.resolved = true;
        targetBeat.status = 'completed';
        await narrativeVault.updatePlotGraph(graph);
        return { data: `Marked beat ${beatId} as resolved` };
    }
  },
  description: async () => 'Manipulates the narrative plot graph and ensures story continuity.',
});
