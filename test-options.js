const { program } = require('commander');

program.hook('preAction', (thisCommand, actionCommand) => {
  const opts = actionCommand.opts();
  if (opts.toon) {
    actionCommand.setOptionValue('json', true);
  }
});

program
  .command('test')
  .option('--toon')
  .option('--json')
  .action((options) => {
    console.log(options);
  });

program.parse(['node', 'test-options.js', 'test', '--toon']);
