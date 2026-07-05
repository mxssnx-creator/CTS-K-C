#!/usr/bin/env node

import http from 'http';

const API_BASE = 'http://localhost:3002/api';

const SYMBOLS_4 = ['PLAYSOUTUSDT', 'XANUSDT', 'BSBUSDT', 'NILUSDT'];

async function fetchJSON(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function checkServer() {
  try {
    const res = await fetchJSON('/health');
    return res.status === 200;
  } catch {
    return false;
  }
}

async function runTest() {
  console.log('\n=== 4-SYMBOL BINGX LIVE TRADING TEST ===\n');
  console.log('Symbols:', SYMBOLS_4.join(', '));
  console.log('Mode: Live Trade | Control Orders: ON');

  const serverUp = await checkServer();
  if (!serverUp) {
    console.log('\n[1] Server not running - running standalone diagnostic test');
    console.log('    Run "npm run dev" first for full live test');
    
    const { spawnSync } = require('child_process');
    const symbolsArg = JSON.stringify(SYMBOLS_4);
    const evalCode = `
      import runDiagnostic from "./COMPREHENSIVE_DIAGNOSTIC_TEST.ts";
      runDiagnostic("bingx-x01", ${symbolsArg}, { liveTrade: true, controlOrders: true, volumeFactor: 2.2 })
        .then(r => {
          console.log("DIAG_RESULT_4SYM:", JSON.stringify(r, null, 2));
          process.exit(r.success ? 0 : 1);
        })
        .catch(e => {
          console.error("DIAG_ERR:", e);
          process.exit(1);
        });
    `;

    const diag = spawnSync(process.execPath, [
      "./node_modules/.bin/tsx",
      "--eval",
      evalCode
    ], { stdio: "inherit", timeout: 60000 });

    console.log("\nStandalone diagnostic exit code:", diag.status);
    process.exit(diag.status || 0);
  }

  console.log('\n[1] Server detected - running API-based test');

  try {
    const connRes = await fetchJSON('/connections');
    const connId = connRes.data?.connections?.[0]?.id;

    if (!connId) {
      console.log('ERROR: No active connection found');
      process.exit(1);
    }
    console.log('   Connection:', connId);

    console.log('\n[2] Triggering quickstart with 4 symbols, live trade enabled...');
    const quickstartRes = await fetchJSON('/trade-engine/quick-start', 'POST', {
      action: 'enable',
      connectionId: connId,
      symbolCount: 4,
      symbols: SYMBOLS_4,
    });

    console.log('   Quickstart response:', quickstartRes.status === 200 ? 'OK' : 'FAILED');
    if (quickstartRes.data?.success) {
      console.log('   Symbols configured:', quickstartRes.data.connection?.symbols?.join(', '));
      console.log('   Live trade:', quickstartRes.data.connection?.is_live_trade ? 'ENABLED' : 'DISABLED');
    }

    console.log('\n[3] Checking engine status...');
    const statusRes = await fetchJSON(`/trade-engine/status?connectionId=${connId}`);
    if (statusRes.data?.engines) {
      const engine = statusRes.data.engines[connId];
      console.log('   Engine status:', engine?.status || 'unknown');
      console.log('   Active symbols:', engine?.active_symbols?.join(', ') || 'none');
    }

    console.log('\n[4] Checking progression stats...');
    const statsRes = await fetchJSON(`/trade-engine/progression/${connId}/stats`);
    if (statsRes.data) {
      console.log('   BASE Sets:', statsRes.data.base?.total || 0);
      console.log('   MAIN Sets:', statsRes.data.main?.total || 0);
      console.log('   REAL Sets:', statsRes.data.real?.total || 0);
      console.log('   LIVE Positions:', statsRes.data.realtimeLive || 0);
    }

    console.log('\n[5] Checking for live order creation...');
    const logsRes = await fetchJSON(`/trade-engine/structured-logs?connectionId=${connId}&limit=20`);
    if (logsRes.data?.logs) {
      const liveLogs = logsRes.data.logs.filter((l) =>
        l.message?.includes('LIVE') ||
        l.message?.includes('order') ||
        l.message?.includes('REAL_ORDER')
      );
      console.log('   Live-related log entries:', liveLogs.length);
      if (liveLogs.length > 0) {
        console.log('   Sample:', liveLogs[0].message?.slice(0, 80));
      }
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Check dashboard at http://localhost:3002/strategies');
    console.log('Monitor Redis: redis-cli keys "*bingx-x01*"');
    console.log('Watch for: [REAL_ORDER_ATTEMPT], [LIVE_POSITION], [SL_TP_PLACED]');

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err.message);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});