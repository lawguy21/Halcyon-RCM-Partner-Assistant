import { Router } from 'express';
import multer from 'multer';
import { batchImportController } from '../controllers/batchImportController.js';

const router = Router();

// Configure multer for memory storage (we'll save to disk in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' ||
        file.originalname.endsWith('.csv') ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Batch import routes
router.post('/start', upload.single('file'), batchImportController.startBatchImport);
router.post('/validate', upload.single('file'), batchImportController.validateCSV);
router.get('/status/:importId', batchImportController.getImportStatus);
router.get('/progress/:importId/stream', batchImportController.streamProgress);
router.post('/cancel/:importId', batchImportController.cancelImport);
router.post('/resume/:importId', batchImportController.resumeImport);
router.get('/errors/:importId', batchImportController.exportErrors);
router.get('/list', batchImportController.listImports);

export default router;
