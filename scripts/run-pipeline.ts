/**
 * Manual pipeline runner — use this to test the pipeline locally.
 * Usage: npm run pipeline
 */
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });

async function main() {
  console.log('🗞  Kendallville Daily — Manual Pipeline Run');
  console.log('='.repeat(50));

  const { runPipeline } = await import('../src/lib/pipeline');

  const result = await runPipeline();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Pipeline complete!');
  console.log(`   Articles generated: ${result.articlesGenerated}`);
  console.log(`   Sources scraped:    ${result.sourcesScraped.join(', ')}`);
  console.log(`   Duration:           ${result.durationSeconds}s`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors (${result.errors.length}):`);
    result.errors.forEach((e) => console.log(`   - ${e}`));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
