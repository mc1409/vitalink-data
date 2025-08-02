import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Database,
  Activity,
  Calendar,
  User,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePrimaryPatient } from '@/hooks/usePrimaryPatient';

interface ComprehensiveMedicalProcessorProps {
  patientId?: string;
  patientName?: string;
}

interface ProcessingLog {
  id: string;
  timestamp: string;
  step: string;
  status: 'processing' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
}

interface ProcessingStatus {
  fileName: string;
  status: 'uploading' | 'extracting' | 'processing' | 'saving' | 'completed' | 'error';
  progress: number;
  error?: string;
  extractedCount?: number;
  savedCount?: number;
  logs: ProcessingLog[];
}

const ComprehensiveMedicalProcessor: React.FC<ComprehensiveMedicalProcessorProps> = ({ 
  patientId, 
  patientName = 'Selected Patient' 
}) => {
  const { primaryPatient } = usePrimaryPatient();
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use primary patient if no specific patient ID provided
  const effectivePatientId = patientId || primaryPatient?.id;
  const effectivePatientName = patientName !== 'Selected Patient' ? patientName : 
    (primaryPatient ? `${primaryPatient.first_name} ${primaryPatient.last_name}` : patientName);

  const addLog = useCallback((step: string, status: ProcessingLog['status'], message: string, data?: any) => {
    const log: ProcessingLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      data
    };
    
    setStatus(prev => prev ? {
      ...prev,
      logs: [log, ...prev.logs]
    } : null);
  }, []);

  const updateProgress = useCallback((progress: number, currentStatus: ProcessingStatus['status']) => {
    setStatus(prev => prev ? {
      ...prev,
      progress,
      status: currentStatus
    } : null);
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !effectivePatientId) {
      if (!effectivePatientId) {
        toast.error('No patient selected. Please select a patient first.');
        return;
      }
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsProcessing(true);
    setStatus({
      fileName: file.name,
      status: 'uploading',
      progress: 0,
      logs: [],
      extractedCount: 0,
      savedCount: 0
    });

    try {
      addLog('File Upload', 'processing', `Starting upload of ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      // Step 1: Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${effectivePatientId}.${fileExt}`;
      const filePath = `medical-documents/${fileName}`;

      updateProgress(10, 'uploading');

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      addLog('File Upload', 'success', `File uploaded to storage: ${filePath}`);

      updateProgress(20, 'uploading');

      // Step 2: Create processing log entry
      const { data: user } = await supabase.auth.getUser();
      const { data: logEntry, error: logError } = await supabase
        .from('document_processing_logs')
        .insert({
          user_id: user.user?.id || '',
          patient_id: effectivePatientId,
          filename: file.name,
          file_size: file.size,
          storage_path: filePath,
          upload_status: 'completed'
        })
        .select()
        .single();

      if (logError) throw logError;
      addLog('Processing Log', 'success', `Created processing log entry with ID: ${logEntry.id}`);

      updateProgress(30, 'extracting');

      // Step 3: Extract text from document
      addLog('Text Extraction', 'processing', 'Extracting text from uploaded document...');
      
      const { data: extractResult, error: extractError } = await supabase.functions.invoke(
        'extract-document-text',
        {
          body: { storage_path: filePath }
        }
      );

      if (extractError) throw extractError;
      if (!extractResult.success) throw new Error(extractResult.error);

      addLog('Text Extraction', 'success', `Extracted ${extractResult.extractedText.length} characters from document`);
      updateProgress(50, 'processing');

      // Step 4: Process with AI
      addLog('AI Processing', 'processing', 'Sending document to AI for medical data extraction...');

        const { data: aiResult, error: aiError } = await supabase.functions.invoke(
          'process-medical-document',
          {
            body: {
              text: extractResult.extractedText,
              filename: file.name,
              patient_id: effectivePatientId
            }
          }
        );

      if (aiError) throw aiError;

      const extractedFields = aiResult.extractedFields || {};
      const extractedCount = Object.keys(extractedFields).length;
      
      addLog('AI Processing', 'success', `AI extracted ${extractedCount} data fields with ${Math.round(aiResult.confidence * 100)}% confidence`);
      
      setStatus(prev => prev ? { ...prev, extractedCount } : null);
      updateProgress(75, 'saving');

      // Step 5: Save to database
      addLog('Database Save', 'processing', 'Saving extracted data to clinical database...');
      
      let savedCount = 0;
      
      console.log('🔍 STARTING DATABASE SAVE PROCESS:', {
        extractedFields: extractedFields,
        extractedFieldsKeys: Object.keys(extractedFields),
        effectivePatientId: effectivePatientId,
        totalFieldsToProcess: Object.keys(extractedFields).length
      });

      // Save lab results to clinical_diagnostic_lab_tests table
      for (const [key, labData] of Object.entries(extractedFields)) {
        console.log(`🔍 PROCESSING FIELD: ${key}`, {
          key: key,
          labData: labData,
          startsWithLabResults: key.startsWith('LAB_RESULTS'),
          isObject: typeof labData === 'object',
          isValid: key.startsWith('LAB_RESULTS') && labData && typeof labData === 'object'
        });
        
        if (key.startsWith('LAB_RESULTS') && labData && typeof labData === 'object') {
          try {
            const data = labData as any;
            
            // Validate required fields
            if (!data.result_name) {
              addLog('Database Save', 'warning', `Skipping ${key} - missing test name`);
              continue;
            }

            // Prepare the database insert payload
            const insertPayload = {
              patient_id: effectivePatientId,
              test_name: data.result_name,
              test_category: 'lab_work',
              test_type: 'blood_chemistry',
              numeric_value: data.numeric_value,
              result_value: data.numeric_value?.toString() || data.result_value,
              unit: data.units || data.unit,
              reference_range_min: data.reference_range_min,
              reference_range_max: data.reference_range_max,
              measurement_time: new Date().toISOString(),
              data_source: 'document_upload'
            };

            // Check for duplicate first
            console.log('🔍 CHECKING FOR DUPLICATES...', {
              table: 'clinical_diagnostic_lab_tests',
              test_name: data.result_name,
              patient_id: effectivePatientId,
              timeRange: new Date(Date.now() - 60000).toISOString() // Last minute
            });

            const { data: existingRecords, error: duplicateCheckError } = await supabase
              .from('clinical_diagnostic_lab_tests')
              .select('*')
              .eq('test_name', data.result_name)
              .eq('patient_id', effectivePatientId)
              .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
              .limit(1);

            console.log('🔍 DUPLICATE CHECK RESULT:', {
              error: duplicateCheckError,
              existingRecords: existingRecords,
              recordCount: existingRecords?.length || 0,
              shouldSkip: existingRecords && existingRecords.length > 0
            });

            if (duplicateCheckError) {
              console.error('❌ DUPLICATE CHECK ERROR:', duplicateCheckError);
              addLog('Database Save', 'error', `Duplicate check failed for ${data.result_name}: ${duplicateCheckError.message}`);
              continue;
            }

            if (existingRecords && existingRecords.length > 0) {
              addLog('Database Save', 'warning', `⚠️ Skipping duplicate record: ${data.result_name} (found ${existingRecords.length} existing records)`);
              console.log('⚠️ SKIPPING DUPLICATE:', existingRecords[0]);
              continue;
            }

            // Log the exact SQL operation being performed
            console.log('🔍 DATABASE INSERT QUERY:', {
              table: 'clinical_diagnostic_lab_tests',
              operation: 'INSERT',
              payload: insertPayload,
              sqlEquivalent: `INSERT INTO clinical_diagnostic_lab_tests (patient_id, test_name, test_category, test_type, numeric_value, result_value, unit, reference_range_min, reference_range_max, measurement_time, data_source) VALUES ('${effectivePatientId}', '${data.result_name}', 'lab_work', 'blood_chemistry', ${data.numeric_value}, '${data.numeric_value?.toString() || data.result_value}', '${data.units}', ${data.reference_range_min}, ${data.reference_range_max}, '${new Date().toISOString()}', 'document_upload')`
            });
            
            addLog('Database Save', 'info', `📊 Executing INSERT into clinical_diagnostic_lab_tests for ${data.result_name}`);

            const { data: insertedData, error: saveError } = await supabase
              .from('clinical_diagnostic_lab_tests')
              .insert(insertPayload)
              .select();
            
            console.log('🔍 INSERT RESULT:', {
              success: !saveError,
              error: saveError,
              insertedData: insertedData,
              rowsAffected: insertedData?.length || 0
            });
            
            if (!saveError && insertedData && insertedData.length > 0) {
              savedCount++;
              addLog('Database Save', 'success', `✅ Saved lab result: ${data.result_name} = ${data.numeric_value || data.result_value} ${data.units || ''}`);
              console.log('✅ SUCCESSFULLY INSERTED:', insertedData[0]);
            } else {
              const errorMsg = saveError?.message || 'Unknown error - no data returned';
              addLog('Database Save', 'error', `❌ Failed to save ${data.result_name}: ${errorMsg}`);
              console.error('❌ INSERT FAILED:', {
                error: saveError,
                payload: insertPayload,
                patient_id: effectivePatientId
              });
            }
          } catch (saveError: any) {
            addLog('Database Save', 'error', `Error saving lab result: ${saveError.message}`);
          }
        }
      }

      // Update processing log with final results
      await supabase
        .from('document_processing_logs')
        .update({
          processing_status: 'completed',
          ai_analysis_status: 'completed',
          confidence_score: aiResult.confidence,
          ai_structured_data: aiResult
        })
        .eq('id', logEntry.id);

      setStatus(prev => prev ? { ...prev, savedCount } : null);
      updateProgress(100, 'completed');

      addLog('Processing Complete', 'success', `✅ Document processing completed! ${savedCount} lab results saved to database.`);
      
      toast.success(
        `Document processed successfully! ${savedCount} lab results saved to database.`
      );

    } catch (error: any) {
      console.error('Processing error:', error);
      addLog('Processing Error', 'error', `❌ Processing failed: ${error.message}`);
      
      setStatus(prev => prev ? {
        ...prev,
        status: 'error',
        error: error.message || 'Unknown error occurred'
      } : null);
      
      toast.error('Failed to process document: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  }, [effectivePatientId, addLog, updateProgress]);

  const getStatusIcon = () => {
    if (!status) return null;
    
    switch (status.status) {
      case 'uploading':
      case 'extracting':
      case 'processing':
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    if (!status) return '';
    
    switch (status.status) {
      case 'uploading':
        return 'Uploading document...';
      case 'extracting':
        return 'Extracting text content...';
      case 'processing':
        return 'Processing with AI...';
      case 'saving':
        return 'Saving to database...';
      case 'completed':
        return `Completed - ${status.savedCount || 0} records saved`;
      case 'error':
        return `Error: ${status.error}`;
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    if (!status) return 'secondary';
    
    switch (status.status) {
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!effectivePatientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medical Document Processor</CardTitle>
          <CardDescription>
            {primaryPatient ? 'Loading patient information...' : 'Please select a patient first'}
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
            <FileText className="h-5 w-5" />
            Comprehensive Medical Document Processor
          </CardTitle>
          <CardDescription>
            Upload and process medical documents for {effectivePatientName} with complete database integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Info */}
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>Patient:</strong> {effectivePatientName} | <strong>Processing:</strong> Full document analysis with database storage
            </AlertDescription>
          </Alert>

          {/* Upload Section */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Upload Medical Document</h3>
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, Word documents (Max 10MB)
              </p>
            </div>

            <div className="space-y-2">
              <Button
                disabled={isProcessing}
                onClick={() => document.getElementById('comprehensive-file-upload')?.click()}
                className="gap-2"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Choose File
              </Button>
              <input
                id="comprehensive-file-upload"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Status Display */}
          {status && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <span className="font-medium">{status.fileName}</span>
                    </div>
                    <Badge variant={getStatusColor()}>
                      {getStatusText()}
                    </Badge>
                  </div>
                  
                  {(status.status !== 'completed' && status.status !== 'error') && (
                    <Progress value={status.progress} className="w-full" />
                  )}

                  {/* Summary Stats */}
                  {status.status === 'completed' && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <TestTube className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                        <div className="text-lg font-bold">{status.extractedCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Fields Extracted</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <Database className="h-6 w-6 mx-auto mb-1 text-green-600" />
                        <div className="text-lg font-bold">{status.savedCount || 0}</div>
                        <div className="text-xs text-muted-foreground">Records Saved</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing Logs */}
          {status && status.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processing Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {status.logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <div className="flex-shrink-0 mt-1">
                          {log.status === 'success' && <CheckCircle className="h-3 w-3 text-green-600" />}
                          {log.status === 'error' && <XCircle className="h-3 w-3 text-red-600" />}
                          {log.status === 'warning' && <AlertCircle className="h-3 w-3 text-yellow-600" />}
                          {log.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                          {log.status === 'info' && <AlertCircle className="h-3 w-3 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-mono text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="font-medium">{log.step}</div>
                          <div>{log.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Processing Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Advanced AI extracts lab results, biomarkers, and clinical data
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Data is automatically saved to clinical database tables
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Quality Assurance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Comprehensive logging and validation for data integrity
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensiveMedicalProcessor;