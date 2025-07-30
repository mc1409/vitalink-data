import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { FileProcessor, ExtractionResult, ProcessingProgress } from '@/utils/FileProcessor';

interface ProcessingStep {
  id: string;
  type: string;
  status: 'running' | 'completed' | 'error';
  message: string;
  timestamp: number;
  details?: any;
}

interface ExtractedData {
  documentType: string;
  confidence: number;
  extractedFields: any;
  recommendations: string[];
}

interface ProcessingLog {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  storage_path: string;
  upload_status: string;
  processing_status: string;
  ai_analysis_status: string;
  extracted_text_preview?: string;
  ai_structured_data?: any;
  confidence_score?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

const PDFUploadProcessor: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<ExtractedData | null>(null);
  const [uploadHistory, setUploadHistory] = useState<ProcessingLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ProcessingLog | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [showDetailedLogs, setShowDetailedLogs] = useState(false);

  const addProcessingStep = useCallback((type: string, status: ProcessingStep['status'], message: string, details?: any) => {
    const newStep: ProcessingStep = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      status,
      message,
      timestamp: Date.now(),
      details
    };
    setProcessingSteps(prev => [...prev, newStep]);
    return newStep.id;
  }, []);

  const updateProcessingStep = useCallback((stepId: string, status: ProcessingStep['status'], message: string, details?: any) => {
    setProcessingSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, status, message, details: details || step.details }
          : step
      )
    );
  }, []);

  const fetchUploadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('document_processing_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUploadHistory(data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
      toast.error('Failed to fetch upload history');
    }
  }, []);

  React.useEffect(() => {
    fetchUploadHistory();
  }, [fetchUploadHistory]);

  const extractTextFromDocument = async (file: File): Promise<ExtractionResult> => {
    return await FileProcessor.extractText(file, (progress: ProcessingProgress) => {
      // Convert FileProcessor progress to our existing step system
      const stepMapping: { [key: string]: string } = {
        'validation': 'FILE_VALIDATION',
        'detection': 'FILE_TYPE_DETECTION',
        'pdf_loading': 'PDF_LOADING',
        'pdf_extraction': 'TEXT_EXTRACTION',
        'docx_processing': 'TEXT_EXTRACTION',
        'text_reading': 'TEXT_EXTRACTION',
        'csv_parsing': 'TEXT_EXTRACTION',
        'excel_processing': 'TEXT_EXTRACTION',
        'completed': 'EXTRACTION_COMPLETED'
      };

      const stepName = stepMapping[progress.stage] || 'PROCESSING';
      
      addProcessingStep(stepName, 'running', progress.message, {
        stage: progress.stage,
        progress: progress.progress
      });
    });
  };

  const processWithAI = async (text: string, filename: string): Promise<ExtractedData> => {
    const aiRequestStepId = addProcessingStep('AI_ANALYSIS', 'running', 'Sending data to Azure OpenAI for analysis...');
    
    // Log the prompt being sent
    const prompt = {
      extractedText: text,
      filename: filename
    };
    
    updateProcessingStep(aiRequestStepId, 'running', 'Processing with AI model...', {
      prompt: prompt,
      textLength: text.length,
      model: 'Azure OpenAI GPT-4'
    });

    const { data, error } = await supabase.functions.invoke('process-medical-document', {
      body: prompt
    });

    if (error) {
      updateProcessingStep(aiRequestStepId, 'error', `AI analysis failed: ${error.message}`, {
        error: error.message
      });
      throw error;
    }
    
    updateProcessingStep(aiRequestStepId, 'completed', 'AI analysis request successful', {
      responseReceived: true,
      response: data
    });
    
    return data;
  };

  const saveToDatabase = async (logId: string, extractedData: ExtractedData) => {
    const saveStepId = addProcessingStep('DATABASE_SAVE', 'running', 'Saving structured data to database...');
    
    try {
      const { error } = await supabase
        .from('document_processing_logs')
        .update({
          processing_status: 'completed',
          ai_structured_data: extractedData.extractedFields,
          confidence_score: extractedData.confidence
        })
        .eq('id', logId);

      if (error) throw error;
      
      updateProcessingStep(saveStepId, 'completed', 'Data saved successfully', {
        logId,
        tablesUpdated: Object.keys(extractedData.extractedFields)
      });
    } catch (error) {
      updateProcessingStep(saveStepId, 'error', 'Failed to save to database', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('Could not update processing log:', error);
    }
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    const filename = `${user?.id}/${Date.now()}-${file.name}`;
    
    console.log('Starting storage upload:', { 
      filename, 
      fileSize: file.size, 
      fileType: file.type,
      userId: user?.id 
    });
    
    try {
      const { data, error } = await supabase.storage
        .from('medical-pdfs')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error details:', {
          error: error,
          message: error.message,
          filename,
          fileSize: file.size
        });
        throw new Error(`Storage upload failed: ${error.message}`);
      }
      
      console.log('Storage upload successful:', { data, filename });
      return filename;
    } catch (uploadError) {
      console.error('Storage upload exception:', uploadError);
      throw uploadError;
    }
  };

  const createProcessingLog = async (file: File, storagePath: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('document_processing_logs')
        .insert({
          user_id: user?.id,
          filename: file.name,
          file_size: file.size,
          storage_path: storagePath,
          upload_status: 'completed',
          processing_status: 'extracting_text',
          ai_analysis_status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || 'temp-' + Date.now();
    } catch (error) {
      console.log('Could not create processing log:', error);
      return 'temp-' + Date.now(); // Return a temporary ID
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log('Upload attempt - User:', user?.email, 'User ID:', user?.id);
    
    if (!user?.id) {
      console.log('No user ID found, blocking upload');
      toast.error('Authentication required. Please refresh the page and try again.');
      return;
    }

    // Clear previous logs and reset state
    setProcessingSteps([]);
    setCurrentFile(file);
    setUploading(true);
    setProgress(0);
    setExtractedText('');
    setAiAnalysis(null);
    setShowDetailedLogs(true);

    const startTime = Date.now();
    addProcessingStep('INIT', 'completed', `Starting upload process for ${file.name}`, {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: file.type,
      userId: user.id
    });

    try {
      // Step 1: Upload to storage
      const uploadStepId = addProcessingStep('STORAGE_UPLOAD', 'running', 'Uploading document to Supabase storage...');
      updateProcessingStep(uploadStepId, 'running', 'Uploading document to Supabase storage...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      setProgress(20);
      
      const storagePath = await uploadToStorage(file);
      updateProcessingStep(uploadStepId, 'completed', 'Document uploaded successfully', {
        storagePath,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`
      });
      
      // Step 2: Create processing log
      const logStepId = addProcessingStep('CREATE_LOG', 'running', 'Creating processing log entry...');
      setProgress(40);
      
      const logId = await createProcessingLog(file, storagePath);
      updateProcessingStep(logStepId, 'completed', 'Processing log created', {
        logId,
        table: 'document_processing_logs'
      });
      
      // Step 3: Extract text using intelligent file processor
      const extractStepId = addProcessingStep('TEXT_EXTRACTION', 'running', `Extracting text from ${file.type || 'document'}...`);
      setProgress(60);
      setProcessing(true);
      
      const extractionResult = await extractTextFromDocument(file);
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error || 'Failed to extract text from document');
      }
      
      const text = extractionResult.text;
      setExtractedText(text);
      
      updateProcessingStep(extractStepId, 'completed', 
        `Extracted ${text.length} characters from ${extractionResult.metadata.fileType}`, {
        textLength: text.length,
        textPreview: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
        fullText: text,
        fileType: extractionResult.metadata.fileType,
        metadata: extractionResult.metadata
      });
      
      // Update log with extracted text
      const updateLogStepId = addProcessingStep('UPDATE_LOG_TEXT', 'running', 'Updating processing log with extracted text...');
      
      try {
        await supabase
          .from('document_processing_logs')
          .update({
            processing_status: 'text_extracted',
            extracted_text_preview: text.substring(0, 500),
            ai_analysis_status: 'processing'
          })
          .eq('id', logId);
        updateProcessingStep(updateLogStepId, 'completed', 'Processing log updated with extracted text');
      } catch (error) {
        updateProcessingStep(updateLogStepId, 'error', 'Failed to update processing log');
        console.log('Could not update processing log:', error);
      }
      
      // Step 4: AI Analysis
      const aiStepId = addProcessingStep('AI_ANALYSIS', 'running', 'Sending extracted text to Azure OpenAI for medical data analysis...');
      setProgress(80);
      
      const aiResult = await processWithAI(text, file.name);
      setAiAnalysis(aiResult);
      updateProcessingStep(aiStepId, 'completed', `AI analysis completed with ${Math.round(aiResult.confidence * 100)}% confidence`, {
        documentType: aiResult.documentType,
        confidence: aiResult.confidence,
        extractedFieldsCount: Object.keys(aiResult.extractedFields).length,
        recommendationsCount: aiResult.recommendations.length,
        fullAnalysis: aiResult
      });
      
      // Step 5: Save to database
      const saveStepId = addProcessingStep('SAVE_DATABASE', 'running', 'Saving structured data to health database tables...');
      setProgress(100);
      
      await saveToDatabase(logId, aiResult);
      updateProcessingStep(saveStepId, 'completed', 'Structured data saved successfully to database', {
        tablesUpdated: Object.keys(aiResult.extractedFields),
        logId
      });
      
      const endTime = Date.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(2);
      addProcessingStep('COMPLETED', 'completed', `Document processing completed successfully in ${totalTime} seconds`, {
        totalTime: `${totalTime}s`,
        stepsCompleted: processingSteps.length + 1
      });
      
      toast.success('Document processed successfully!');
      fetchUploadHistory();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addProcessingStep('ERROR', 'error', `Processing failed: ${errorMessage}`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      console.error('Upload error:', error);
      toast.error('Failed to process document');
    } finally {
      setUploading(false);
      setProcessing(false);
      setCurrentFile(null);
      setProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      // Accept multiple file types now
      const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (supportedTypes.includes(file.type) || file.name.match(/\.(pdf|docx|doc|txt|csv|xlsx|xls)$/i)) {
        handleFileUpload(file);
      } else {
        toast.error('Please upload a supported file type (PDF, Word, Excel, CSV, TXT)');
      }
    }
  }, [uploading, user?.id]);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Accept multiple file types now
      const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (supportedTypes.includes(file.type) || file.name.match(/\.(pdf|docx|doc|txt|csv|xlsx|xls)$/i)) {
        handleFileUpload(file);
      } else {
        toast.error('Please upload a supported file type (PDF, Word, Excel, CSV, TXT)');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': case 'extracting_text': case 'text_extracted': return Clock;
      case 'error': case 'failed': return AlertCircle;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': case 'extracting_text': case 'text_extracted': return 'bg-yellow-500';
      case 'error': case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Medical Document Processor</h2>
        <p className="text-muted-foreground">Upload documents to extract and analyze medical data</p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="logs">Processing Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Upload className="h-6 w-6" />
                Document Upload
              </CardTitle>
              <CardDescription>
                Drag and drop a document or click to select. Supported formats: PDF, Word, Excel, CSV, TXT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {uploading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium">
                      {processing ? 'Processing document...' : 'Uploading...'}
                    </span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  {currentFile && (
                    <div className="text-center text-sm text-muted-foreground">
                      {currentFile.name} • {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-4">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Drop your document here</p>
                      <p className="text-sm text-muted-foreground">
                        PDFs, Word docs, Excel files, CSV data, text files
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Browse Files
                    </Button>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls"
                    onChange={handleFileSelection}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {extractedText && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extracted Text Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full border rounded p-4">
                  <pre className="whitespace-pre-wrap text-sm">
                    {extractedText.substring(0, 2000)}
                    {extractedText.length > 2000 && '...'}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {aiAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Analysis Results
                  <Badge variant="secondary">{Math.round(aiAnalysis.confidence * 100)}% confidence</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Document Type</h4>
                  <Badge variant="outline">{aiAnalysis.documentType}</Badge>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Extracted Medical Data</h4>
                  <ScrollArea className="h-48 w-full border rounded p-4">
                    <pre className="text-xs">
                      {JSON.stringify(aiAnalysis.extractedFields, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
                
                {aiAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {aiAnalysis.recommendations.map((rec, index) => (
                        <li key={`recommendation-${index}`} className="text-sm text-muted-foreground">
                          • {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upload History</h3>
            <Button onClick={fetchUploadHistory} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {uploadHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No documents uploaded yet</p>
              </div>
            ) : (
              uploadHistory.map((log, index) => {
                const StatusIcon = getStatusIcon(log.processing_status);
                return (
                  <Card key={`${log.id}-${index}`} className="shadow-card-custom">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StatusIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{log.filename}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(log.created_at).toLocaleDateString()} • {(log.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(log.processing_status)}`} />
                          <Badge variant="outline" className="text-xs">
                            {log.processing_status}
                          </Badge>
                          {log.confidence_score && (
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(log.confidence_score * 100)}%
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          {selectedLog ? (
            <Card className="shadow-medical">
              <CardHeader>
                <CardTitle>{selectedLog.filename} - Analysis Details</CardTitle>
                <CardDescription>
                  Processed on {new Date(selectedLog.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedLog.extracted_text_preview && (
                  <div>
                    <h4 className="font-medium mb-2">Extracted Text Preview</h4>
                    <ScrollArea className="h-32 w-full border rounded p-4">
                      <pre className="text-xs whitespace-pre-wrap">
                        {selectedLog.extracted_text_preview}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
                
                {selectedLog.ai_structured_data && (
                  <div>
                    <h4 className="font-medium mb-2">Structured Data</h4>
                    <ScrollArea className="h-64 w-full border rounded p-4">
                      <pre className="text-xs">
                        {JSON.stringify(selectedLog.ai_structured_data, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select a document from the history to view analysis details
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Detailed Processing Logs
              </CardTitle>
              <CardDescription>
                Real-time step-by-step processing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingSteps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No processing logs yet. Upload a document to see detailed logs.</p>
                </div>
              ) : (
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-4">
                    {processingSteps.map((step, index) => (
                      <div key={`${step.type}-${step.timestamp}-${index}`} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {step.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : step.status === 'error' ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                            )}
                            <span className="font-medium">{step.type}</span>
                            <Badge variant={
                              step.status === 'completed' ? 'default' :
                              step.status === 'error' ? 'destructive' : 'secondary'
                            }>
                              {step.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{step.message}</p>
                        {step.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Show Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PDFUploadProcessor;