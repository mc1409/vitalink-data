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
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ProcessingLog {
  id: string;
  filename: string;
  file_size: number;
  upload_status: string;
  processing_status: string;
  ai_analysis_status: string;
  extracted_text_preview: string;
  ai_structured_data: any;
  confidence_score: number;
  error_message: string;
  created_at: string;
  updated_at: string;
}

interface ExtractedData {
  documentType: string;
  confidence: number;
  extractedFields: Record<string, any>;
  recommendations: string[];
}

const PDFUploadProcessor = () => {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<ExtractedData | null>(null);
  const [uploadHistory, setUploadHistory] = useState<ProcessingLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ProcessingLog | null>(null);

  const fetchUploadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('document_processing_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setUploadHistory((data as unknown as ProcessingLog[]) || []);
    } catch (error) {
      console.log('Upload history not available yet - table may not exist');
      setUploadHistory([]);
    }
  };

  React.useEffect(() => {
    fetchUploadHistory();
  }, []);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  };

  const processWithAI = async (text: string, filename: string): Promise<ExtractedData> => {
    const { data, error } = await supabase.functions.invoke('process-medical-document', {
      body: {
        extractedText: text,
        filename: filename
      }
    });

    if (error) throw error;
    return data;
  };

  const saveToDatabase = async (logId: string, extractedData: ExtractedData) => {
    // This would implement the logic to save extracted data to appropriate tables
    // For now, we'll just update the processing log
    try {
      const { error } = await supabase
        .from('document_processing_logs' as any)
        .update({
          processing_status: 'completed',
          ai_structured_data: extractedData.extractedFields,
          confidence_score: extractedData.confidence
        })
        .eq('id', logId);

      if (error) throw error;
    } catch (error) {
      console.log('Could not update processing log:', error);
    }
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    const filename = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('medical-pdfs')
      .upload(filename, file);

    if (error) throw error;
    return filename;
  };

  const createProcessingLog = async (file: File, storagePath: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('document_processing_logs' as any)
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
      return (data as any)?.id || 'temp-' + Date.now();
    } catch (error) {
      console.log('Could not create processing log:', error);
      return 'temp-' + Date.now(); // Return a temporary ID
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log('Upload attempt - User:', user?.email, 'User ID:', user?.id);
    
    if (!user) {
      console.log('No user found, blocking upload');
      toast.error('Please log in to upload files');
      return;
    }

    setCurrentFile(file);
    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Upload to storage
      setProgress(20);
      const storagePath = await uploadToStorage(file);
      
      // Step 2: Create processing log
      setProgress(40);
      const logId = await createProcessingLog(file, storagePath);
      
      // Step 3: Extract text
      setProgress(60);
      setProcessing(true);
      const text = await extractTextFromPDF(file);
      setExtractedText(text);
      
      // Update log with extracted text
      try {
        await supabase
          .from('document_processing_logs' as any)
          .update({
            processing_status: 'text_extracted',
            extracted_text_preview: text.substring(0, 500),
            ai_analysis_status: 'processing'
          })
          .eq('id', logId);
      } catch (error) {
        console.log('Could not update processing log:', error);
      }
      
      // Step 4: AI Analysis
      setProgress(80);
      const aiResult = await processWithAI(text, file.name);
      setAiAnalysis(aiResult);
      
      // Step 5: Save to database
      setProgress(100);
      await saveToDatabase(logId, aiResult);
      
      toast.success('Document processed successfully!');
      fetchUploadHistory();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process document');
    } finally {
      setUploading(false);
      setProcessing(false);
      setCurrentFile(null);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        handleFileUpload(file);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': case 'extracting_text': case 'text_extracted': return 'bg-yellow-500';
      case 'failed': case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'processing': case 'extracting_text': case 'text_extracted': return Clock;
      case 'failed': case 'error': return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-primary p-2 rounded-lg shadow-medical">
          <FileText className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Medical Document Processor</h2>
          <p className="text-muted-foreground">Upload PDFs to extract and analyze medical data</p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Process</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Upload Area */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Medical Document
              </CardTitle>
              <CardDescription>
                Drag and drop a PDF file or click to select. Supported formats: PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-primary/10 p-4 rounded-full">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  
                  {uploading ? (
                    <div className="space-y-4 w-full max-w-md">
                      <p className="text-sm text-muted-foreground">
                        Processing {currentFile?.name}...
                      </p>
                      <Progress value={progress} className="w-full" />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {processing && <Brain className="h-4 w-4 animate-pulse" />}
                        {progress < 40 && 'Uploading file...'}
                        {progress >= 40 && progress < 60 && 'Extracting text...'}
                        {progress >= 60 && progress < 80 && 'Analyzing with AI...'}
                        {progress >= 80 && 'Saving to database...'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-lg font-medium">Drop your PDF here</p>
                        <p className="text-sm text-muted-foreground">
                          Lab reports, imaging studies, medical records
                        </p>
                      </div>
                      
                      <Button asChild className="gap-2">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="h-4 w-4" />
                          Choose File
                        </label>
                      </Button>
                      
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Results */}
          {(extractedText || aiAnalysis) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {extractedText && (
                <Card className="shadow-medical">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Extracted Text
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64 w-full border rounded p-4">
                      <pre className="text-xs whitespace-pre-wrap">{extractedText}</pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {aiAnalysis && (
                <Card className="shadow-medical">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Analysis Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Document Type:</span>
                      <Badge variant="outline">{aiAnalysis.documentType}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Confidence:</span>
                      <Badge variant={aiAnalysis.confidence > 0.8 ? 'default' : 'secondary'}>
                        {Math.round(aiAnalysis.confidence * 100)}%
                      </Badge>
                    </div>
                    <ScrollArea className="h-32">
                      <pre className="text-xs">{JSON.stringify(aiAnalysis.extractedFields, null, 2)}</pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
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
            {uploadHistory.map((log) => {
              const StatusIcon = getStatusIcon(log.processing_status);
              return (
                <Card key={log.id} className="shadow-card-custom">
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
            })}
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
      </Tabs>
    </div>
  );
};

export default PDFUploadProcessor;