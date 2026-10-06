/**
 * RFC-4180 compliant CSV parser and validator for FraudTrace transactions.
 * Zero external dependencies.
 */

// Approved CSV columns
export const EXPECTED_HEADERS = [
  'externalTransactionId',
  'fromAccount',
  'toAccount',
  'merchant',
  'device',
  'amount',
  'timestamp',
];

// PLACEHOLDER(FT-8): Maximum rows allowed per upload batch
export const MAX_BATCH_ROWS = 50000;

export function parseCSVLines(csvText) {
  const sanitized = csvText ? csvText.replace(/^\uFEFF/, '') : '';
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < sanitized.length) {
    const char = sanitized[i];
    const nextChar = sanitized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function validateAndParseTransactionsCSV(csvText) {
  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    throw new Error('CSV content is empty');
  }

  const cleanCsvText = csvText.replace(/^\uFEFF/, '');
  const rawRows = parseCSVLines(cleanCsvText.trim());
  if (rawRows.length === 0) {
    throw new Error('CSV contains no data');
  }

  const headers = rawRows[0].map((h) => h.trim());

  // Validate headers
  const missingHeaders = EXPECTED_HEADERS.filter((eh) => !headers.includes(eh));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
  }

  const headerIndexMap = {};
  headers.forEach((h, idx) => {
    headerIndexMap[h] = idx;
  });

  const dataRows = rawRows.slice(1);
  if (dataRows.length > MAX_BATCH_ROWS) {
    throw new Error(`CSV exceeds maximum row limit of ${MAX_BATCH_ROWS} rows`);
  }

  const validRecords = [];
  const rejectedRows = [];

  const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const rowNumber = rowIndex + 2; // 1-based index including header

    const externalTransactionId = (row[headerIndexMap['externalTransactionId']] || '').trim();
    const fromAccount = (row[headerIndexMap['fromAccount']] || '').trim();
    const toAccount = (row[headerIndexMap['toAccount']] || '').trim();
    const merchant = (row[headerIndexMap['merchant']] || '').trim();
    const device = (row[headerIndexMap['device']] || '').trim();
    const rawAmount = (row[headerIndexMap['amount']] || '').trim();
    const rawTimestamp = (row[headerIndexMap['timestamp']] || '').trim();

    const errors = [];

    if (!externalTransactionId) {
      errors.push('Missing externalTransactionId');
    }

    if (!fromAccount) {
      errors.push('Missing fromAccount');
    }

    // Rule: exactly one destination: either toAccount or merchant
    const hasToAccount = toAccount.length > 0;
    const hasMerchant = merchant.length > 0;

    if (hasToAccount && hasMerchant) {
      errors.push('Transaction has both toAccount and merchant; exactly one is required');
    } else if (!hasToAccount && !hasMerchant) {
      errors.push('Transaction has neither toAccount nor merchant; exactly one is required');
    }

    const amount = Number(rawAmount);
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
      errors.push(`Invalid amount "${rawAmount}": must be a positive number`);
    }

    const parsedDate = new Date(rawTimestamp);
    if (!rawTimestamp || !ISO_8601_REGEX.test(rawTimestamp) || isNaN(parsedDate.getTime())) {
      errors.push(`Invalid timestamp "${rawTimestamp}": must be a valid ISO 8601 date`);
    }

    if (errors.length > 0) {
      rejectedRows.push({
        rowNumber,
        externalTransactionId: externalTransactionId || null,
        errors,
        raw: row.join(','),
      });
    } else {
      validRecords.push({
        rowNumber,
        externalTransactionId,
        fromAccount,
        toAccount: hasToAccount ? toAccount : null,
        merchant: hasMerchant ? merchant : null,
        device: device.length > 0 ? device : null,
        amount,
        timestamp: parsedDate,
      });
    }
  }

  return {
    validRecords,
    rejectedRows,
    totalRows: dataRows.length,
  };
}
