(function(){
  if (!window.QUnit) return;
  try {
    // Align timeout with gulpfile runner
    if (QUnit.config) {
      QUnit.config.testTimeout = 60000;
    }
    function hook(name){
      return function(ctx){
        var fn = window[name];
        if (typeof fn === 'function') fn(ctx);
      };
    }
    QUnit.begin(hook('qunit_puppeteer_runner_begin'));
    QUnit.done(hook('qunit_puppeteer_runner_done'));
    QUnit.moduleStart(hook('qunit_puppeteer_runner_moduleStart'));
    QUnit.moduleDone(hook('qunit_puppeteer_runner_moduleDone'));
    QUnit.testStart(hook('qunit_puppeteer_runner_testStart'));
    QUnit.testDone(hook('qunit_puppeteer_runner_testDone'));
    QUnit.log(hook('qunit_puppeteer_runner_log'));
  } catch (e) {
    console.error('QUnit puppeteer hook error', e);
  }
})();
