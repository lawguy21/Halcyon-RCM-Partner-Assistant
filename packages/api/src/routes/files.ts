// @ts-nocheck
/**
 * File upload and processing routes
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parseCSV, exportToCSV } from '@halcyon-rcm/file-exchange';

export const fileRouter = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// POST /api/files/upload - Upload and parse a CSV file
fileRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = req.file.buffer.toString('utf-8');
    const parsed = parseCSV(content);

    res.json({
      filename: req.file.originalname,
      size: req.file.size,
      rowCount: parsed.data.length,
      headers: parsed.meta?.fields || [],
      errors: parsed.errors,
      preview: parsed.data.slice(0, 10),
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to process file' });
  }
});

// POST /api/files/export - Export data as CSV
fileRouter.post('/export', async (req: Request, res: Response) => {
  try {
    const { data, columns } = req.body as { data: Record<string, unknown>[]; columns: string[] };

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const csv = exportToCSV(data as any, { columns });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate export' });
  }
});

// GET /api/files/templates/:type - Get a template CSV
fileRouter.get('/templates/:type', (req: Request, res: Response) => {
  const templates: Record<string, string[]> = {
    claims: ['claim_id', 'patient_id', 'provider_id', 'amount', 'date_of_service', 'status'],
    patients: ['patient_id', 'first_name', 'last_name', 'date_of_birth', 'insurance_id'],
    providers: ['provider_id', 'name', 'npi', 'tax_id'],
  };

  const template = templates[req.params.type];
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const csv = template.join(',') + '\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-template.csv"`);
  res.send(csv);
});
