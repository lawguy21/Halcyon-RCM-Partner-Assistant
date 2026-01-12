/**
 * Claims API routes
 */

import { Router, Request, Response } from 'express';
import type { Claim } from '@halcyon-rcm/core';
import { ClaimsController } from '../controllers/claimsController.js';

export const claimsRouter = Router();
const controller = new ClaimsController();

// GET /api/claims - List all claims
claimsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const claims = await controller.list(req.query);
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// GET /api/claims/:id - Get a single claim
claimsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const claim = await controller.get(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

// POST /api/claims - Create a new claim
claimsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const claim = await controller.create(req.body as Partial<Claim>);
    res.status(201).json(claim);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create claim' });
  }
});

// PUT /api/claims/:id - Update a claim
claimsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const claim = await controller.update(req.params.id, req.body as Partial<Claim>);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(claim);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update claim' });
  }
});

// DELETE /api/claims/:id - Delete a claim
claimsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await controller.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete claim' });
  }
});
