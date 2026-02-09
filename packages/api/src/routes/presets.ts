/**
 * Preset Routes
 * Routes for managing column mapping presets
 * Stores custom presets in database while keeping built-in presets from file-exchange package
 *
 * Uses optionalAuth so presets can be fetched without authentication (public API)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getPreset,
  listPresets,
  exportPresetToJSON,
} from '@halcyon-rcm/file-exchange';
import type { MappingPreset, ColumnMapping } from '@halcyon-rcm/file-exchange';
import { prisma } from '../lib/prisma.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

export const presetsRouter = Router();

// Apply optionalAuth to all routes - presets can be fetched without authentication
presetsRouter.use(optionalAuth);

// Validation schemas
const columnMappingSchema = z.object({
  sourceColumn: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
  defaultValue: z.unknown().optional(),
  required: z.boolean().optional(),
});

const createPresetSchema = z.object({
  name: z.string().min(1),
  vendor: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  mappings: z.array(columnMappingSchema),
  delimiter: z.string().optional(),
  skipHeaderRows: z.number().optional(),
  dateFormat: z.string().optional(),
  currencyFormat: z.enum(['decimal', 'cents']).optional(),
});

const updatePresetSchema = z.object({
  name: z.string().min(1).optional(),
  vendor: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  mappings: z.array(columnMappingSchema).optional(),
  delimiter: z.string().optional(),
  skipHeaderRows: z.number().optional(),
  dateFormat: z.string().optional(),
  currencyFormat: z.enum(['decimal', 'cents']).optional(),
});

const clonePresetSchema = z.object({
  newName: z.string().min(1).optional(),
  modifications: updatePresetSchema.optional(),
});

/**
 * Extended preset type that includes isCustom flag and optional version
 */
interface ExtendedPreset extends Omit<MappingPreset, 'skipHeaderRows'> {
  isCustom: boolean;
  version?: string;
  skipHeaderRows?: number;
}

/**
 * Get all presets (built-in + custom from database)
 */
async function getAllPresets(organizationId?: string): Promise<ExtendedPreset[]> {
  // Get built-in presets from file-exchange package
  const builtInPresets = listPresets().map((p) => ({
    ...p,
    isCustom: false,
    version: '1.0.0',
  }));

  // Get custom presets from database
  const customPresets = await prisma.customPreset.findMany({
    where: organizationId ? { organizationId } : {},
    orderBy: { createdAt: 'desc' },
  });

  const customPresetsFormatted: ExtendedPreset[] = customPresets.map((p) => ({
    id: p.id,
    name: p.name,
    vendor: p.vendor || 'Custom',
    version: '1.0.0',
    description: p.description || '',
    mappings: (p.mappings as unknown as ColumnMapping[]) || [],
    delimiter: (p.delimiter as MappingPreset['delimiter']) || ',',
    skipHeaderRows: p.skipHeaderRows ?? 0,
    dateFormat: p.dateFormat || 'MM/DD/YYYY',
    currencyFormat: (p.currencyFormat as 'decimal' | 'cents') || 'decimal',
    isCustom: true,
  }));

  // Get IDs of custom presets to filter out duplicates
  const customIds = new Set(customPresetsFormatted.map((p) => p.id));

  // Filter out built-in presets that have been overridden by custom
  const uniqueBuiltIn = builtInPresets.filter((p) => !customIds.has(p.id));

  return [...customPresetsFormatted, ...uniqueBuiltIn];
}

/**
 * Get a single preset by ID (checks custom first, then built-in)
 */
async function getPresetById(id: string, organizationId?: string): Promise<ExtendedPreset | null> {
  // Check custom presets first
  const customPreset = await prisma.customPreset.findFirst({
    where: {
      id,
      ...(organizationId ? { organizationId } : {}),
    },
  });

  if (customPreset) {
    return {
      id: customPreset.id,
      name: customPreset.name,
      vendor: customPreset.vendor || 'Custom',
      version: '1.0.0',
      description: customPreset.description || '',
      mappings: (customPreset.mappings as unknown as ColumnMapping[]) || [],
      delimiter: (customPreset.delimiter as MappingPreset['delimiter']) || ',',
      skipHeaderRows: customPreset.skipHeaderRows ?? 0,
      dateFormat: customPreset.dateFormat || 'MM/DD/YYYY',
      currencyFormat: (customPreset.currencyFormat as 'decimal' | 'cents') || 'decimal',
      isCustom: true,
    };
  }

  // Check built-in presets from file-exchange package
  const builtInPreset = getPreset(id);
  if (builtInPreset) {
    return {
      ...builtInPreset,
      isCustom: false,
      version: '1.0.0',
    };
  }

  return null;
}

/**
 * GET /presets
 * List all available presets (built-in + custom)
 * Can be accessed without authentication (optionalAuth)
 */
presetsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = req.query.vendor as string | undefined;
    const search = req.query.search as string | undefined;

    // Get user's organization if authenticated
    const organizationId = req.user?.organizationId;

    let presets = await getAllPresets(organizationId);

    // Filter by vendor
    if (vendor) {
      presets = presets.filter((p) => p.vendor.toLowerCase() === vendor.toLowerCase());
    }

    // Search by name/description
    if (search) {
      const searchLower = search.toLowerCase();
      presets = presets.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower)
      );
    }

    // Format response with metadata
    const presetsWithMeta = presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      vendor: preset.vendor,
      version: preset.version,
      description: preset.description,
      isCustom: preset.isCustom,
      mappingCount: preset.mappings.length,
      delimiter: preset.delimiter,
      dateFormat: preset.dateFormat,
      currencyFormat: preset.currencyFormat,
      skipHeaderRows: preset.skipHeaderRows,
      // Include column mappings for full preset data
      columnMappings: preset.mappings,
      // Default options for import
      defaultOptions: {
        dateFormat: preset.dateFormat,
        currencyFormat: preset.currencyFormat,
        delimiter: preset.delimiter,
        skipHeaderRows: preset.skipHeaderRows,
      },
    }));

    res.json({
      success: true,
      data: presetsWithMeta,
      total: presetsWithMeta.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /presets/vendors
 * Get list of unique vendors
 */
presetsRouter.get('/vendors', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    const presets = await getAllPresets(organizationId);
    const vendors = [...new Set(presets.map((p) => p.vendor).filter(Boolean))];

    res.json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /presets/:id
 * Get a single preset with full details including column mappings
 */
presetsRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const preset = await getPresetById(id, organizationId);

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Return full preset with all fields
    res.json({
      success: true,
      data: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        vendor: preset.vendor,
        version: preset.version,
        isCustom: preset.isCustom,
        columnMappings: preset.mappings,
        defaultOptions: {
          dateFormat: preset.dateFormat,
          currencyFormat: preset.currencyFormat,
          delimiter: preset.delimiter,
          skipHeaderRows: preset.skipHeaderRows,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /presets/:id/export
 * Export preset as JSON
 */
presetsRouter.get('/:id/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const preset = await getPresetById(id, organizationId);

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Convert to MappingPreset format for export
    const mappingPreset: MappingPreset = {
      id: preset.id,
      name: preset.name,
      vendor: preset.vendor,
      description: preset.description,
      mappings: preset.mappings,
      dateFormat: preset.dateFormat,
      currencyFormat: preset.currencyFormat,
      skipHeaderRows: preset.skipHeaderRows ?? 0,
      delimiter: preset.delimiter,
    };

    const json = exportPresetToJSON(mappingPreset);
    const download = req.query.download === 'true';

    if (download) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${preset.id}-preset.json"`);
      res.send(json);
    } else {
      res.json({
        success: true,
        data: {
          json,
          filename: `${preset.id}-preset.json`,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /presets
 * Create a new custom preset (stored in database)
 */
presetsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createPresetSchema.parse(req.body);
    const organizationId = req.user?.organizationId;

    // Check if a preset with same name already exists for this organization
    const existingPreset = await prisma.customPreset.findFirst({
      where: {
        name: parsed.name,
        organizationId: organizationId || null,
      },
    });

    if (existingPreset) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'A preset with this name already exists',
          code: 'DUPLICATE_NAME',
        },
      });
    }

    // Create the preset in database
    const customPreset = await prisma.customPreset.create({
      data: {
        name: parsed.name,
        vendor: parsed.vendor || null,
        description: parsed.description || null,
        mappings: parsed.mappings as unknown as object,
        delimiter: parsed.delimiter || ',',
        skipHeaderRows: parsed.skipHeaderRows || 0,
        dateFormat: parsed.dateFormat || 'MM/DD/YYYY',
        currencyFormat: parsed.currencyFormat || 'decimal',
        organizationId: organizationId || null,
      },
    });

    console.log(`[Presets] Created custom preset: ${customPreset.id} - ${parsed.name}`);

    res.status(201).json({
      success: true,
      data: {
        id: customPreset.id,
        name: customPreset.name,
        vendor: customPreset.vendor,
        version: '1.0.0',
        description: customPreset.description,
        columnMappings: customPreset.mappings,
        defaultOptions: {
          delimiter: customPreset.delimiter,
          skipHeaderRows: customPreset.skipHeaderRows,
          dateFormat: customPreset.dateFormat,
          currencyFormat: customPreset.currencyFormat,
        },
        isCustom: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /presets/:id/clone
 * Clone an existing preset (creates a new custom preset)
 */
presetsRouter.post('/:id/clone', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = clonePresetSchema.parse(req.body);
    const organizationId = req.user?.organizationId;

    const sourcePreset = await getPresetById(id, organizationId);
    if (!sourcePreset) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Source preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Generate name for cloned preset
    const newName = parsed.newName || `${sourcePreset.name} (Copy)`;

    // Check if name already exists
    const existingPreset = await prisma.customPreset.findFirst({
      where: {
        name: newName,
        organizationId: organizationId || null,
      },
    });

    if (existingPreset) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'A preset with this name already exists',
          code: 'DUPLICATE_NAME',
        },
      });
    }

    // Merge source preset with modifications
    const modifications = parsed.modifications || {};

    const customPreset = await prisma.customPreset.create({
      data: {
        name: newName,
        vendor: modifications.vendor ?? sourcePreset.vendor ?? null,
        description: modifications.description ?? sourcePreset.description ?? null,
        mappings: (modifications.mappings || sourcePreset.mappings) as unknown as object,
        delimiter: modifications.delimiter ?? sourcePreset.delimiter ?? ',',
        skipHeaderRows: modifications.skipHeaderRows ?? sourcePreset.skipHeaderRows ?? 0,
        dateFormat: modifications.dateFormat ?? sourcePreset.dateFormat ?? 'MM/DD/YYYY',
        currencyFormat: modifications.currencyFormat ?? sourcePreset.currencyFormat ?? 'decimal',
        organizationId: organizationId || null,
      },
    });

    console.log(`[Presets] Cloned preset ${id} -> ${customPreset.id} (${newName})`);

    res.status(201).json({
      success: true,
      data: {
        id: customPreset.id,
        name: customPreset.name,
        vendor: customPreset.vendor,
        version: '1.0.0',
        description: customPreset.description,
        columnMappings: customPreset.mappings,
        defaultOptions: {
          delimiter: customPreset.delimiter,
          skipHeaderRows: customPreset.skipHeaderRows,
          dateFormat: customPreset.dateFormat,
          currencyFormat: customPreset.currencyFormat,
        },
        isCustom: true,
        clonedFrom: id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * PUT /presets/:id
 * Update a custom preset
 */
presetsRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updatePresetSchema.parse(req.body);
    const organizationId = req.user?.organizationId;

    // Check if preset exists and is custom
    const existingPreset = await prisma.customPreset.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (!existingPreset) {
      // Check if it's a built-in preset
      const builtInPreset = getPreset(id);
      if (builtInPreset) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot modify built-in presets. Clone it first to create a custom version.',
            code: 'FORBIDDEN',
          },
        });
      }

      return res.status(404).json({
        success: false,
        error: {
          message: 'Preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Update the preset
    const updated = await prisma.customPreset.update({
      where: { id },
      data: {
        name: parsed.name ?? existingPreset.name,
        vendor: parsed.vendor !== undefined ? parsed.vendor : existingPreset.vendor,
        description: parsed.description !== undefined ? parsed.description : existingPreset.description,
        mappings: parsed.mappings ? (parsed.mappings as unknown as object) : existingPreset.mappings,
        delimiter: parsed.delimiter !== undefined ? parsed.delimiter : existingPreset.delimiter,
        skipHeaderRows: parsed.skipHeaderRows !== undefined ? parsed.skipHeaderRows : existingPreset.skipHeaderRows,
        dateFormat: parsed.dateFormat !== undefined ? parsed.dateFormat : existingPreset.dateFormat,
        currencyFormat: parsed.currencyFormat !== undefined ? parsed.currencyFormat : existingPreset.currencyFormat,
        updatedAt: new Date(),
      },
    });

    console.log(`[Presets] Updated custom preset: ${id}`);

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        vendor: updated.vendor,
        version: '1.0.0',
        description: updated.description,
        columnMappings: updated.mappings,
        defaultOptions: {
          delimiter: updated.delimiter,
          skipHeaderRows: updated.skipHeaderRows,
          dateFormat: updated.dateFormat,
          currencyFormat: updated.currencyFormat,
        },
        isCustom: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    }
    next(error);
  }
});

/**
 * DELETE /presets/:id
 * Delete a custom preset
 */
presetsRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    // Check if preset exists and is custom
    const existingPreset = await prisma.customPreset.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    if (!existingPreset) {
      // Check if it's a built-in preset
      const builtInPreset = getPreset(id);
      if (builtInPreset) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cannot delete built-in presets',
            code: 'FORBIDDEN',
          },
        });
      }

      return res.status(404).json({
        success: false,
        error: {
          message: 'Preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    await prisma.customPreset.delete({
      where: { id },
    });

    console.log(`[Presets] Deleted custom preset: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
