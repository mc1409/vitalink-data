import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  User,
  Calendar,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DatabaseMapper } from '@/utils/DatabaseMapper';

interface PatientDocumentUploadProps {
  patientId: string;
  patientName?: string;
}

interface UploadStatus {
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  extractedCount?: number;
}

const PatientDocumentUpload: React.FC<PatientDocumentUploadProps> = ({ 
  patientId, 
  patientName = 'Selected Patient' 
}) => {
  console.log('PatientDocumentUpload - Received patient ID:', patientId);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !patientId) return;

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
    setUploadStatus({
      fileName: file.name,
      status: 'uploading',
      progress: 0
    });

    try {
      // Step 1: Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${patientId}.${fileExt}`;
      const filePath = `medical-documents/${fileName}`;

      setUploadStatus(prev => prev ? { ...prev, progress: 25 } : null);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('medical-pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadStatus(prev => prev ? { ...prev, progress: 50, status: 'processing' } : null);

      // Step 2: Create processing log entry
      const { data: user } = await supabase.auth.getUser();
      const { data: logEntry, error: logError } = await supabase
        .from('document_processing_logs')
        .insert({
          user_id: user.user?.id || '',
          patient_id: patientId,
          filename: file.name,
          file_size: file.size,
          storage_path: filePath,
          upload_status: 'completed'
        })
        .select()
        .single();

      if (logError) throw logError;

      setUploadStatus(prev => prev ? { ...prev, progress: 75 } : null);

      // Step 3: Extract text from the uploaded file
      const { data: extractResult, error: extractError } = await supabase.functions.invoke(
        'extract-document-text',
        {
          body: { storage_path: filePath }
        }
      );

      if (extractError) throw extractError;
      if (!extractResult.success) throw new Error(extractResult.error);

      // Step 4: Process with AI and save to database
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-medical-document',
        {
          body: {
            text: extractResult.extractedText,
            filename: file.name,
            patient_id: patientId,
            log_id: logEntry.id
          }
        }
      );

      if (processError) throw processError;

      // Step 5: Save extracted data to database using DatabaseMapper
      console.log('Processing extracted data with DatabaseMapper...');
      const processingResult = await DatabaseMapper.processExtractedData(processResult.extracted_fields, logEntry.id);
      
      console.log('DatabaseMapper processing result:', processingResult);
      const savedCount = processingResult.totalProcessed;

      // Update processing log with final status
      await supabase
        .from('document_processing_logs')
        .update({
          processing_status: 'completed',
          ai_analysis_status: 'completed',
          confidence_score: processResult.confidence,
          ai_structured_data: processResult
        })
        .eq('id', logEntry.id);

      setUploadStatus({
        fileName: file.name,
        status: 'completed',
        progress: 100,
        extractedCount: savedCount
      });

      toast.success(
        `Document processed successfully! ${savedCount} lab results saved to database.`
      );

    } catch (error: any) {
      console.error('Upload/processing error:', error);
      setUploadStatus({
        fileName: file.name,
        status: 'error',
        progress: 0,
        error: error.message || 'Upload failed'
      });
      toast.error('Failed to process document: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  }, [patientId]);

  const renderUploadStatus = () => {
    if (!uploadStatus) return null;

    const getStatusIcon = () => {
      switch (uploadStatus.status) {
        case 'uploading':
        case 'processing':
          return <Loader2 className="h-4 w-4 animate-spin" />;
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'error':
          return <XCircle className="h-4 w-4 text-red-600" />;
        default:
          return <AlertCircle className="h-4 w-4" />;
      }
    };

    const getStatusColor = () => {
      switch (uploadStatus.status) {
        case 'completed':
          return 'default';
        case 'error':
          return 'destructive';
        default:
          return 'secondary';
      }
    };

    const getStatusText = () => {
      switch (uploadStatus.status) {
        case 'uploading':
          return 'Uploading...';
        case 'processing':
          return 'Processing document...';
        case 'completed':
          return `Completed - ${uploadStatus.extractedCount || 0} records extracted`;
        case 'error':
          return `Error: ${uploadStatus.error}`;
        default:
          return 'Unknown status';
      }
    };

    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-medium">{uploadStatus.fileName}</span>
              </div>
              <Badge variant={getStatusColor()}>
                {getStatusText()}
              </Badge>
            </div>
            
            {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
              <Progress value={uploadStatus.progress} className="w-full" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>Please select a patient first</CardDescription>
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
            Medical Document Upload
          </CardTitle>
          <CardDescription>
            Upload medical documents for {patientName} - Lab results, reports, and clinical documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Info */}
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>Patient:</strong> {patientName} | <strong>Upload Target:</strong> Clinical lab tests and biomarker data
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
                onClick={() => document.getElementById('file-upload')?.click()}
                className="gap-2"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Choose File
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Status Display */}
          {renderUploadStatus()}

          {/* Processing Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Data Extraction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Automatically extracts lab results, biomarkers, and clinical data
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Data is automatically organized by date and type
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
                  AI validates and structures the extracted information
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientDocumentUpload;