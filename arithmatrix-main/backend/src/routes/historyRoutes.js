import { Router } from 'express';
import { HistoryEntry } from '../models/HistoryEntry.js';

const VALID_SOURCES = new Set(['BASIC', 'VOICE', 'CAMERA', 'CURRENCY']);

function normalizeSource(source) {
  if (!source) return undefined;
  const upper = String(source).toUpperCase();
  return VALID_SOURCES.has(upper) ? upper : undefined;
}

export const historyRouter = Router();

historyRouter.get('/', async (req, res, next) => {
  try {
    const source = normalizeSource(req.query.source);
    const filter = source ? { source } : {};

    const items = await HistoryEntry.find(filter)
      .sort({ timestamp: -1 })
      .limit(300)
      .lean();

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

historyRouter.post('/', async (req, res, next) => {
  try {
    const { expression, result, source } = req.body ?? {};

    if (!expression || !result) {
      return res.status(400).json({ message: 'expression and result are required.' });
    }

    const doc = await HistoryEntry.create({
      expression: String(expression),
      result: String(result),
      source: normalizeSource(source) ?? 'BASIC'
    });

    return res.status(201).json({ item: doc });
  } catch (error) {
    next(error);
  }
});

historyRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await HistoryEntry.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'History entry not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

historyRouter.delete('/', async (req, res, next) => {
  try {
    const source = normalizeSource(req.query.source);
    const filter = source ? { source } : {};

    const result = await HistoryEntry.deleteMany(filter);
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    next(error);
  }
});
