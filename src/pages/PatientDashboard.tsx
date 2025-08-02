import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Heart, FileText, Database, TestTube, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PatientSelector from '@/components/PatientSelector';
import PatientBiomarkerDashboard from '@/components/PatientBiomarkerDashboard';
import HealthKitSyncPatientCentric from '@/components/HealthKitSyncPatientCentric';
import HealthKitIntegration from '@/components/HealthKitIntegration';
import PatientDocumentUpload from '@/components/PatientDocumentUpload';
import { PatientBiomarkerUpload } from '@/components/PatientBiomarkerUpload';
import ComprehensiveMedicalProcessor from '@/components/ComprehensiveMedicalProcessor';
import DatabaseDashboard from '@/components/DatabaseDashboard';
import SimpleTableViewer from '@/components/SimpleTableViewer';
import { usePatient } from '@/contexts/PatientContext';

const PatientDashboard = () => {
  const { primaryPatient, loading: primaryPatientLoading } = usePatient();
  
  console.log('PatientDashboard - Current primary patient:', primaryPatient?.id, primaryPatient?.first_name, primaryPatient?.last_name);

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
            ? `Comprehensive health data management for ${primaryPatient.first_name} ${primaryPatient.last_name} and additional patients`
            : 'Comprehensive health data management and medical record processing'
          }
        </p>
      </div>

      {/* Patient Selector */}
      <PatientSelector 
        selectedPatientId={primaryPatient?.id || null}
        onPatientSelect={() => {}} 
      />

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="biomarkers">Biomarkers</TabsTrigger>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="biomarker-upload">Biomarker Upload</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {primaryPatient?.id ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent Biomarkers</CardTitle>
                    <TestTube className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-xs text-muted-foreground">
                      No recent data available
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clinical Test Results</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                    <p className="text-xs text-muted-foreground">
                      Ready to upload documents
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Last Data Sync</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Never</div>
                    <p className="text-xs text-muted-foreground">
                      Connect HealthKit or upload data
                    </p>
                  </CardContent>
                </Card>
              </div>

              {primaryPatient && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Primary Patient Profile
                    </CardTitle>
                    <CardDescription>
                      This is your main patient profile that was created during account setup.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>
                        <div>{primaryPatient.first_name} {primaryPatient.last_name}</div>
                      </div>
                      <div>
                        <span className="font-medium">Date of Birth:</span>
                        <div>{new Date(primaryPatient.date_of_birth).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="font-medium">Age:</span>
                        <div>{new Date().getFullYear() - new Date(primaryPatient.date_of_birth).getFullYear()} years</div>
                      </div>
                      <div>
                        <span className="font-medium">Gender:</span>
                        <div className="capitalize">{primaryPatient.gender || 'Not specified'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select a Patient</CardTitle>
                <CardDescription>Choose a patient from the dropdown above to view their health data</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="biomarkers" className="space-y-6">
          {primaryPatient?.id ? (
            <PatientBiomarkerDashboard patientId={primaryPatient.id} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Biomarker Dashboard</CardTitle>
                <CardDescription>Please select a patient to view biomarker data</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          {primaryPatient?.id ? (
            <HealthKitIntegration patientId={primaryPatient.id} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>HealthKit Integration</CardTitle>
                <CardDescription>Please select a patient to configure HealthKit sync with biomarker tables</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <div className="space-y-6">
            <ComprehensiveMedicalProcessor 
              patientId={primaryPatient?.id || ''}
              patientName={primaryPatient ? `${primaryPatient.first_name} ${primaryPatient.last_name}` : undefined}
            />
            <PatientDocumentUpload 
              patientId={primaryPatient?.id || ''} 
              patientName={primaryPatient ? `${primaryPatient.first_name} ${primaryPatient.last_name}` : undefined}
            />
          </div>
        </TabsContent>

        <TabsContent value="biomarker-upload" className="space-y-6">
          {primaryPatient ? (
            <PatientBiomarkerUpload 
              patientId={primaryPatient.id} 
              patientName={`${primaryPatient.first_name} ${primaryPatient.last_name}`}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Biomarker Data Upload</CardTitle>
                <CardDescription>Please select a patient to upload biomarker data</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <DatabaseDashboard />
          <SimpleTableViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientDashboard;