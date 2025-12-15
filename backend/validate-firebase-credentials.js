const { validateCredentials } = require('./services/firebaseValidator');

(async () => {
  try {
    const res = await validateCredentials();

    console.log('Loaded service account for project:', res.projectId || 'unknown');
    console.log('Local time:', new Date().toISOString());
    if (res.timeDiffMs !== null) console.log('Time difference (ms):', res.timeDiffMs);

    if (res.tokenExchange && res.tokenExchange.success) {
      console.log('\nSuccess: token exchange succeeded. Scope:', res.tokenExchange.scope);
    } else {
      console.error('\nToken exchange failed:', res.tokenExchange || res.error);
      if (res.timeDiffMs !== null && Math.abs(res.timeDiffMs) > 120000) console.log('⚠️ Time skew detected (>2 minutes). Please sync server time (ntp)');
      process.exit(1);
    }
  } catch (err) {
    console.error('Validation failed:', err.message || err);
    process.exit(1);
  }
})();
