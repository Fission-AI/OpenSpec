import path from 'path';
import { existsSync } from 'fs';
import { startServer, findAvailablePort, openBrowser } from './server.js';

export interface DashboardOptions {
  port?: string;
  open?: boolean;
}

export class DashboardCommand {
  async execute(targetPath: string = '.', options?: DashboardOptions): Promise<void> {
    const openspecDir = path.resolve(targetPath, 'openspec');

    if (!existsSync(openspecDir)) {
      throw new Error('No OpenSpec project found. Run "openspec init" first.');
    }

    const requestedPort = parseInt(options?.port || '3000', 10);
    const shouldOpen = options?.open !== false;

    let port: number;
    if (options?.port) {
      // Explicit port: use it directly, fail if unavailable
      port = requestedPort;
    } else {
      // Default: auto-increment from 3000 to 3010
      port = await findAvailablePort(3000, 3010);
    }

    const server = await startServer({ port, openspecDir, noOpen: !shouldOpen });

    const url = `http://127.0.0.1:${port}`;

    server.listen(port, '127.0.0.1', () => {
      console.log(`\nOpenSpec Dashboard running at ${url}`);
      console.log('Press Ctrl+C to stop.\n');

      if (shouldOpen) {
        openBrowser(url);
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        throw new Error(
          `Port ${port} is already in use. Use --port to specify a different port.`
        );
      }
      throw err;
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down dashboard server...');
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}
