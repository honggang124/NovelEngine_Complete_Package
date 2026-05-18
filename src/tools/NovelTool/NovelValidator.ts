/**
 * NovelValidator provides automated checks to ensure the NovelWriter agent
 * adheres to hard constraints like word count and anti-summary protocols.
 * Enhanced with AI-style detection mechanisms.
 */
export class NovelValidator {
  /**
   * Detects if the text ends with summary-style language.
   * Common indicators: "eventually", "in the end", "this marked the beginning", "realized that".
   */
  static detectSummaryEnding(text: string): { isSummary: boolean; reason?: string } {
    const summaryKeywords = [
      'eventually', 'in the end', 'finally', 'consequently',
      'marked the beginning', 'realized that', 'discovered that',
      '从此以后', '最终', '总而言之', '意识到', '这意味着'
    ];

    const lastParagraph = text.split('\\n').filter(p => p.trim()).pop() || '';
    const lowerText = lastParagraph.toLowerCase();

    for (const keyword of summaryKeywords) {
      if (lowerText.includes(keyword)) {
        return { isSummary: true, reason: `Detected summary keyword: ${keyword}` };
      }
    }

    // Heuristic: If the last paragraph is too short and contains a a lot of abstract nouns, it might be a summary.
    if (lastParagraph.length < 100 && (lastParagraph.includes('意义') || lastParagraph.includes('改变'))) {
        return { isSummary: true, reason: 'Last paragraph appears to be a thematic summary.' };
    }

    return { isSummary: false };
  }

  /**
   * NEW: Detects AI-style writing patterns that make text feel artificial.
   */
  static detectAIStyle(text: string): { issues: string[]; score: number } {
    const issues: string[] = [];
    let aiScore = 0; // 0 = human-like, 100 = very AI-like

    // 1. Check for excessive short sentences (AI tendency)
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    const shortSentenceCount = sentences.filter(s => s.length < 15).length;
    const shortSentenceRatio = shortSentenceCount / sentences.length;
    if (shortSentenceRatio > 0.4) {
      issues.push(`⚠️ 短句过多 (${(shortSentenceRatio * 100).toFixed(1)}%)，建议增加长句和复杂句式`);
      aiScore += 20;
    }

    // 2. Check for excessive use of "——" (AI loves dramatic pauses)
    const dashCount = (text.match(/——/g) || []).length;
    const dashDensity = dashCount / (text.length / 100);
    if (dashDensity > 2) {
      issues.push(`⚠️ 破折号"——"使用过多 (${dashCount}次)，建议减少戏剧化停顿`);
      aiScore += 15;
    }

    // 3. Check for cliché metaphors (AI overuses these)
    const clicheMetaphors = [
      '如铁钉', '如潮水', '如暴雨', '如惊雷', '如利剑',
      '狠狠', '疯狂', '剧烈', '恐怖', '窒息'
    ];
    let metaphorCount = 0;
    for (const metaphor of clicheMetaphors) {
      const count = (text.match(new RegExp(metaphor, 'g')) || []).length;
      metaphorCount += count;
    }
    if (metaphorCount > 5) {
      issues.push(`⚠️ 陈词滥调比喻过多 (${metaphorCount}次)，建议使用更独特的描写`);
      aiScore += 15;
    }

    // 4. Check for lack of subtext in dialogue
    const dialogueLines = text.match(/"[^"]+"/g) || [];
    const directDialogueCount = dialogueLines.filter(d => {
      const content = d.slice(1, -1);
      // Direct, on-the-nose dialogue (AI tendency)
      return content.includes('我') && content.includes('你') && content.length < 20;
    }).length;
    if (dialogueLines.length > 0 && directDialogueCount / dialogueLines.length > 0.5) {
      issues.push(`⚠️ 对话过于直白，缺乏潜台词和言外之意`);
      aiScore += 20;
    }

    // 5. Check for repetitive sentence structures
    const sentenceStarters = sentences.map(s => s.trim().slice(0, 5));
    const uniqueStarters = new Set(sentenceStarters);
    if (sentenceStarters.length > 10 && uniqueStarters.size / sentenceStarters.length < 0.6) {
      issues.push(`⚠️ 句式结构重复，建议变化句式开头`);
      aiScore += 15;
    }

    // 6. Check for overuse of ellipsis "..."
    const ellipsisCount = (text.match(/\.\.\.\.|……/g) || []).length;
    if (ellipsisCount > 10) {
      issues.push(`⚠️ 省略号使用过多 (${ellipsisCount}次)，建议减少`);
      aiScore += 10;
    }

    // 7. Check for lack of sensory details (AI focuses on action/plot)
    const sensoryWords = ['气味', '声音', '触感', '温度', '光线', '颜色', '味道'];
    const sensoryCount = sensoryWords.reduce((count, word) => {
      return count + (text.match(new RegExp(word, 'g')) || []).length;
    }, 0);
    if (text.length > 2000 && sensoryCount < 3) {
      issues.push(`⚠️ 缺乏感官细节描写，建议增加视觉、听觉、触觉等感官体验`);
      aiScore += 15;
    }

    return { issues, score: Math.min(aiScore, 100) };
  }

  /**
   * Validates if the text length is within the target range.
   */
  static validateWordCount(text: string, target: number): { isValid: boolean; current: number; variance: number } {
    // Simple word count for English, character count for Chinese
    const current = text.length;
    const variance = Math.abs(current - target) / target;

    return {
      isValid: variance <= 0.2, // 20% variance allowed
      current,
      variance,
    };
  }

  /**
   * Performs a full audit of the generated chapter.
   */
  static async audit(text: string, targetWords: number) {
    const summaryCheck = this.detectSummaryEnding(text);
    const countCheck = this.validateWordCount(text, targetWords);
    const aiStyleCheck = this.detectAIStyle(text);

    return {
      passed: summaryCheck.isSummary === false && countCheck.isValid && aiStyleCheck.score < 50,
      issues: {
        summary: summaryCheck.isSummary ? summaryCheck.reason : null,
        wordCount: countCheck.isValid ? null : `Target: ${targetWords}, Actual: ${countCheck.current}`,
        aiStyle: aiStyleCheck.issues.length > 0 ? aiStyleCheck.issues : null,
        aiScore: aiStyleCheck.score,
      },
    };
  }
}
