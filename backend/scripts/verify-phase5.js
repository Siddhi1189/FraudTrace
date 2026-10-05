import http from 'http';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('================================================================');
  console.log('  FRAUDTRACE PHASE 5 IDEMPOTENT ACCEPTANCE VERIFICATION SUITE  ');
  console.log('================================================================\n');

  // 1. Authenticate as Analyst
  console.log('[STEP 1] Authenticating as analyst...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'analyst@fraudtrace.local', password: 'Password123!' }
  );

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
  }
  const token = loginRes.body.token;
  console.log('  -> Authenticated successfully. Analyst Role:', loginRes.body.user.role);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. GET /api/analysis/rules (Verify Rule config and explicit category caps)
  console.log('\n[STEP 2] Fetching active detector rule configurations & category caps...');
  const rulesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/analysis/rules',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('  -> Status:', rulesRes.status);
  console.log('  -> Rule Version:', rulesRes.body.ruleVersion);
  console.log('  -> Detectors Configured:', Object.keys(rulesRes.body.detectorThresholds).join(', '));
  console.log('  -> Account Category Caps:');
  console.log(JSON.stringify(rulesRes.body.scoringWeights.account.categoryCaps, null, 2));
  console.log('  -> Explanation:', rulesRes.body.scoringWeights.account.explanation);

  // 3. POST /api/analysis/run (FIRST ANALYSIS RUN)
  console.log('\n[STEP 3] Executing Analysis Run 1 (Initial Run)...');
  const run1Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/analysis/run',
      method: 'POST',
      headers: authHeaders,
    },
    { trigger: 'MANUAL' }
  );
  console.log('  -> Status:', run1Res.status);
  const run1Id = run1Res.body.run?._id;
  console.log('  -> Run 1 ID:', run1Id);
  console.log('  -> Run 1 Summary:', JSON.stringify(run1Res.body.summary, null, 2));

  // 4. GET /api/rings (Verify ring count after Run 1)
  console.log('\n[STEP 4] Fetching current fraud rings after Run 1...');
  const rings1Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/rings',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('  -> Status:', rings1Res.status);
  const ringsRun1 = rings1Res.body.rings || [];
  console.log(`  -> Current Ring Count after Run 1: ${ringsRun1.length}`);
  if (ringsRun1.length !== 5) {
    throw new Error(`Expected exactly 5 rings after Run 1, but found: ${ringsRun1.length}`);
  }
  ringsRun1.forEach((r) => {
    console.log(`     [${r.label}] FP: ${r.fingerprint} | Score: ${r.score} | Members: ${r.memberCount} | Total Flow: $${r.totalFlow}`);
  });

  // 5. GET /api/alerts (Fetch alerts and patch one to REVIEWING)
  console.log('\n[STEP 5] Fetching alerts created by Run 1...');
  const alerts1Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/alerts',
    method: 'GET',
    headers: authHeaders,
  });
  const alertsRun1 = alerts1Res.body.alerts || [];
  console.log(`  -> Current Alert Count after Run 1: ${alertsRun1.length}`);
  if (alertsRun1.length !== 7) {
    throw new Error(`Expected 7 alerts after Run 1, but found: ${alertsRun1.length}`);
  }

  const alertToPatch = alertsRun1[0];
  console.log(`  -> Patching Alert ${alertToPatch._id} (${alertToPatch.fingerprint}) triageStatus to REVIEWING...`);
  const patchRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/alerts/${alertToPatch._id}`,
      method: 'PATCH',
      headers: authHeaders,
    },
    { triageStatus: 'REVIEWING' }
  );
  console.log('  -> Patch Status:', patchRes.status);
  console.log('  -> Updated Alert Triage Status:', patchRes.body.alert?.triageStatus);

  // 6. POST /api/analysis/run (SECOND ANALYSIS RUN - IDEMPOTENCY TEST)
  console.log('\n[STEP 6] Executing Analysis Run 2 (Idempotency Rerun on same dataset)...');
  const run2Res = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/analysis/run',
      method: 'POST',
      headers: authHeaders,
    },
    { trigger: 'MANUAL' }
  );
  console.log('  -> Status:', run2Res.status);
  const run2Id = run2Res.body.run?._id;
  console.log('  -> Run 2 ID:', run2Id);
  console.log('  -> Run 2 Summary:', JSON.stringify(run2Res.body.summary, null, 2));

  // 7. Verify Historical AnalysisRun Audit Records
  console.log('\n[STEP 7] Verifying AnalysisRun history (Run 1 and Run 2 must both exist)...');
  const getRun1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/analysis/runs/${run1Id}`,
    method: 'GET',
    headers: authHeaders,
  });
  const getRun2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/analysis/runs/${run2Id}`,
    method: 'GET',
    headers: authHeaders,
  });
  console.log(`  -> Run 1 status: ${getRun1.body.run?.status} (ID: ${run1Id})`);
  console.log(`  -> Run 2 status: ${getRun2.body.run?.status} (ID: ${run2Id})`);
  if (!getRun1.body.run || !getRun2.body.run) {
    throw new Error('AnalysisRun historical audit records failed retrieval!');
  }
  console.log('  -> [PASS] Historical AnalysisRun records preserved.');

  // 8. GET /api/rings (Verify ring count is STILL 5 after Run 2)
  console.log('\n[STEP 8] Verifying Current Ring Count after Run 2...');
  const rings2Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/rings',
    method: 'GET',
    headers: authHeaders,
  });
  const ringsRun2 = rings2Res.body.rings || [];
  console.log(`  -> Current Ring Count after Run 2: ${ringsRun2.length}`);
  if (ringsRun2.length !== 5) {
    throw new Error(`IDEMPOTENCY FAILURE: Expected 5 rings after Run 2, but found: ${ringsRun2.length}`);
  }
  console.log('  -> [PASS] Ring count is STILL 5 after rerun!');

  // 9. Verify No Duplicate Logical Ring Fingerprints Exist
  console.log('\n[STEP 9] Checking for duplicate ring fingerprints...');
  const seenFp = new Set();
  const duplicateFps = [];
  ringsRun2.forEach((r) => {
    if (seenFp.has(r.fingerprint)) {
      duplicateFps.push(r.fingerprint);
    }
    seenFp.add(r.fingerprint);
  });
  console.log(`  -> Duplicate Fingerprints Found: ${duplicateFps.length}`);
  if (duplicateFps.length > 0) {
    throw new Error(`Duplicate ring fingerprints detected: ${duplicateFps.join(', ')}`);
  }
  console.log('  -> [PASS] Zero duplicate ring fingerprints found.');

  // 10. Verify Stable Ring Identities Across Reruns
  console.log('\n[STEP 10] Verifying stable ring identities and labels across reruns...');
  for (const r1 of ringsRun1) {
    const r2 = ringsRun2.find((r) => r.fingerprint === r1.fingerprint);
    if (!r2) {
      throw new Error(`Ring with fingerprint ${r1.fingerprint} missing in Run 2!`);
    }
    if (r1._id !== r2._id) {
      throw new Error(`Ring _id changed across runs! Run 1: ${r1._id}, Run 2: ${r2._id}`);
    }
    if (r1.label !== r2.label) {
      throw new Error(`Ring label changed across runs! Run 1: ${r1.label}, Run 2: ${r2.label}`);
    }
    console.log(`  -> Stable Match: [${r1.label}] ID: ${r1._id} | FP: ${r1.fingerprint}`);
  }
  console.log('  -> [PASS] All 5 rings retained identical MongoDB _id, label, and fingerprint.');

  // 11. Verify Alert Triage Carry-Over
  console.log('\n[STEP 11] Verifying Alert Triage Carry-Over after rerun...');
  const alerts2Res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/alerts',
    method: 'GET',
    headers: authHeaders,
  });
  const alertsRun2 = alerts2Res.body.alerts || [];
  console.log(`  -> Alert Count after Run 2: ${alertsRun2.length}`);
  if (alertsRun2.length !== 7) {
    throw new Error(`Expected 7 alerts after Run 2, but found: ${alertsRun2.length}`);
  }
  const preservedAlert = alertsRun2.find((a) => a.fingerprint === alertToPatch.fingerprint);
  console.log(`  -> Patched Alert (${alertToPatch.fingerprint}) Triage Status: ${preservedAlert?.triageStatus}`);
  if (preservedAlert?.triageStatus !== 'REVIEWING') {
    throw new Error(`Expected triageStatus REVIEWING to be preserved, found: ${preservedAlert?.triageStatus}`);
  }
  console.log('  -> [PASS] Alert triage status successfully preserved across reruns.');

  // 12. GET /api/rings/:id (Inspect sample ring details and populated members)
  console.log(`\n[STEP 12] Fetching full details for ring ${ringsRun2[0].label}...`);
  const ringDetailRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/rings/${ringsRun2[0]._id}`,
    method: 'GET',
    headers: authHeaders,
  });
  const sampleRing = ringDetailRes.body.ring;
  console.log('  -> Ring Label:', sampleRing.label);
  console.log('  -> Risk Score:', sampleRing.score);
  console.log('  -> Member Count:', sampleRing.members?.length);
  sampleRing.members?.forEach((m) => {
    const extId = m.entityId?.externalAccountId || m.entityId?.externalDeviceId || m.entityId?.externalMerchantId || m.entityId?._id;
    console.log(`     * Member: ${m.entityType} | ID: ${extId}`);
  });
  console.log('  -> Associated Alerts:', sampleRing.alerts?.length);

  // 13. GET /api/accounts/:id (Inspect account profile and explicit category caps)
  console.log('\n[STEP 13] Fetching high-risk account profile and explicit category scoring breakdown...');
  const accountMember = sampleRing.members.find((m) => m.entityType === 'ACCOUNT');
  const accountMongoId = accountMember?.entityId?._id || accountMember?.entityId;

  const accountRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/accounts/${accountMongoId}`,
    method: 'GET',
    headers: authHeaders,
  });
  console.log('  -> Account External ID:', accountRes.body.account?.externalId);
  console.log('  -> Risk Score:', accountRes.body.latestRisk?.score);
  console.log('  -> "Why Flagged?" Summary:');
  const whyReasons = Array.isArray(accountRes.body.latestRisk?.whyFlagged)
    ? accountRes.body.latestRisk?.whyFlagged
    : [accountRes.body.latestRisk?.whyFlagged];
  whyReasons.forEach((r) => console.log(`     * ${r}`));
  console.log('  -> Decomposed Contributors (with Explicit Category Caps):');
  accountRes.body.latestRisk?.contributors?.forEach((c) => {
    console.log(`     [${c.category}] ${c.signalName}: +${c.pointsAwarded || c.score} pts (Cap: ${c.maxCap || c.weight} pts) - ${c.evidence}`);
  });

  // 14. GET /api/accounts/:id/transactions
  console.log(`\n[STEP 14] Fetching transaction history for account ${accountRes.body.account?.externalId}...`);
  const txRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/accounts/${accountMongoId}/transactions`,
    method: 'GET',
    headers: authHeaders,
  });
  console.log('  -> Status:', txRes.status);
  const txs = txRes.body.transactions || [];
  console.log(`  -> Retrieved ${txs.length} transactions (Total count: ${txRes.body.count || txs.length})`);
  if (txs.length > 0) {
    const t0 = txs[0];
    console.log(`     Sample Tx: ${t0.externalTransactionId} | Amount: $${t0.amount} | Time: ${t0.timestamp}`);
  }

  console.log('\n================================================================');
  console.log('  PHASE 5 IDEMPOTENCY & RECONCILIATION VERIFICATION COMPLETED!  ');
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('\nVerification FAILED:', err);
  process.exit(1);
});
