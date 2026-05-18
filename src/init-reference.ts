import * as readline from 'readline';
import { NovelReferenceManager } from './tools/NovelTool/NovelReferenceManager';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║         NovelEngine 原著参考系统 v1.0                   ║');
  console.log('║         仿写创作流程优化工具                             ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const novelEnginePath = process.cwd();

  console.log('📌 使用说明：');
  console.log('   输入两本要仿写的原著小说网址');
  console.log('   系统将自动提取信息并生成创作模板\n');

  const url1 = await question('请输入第一本原著网址: ');
  const url2 = await question('请输入第二本原著网址: ');

  console.log('\n');

  const manager = new NovelReferenceManager(novelEnginePath);

  try {
    await manager.initFromUrls(url1, url2);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    后续操作指引                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    console.log('📚 已生成文件：');
    console.log('   • reference_books.json  - 原著信息与模板库');
    console.log('   • optimization_guide.md - 完整创作流程指南');
    console.log('   • plot_templates.json   - 剧情模式模板库\n');

    console.log('✍️  写作流程：');
    console.log('   1. 阅读 optimization_guide.md 了解创作流程');
    console.log('   2. 参考 plot_templates.json 选择剧情模式');
    console.log('   3. 每章按Beat序列写作正文');
    console.log('   4. 更新plot_graph.json和characters.json\n');

    console.log('💡 快捷命令：');
    console.log('   • 查看当前状态: npm run status');
    console.log('   • 生成下一章: npm run next');
    console.log('   • 审计内容: npm run validate\n');

  } catch (error: any) {
    console.error('❌ 错误:', error.message);
  }

  rl.close();
}

main();
