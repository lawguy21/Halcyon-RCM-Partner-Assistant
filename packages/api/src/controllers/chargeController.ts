/**
 * Charge Controller
 * REST endpoint handlers for charge capture and coding
 */

import { Request, Response } from 'express';
import { chargeService, type ChargeInput } from '../services/chargeService.js';
import {
  searchCPT,
  getCPTCode,
  getCPTsByCategory,
  searchICD10,
  getICD10Code,
  getICD10sByCategory,
  searchRevenueCodes,
  getRevenueCode,
  getRevenueCodesByCategory,
  type CPTCategory,
  type ICD10Category,
  type RevenueCategory,
} from '@halcyon-rcm/core';

// ============================================================================
// Charge Endpoints
// ============================================================================

/**
 * POST /charges - Create a new charge
 */
export async function createCharge(req: Request, res: Response): Promise<void> {
  try {
    const input: ChargeInput = {
      encounterId: req.body.encounterId,
      cptCode: req.body.cptCode,
      icdCodes: req.body.icdCodes || [],
      revenueCode: req.body.revenueCode,
      units: req.body.units || 1,
      modifiers: req.body.modifiers || [],
      serviceDate: new Date(req.body.serviceDate),
      providerId: req.body.providerId,
      placeOfService: req.body.placeOfService,
      notes: req.body.notes,
    };

    // Get user ID from auth context if available
    const userId = (req as any).user?.id;

    const charge = await chargeService.createCharge(input, userId);
    res.status(201).json({
      success: true,
      data: charge,
    });
  } catch (error: any) {
    console.error('Error creating charge:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create charge',
    });
  }
}

/**
 * GET /charges/:id - Get a charge by ID
 */
export async function getCharge(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const charge = await chargeService.getCharge(id);

    if (!charge) {
      res.status(404).json({
        success: false,
        error: 'Charge not found',
      });
      return;
    }

    res.json({
      success: true,
      data: charge,
    });
  } catch (error: any) {
    console.error('Error getting charge:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get charge',
    });
  }
}

/**
 * GET /charges/encounter/:encounterId - Get charges by encounter
 */
export async function getChargesByEncounter(req: Request, res: Response): Promise<void> {
  try {
    const { encounterId } = req.params;
    const charges = await chargeService.getChargesByEncounter(encounterId);

    res.json({
      success: true,
      data: charges,
      count: charges.length,
    });
  } catch (error: any) {
    console.error('Error getting charges by encounter:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get charges',
    });
  }
}

/**
 * PUT /charges/:id - Update a charge
 */
export async function updateCharge(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const updates: Partial<ChargeInput> = {};
    if (req.body.cptCode) updates.cptCode = req.body.cptCode;
    if (req.body.icdCodes) updates.icdCodes = req.body.icdCodes;
    if (req.body.revenueCode) updates.revenueCode = req.body.revenueCode;
    if (req.body.units) updates.units = req.body.units;
    if (req.body.modifiers) updates.modifiers = req.body.modifiers;
    if (req.body.serviceDate) updates.serviceDate = new Date(req.body.serviceDate);
    if (req.body.providerId) updates.providerId = req.body.providerId;
    if (req.body.placeOfService) updates.placeOfService = req.body.placeOfService;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;

    const charge = await chargeService.updateCharge(id, updates, userId);

    res.json({
      success: true,
      data: charge,
    });
  } catch (error: any) {
    console.error('Error updating charge:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    } else if (error.message.includes('validation failed')) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update charge',
      });
    }
  }
}

/**
 * DELETE /charges/:id - Delete a charge
 */
export async function deleteCharge(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    await chargeService.deleteCharge(id, userId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting charge:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete charge',
      });
    }
  }
}

/**
 * POST /charges/validate - Validate a charge before submission
 */
