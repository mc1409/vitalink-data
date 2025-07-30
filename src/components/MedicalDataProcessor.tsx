import React, { useState, useRef } from 'react';
import { Upload, FileText, Database, Brain, CheckCircle, AlertCircle, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProcessingLog {
  id: string;
  timestamp: string;
  step: string;
  status: 'processing' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
}

interface ExtractedData {
  [tableName: string]: any;
}

interface ProcessingState {
  step: number;
  totalSteps: number;
  currentOperation: string;
  isProcessing: boolean;
  extractedData: ExtractedData | null;
  savedRecords: any[];
  logs: ProcessingLog[];
  streamingText: string;
  showStreamingText: boolean;
}

const MedicalDataProcessor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    step: 0,
    totalSteps: 5,
    currentOperation: '',
    isProcessing: false,
    extractedData: null,
    savedRecords: [],
    logs: [],
    streamingText: '',
    showStreamingText: false
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addLog = (step: string, status: 'processing' | 'success' | 'error' | 'warning' | 'info', message: string, data?: any) => {
    const log: ProcessingLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      data
    };
    
    setProcessing(prev => ({
      ...prev,
      logs: [log, ...prev.logs]
    }));
  };

  const updateProcessingStep = (step: number, operation: string) => {
    setProcessing(prev => ({
      ...prev,
      step,
      currentOperation: operation
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      addLog('File Upload', 'success', `File selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    addLog('Text Extraction', 'processing', 'Starting text extraction from uploaded file...');
    
    // Show streaming text area
    setProcessing(prev => ({ ...prev, showStreamingText: true, streamingText: '' }));
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add file type information to help the edge function
      if (file.name) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension) {
          formData.append('fileType', extension);
        }
      }

      // Simulate streaming by showing progress
      setProcessing(prev => ({ 
        ...prev, 
        streamingText: `Processing ${file.name} (${file.size} bytes)...\n\nExtracting text content...` 
      }));

      const { data, error } = await supabase.functions.invoke('extract-document-text', {
        body: formData,
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to extract text from file');
      }

      // Stream the extracted text progressively
      const fullText = data.extractedText;
      let currentText = '';
      const chunkSize = 50;
      
      for (let i = 0; i < fullText.length; i += chunkSize) {
        currentText += fullText.slice(i, i + chunkSize);
        setProcessing(prev => ({ 
          ...prev, 
          streamingText: `📄 Extracted from ${file.name}:\n\n${currentText}${i + chunkSize < fullText.length ? '...' : ''}` 
        }));
        
        // Small delay to show streaming effect
        if (i + chunkSize < fullText.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      addLog('Text Extraction', 'success', `Successfully extracted ${data.extractedText.length} characters from file`, {
        textLength: data.extractedText.length,
        preview: data.extractedText.substring(0, 200) + '...'
      });

      return data.extractedText;
    } catch (error: any) {
      setProcessing(prev => ({ 
        ...prev, 
        streamingText: `❌ Error extracting text from ${file.name}:\n\n${error.message}` 
      }));
      addLog('Text Extraction', 'error', `Failed to extract text: ${error.message}`);
      throw error;
    }
  };

  const processWithAI = async (text: string): Promise<ExtractedData> => {
    addLog('AI Processing', 'processing', 'Sending text to AI for medical data extraction...');
    
    try {
      const { data, error } = await supabase.functions.invoke('process-medical-document', {
        body: { text, filename: file?.name || 'Direct Text Input' },
      });

      if (error) throw error;

      addLog('AI Processing', 'success', `AI successfully extracted ${Object.keys(data.extractedFields).length} data entities`, {
        documentType: data.documentType,
        confidence: data.confidence,
        extractedFields: data.extractedFields,
        recommendations: data.recommendations
      });

      return data.extractedFields;
    } catch (error: any) {
      addLog('AI Processing', 'error', `AI processing failed: ${error.message}`);
      throw error;
    }
  };

  const checkForDuplicates = async (extractedData: ExtractedData, extractedText: string): Promise<{ hasDuplicates: boolean, duplicateDetails: any[] }> => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return { hasDuplicates: false, duplicateDetails: [] };

      const duplicateDetails: any[] = [];

      // Check for duplicate text content in document_processing_logs
      const textHash = btoa(extractedText.substring(0, 500)); // Use first 500 chars as fingerprint
      const { data: existingLogs } = await supabase
        .from('document_processing_logs')
        .select('*')
        .eq('user_id', userId)
        .contains('ai_structured_data', { textHash })
        .limit(1);

      if (existingLogs && existingLogs.length > 0) {
        duplicateDetails.push({
          type: 'document',
          message: 'Similar document content found',
          existing: existingLogs[0]
        });
      }

      // Check for duplicate lab results based on test name and date
      for (const [tableName, data] of Object.entries(extractedData)) {
        if (tableName.startsWith('LAB_RESULTS') && data && data.result_name) {
          const { data: existingResults } = await supabase
            .from('lab_results')
            .select('*')
            .eq('result_name', data.result_name)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
            .limit(1);

          if (existingResults && existingResults.length > 0) {
            duplicateDetails.push({
              type: 'lab_result',
              message: `Lab result "${data.result_name}" found within last 24 hours`,
              existing: existingResults[0]
            });
          }
        }
      }

      return { hasDuplicates: duplicateDetails.length > 0, duplicateDetails };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { hasDuplicates: false, duplicateDetails: [] };
    }
  };

  const mapAndSaveToDatabase = async (extractedData: ExtractedData): Promise<any[]> => {
    addLog('Database Mapping', 'processing', 'Starting database mapping and insertion...');
    
    const savedRecords: any[] = [];
    let patientId: string | null = null;

    // Define valid columns for each table to filter out invalid fields
    const validColumns = {
      patients: [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'phone_primary', 'phone_secondary',
        'email', 'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        'medical_record_number', 'primary_care_physician', 'insurance_provider',
        'insurance_policy_number', 'insurance_group_number', 'race_ethnicity', 'user_id'
      ],
      lab_results: [
        'result_name', 'numeric_value', 'text_value', 'units', 'reference_range_min',
        'reference_range_max', 'reference_range_text', 'abnormal_flag', 'result_status',
        'interpretation', 'reviewing_physician', 'lab_test_id'
      ],
      heart_metrics: [
        'measurement_timestamp', 'device_type', 'resting_heart_rate', 'average_heart_rate',
        'max_heart_rate', 'min_heart_rate', 'walking_heart_rate', 'workout_heart_rate',
        'recovery_heart_rate', 'hrv_score', 'hrv_rmssd', 'hrv_sdnn', 'vo2_max',
        'measurement_context', 'data_source', 'user_id'
      ],
      sleep_metrics: [
        'sleep_date', 'device_type', 'bedtime', 'sleep_start', 'sleep_end', 'wake_time',
        'total_sleep_time', 'time_in_bed', 'sleep_efficiency', 'sleep_latency',
        'rem_sleep_minutes', 'deep_sleep_minutes', 'light_sleep_minutes', 'awake_minutes',
        'sleep_score', 'restfulness_score', 'sleep_disturbances', 'sleep_debt',
        'data_source', 'user_id'
      ],
      activity_metrics: [
        'measurement_date', 'measurement_timestamp', 'device_type', 'steps_count',
        'distance_walked_meters', 'distance_ran_meters', 'distance_cycled_meters',
        'flights_climbed', 'total_calories', 'active_calories', 'basal_calories',
        'exercise_minutes', 'moderate_activity_minutes', 'vigorous_activity_minutes',
        'data_source', 'user_id'
      ]
    };

    // Helper function to filter and map data to valid columns
    const filterValidFields = (data: any, tableName: keyof typeof validColumns) => {
      const validCols = validColumns[tableName];
      const filtered: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (validCols.includes(key) && value !== null && value !== undefined) {
          filtered[key] = value;
        } else if (key === 'address' && tableName === 'patients') {
          // Map 'address' to 'address_line1' for patients
          filtered.address_line1 = value;
        }
      }
      
      return filtered;
    };

    try {
      // Step 1: Create patient record if patient data exists
      if (extractedData.PATIENTS) {
        addLog('Database Mapping', 'processing', 'Creating patient record...');
        
        const patientData = filterValidFields(extractedData.PATIENTS, 'patients');
        patientData.user_id = (await supabase.auth.getUser()).data.user?.id;
        
        // Ensure required fields have defaults
        if (!patientData.date_of_birth) {
          patientData.date_of_birth = '1990-01-01';
        }

        const { data: patient, error } = await supabase
          .from('patients')
          .insert(patientData)
          .select()
          .single();

        if (error) {
          addLog('Database Mapping', 'warning', `Patient creation failed: ${error.message}. Continuing with other data.`);
        } else {
          patientId = patient.id;
          savedRecords.push({ table: 'patients', data: patient });
          addLog('Database Mapping', 'success', 'Patient record created successfully', patient);
        }
      }

      // Step 2: Process lab results
      const labResults = Object.entries(extractedData).filter(([key]) => 
        key.startsWith('LAB_RESULTS')
      );

      if (labResults.length > 0) {
        addLog('Database Mapping', 'processing', `Processing ${labResults.length} lab results...`);

        for (const [key, data] of labResults) {
          try {
            const labData = filterValidFields(data, 'lab_results');
            
            const { data: result, error } = await supabase
              .from('lab_results')
              .insert({
                ...labData,
                lab_test_id: null, // Will be linked later if needed
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (error) {
              addLog('Database Mapping', 'warning', `Lab result failed for ${data.result_name}: ${error.message}`);
              continue;
            }

            savedRecords.push({ table: 'lab_results', data: result });
            addLog('Database Mapping', 'success', `Lab result saved: ${data.result_name}`, result);
          } catch (error: any) {
            addLog('Database Mapping', 'error', `Failed to save lab result ${data.result_name}: ${error.message}`);
          }
        }
      }

      // Step 3: Process heart metrics
      if (extractedData.HEART_METRICS) {
        addLog('Database Mapping', 'processing', 'Processing heart metrics...');
        
        try {
          const heartData = filterValidFields(extractedData.HEART_METRICS, 'heart_metrics');
          heartData.user_id = (await supabase.auth.getUser()).data.user?.id;
          heartData.device_type = 'manual_entry';
          heartData.measurement_timestamp = heartData.measurement_timestamp || new Date().toISOString();

          const { data: result, error } = await supabase
            .from('heart_metrics')
            .insert(heartData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Heart metrics failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'heart_metrics', data: result });
            addLog('Database Mapping', 'success', 'Heart metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Heart metrics processing failed: ${error.message}`);
        }
      }

      // Step 4: Process sleep metrics
      if (extractedData.SLEEP_METRICS) {
        addLog('Database Mapping', 'processing', 'Processing sleep metrics...');
        
        try {
          const sleepData = filterValidFields(extractedData.SLEEP_METRICS, 'sleep_metrics');
          sleepData.user_id = (await supabase.auth.getUser()).data.user?.id;
          sleepData.device_type = 'manual_entry';
          sleepData.sleep_date = sleepData.sleep_date || new Date().toISOString().split('T')[0];

          const { data: result, error } = await supabase
            .from('sleep_metrics')
            .insert(sleepData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Sleep metrics failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'sleep_metrics', data: result });
            addLog('Database Mapping', 'success', 'Sleep metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Sleep metrics processing failed: ${error.message}`);
        }
      }

      // Step 5: Process activity metrics
      if (extractedData.ACTIVITY_METRICS) {
        addLog('Database Mapping', 'processing', 'Processing activity metrics...');
        
        try {
          const activityData = filterValidFields(extractedData.ACTIVITY_METRICS, 'activity_metrics');
          activityData.user_id = (await supabase.auth.getUser()).data.user?.id;
          activityData.device_type = 'manual_entry';
          activityData.measurement_date = activityData.measurement_date || new Date().toISOString().split('T')[0];
          activityData.measurement_timestamp = activityData.measurement_timestamp || new Date().toISOString();

          const { data: result, error } = await supabase
            .from('activity_metrics')
            .insert(activityData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Activity metrics failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'activity_metrics', data: result });
            addLog('Database Mapping', 'success', 'Activity metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Activity metrics processing failed: ${error.message}`);
        }
      }

      addLog('Database Mapping', 'success', `Processing complete! ${savedRecords.length} records saved across ${new Set(savedRecords.map(r => r.table)).size} tables`);
      return savedRecords;

    } catch (error: any) {
      addLog('Database Mapping', 'error', `Database processing failed: ${error.message}`);
      throw error;
    }
  };

  const processDocument = async (forceOverwrite = false) => {
    if (!file && !textInput.trim()) {
      toast({
        title: "No Input",
        description: "Please upload a file or enter text to process.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(prev => ({
      ...prev,
      isProcessing: true,
      step: 0,
      logs: [],
      extractedData: null,
      savedRecords: [],
      streamingText: '',
      showStreamingText: false
    }));

    try {
      // Step 1: Extract text
      updateProcessingStep(1, 'Extracting text from document...');
      let text = textInput.trim();
      
      if (file && !text) {
        // Only call edge function if we have a file and no text input
        try {
          text = await extractTextFromFile(file);
        } catch (error: any) {
          // If file extraction fails, check if user provided text instead
          if (!textInput.trim()) {
            throw new Error(`File processing failed: ${error.message}. Please try pasting the text directly instead.`);
          }
          text = textInput.trim();
          addLog('Text Extraction', 'warning', 'File processing failed, using provided text input instead');
        }
        } else if (text) {
          setProcessing(prev => ({ 
            ...prev, 
            showStreamingText: true,
            streamingText: `📝 Using provided text input (${text.length} characters):\n\n${text.substring(0, 500)}${text.length > 500 ? '...' : ''}` 
          }));
          addLog('Text Extraction', 'success', `Using provided text input (${text.length} characters)`);
        }

      // Step 2: Process with AI
      updateProcessingStep(2, 'Processing with AI to extract medical data...');
      const extractedData = await processWithAI(text);

      // Step 3: Check for duplicates (unless forced)
      if (!forceOverwrite) {
        updateProcessingStep(3, 'Checking for duplicate data...');
        const { hasDuplicates, duplicateDetails } = await checkForDuplicates(extractedData, text);
        
        if (hasDuplicates) {
          const duplicateMessages = duplicateDetails.map(d => d.message).join('\n');
          const userConfirmed = confirm(
            `Potential duplicate data detected:\n\n${duplicateMessages}\n\nDo you want to proceed and save this data anyway? This will create new records without overwriting existing ones.`
          );
          
          if (!userConfirmed) {
            setProcessing(prev => ({
              ...prev,
              isProcessing: false,
              step: 0
            }));
            addLog('Duplicate Check', 'warning', 'Processing cancelled due to duplicate data detection');
            return;
          }
          
          addLog('Duplicate Check', 'info', 'User confirmed to proceed despite duplicates');
        } else {
          addLog('Duplicate Check', 'success', 'No duplicates found');
        }
      }

      // Step 4: Map and save to database
      updateProcessingStep(4, 'Mapping data to database schema...');
      const savedRecords = await mapAndSaveToDatabase(extractedData);

      // Step 5: Complete
      updateProcessingStep(5, 'Processing complete!');
      
      setProcessing(prev => ({
        ...prev,
        extractedData,
        savedRecords,
        isProcessing: false,
        step: 5
      }));

      toast({
        title: "Processing Complete",
        description: `Successfully processed and saved ${savedRecords.length} records to the database.`,
      });

    } catch (error: any) {
      addLog('Process Error', 'error', `Processing failed: ${error.message}`);
      setProcessing(prev => ({
        ...prev,
        isProcessing: false
      }));
      
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderDataMapping = () => {
    if (!processing.extractedData) return null;

    return (
      <div className="space-y-4">
        {Object.entries(processing.extractedData).map(([tableName, data]) => (
          <Card key={tableName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                {tableName.replace(/_/g, ' ')}
                <Badge variant="outline" className="ml-auto">
                  {Object.keys(data).length} fields
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(data).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-mono">{value !== null ? String(value) : 'null'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderProcessingSteps = () => {
    const steps = [
      { id: 1, name: 'Text Extraction', icon: FileText },
      { id: 2, name: 'AI Processing', icon: Brain },
      { id: 3, name: 'Database Mapping', icon: Database },
      { id: 4, name: 'Complete', icon: CheckCircle }
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Processing Pipeline</h3>
          <Badge variant={processing.isProcessing ? "default" : "secondary"}>
            Step {processing.step} of {processing.totalSteps - 1}
          </Badge>
        </div>
        
        <Progress value={(processing.step / (processing.totalSteps - 1)) * 100} />
        
        <div className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = processing.step === step.id;
            const isCompleted = processing.step > step.id;
            const isProcessing = processing.isProcessing && isActive;

            return (
              <div key={step.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isActive ? 'bg-primary/10' : isCompleted ? 'bg-green-50' : 'bg-muted/50'
              }`}>
                <Icon className={`h-4 w-4 ${
                  isCompleted ? 'text-green-600' : isActive ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <span className={`text-sm ${
                  isActive ? 'font-medium' : ''
                }`}>
                  {step.name}
                </span>
                {isProcessing && (
                  <div className="ml-auto flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">Processing...</span>
                  </div>
                )}
                {isCompleted && (
                  <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />
                )}
              </div>
            );
          })}
        </div>

        {processing.currentOperation && (
          <div className="text-sm text-muted-foreground italic">
            {processing.currentOperation}
          </div>
        )}
      </div>
    );
  };

  const renderLogs = () => {
    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {processing.logs.map((log) => (
            <Card key={log.id} className={`${
              log.status === 'error' ? 'border-red-200 bg-red-50' :
              log.status === 'success' ? 'border-green-200 bg-green-50' :
              log.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  {log.status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                   ) : log.status === 'success' ? (
                     <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                   ) : log.status === 'warning' ? (
                     <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                   ) : (
                     <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                   )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{log.step}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{log.message}</p>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">
                          View details
                        </summary>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Medical Data Processing Pipeline</h1>
        <p className="text-muted-foreground">
          Upload medical documents or enter text to extract and store health data in structured database tables
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Data Input
          </CardTitle>
          <CardDescription>
            Upload a medical document (PDF, DOCX, TXT) or enter text directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload File</label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </Button>
              {file && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="outline">
                    {(file.size / 1024).toFixed(2)} KB
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Or Enter Text Directly</label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste medical report text here..."
              className="w-full min-h-[100px] p-3 border rounded-md resize-none"
            />
          </div>

          <Button
            onClick={() => processDocument()}
            disabled={processing.isProcessing || (!file && !textInput.trim())}
            className="w-full"
            size="lg"
          >
            {processing.isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Process Medical Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Streaming Text Display */}
      {processing.showStreamingText && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extracted Text Stream
            </CardTitle>
            <CardDescription>
              Real-time view of text being extracted from your document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {processing.streamingText || 'Preparing to extract text...'}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing and Results */}
      {(processing.logs.length > 0 || processing.isProcessing) && (
        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pipeline">Processing Pipeline</TabsTrigger>
            <TabsTrigger value="logs">Detailed Logs</TabsTrigger>
            <TabsTrigger value="mapping">Data Mapping</TabsTrigger>
            <TabsTrigger value="results">Database Results</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <Card>
              <CardHeader>
                <CardTitle>Processing Pipeline Status</CardTitle>
                <CardDescription>
                  Real-time view of the data processing workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProcessingSteps()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Processing Logs</CardTitle>
                <CardDescription>
                  Complete log of all processing steps and operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderLogs()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Data Mapping</CardTitle>
                <CardDescription>
                  How AI-extracted data maps to database table schemas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processing.extractedData ? renderDataMapping() : (
                  <p className="text-muted-foreground text-center py-8">
                    No extracted data available yet. Process a document to see the mapping.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Database Storage Results</CardTitle>
                <CardDescription>
                  Records successfully saved to the database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processing.savedRecords.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(new Set(processing.savedRecords.map(r => r.table))).map(table => {
                        const records = processing.savedRecords.filter(r => r.table === table);
                        return (
                          <Card key={table} className="border-green-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {table.replace(/_/g, ' ').toUpperCase()}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Badge variant="default">{records.length} records saved</Badge>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    <details className="border rounded-lg p-4">
                      <summary className="font-medium cursor-pointer">
                        View All Saved Records ({processing.savedRecords.length})
                      </summary>
                      <pre className="text-xs bg-muted p-4 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(processing.savedRecords, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No records saved yet. Process a document to see the results.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MedicalDataProcessor;