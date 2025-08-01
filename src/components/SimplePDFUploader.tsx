import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  X,
  File
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { pdfExtractor, PDFTextExtractor, type PDFExtractionResult, type ExtractionProgress } from '@/utils/PDFTextExtractor';
import { TextDisplayArea } from './TextDisplayArea';
import { supabase } from '@/integrations/supabase/client';

interface SimplePDFUploaderProps {
  onTextExtracted?: (text: string, filename: string) => void;
  enableDatabaseSave?: boolean;
}

export const SimplePDFUploader: React.FC<SimplePDFUploaderProps> = ({
  onTextExtracted,
  enableDatabaseSave = true
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [result, setResult] = useState<PDFExtractionResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setIsProcessing(false);
    setIsSaving(false);
    setProgress(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!PDFTextExtractor.isPDFFile(file)) {
      return 'Please select a PDF file.';
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 50MB.';
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: "Invalid File",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setProgress(null);
  }, [toast]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const extractText = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);
    setProgress(null);

    try {
      const extractionResult = await pdfExtractor.extractText(
        selectedFile,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setResult(extractionResult);

      if (extractionResult.success) {
        toast({
          title: "Success!",
          description: `Extracted ${extractionResult.text.length.toLocaleString()} characters from ${extractionResult.pageCount} pages`,
        });

        onTextExtracted?.(extractionResult.text, selectedFile.name);
      } else {
        toast({
          title: "Extraction Failed",
          description: extractionResult.error || "Failed to extract text from PDF",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('PDF extraction error:', error);
      setResult({
        success: false,
        text: '',
        pageCount: 0,
        error: error.message || 'An unexpected error occurred during extraction'
      });
      
      toast({
        title: "Error",
        description: "Failed to extract text from PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [selectedFile, onTextExtracted, toast]);

  const saveToDatabase = useCallback(async () => {
    if (!result?.success || !result.text || !selectedFile) return;

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to save to database');
      }

      // Save to document_processing_logs table
      const { data, error } = await supabase
        .from('document_processing_logs')
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          file_size: selectedFile.size,
          processing_status: 'completed',
          upload_status: 'completed',
          ai_analysis_status: 'pending',
          extracted_text_preview: result.text.substring(0, 1000),
          confidence_score: 1.0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Text has been saved to the database",
      });

      console.log('Saved to database:', data);
    } catch (error: any) {
      console.error('Database save error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save to database",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [result, selectedFile, toast]);

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            PDF Text Extractor
          </CardTitle>
          <CardDescription>
            Upload a PDF file to extract its text content. Supports both text-based and searchable PDFs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
            `}
          >
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragOver ? 'Drop your PDF here' : 'Drag and drop your PDF file here'}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse (Max 50MB)
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                Browse Files
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </div>

          {/* Selected File Info */}
          {selectedFile && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {PDFTextExtractor.formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isProcessing && (
                    <Button
                      size="sm"
                      onClick={extractText}
                      disabled={isProcessing}
                    >
                      Extract Text
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetState}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Processing Progress */}
          {isProcessing && progress && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{progress.status}</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              {progress.totalPages > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Page {progress.currentPage} of {progress.totalPages}
                </p>
              )}
            </div>
          )}

          {/* Status Messages */}
          {result && (
            <div className="mt-4">
              {result.success ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Successfully extracted {result.text.length.toLocaleString()} characters 
                    from {result.pageCount} pages
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text Display */}
      {result && (
        <TextDisplayArea
          text={result.text}
          filename={selectedFile?.name}
          pageCount={result.pageCount}
          metadata={result.metadata}
          isError={!result.success}
          onSaveToDatabase={enableDatabaseSave ? saveToDatabase : undefined}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};