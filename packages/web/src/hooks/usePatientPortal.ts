'use client';

import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface PatientPortalData {
  patientName: string;
  patientEmail: string | null;
  assessment: {
    id: string;
    accountNumber: string | null;
    encounterType: string;
    admissionDate: string | null;
    dischargeDate: string | null;
    facilityState: string;
    status: string;
    createdAt: string;
  };
}

export interface PatientDocument {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface PatientAccessToken {
  id: string;
  token: string;
  patientEmail: string | null;
  patientName: string | null;
  expiresAt: string;
  lastAccessedAt: string | null;
  isRevoked: boolean;
  createdAt: string;
  createdBy?: { name: string | null; email: string };
}

export function usePatientPortal(token: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateToken = useCallback(async (): Promise<PatientPortalData | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/access/${token}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message || 'Invalid access link');
        return null;
      }
      return data.data;
    } catch (err) {
      setError('Unable to connect. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getDocuments = useCallback(async (): Promise<PatientDocument[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/access/${token}/documents`);
      const data = await response.json();
      if (response.ok && data.success) {
        return data.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [token]);

  const uploadDocument = useCallback(async (file: File): Promise<PatientDocument | null> => {
    setError(null);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/access/${token}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return data.data;
      }
      setError(data.error?.message || 'Upload failed');
      return null;
    } catch {
      setError('Upload failed. Please try again.');
      return null;
    }
  }, [token]);

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/access/${token}/documents/${documentId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [token]);

  return { loading, error, validateToken, getDocuments, uploadDocument, deleteDocument };
}

/**
 * Hook for staff to manage patient access tokens
 */
export function usePatientAccessTokens() {
  const [loading, setLoading] = useState(false);

  const createToken = useCallback(async (assessmentId: string, patientEmail?: string, patientName?: string, expiresInDays?: number): Promise<PatientAccessToken | null> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assessmentId, patientEmail, patientName, expiresInDays }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return data.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTokens = useCallback(async (assessmentId: string): Promise<PatientAccessToken[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/tokens/${assessmentId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return data.data;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const revokeToken = useCallback(async (tokenId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient-portal/tokens/${tokenId}/revoke`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return { loading, createToken, getTokens, revokeToken };
}
