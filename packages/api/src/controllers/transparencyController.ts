// @ts-nocheck
/**
 * Price Transparency Controller
 *
 * REST endpoint handlers for CMS price transparency compliance
 */

import { Request, Response } from 'express';
import transparencyService, {
  type CreateEstimateRequest,
  type GoodFaithEstimateRequest,
} from '../services/transparencyService.js';
import {
  type HospitalConfig,
  mrfToJSON,
  mrfToCSV,
} from '@halcyon-rcm/core/transparency';

// ============================================================================
// Price Estimate Endpoints
// ============================================================================

/**
 * POST /transparency/estimate
 * Create a price estimate for services
 */
export async function createEstimate(req: Request, res: Response): Promise<void> {
  try {
    const request: CreateEstimateRequest = {
      patientId: req.body.patientId,
      services: req.body.services,
      payerId: req.body.payerId,
      patientInfo: req.body.patientInfo,
      benefits: req.body.benefits,
      organizationId: (req as any).user?.organizationId || req.body.organizationId,
    };

    // Validate required fields
    if (!request.services || !Array.isArray(request.services) || request.services.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one service is required',
      });
      return;
    }

    // Validate each service
    for (const service of request.services) {
      if (!service.cptCode) {
        res.status(400).json({
          success: false,
          error: 'Each service must have a CPT code',
        });
        return;
      }
      if (!service.units || service.units < 1) {
        service.units = 1;
      }
    }

    const estimate = await transparencyService.createEstimate(request);

    res.status(201).json({
      success: true,
      data: estimate,
    });
  } catch (error: any) {
    console.error('Error creating estimate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create estimate',
    });
  }
}

/**
 * GET /transparency/estimate/:id
 * Get estimate details
 */
export async function getEstimate(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const estimate = await transparencyService.getEstimate(id);

    if (!estimate) {
      res.status(404).json({
        success: false,
        error: 'Estimate not found',
      });
      return;
    }

    res.json({
      success: true,
      data: estimate,
    });
  } catch (error: any) {
    console.error('Error getting estimate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get estimate',
    });
  }
}

/**
 * GET /transparency/estimate/history/:patientId
 * Get estimate history for a patient
 */
export async function getEstimateHistory(req: Request, res: Response): Promise<void> {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await transparencyService.getEstimateHistory(patientId, limit);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('Error getting estimate history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get estimate history',
    });
  }
}

// ============================================================================
// Shoppable Services Endpoints
// ============================================================================

/**
 * GET /transparency/shoppable-services
 * List all shoppable services
 */
export async function listShoppableServices(req: Request, res: Response): Promise<void> {
  try {
    const { search, category, limit } = req.query;

    let services;
    if (search) {
      services = transparencyService.searchServices(
        search as string,
        parseInt(limit as string) || 100
      );
    } else {
      services = transparencyService.getAllShoppableServices();
      if (category) {
        services = services.filter((s) => s.category === category);
      }
    }

    res.json({
      success: true,
      data: services,
      count: services.length,
    });
  } catch (error: any) {
    console.error('Error listing shoppable services:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list shoppable services',
    });
  }
}

/**
 * GET /transparency/shoppable-services/:code/prices
 * Get prices for a specific shoppable service
 */
export async function getServicePrices(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params;
    const organizationId = (req as any).user?.organizationId;

    const result = await transparencyService.getShoppableServicePrices(
      code,
      organizationId
    );

    if (!result.service) {
      res.status(404).json({
        success: false,
        error: `Service not found: ${code}`,
      });
      return;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting service prices:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get service prices',
    });
  }
}

/**
 * GET /transparency/shoppable-services/packages
 * Get all service packages
 */
export async function getServicePackages(req: Request, res: Response): Promise<void> {
  try {
    const packages = transparencyService.getAllServicePackages();

    res.json({
      success: true,
      data: packages,
      count: packages.length,
    });
  } catch (error: any) {
    console.error('Error getting service packages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get service packages',
    });
  }
}

// ============================================================================
// Good Faith Estimate Endpoints
// ============================================================================

/**
 * POST /transparency/good-faith-estimate
 * Generate a Good Faith Estimate per No Surprises Act
 */
export async function generateGoodFaithEstimate(req: Request, res: Response): Promise<void> {
  try {
    const request: GoodFaithEstimateRequest = {
      patientId: req.body.patientId,
      services: req.body.services,
      diagnosisCode: req.body.diagnosisCode,
      requestingProviderId: req.body.requestingProviderId,
      organizationId: (req as any).user?.organizationId || req.body.organizationId,
    };

    // Validate required fields
    if (!request.patientId) {
      res.status(400).json({
        success: false,
        error: 'Patient ID is required',
      });
      return;
    }

    if (!request.services || !Array.isArray(request.services) || request.services.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one service is required',
      });
      return;
    }

    if (!request.organizationId) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return;
    }

    // Validate each service
    for (const service of request.services) {
      if (!service.cptCode) {
        res.status(400).json({
          success: false,
          error: 'Each service must have a CPT code',
        });
        return;
      }
      if (!service.scheduledDate) {
        res.status(400).json({
          success: false,
          error: 'Each service must have a scheduled date',
        });
        return;
      }
    }

    const gfe = await transparencyService.generateGoodFaithEstimate(request);

    res.status(201).json({
      success: true,
      data: gfe,
    });
  } catch (error: any) {
    console.error('Error generating Good Faith Estimate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate Good Faith Estimate',
    });
  }
}

// ============================================================================
// Machine Readable File Endpoints
// ============================================================================

/**
 * GET /transparency/machine-readable-file
 * Download the current Machine Readable File
 */
export async function getMachineReadableFile(req: Request, res: Response): Promise<void> {
  try {
    const { format } = req.query;
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return;
    }

    // Create default hospital config (in production, fetch from organization settings)
    const hospitalConfig: HospitalConfig = {
      hospitalId: organizationId,
      name: 'Healthcare Organization',
      address: {
        street: '123 Healthcare Drive',
        city: 'Healthcare City',
        state: 'CA',
        zipCode: '90210',
      },
      cashDiscountPercent: 25,
    };

    const result = await transparencyService.exportMachineReadableFile(
      organizationId,
      hospitalConfig
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="machine-readable-file-${organizationId}.csv"`
      );
      res.send(mrfToCSV(result.mrf));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="machine-readable-file-${organizationId}.json"`
      );
      res.send(mrfToJSON(result.mrf));
    }
  } catch (error: any) {
    console.error('Error getting machine readable file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get machine readable file',
    });
  }
}

/**
 * POST /transparency/machine-readable-file/generate
 * Regenerate the Machine Readable File
 */
export async function generateMachineReadableFile(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = (req as any).user?.organizationId || req.body.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return;
    }

    // Get hospital config from request or use defaults
    const hospitalConfig: HospitalConfig = req.body.hospitalConfig || {
      hospitalId: organizationId,
      name: req.body.hospitalName || 'Healthcare Organization',
      address: req.body.address || {
        street: '123 Healthcare Drive',
        city: 'Healthcare City',
        state: 'CA',
        zipCode: '90210',
      },
      ccn: req.body.ccn,
      npi: req.body.npi,
      ein: req.body.ein,
      cashDiscountPercent: req.body.cashDiscountPercent || 25,
      publicationUrl: req.body.publicationUrl,
    };

    const result = await transparencyService.exportMachineReadableFile(
      organizationId,
      hospitalConfig
    );

    res.status(201).json({
      success: true,
      data: {
        metadata: result.metadata,
        validation: result.validation,
        itemCount: result.mrf.standard_charge_information.length,
      },
    });
  } catch (error: any) {
    console.error('Error generating machine readable file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate machine readable file',
    });
  }
}

/**
 * POST /transparency/machine-readable-file/validate
 * Validate a Machine Readable File
 */
export async function validateMachineReadableFile(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = (req as any).user?.organizationId || req.body.organizationId;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return;
    }

    const hospitalConfig: HospitalConfig = {
      hospitalId: organizationId,
      name: 'Validation Test',
      address: {
        street: '123 Healthcare Drive',
        city: 'Healthcare City',
        state: 'CA',
        zipCode: '90210',
      },
      cashDiscountPercent: 25,
    };

    const result = await transparencyService.exportMachineReadableFile(
      organizationId,
      hospitalConfig
    );

    res.json({
      success: true,
      data: {
        isValid: result.validation.isValid,
        errors: result.validation.errors,
        warnings: result.validation.warnings,
        statistics: result.validation.statistics,
      },
    });
  } catch (error: any) {
    console.error('Error validating machine readable file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate machine readable file',
    });
  }
}

// ============================================================================
// Estimate Accuracy Endpoints
// ============================================================================

/**
 * GET /transparency/estimate-accuracy
 * Get estimate accuracy report
 */
export async function getEstimateAccuracyReport(req: Request, res: Response): Promise<void> {
  try {
    const organizationId =
      (req as any).user?.organizationId || (req.query.organizationId as string);

    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return;
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const report = await transparencyService.getEstimateAccuracyReport(
      organizationId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error getting estimate accuracy report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get estimate accuracy report',
    });
  }
}

/**
 * POST /transparency/estimate/:id/compare
 * Compare an estimate to the actual claim
 */
export async function compareEstimateToActual(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { claimId } = req.body;

    if (!claimId) {
      res.status(400).json({
        success: false,
        error: 'Claim ID is required',
      });
      return;
    }

    const result = await transparencyService.compareEstimateToActual(id, claimId);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Estimate not found',
      });
      return;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error comparing estimate to actual:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare estimate to actual',
    });
  }
}

/**
 * POST /transparency/payer-comparison
 * Compare prices across payers for services
 */
export async function comparePayerPrices(req: Request, res: Response): Promise<void> {
  try {
    const { services, payerIds } = req.body;

    if (!services || !Array.isArray(services) || services.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one service is required',
      });
      return;
    }

    const serviceItems = services.map((s: any) => ({
      cptCode: s.cptCode,
      description: s.description,
      units: s.units || 1,
    }));

    const comparison = transparencyService.comparePayers(
      serviceItems,
      payerIds || []
    );

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error('Error comparing payer prices:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare payer prices',
    });
  }
}

export default {
  createEstimate,
  getEstimate,
  getEstimateHistory,
  listShoppableServices,
  getServicePrices,
  getServicePackages,
  generateGoodFaithEstimate,
  getMachineReadableFile,
  generateMachineReadableFile,
  validateMachineReadableFile,
  getEstimateAccuracyReport,
  compareEstimateToActual,
  comparePayerPrices,
};
