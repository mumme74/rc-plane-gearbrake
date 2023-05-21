const rctalk = require('./RC_talk_layer'),
      setup = require('./test_setup').setup;

async function start() {
  await setupAll();

  console.log(await rctalk.fetchSettings());
}

start();