export async function validateCharge(req: Request, res: Response): Promise<void> {
  try {
    const input: ChargeInput = {
      encounterId: req.body.encounterId || 'validation-only',
      cptCode: req.body.cptCode,
      icdCodes: req.body.icdCodes || [],
      revenueCode: req.body.revenueCode,
      units: req.body.units || 1,
      modifiers: req.body.modifiers || [],
      serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : new Date(),
    };

    const validation = await chargeService.validateCharge(input);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    console.error('Error validating charge:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to validate charge',
    });
  }
}

/**
 * POST /charges/:id/audit - Audit a charge for compliance
 */
export async function auditCharge(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const auditResult = await chargeService.auditCharge(id);

    res.json({
      success: true,
      data: auditResult,
    });
  } catch (error: any) {
    console.error('Error auditing charge:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to audit charge',
      });
    }
  }
}

/**
 * POST /charges/calculate - Calculate charge amount
 */
export async function calculateChargeAmount(req: Request, res: Response): Promise<void> {
  try {
    const { cptCode, modifiers, units = 1 } = req.body;

    if (!cptCode) {
      res.status(400).json({
        success: false,
        error: 'CPT code is required',
      });
      return;
    }

    const calculation = await chargeService.calculateChargeAmount(cptCode, modifiers);

    res.json({
      success: true,
      data: {
        ...calculation,
        units,
        totalAmount: calculation.adjustedAmount * units,
      },
    });
  } catch (error: any) {
    console.error('Error calculating charge amount:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate charge amount',
    });
  }
}

// ============================================================================
// Code Search Endpoints
// ============================================================================

/**
 * GET /codes/cpt/search - Search CPT codes
 */
export async function searchCPTCodes(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

    let results;
    if (q) {
      results = searchCPT(q as string, limitNum);
    } else if (category) {
      results = getCPTsByCategory(category as CPTCategory);
    } else {
      res.status(400).json({
        success: false,
        error: 'Either q (search query) or category parameter is required',
      });
      return;
    }

    res.json({
      success: true,
      data: results.slice(0, limitNum),
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error searching CPT codes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search CPT codes',
    });
  }
}

/**
 * GET /codes/cpt/:code - Get a specific CPT code
 */
export async function getCPTCodeDetails(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params;
    const cptCode = getCPTCode(code);

    if (!cptCode) {
      res.status(404).json({
        success: false,
        error: `CPT code not found: ${code}`,
      });
      return;
    }

    res.json({
      success: true,
      data: cptCode,
    });
  } catch (error: any) {
    console.error('Error getting CPT code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get CPT code',
    });
  }
}

/**
 * GET /codes/icd10/search - Search ICD-10 codes
 */
export async function searchICD10Codes(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

    let results;
    if (q) {
      results = searchICD10(q as string, limitNum);
    } else if (category) {
      results = getICD10sByCategory(category as ICD10Category);
    } else {
      res.status(400).json({
        success: false,
        error: 'Either q (search query) or category parameter is required',
      });
      return;
    }

    res.json({
      success: true,
      data: results.slice(0, limitNum),
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error searching ICD-10 codes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search ICD-10 codes',
    });
  }
}

/**
 * GET /codes/icd10/:code - Get a specific ICD-10 code
 */
export async function getICD10CodeDetails(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params;
    const icdCode = getICD10Code(code);

    if (!icdCode) {
      res.status(404).json({
        success: false,
        error: `ICD-10 code not found: ${code}`,
      });
      return;
    }

    res.json({
      success: true,
      data: icdCode,
    });
  } catch (error: any) {
    console.error('Error getting ICD-10 code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get ICD-10 code',
    });
  }
}

/**
 * GET /codes/revenue/search - Search revenue codes
 */
export async function searchRevenueCodesEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const { q, category, limit = '50' } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);

    let results;
    if (q) {
      results = searchRevenueCodes(q as string, limitNum);
    } else if (category) {
      results = getRevenueCodesByCategory(category as RevenueCategory);
    } else {
      res.status(400).json({
        success: false,
        error: 'Either q (search query) or category parameter is required',
      });
      return;
    }

    res.json({
      success: true,
      data: results.slice(0, limitNum),
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error searching revenue codes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search revenue codes',
    });
  }
}

