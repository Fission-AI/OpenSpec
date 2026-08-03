import { Command } from 'commander';
const program = new Command();

program.hook('preAction', (thisCmd, actionCmd) => {
  const opts = actionCmd.opts();
  opts.json = true;
});

program
  .command('test')
  .option('--toon')
  .option('--json')
  .action((options) => {
    console.log(options);
  });

program.parse(['node', 'test-hook', 'test', '--toon']);
