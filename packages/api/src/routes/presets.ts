// @ts-nocheck
/**
 * Preset Routes
 * Routes for managing column mapping presets
 * Stores custom presets in database while keeping built-in presets from file-exchange package
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getPreset,
  listPresets,
  getPresetsByVendor,
  searchPresets,
  exportPresetToJSON,
} from '@halcyon-rcm/file-exchange';
import type { MappingPreset, ColumnMapping } from '@halcyon-rcm/file-exchange';
import { prisma } from '../lib/prisma.js';

export const presetsRouter = Router();

// Validation schemas
const columnMappingSchema = z.object({
  sourceColumn: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
  defaultValue: z.unknown().optional(),
  required: z.boolean().optional(),
});

const createPresetSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/i, 'ID must contain only alphanumeric characters, hyphens, and underscores'),
  name: z.string().min(1),
  vendor: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  mappings: z.array(columnMappingSchema),
  delimiter: z.string().optional(),
  hasHeader: z.boolean().optional(),
  skipRows: z.number().optional(),
  dateFormat: z.string().optional(),
});

const updatePresetSchema = z.object({
  name: z.string().min(1).optional(),
  vendor: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  mappings: z.array(columnMappingSchema).optional(),
  delimiter: z.string().optional(),
  hasHeader: z.boolean().optional(),
  skipRows: z.number().optional(),
  dateFormat: z.string().optional(),
});

const clonePresetSchema = z.object({
  newId: z.string().min(1).regex(/^[a-z0-9-_]+$/i, 'ID must contain only alphanumeric characters, hyphens, and underscores'),
  newName: z.string().min(1).optional(),
  modifications: updatePresetSchema.optional(),
});

/**
 * Get all presets (built-in + custom from database)
 */
async function getAllPresets(): Promise<Array<MappingPreset & { isCustom: boolean }>> {
  // Get built-in presets
  const builtInPresets = listPresets().map((p) => ({ ...p, isCustom: false }));

  // Get custom presets from database
  const customPresets = await prisma.customPreset.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const customPresetsFormatted = customPresets.map((p) => ({
    id: p.presetId,
    name: p.name,
    vendor: p.vendor || undefined,
    version: p.version || undefined,
    description: p.description || undefined,
    mappings: (p.mappings as ColumnMapping[]) || [],
    delimiter: p.delimiter || undefined,
    hasHeader: p.hasHeader ?? true,
    skipRows: p.skipRows || undefined,
    dateFormat: p.dateFormat || undefined,
    isCustom: true,
  }));

  // Merge, with custom presets taking precedence over built-in with same ID
  const builtInIds = new Set(builtInPresets.map((p) => p.id));
  const customIds = new Set(customPresetsFormatted.map((p) => p.id));

  // Filter out built-in presets that have been overridden by custom
  const uniqueBuiltIn = builtInPresets.filter((p) => !customIds.has(p.id));

  return [...customPresetsFormatted, ...uniqueBuiltIn];
}

/**
 * Get a single preset by ID (checks custom first, then built-in)
 */
async function getPresetById(id: string): Promise<(MappingPreset & { isCustom: boolean }) | null> {
  // Check custom presets first
  const customPreset = await prisma.customPreset.findUnique({
    where: { presetId: id },
  });

  if (customPreset) {
    return {
      id: customPreset.presetId,
      name: customPreset.name,
      vendor: customPreset.vendor || undefined,
      version: customPreset.version || undefined,
      description: customPreset.description || undefined,
      mappings: (customPreset.mappings as ColumnMapping[]) || [],
      delimiter: customPreset.delimiter || undefined,
      hasHeader: customPreset.hasHeader ?? true,
      skipRows: customPreset.skipRows || undefined,
      dateFormat: customPreset.dateFormat || undefined,
      isCustom: true,
    };
  }

  // Check built-in presets
  const builtInPreset = getPreset(id);
  if (builtInPreset) {
    return { ...builtInPreset, isCustom: false };
  }

  return null;
}

/**
 * GET /presets
 * List all available presets (built-in + custom)
 */
presetsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vendor = req.query.vendor as string | undefined;
    const search = req.query.search as string | undefined;

    let presets = await getAllPresets();

    // Filter by vendor
    if (vendor) {
      presets = presets.filter((p) => p.vendor?.toLowerCase() === vendor.toLowerCase());
    }

    // Search by name/description
    if (search) {
      const searchLower = search.toLowerCase();
      presets = presets.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower)
      );
    }

    // Add metadata
    const presetsWithMeta = presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      vendor: preset.vendor,
      version: preset.version,
      description: preset.description,
      isCustom: preset.isCustom,
      mappingCount: preset.mappings.length,
      delimiter: preset.delimiter,
      hasHeader: preset.hasHeader,
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
presetsRouter.get('/vendors', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const presets = await getAllPresets();
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
 * Get a single preset with full details
 */
presetsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const preset = await getPresetById(id);

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({
      success: true,
      data: preset,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /presets/:id/export
 * Export preset as JSON
 */
presetsRouter.get('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const preset = await getPresetById(id);

    if (!preset) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    const json = exportPresetToJSON(preset);
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
presetsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPresetSchema.parse(req.body);

    // Check if preset ID already exists (custom or built-in)
    const existingPreset = await getPresetById(parsed.id);
    if (existingPreset) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'A preset with this ID already exists',
          code: 'DUPLICATE_ID',
        },
      });
    }

    // Create the preset in database
    const customPreset = await prisma.customPreset.create({
      data: {
        presetId: parsed.id,
        name: parsed.name,
        vendor: parsed.vendor || null,
        version: parsed.version || null,
        description: parsed.description || null,
        mappings: parsed.mappings as any,
        delimiter: parsed.delimiter || null,
        hasHeader: parsed.hasHeader ?? true,
        skipRows: parsed.skipRows || null,
        dateFormat: parsed.dateFormat || null,
      },
    });

    console.log(`[Presets] Created custom preset: ${parsed.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: customPreset.presetId,
        name: customPreset.name,
        vendor: customPreset.vendor,
        version: customPreset.version,
        description: customPreset.description,
        mappings: customPreset.mappings,
        delimiter: customPreset.delimiter,
        hasHeader: customPreset.hasHeader,
        skipRows: customPreset.skipRows,
        dateFormat: customPreset.dateFormat,
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
presetsRouter.post('/:id/clone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = clonePresetSchema.parse(req.body);

    const sourcePreset = await getPresetById(id);
    if (!sourcePreset) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Source preset not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Check if new ID already exists
    const existingPreset = await getPresetById(parsed.newId);
    if (existingPreset) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'A preset with this ID already exists',
          code: 'DUPLICATE_ID',
        },
      });
    }

    // Create cloned preset with modifications
    const clonedData = {
      ...sourcePreset,
      id: parsed.newId,
      name: parsed.newName || `${sourcePreset.name} (Copy)`,
      ...parsed.modifications,
    };

    const customPreset = await prisma.customPreset.create({
      data: {
        presetId: clonedData.id,
        name: clonedData.name,
        vendor: clonedData.vendor || null,
        version: clonedData.version || null,
        description: clonedData.description || null,
        mappings: clonedData.mappings as any,
        delimiter: clonedData.delimiter || null,
        hasHeader: clonedData.hasHeader ?? true,
        skipRows: clonedData.skipRows || null,
        dateFormat: clonedData.dateFormat || null,
      },
    });

    console.log(`[Presets] Cloned preset ${id} -> ${parsed.newId}`);

    res.status(201).json({
      success: true,
      data: {
        id: customPreset.presetId,
        name: customPreset.name,
        vendor: customPreset.vendor,
        version: customPreset.version,
        description: customPreset.description,
        mappings: customPreset.mappings,
        delimiter: customPreset.delimiter,
        hasHeader: customPreset.hasHeader,
        skipRows: customPreset.skipRows,
        dateFormat: customPreset.dateFormat,
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
presetsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = updatePresetSchema.parse(req.body);

    // Check if preset exists and is custom
    const existingPreset = await prisma.customPreset.findUnique({
      where: { presetId: id },
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
      where: { presetId: id },
      data: {
        name: parsed.name ?? existingPreset.name,
        vendor: parsed.vendor !== undefined ? parsed.vendor : existingPreset.vendor,
        version: parsed.version !== undefined ? parsed.version : existingPreset.version,
        description: parsed.description !== undefined ? parsed.description : existingPreset.description,
        mappings: parsed.mappings ? (parsed.mappings as any) : existingPreset.mappings,
        delimiter: parsed.delimiter !== undefined ? parsed.delimiter : existingPreset.delimiter,
        hasHeader: parsed.hasHeader !== undefined ? parsed.hasHeader : existingPreset.hasHeader,
        skipRows: parsed.skipRows !== undefined ? parsed.skipRows : existingPreset.skipRows,
        dateFormat: parsed.dateFormat !== undefined ? parsed.dateFormat : existingPreset.dateFormat,
        updatedAt: new Date(),
      },
    });

    console.log(`[Presets] Updated custom preset: ${id}`);

    res.json({
      success: true,
      data: {
        id: updated.presetId,
        name: updated.name,
        vendor: updated.vendor,
        version: updated.version,
        description: updated.description,
        mappings: updated.mappings,
        delimiter: updated.delimiter,
        hasHeader: updated.hasHeader,
        skipRows: updated.skipRows,
        dateFormat: updated.dateFormat,
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
presetsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if preset exists and is custom
    const existingPreset = await prisma.customPreset.findUnique({
      where: { presetId: id },
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
      where: { presetId: id },
    });

    console.log(`[Presets] Deleted custom preset: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