/**
 * GET /codes/revenue/:code - Get a specific revenue code
 */
export async function getRevenueCodeDetails(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.params;
    const revCode = getRevenueCode(code);

    if (!revCode) {
      res.status(404).json({
        success: false,
        error: `Revenue code not found: ${code}`,
      });
      return;
    }

    res.json({
      success: true,
      data: revCode,
    });
  } catch (error: any) {
    console.error('Error getting revenue code:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get revenue code',
    });
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * POST /charges/batch - Create multiple charges at once
 */
export async function createChargesBatch(req: Request, res: Response): Promise<void> {
  try {
    const { charges } = req.body;
    const userId = (req as any).user?.id;

    if (!Array.isArray(charges) || charges.length === 0) {
      res.status(400).json({
        success: false,
        error: 'charges array is required and must not be empty',
      });
      return;
    }

    if (charges.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Maximum 100 charges per batch',
      });
      return;
    }

    const results = {
      successful: [] as any[],
      failed: [] as { index: number; error: string; input: any }[],
    };

    for (let i = 0; i < charges.length; i++) {
      const chargeData = charges[i];
      try {
        const input: ChargeInput = {
          encounterId: chargeData.encounterId,
          cptCode: chargeData.cptCode,
          icdCodes: chargeData.icdCodes || [],
          revenueCode: chargeData.revenueCode,
          units: chargeData.units || 1,
          modifiers: chargeData.modifiers || [],
          serviceDate: new Date(chargeData.serviceDate),
          providerId: chargeData.providerId,
          placeOfService: chargeData.placeOfService,
          notes: chargeData.notes,
        };

        const charge = await chargeService.createCharge(input, userId);
        results.successful.push(charge);
      } catch (error: any) {
        results.failed.push({
          index: i,
          error: error.message,
          input: chargeData,
        });
      }
    }

    const statusCode = results.failed.length === 0 ? 201 :
                       results.successful.length === 0 ? 400 : 207;

    res.status(statusCode).json({
      success: results.failed.length === 0,
      data: {
        total: charges.length,
        successCount: results.successful.length,
        failedCount: results.failed.length,
        successful: results.successful,
        failed: results.failed,
      },
    });
  } catch (error: any) {
    console.error('Error creating batch charges:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create batch charges',
    });
  }
}

/**
 * POST /charges/batch/validate - Validate multiple charges
 */
export async function validateChargesBatch(req: Request, res: Response): Promise<void> {
  try {
    const { charges } = req.body;

    if (!Array.isArray(charges) || charges.length === 0) {
      res.status(400).json({
        success: false,
        error: 'charges array is required and must not be empty',
      });
      return;
    }

    if (charges.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Maximum 100 charges per batch',
      });
      return;
    }

    const results = await Promise.all(
      charges.map(async (chargeData, index) => {
        const input: ChargeInput = {
          encounterId: chargeData.encounterId || 'validation-only',
          cptCode: chargeData.cptCode,
          icdCodes: chargeData.icdCodes || [],
          revenueCode: chargeData.revenueCode,
          units: chargeData.units || 1,
          modifiers: chargeData.modifiers || [],
          serviceDate: chargeData.serviceDate ? new Date(chargeData.serviceDate) : new Date(),
        };

        const validation = await chargeService.validateCharge(input);
        return {
          index,
          input: chargeData,
          validation,
        };
      })
    );

    const validCount = results.filter(r => r.validation.isValid).length;
    const invalidCount = results.filter(r => !r.validation.isValid).length;

    res.json({
      success: invalidCount === 0,
      data: {
        total: charges.length,
        validCount,
        invalidCount,
        results,
      },
    });
  } catch (error: any) {
    console.error('Error validating batch charges:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate batch charges',
    });
  }
}
