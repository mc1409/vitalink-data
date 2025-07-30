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
  status: 'processing' | 'success' | 'error';
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
    logs: []
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addLog = (step: string, status: 'processing' | 'success' | 'error', message: string, data?: any) => {
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
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('extract-document-text', {
        body: formData,
      });

      if (error) throw error;

      addLog('Text Extraction', 'success', `Successfully extracted ${data.text.length} characters from file`, {
        textLength: data.text.length,
        preview: data.text.substring(0, 200) + '...'
      });

      return data.text;
    } catch (error: any) {
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

  const mapAndSaveToDatabase = async (extractedData: ExtractedData): Promise<any[]> => {
    addLog('Database Mapping', 'processing', 'Starting database mapping and insertion...');
    
    const savedRecords: any[] = [];
    let patientId: string | null = null;

    try {
      // Step 1: Create patient record if patient data exists
      if (extractedData.PATIENTS) {
        addLog('Database Mapping', 'processing', 'Creating patient record...');
        
        const patientData = {
          ...extractedData.PATIENTS,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          date_of_birth: extractedData.PATIENTS.date_of_birth || '1990-01-01'
        };

        const { data: patient, error } = await supabase
          .from('patients')
          .insert(patientData)
          .select()
          .single();

        if (error) throw error;

        patientId = patient.id;
        savedRecords.push({ table: 'patients', data: patient });
        addLog('Database Mapping', 'success', 'Patient record created successfully', patient);
      }

      // Step 2: Process lab results
      const labResults = Object.entries(extractedData).filter(([key]) => 
        key.startsWith('LAB_RESULTS')
      );

      if (labResults.length > 0) {
        addLog('Database Mapping', 'processing', `Processing ${labResults.length} lab results...`);

        for (const [key, data] of labResults) {
          try {
            const { data: result, error } = await supabase
              .from('lab_results')
              .insert({
                ...data,
                lab_test_id: null, // Will be linked later if needed
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (error) throw error;

            savedRecords.push({ table: 'lab_results', data: result });
            addLog('Database Mapping', 'success', `Lab result saved: ${data.result_name}`, result);
          } catch (error: any) {
            addLog('Database Mapping', 'error', `Failed to save lab result ${data.result_name}: ${error.message}`);
          }
        }
      }

      // Step 3: Process other health metrics
      const healthTables = ['HEART_METRICS', 'SLEEP_METRICS', 'ACTIVITY_METRICS', 'NUTRITION_METRICS'];
      
      for (const tableName of healthTables) {
        if (extractedData[tableName]) {
          const tableKey = tableName.toLowerCase();
          addLog('Database Mapping', 'processing', `Processing ${tableName}...`);

          try {
            const userId = (await supabase.auth.getUser()).data.user?.id;
            let recordData = {
              ...extractedData[tableName],
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Add device_type if required
            if (['heart_metrics', 'sleep_metrics', 'activity_metrics'].includes(tableKey)) {
              recordData.device_type = 'manual_entry';
            }

            // Handle measurement timestamp/date fields
            if (tableKey === 'heart_metrics' && !recordData.measurement_timestamp) {
              recordData.measurement_timestamp = new Date().toISOString();
            }
            if (tableKey === 'activity_metrics' && !recordData.measurement_timestamp) {
              recordData.measurement_timestamp = new Date().toISOString();
            }

            const { data: result, error } = await supabase
              .from(tableKey as any)
              .insert(recordData)
              .select()
              .single();

            if (error) throw error;

            savedRecords.push({ table: tableKey, data: result });
            addLog('Database Mapping', 'success', `${tableName} data saved successfully`, result);
          } catch (error: any) {
            addLog('Database Mapping', 'error', `Failed to save ${tableName}: ${error.message}`);
          }
        }
      }

      addLog('Database Mapping', 'success', `Processing complete! ${savedRecords.length} records saved across ${new Set(savedRecords.map(r => r.table)).size} tables`);
      return savedRecords;

    } catch (error: any) {
      addLog('Database Mapping', 'error', `Database processing failed: ${error.message}`);
      throw error;
    }
  };

  const processDocument = async () => {
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
      savedRecords: []
    }));

    try {
      // Step 1: Extract text
      updateProcessingStep(1, 'Extracting text from document...');
      let text = textInput.trim();
      
      if (file) {
        text = await extractTextFromFile(file);
      }

      // Step 2: Process with AI
      updateProcessingStep(2, 'Processing with AI to extract medical data...');
      const extractedData = await processWithAI(text);

      // Step 3: Map and save to database
      updateProcessingStep(3, 'Mapping data to database schema...');
      const savedRecords = await mapAndSaveToDatabase(extractedData);

      // Step 4: Complete
      updateProcessingStep(4, 'Processing complete!');
      
      setProcessing(prev => ({
        ...prev,
        extractedData,
        savedRecords,
        isProcessing: false,
        step: 4
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
              'border-blue-200 bg-blue-50'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  {log.status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  ) : log.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
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
            onClick={processDocument}
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