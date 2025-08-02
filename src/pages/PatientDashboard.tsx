import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PatientSelector from '@/components/PatientSelector';
import HealthKitSyncPatientCentric from '@/components/HealthKitSyncPatientCentric';
import PatientBiomarkerDashboard from '@/components/PatientBiomarkerDashboard';
import PatientDocumentUpload from '@/components/PatientDocumentUpload';
import DatabaseDashboard from '@/components/DatabaseDashboard';
import SimpleTableViewer from '@/components/SimpleTableViewer';
import { Activity, FileText, Database, Heart, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PatientDashboard: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');

  // Load patient info when selection changes
  useEffect(() => {
    const loadPatientInfo = async () => {
      if (!selectedPatientId) {
        setSelectedPatientName('');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('patients')
          .select('first_name, last_name')
          .eq('id', selectedPatientId)
          .single();

        if (error) throw error;
        setSelectedPatientName(`${data.first_name} ${data.last_name}`);
      } catch (error) {
        console.error('Error loading patient info:', error);
        setSelectedPatientName('Selected Patient');
      }
    };

    loadPatientInfo();
  }, [selectedPatientId]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Patient Health Dashboard</h1>
        <p className="text-muted-foreground">
          Manage patient health data, biomarkers, and clinical diagnostics
        </p>
      </div>

      {/* Patient Selection */}
      <PatientSelector 
        selectedPatientId={selectedPatientId || undefined}
        onPatientSelect={setSelectedPatientId}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <Heart className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="biomarkers" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Biomarkers
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-2">
            <Activity className="h-4 w-4" />
            Data Sync
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <FileText className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recent Biomarker Records
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  {selectedPatientId ? 'Loading data...' : 'Select a patient to view data'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Clinical Test Results
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  {selectedPatientId ? 'Loading data...' : 'Select a patient to view data'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Last Data Sync
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  {selectedPatientId ? 'No recent sync' : 'Select a patient to view sync status'}
                </p>
              </CardContent>
            </Card>
          </div>

          {selectedPatientId && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Patient Timeline</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center py-8">
                    Patient timeline visualization will be displayed here.
                    This will show biomarker trends, clinical events, and other health data over time.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="biomarkers" className="space-y-6">
          {selectedPatientId ? (
            <PatientBiomarkerDashboard patientId={selectedPatientId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Biomarker Analytics</CardTitle>
                <CardDescription>Please select a patient to view biomarker trends and analytics</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          {selectedPatientId ? (
            <HealthKitSyncPatientCentric patientId={selectedPatientId} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Data Sync</CardTitle>
                <CardDescription>Please select a patient to sync health data</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          {selectedPatientId ? (
            <PatientDocumentUpload 
              patientId={selectedPatientId} 
              patientName={selectedPatientName}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>Please select a patient to upload medical documents</CardDescription>
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