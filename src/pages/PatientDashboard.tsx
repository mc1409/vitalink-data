import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import PatientSelector from '@/components/PatientSelector';
import HealthIntelligenceDashboard from '@/components/HealthIntelligenceDashboard';
import EnhancedHealthIntelligenceDashboard from '@/components/EnhancedHealthIntelligenceDashboard';
import LabResultsTable from '@/components/LabResultsTable';
import BiomarkerDataTable from '@/components/BiomarkerDataTable';
import { usePatient } from '@/contexts/PatientContext';

const PatientDashboard = () => {
  const { primaryPatient, loading: primaryPatientLoading } = usePatient();
  
  console.log('🔍 PatientDashboard - Current primary patient ID:', primaryPatient?.id);
  console.log('🔍 PatientDashboard - Primary patient details:', primaryPatient?.first_name, primaryPatient?.last_name);

  if (primaryPatientLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Patient Dashboard</h1>
          <p className="text-muted-foreground">Loading your patient information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Patient Dashboard</h1>
        <p className="text-muted-foreground">
          {primaryPatient 
            ? `Comprehensive health intelligence for ${primaryPatient.first_name} ${primaryPatient.last_name}`
            : 'Comprehensive health intelligence and medical analytics'
          }
        </p>
        {/* Display Patient ID */}
        {primaryPatient && (
          <div className="mt-2 p-2 bg-muted rounded-lg inline-block">
            <span className="text-sm font-mono text-muted-foreground">
              Patient ID: <span className="font-semibold text-foreground">{primaryPatient.id}</span>
            </span>
          </div>
        )}
      </div>

      {/* Patient Selector */}
      <PatientSelector 
        selectedPatientId={primaryPatient?.id || null}
        onPatientSelect={() => {}} 
      />

      {/* Lab Results Table */}
      {primaryPatient?.id && (
        <LabResultsTable patientId={primaryPatient.id} />
      )}

      {/* Biomarker Data Table */}
      {primaryPatient?.id ? (
        <BiomarkerDataTable patientId={primaryPatient.id} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>⚡ Biomarker Data</CardTitle>
            <CardDescription>Please select a patient to view biomarker data from Apple HealthKit and other sources</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Enhanced Health Intelligence Dashboard - Single Rolling Page with Full Explanations */}
      {primaryPatient?.id ? (
        <EnhancedHealthIntelligenceDashboard 
          patientId={primaryPatient.id} 
          patientName={`${primaryPatient.first_name} ${primaryPatient.last_name}`}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Health Intelligence Dashboard</CardTitle>
            <CardDescription>Please select a patient to view comprehensive health analytics with detailed explanations</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default PatientDashboard;