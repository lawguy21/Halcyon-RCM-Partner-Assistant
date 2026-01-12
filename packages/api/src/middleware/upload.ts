/**
 * File Upload Middleware
 * Multer configuration for handling file uploads
 */

import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler.js';

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types for CSV/spreadsheet
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Allowed MIME types for PDF/image documents
const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.csv', '.txt', '.xlsx'];

// Allowed document extensions
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff'];

/**
 * Check if file extension is allowed
 */
function isAllowedExtension(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Configure multer storage (memory for now, can switch to disk later)
 */
const storage = multer.memoryStorage();

/**
 * File filter function
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
): void => {
  // Check MIME type
  const isMimeTypeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);

  // Check extension
  const isExtensionAllowed = isAllowedExtension(file.originalname);

  if (isMimeTypeAllowed || isExtensionAllowed) {
    callback(null, true);
  } else {
    callback(
      new ValidationError(
        `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
      )
    );
  }
};

/**
 * Main upload middleware - single file
 */
export const uploadSingle = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
}).single('file');

/**
 * Upload middleware for multiple files
 */
export const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
}).array('files', 10);

/**
 * Upload middleware wrapper with better error handling
 */
export function handleUpload(fieldName: string = 'file') {
  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
    fileFilter,
  }).single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              error: {
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
                code: 'FILE_TOO_LARGE',
              },
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              error: {
                message: 'Too many files uploaded',
                code: 'TOO_MANY_FILES',
              },
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              error: {
                message: `Unexpected field name. Use '${fieldName}' for file upload`,
                code: 'UNEXPECTED_FIELD',
              },
            });
          default:
            return res.status(400).json({
              error: {
                message: err.message,
                code: 'UPLOAD_ERROR',
              },
            });
        }
      } else if (err instanceof ValidationError) {
        return res.status(400).json({
          error: {
            message: err.message,
            code: err.code,
          },
        });
      } else if (err) {
        return res.status(500).json({
          error: {
            message: 'File upload failed',
            code: 'UPLOAD_FAILED',
          },
        });
      }
      next();
    });
  };
}

/**
 * Middleware to validate that a file was uploaded
 */
export function requireFile(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        message: 'No file uploaded. Please provide a file',
        code: 'NO_FILE',
      },
    });
  }
  next();
}

/**
 * Middleware to validate file is CSV
 */
export function requireCSV(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        message: 'No file uploaded. Please provide a CSV file',
        code: 'NO_FILE',
      },
    });
  }

  const isCSV =
    req.file.mimetype === 'text/csv' ||
    req.file.mimetype === 'application/csv' ||
    req.file.originalname.toLowerCase().endsWith('.csv');

  if (!isCSV) {
    return res.status(400).json({
      error: {
        message: 'Invalid file type. Please upload a CSV file',
        code: 'INVALID_FILE_TYPE',
      },
    });
  }

  next();
}

/**
 * Get file content as string
 */
export function getFileContent(req: Request): string {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }
  return req.file.buffer.toString('utf-8');
}

/**
 * Get file metadata
 */
export function getFileMetadata(req: Request): {
  filename: string;
  size: number;
  mimetype: string;
} {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }
  return {
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  };
}

// Export constants for reference
export const UPLOAD_LIMITS = {
  maxFileSize: MAX_FILE_SIZE,
  maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  allowedExtensions: ALLOWED_EXTENSIONS,
};

// ============================================================================
// PDF/Document Upload Support
// ============================================================================

/**
 * Check if file extension is allowed for documents
 */
function isAllowedDocumentExtension(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_DOCUMENT_EXTENSIONS.includes(ext);
}

/**
 * File filter for PDF/image documents
 */
const documentFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
): void => {
  const isMimeTypeAllowed = ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype);
  const isExtensionAllowed = isAllowedDocumentExtension(file.originalname);

  if (isMimeTypeAllowed || isExtensionAllowed) {
    callback(null, true);
  } else {
    callback(
      new ValidationError(
        `Invalid file type. Allowed types: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`
      )
    );
  }
};

/**
 * Upload middleware for PDF/image documents
 */
export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: documentFileFilter,
}).single('document');

/**
 * Upload middleware for multiple documents
 */
export const uploadDocuments = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter: documentFileFilter,
}).array('documents', 10);

/**
 * Document upload middleware wrapper with better error handling
 */
export function handleDocumentUpload(fieldName: string = 'document') {
  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    },
    fileFilter: documentFileFilter,
  }).single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              error: {
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
                code: 'FILE_TOO_LARGE',
              },
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              error: {
                message: 'Too many files uploaded',
                code: 'TOO_MANY_FILES',
              },
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              error: {
                message: `Unexpected field name. Use '${fieldName}' for document upload`,
                code: 'UNEXPECTED_FIELD',
              },
            });
          default:
            return res.status(400).json({
              error: {
                message: err.message,
                code: 'UPLOAD_ERROR',
              },
            });
        }
      } else if (err instanceof ValidationError) {
        return res.status(400).json({
          error: {
            message: err.message,
            code: err.code,
          },
        });
      } else if (err) {
        return res.status(500).json({
          error: {
            message: 'Document upload failed',
            code: 'UPLOAD_FAILED',
          },
        });
      }
      next();
    });
  };
}

/**
 * Middleware to validate that a document (PDF/image) was uploaded
 */
export function requireDocument(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        message: 'No document uploaded. Please provide a PDF or image file',
        code: 'NO_FILE',
      },
    });
  }

  const isPDF = req.file.mimetype === 'application/pdf' ||
    req.file.originalname.toLowerCase().endsWith('.pdf');
  const isImage = ALLOWED_DOCUMENT_MIME_TYPES.includes(req.file.mimetype) ||
    ALLOWED_DOCUMENT_EXTENSIONS.some(ext =>
      req.file!.originalname.toLowerCase().endsWith(ext)
    );

  if (!isPDF && !isImage) {
    return res.status(400).json({
      error: {
        message: 'Invalid file type. Please upload a PDF or image file',
        code: 'INVALID_FILE_TYPE',
      },
    });
  }

  next();
}

/**
 * Get file buffer for document processing
 */
export function getFileBuffer(req: Request): Buffer {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }
  return req.file.buffer;
}

// Export document upload constants
export const DOCUMENT_UPLOAD_LIMITS = {
  maxFileSize: MAX_FILE_SIZE,
  maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
  allowedExtensions: ALLOWED_DOCUMENT_EXTENSIONS,
};
