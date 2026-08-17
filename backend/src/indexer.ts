import { AtreusIndexer } from './lib/indexer.js';
import pino from 'pino';

const logger = pino({
  name: 'atreus-indexer-main',
  transport: {
    target: 'pino-pretty',
  },
});

async function main() {
  logger.info('Initializing Atreus Chain Indexer...');

  try {
    const indexer = new AtreusIndexer();

    // Run indexing loop
    await indexer.index();

    logger.info('Indexing run completed successfully.');
  } catch (err) {
    logger.error('Fatal error during indexing:', err);
    process.exit(1);
  }
}

main();
