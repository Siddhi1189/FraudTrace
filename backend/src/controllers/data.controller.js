import * as dataService from '../services/data.service.js';
import { validateAndParseTransactionsCSV } from '../utils/csv.js';

export async function uploadCSV(req, res, next) {
  try {
    let csvText = '';

    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (req.body && typeof req.body === 'object') {
      csvText = req.body.csvContent || req.body.csv || '';
    }

    if (!csvText || !csvText.trim()) {
      return res.status(400).json({ error: 'CSV data is required in request body' });
    }

    const { validRecords, rejectedRows } = validateAndParseTransactionsCSV(csvText);

    const batch = await dataService.ingestTransactions({
      records: validRecords,
      source: 'CSV_UPLOAD',
      preRejectedRows: rejectedRows,
    });

    return res.status(201).json({ batch });
  } catch (error) {
    next(error);
  }
}

export async function simulate(req, res, next) {
  try {
    const { seed = 42, size = 'small' } = req.body || {};
    const result = await dataService.simulateData({
      seed: Number(seed) || 42,
      size: size === 'medium' ? 'medium' : 'small',
    });
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getBatches(req, res, next) {
  try {
    const batches = await dataService.getBatches();
    return res.status(200).json({ batches });
  } catch (error) {
    next(error);
  }
}

export async function getBatchById(req, res, next) {
  try {
    const batch = await dataService.getBatchById(req.params.id);
    return res.status(200).json({ batch });
  } catch (error) {
    next(error);
  }
}
