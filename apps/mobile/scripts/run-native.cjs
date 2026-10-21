// Only local compilation. No EAS calls, account creation or automatic identifier selection.
const { spawnSync } = require('node:child_process');
const target = process.argv[2];
if (target !== 'ios' && target !== 'android') {
  throw new Error('Expected ios or android.');
}
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), `run:${target}`, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: { ...process.env, MOBILE_NATIVE_TARGET: target },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
