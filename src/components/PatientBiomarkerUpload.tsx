import { useState } from 'react';
import { usePatient } from '@/contexts/PatientContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Heart, Moon, Apple, Database, CheckCircle, AlertCircle, Clock, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ProcessingLog {
  timestamp: string;
  status: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface ProcessingStatus {
  status: 'idle' | 'uploading' | 'extracting' | 'processing' | 'complete' | 'error';
  progress: number;
  currentStep: string;
  logs: ProcessingLog[];
  extractedData?: any;
  sqlQuery?: string;
  results?: {
    heart?: number;
    activity?: number;
    sleep?: number;
    nutrition?: number;
    biological?: number;
  };
}

interface PatientBiomarkerUploadProps {
  patientId: string;
  patientName: string;
}

export const PatientBiomarkerUpload = ({ patientId, patientName }: PatientBiomarkerUploadProps) => {
  const { toast } = useToast();
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: 'idle',
    progress: 0,
    currentStep: '',
    logs: []
  });
  const [isLoading, setIsLoading] = useState(false);

  console.log('[PatientBiomarkerUpload] Rendering with patientId:', patientId);

  const addLog = (status: ProcessingLog['status'], message: string) => {
    const newLog: ProcessingLog = {
      timestamp: new Date().toLocaleTimeString(),
      status,
      message
    };
    setProcessingStatus(prev => ({
      ...prev,
      logs: [...prev.logs, newLog]
    }));
  };

  const updateProgress = (progress: number, currentStep: string, status?: ProcessingStatus['status']) => {
    setProcessingStatus(prev => ({
      ...prev,
      progress,
      currentStep,
      ...(status && { status })
    }));
  };

  const handleFileUpload = async (file: File) => {
    if (!patientId) {
      toast({
        title: "Error",
        description: "Please select a patient first",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setProcessingStatus({
      status: 'uploading',
      progress: 0,
      currentStep: 'Preparing upload...',
      logs: []
    });

    try {
      addLog('info', `Starting biomarker data processing for ${file.name}`);
      updateProgress(10, 'Uploading file to storage...', 'uploading');

      // Upload to Supabase storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-pdfs')
        .upload(`biomarker-documents/${fileName}`, file);

      if (uploadError) throw uploadError;

      addLog('success', 'File uploaded successfully');
      updateProgress(30, 'Extracting text from document...', 'extracting');

      // Extract text using existing edge function
      const { data: extractData, error: extractError } = await supabase.functions
        .invoke('extract-document-text', {
          body: { 
            filePath: uploadData.path,
            documentType: 'biomarker'
          }
        });

      if (extractError) throw extractError;

      addLog('success', 'Text extracted successfully');
      updateProgress(60, 'Processing biomarker data with AI...', 'processing');

      // Process with enhanced biomarker logic
      const { data: processData, error: processError } = await supabase.functions
        .invoke('process-medical-document', {
          body: {
            text: extractData.text,
            extractedText: extractData.text,
            filename: file.name,
            patient_id: patientId,
            documentType: 'biomarker'
          }
        });

      if (processError) throw processError;

      addLog('success', 'AI processing completed');
      updateProgress(90, 'Saving data to database...', 'processing');

      setProcessingStatus(prev => ({
        ...prev,
        extractedData: processData.extractedFields,
        sqlQuery: processData.sqlQuery
      }));

      // Execute the SQL if provided
      if (processData.sqlQuery) {
        const { data: sqlResult, error: sqlError } = await supabase.rpc(
          'execute_sql',
          { query_text: processData.sqlQuery }
        );

        if (sqlError) {
          addLog('error', `Database error: ${sqlError.message}`);
          throw sqlError;
        }

        addLog('success', `Successfully inserted biomarker records`);
      }

      updateProgress(100, 'Processing complete!', 'complete');
      
      setProcessingStatus(prev => ({
        ...prev,
        results: {
          heart: processData.extractedFields?.biomarker_heart?.length || 0,
          activity: processData.extractedFields?.biomarker_activity?.length || 0,
          sleep: processData.extractedFields?.biomarker_sleep?.length || 0,
          nutrition: processData.extractedFields?.biomarker_nutrition?.length || 0,
          biological: processData.extractedFields?.biomarker_biological_genetic_microbiome?.length || 0
        }
      }));

      toast({
        title: "Success",
        description: "Biomarker data processed and uploaded successfully",
      });

    } catch (error: any) {
      console.error('Error processing biomarker document:', error);
      addLog('error', `Processing failed: ${error.message}`);
      updateProgress(0, 'Processing failed', 'error');
      
      toast({
        title: "Error",
        description: error.message || "Failed to process biomarker document",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (processingStatus.status) {
      case 'complete': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'idle': return <Upload className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (processingStatus.status) {
      case 'idle': return 'Ready to upload';
      case 'uploading': return 'Uploading file...';
      case 'extracting': return 'Extracting data...';
      case 'processing': return 'Processing with AI...';
      case 'complete': return 'Processing complete';
      case 'error': return 'Processing failed';
      default: return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (processingStatus.status) {
      case 'complete': return 'default';
      case 'error': return 'destructive';
      case 'idle': return 'secondary';
      default: return 'default';
    }
  };

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Biomarker Data Upload
          </CardTitle>
          <CardDescription>
            Please select a patient to upload biomarker data
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Biomarker Data Upload for {patientName}
          </CardTitle>
          <CardDescription>
            Upload and process biomarker data from fitness trackers, health apps, and medical devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="biomarker-file" className="text-sm font-medium">
                Select Biomarker Data File
              </label>
              <Input
                id="biomarker-file"
                type="file"
                accept=".pdf,.csv,.json,.xlsx,.xls,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Supports: PDF reports, CSV exports, JSON data, Excel files, ZIP archives
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <Badge variant={getStatusColor()}>
                  {getStatusText()}
                </Badge>
                {processingStatus.currentStep && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {processingStatus.currentStep}
                  </p>
                )}
              </div>
            </div>
          </div>

          {processingStatus.progress > 0 && (
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingStatus.progress}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {processingStatus.results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold">{processingStatus.results.heart}</div>
                <div className="text-xs text-muted-foreground">Heart Records</div>
              </div>
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{processingStatus.results.activity}</div>
                <div className="text-xs text-muted-foreground">Activity Records</div>
              </div>
              <div className="text-center">
                <Moon className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">{processingStatus.results.sleep}</div>
                <div className="text-xs text-muted-foreground">Sleep Records</div>
              </div>
              <div className="text-center">
                <Apple className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{processingStatus.results.nutrition}</div>
                <div className="text-xs text-muted-foreground">Nutrition Records</div>
              </div>
              <div className="text-center">
                <Database className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{processingStatus.results.biological}</div>
                <div className="text-xs text-muted-foreground">Biological Records</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {processingStatus.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="logs">
              <TabsList>
                <TabsTrigger value="logs">Processing Log</TabsTrigger>
                {processingStatus.extractedData && (
                  <TabsTrigger value="data">Extracted Data</TabsTrigger>
                )}
                {processingStatus.sqlQuery && (
                  <TabsTrigger value="sql">SQL Query</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="logs" className="space-y-2">
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {processingStatus.logs.map((log, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{log.timestamp}</span>
                      <Badge 
                        variant={log.status === 'error' ? 'destructive' : 
                                log.status === 'success' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {log.status}
                      </Badge>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              {processingStatus.extractedData && (
                <TabsContent value="data">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-60">
                    {JSON.stringify(processingStatus.extractedData, null, 2)}
                  </pre>
                </TabsContent>
              )}
              
              {processingStatus.sqlQuery && (
                <TabsContent value="sql">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-60">
                    {processingStatus.sqlQuery}
                  </pre>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-red-500" />
              Supported Devices & Formats
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>• Apple Health exports (XML/JSON)</p>
            <p>• Fitbit data exports (JSON/CSV)</p>
            <p>• WHOOP reports (PDF/CSV)</p>
            <p>• Oura ring data (JSON/CSV)</p>
            <p>• Garmin Connect exports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-blue-500" />
              Data Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>• Heart rate & variability</p>
            <p>• Activity & exercise metrics</p>
            <p>• Sleep stages & recovery</p>
            <p>• Nutrition & hydration</p>
            <p>• Microbiome & genetic data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              AI Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>• Automatic data type detection</p>
            <p>• Smart field mapping</p>
            <p>• Duplicate detection</p>
            <p>• Data validation & cleanup</p>
            <p>• Multi-table insertion</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};