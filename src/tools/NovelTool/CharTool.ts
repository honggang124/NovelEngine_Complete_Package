import { z } from 'zod';
import { buildTool, ToolUseContext } from '../../Tool.js';
import { narrativeVault } from './NarrativeVault.js';

export const CharTool = buildTool({
  name: 'CharTool',
  searchHint: 'update character arcs, beliefs, and traits',
  inputSchema: z.object({
    action: z.enum(['update_state', 'get_arc', 'add_trait']),
    characterId: z.string(),
    update: z.object({
      belief: z.string().optional(),
      fear: z.string().optional(),
      currentGoal: z.string().optional(),
      arcProgress: z.number().min(0).max(1).optional(),
    }).optional(),
    trait: z.string().optional(),
  }),
  async call(args, context) {
    const { action, characterId, update, trait } = args;

    switch (action) {
      case 'update_state':
        if (!update) throw new Error('Update data is required for update_state action');
        await narrativeVault.updateCharacter(characterId, update);
        return { data: `Successfully updated state for character ${characterId}` };

      case 'get_arc':
        const chars = await narrativeVault.getCharacters();
        const char = chars[characterId];
        if (!char) return { data: `Character ${characterId} not found` };
        return { data: JSON.stringify(char, null, 2) };

      case 'add_trait':
        if (!trait) throw new Error('Trait is required for add_trait action');
        await narrativeVault.updateCharacter(characterId, { traits: (await narrativeVault.getCharacters())[characterId]?.traits || [] }).then(() => {
            // Logic to actually append trait
            const currentChars = narrativeVault.getCharacters(); // simplified for demo
        });
        // Correcting logic for trait addition
        const currentChars = await narrativeVault.getCharacters();
        const charTraits = currentChars[characterId]?.traits || [];
        if (!charTraits.includes(trait)) {
            charTraits.push(trait);
            await narrativeVault.updateCharacter(characterId, { traits: charTraits });
        }
        return { data: `Added trait ${trait} to character ${characterId}` };
    }
  },
  description: async () => 'Manages character psychological states and narrative arcs in the Story Bible.',
});
