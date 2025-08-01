import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Copy, Download, Save, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Set up PDF.js worker with the correct version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ExtractionResult {
  text: string;
  filename: string;
  pageCount: number;
  processingTime: number;
  hasOCR: boolean;
}

const EnhancedPDFExtractor: React.FC = () => {
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  const extractTextFromPDF = async (file: File) => {
    const startTime = Date.now();
    setIsProcessing(true);
    setProgress(0);
    setCurrentStatus('Loading PDF...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/`,
        cMapPacked: true,
      }).promise;
      
      const numPages = pdf.numPages;
      let fullText = '';
      let hasOCR = false;

      setCurrentStatus(`Processing ${numPages} pages...`);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setCurrentStatus(`Processing page ${pageNum} of ${numPages}...`);
        
        const page = await pdf.getPage(pageNum);
        
        // Try to extract text directly first
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .filter(str => str.trim().length > 0)
          .join(' ')
          .trim();
        
        if (pageText.length > 50) {
          // If we got substantial text directly, use it
          fullText += `Page ${pageNum}:\n${pageText}\n\n`;
        } else {
          // If no text or minimal text, use OCR
          hasOCR = true;
          setCurrentStatus(`Running OCR on page ${pageNum}...`);
          
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) throw new Error('Could not get canvas context');
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;

          // Convert canvas to image and run OCR
          const imageDataUrl = canvas.toDataURL('image/png', 0.8);
          
          const ocrResult = await Tesseract.recognize(imageDataUrl, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const pageProgress = ((pageNum - 1) / numPages + m.progress / numPages) * 100;
                setProgress(pageProgress);
              }
            }
          });
          
          const ocrText = ocrResult.data.text.trim();
          if (ocrText.length > 0) {
            fullText += `Page ${pageNum} (OCR):\n${ocrText}\n\n`;
          }
        }
        
        // Update progress for non-OCR pages
        if (!hasOCR || pageText.length > 50) {
          setProgress((pageNum / numPages) * 100);
        }
      }

      const processingTime = Date.now() - startTime;
      
      const result: ExtractionResult = {
        text: fullText.trim(),
        filename: file.name,
        pageCount: numPages,
        processingTime,
        hasOCR
      };

      setExtractedText(fullText.trim());
      setExtractionResult(result);
      setCurrentStatus('Extraction complete!');
      
      toast.success(`Successfully extracted text from ${numPages} pages${hasOCR ? ' (with OCR)' : ''}`);
      
    } catch (error: any) {
      console.error('Error extracting text:', error);
      toast.error(`Error processing PDF: ${error.message}`);
      setCurrentStatus('Error occurred during extraction');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setExtractedText('');
      setExtractionResult(null);
    } else {
      toast.error('Please select a valid PDF file.');
    }
  };

  const handleProcess = () => {
    if (selectedFile) {
      extractTextFromPDF(selectedFile);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      toast.success('Text copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name.replace('.pdf', '')}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Text file downloaded!');
  };

  const handleSaveToDatabase = async () => {
    if (!extractionResult || !extractedText) {
      toast.error('No extracted text to save');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to save to database');
        return;
      }

      const { error } = await supabase
        .from('document_processing_logs')
        .insert({
          user_id: user.id,
          filename: extractionResult.filename,
          file_size: selectedFile?.size || 0,
          processing_status: 'completed',
          ai_analysis_status: 'pending',
          extracted_text_preview: extractedText.substring(0, 1000),
          ai_structured_data: {
            pageCount: extractionResult.pageCount,
            processingTime: extractionResult.processingTime,
            hasOCR: extractionResult.hasOCR,
            extractionMethod: extractionResult.hasOCR ? 'client_side_ocr' : 'client_side_text',
            fullText: extractedText
          }
        });

      if (error) throw error;
      
      toast.success('Successfully saved to database!');
    } catch (error: any) {
      console.error('Error saving to database:', error);
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  const handleProcessMedicalData = async () => {
    if (!extractionResult || !extractedText) {
      toast.error('No extracted text to process');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to process medical data');
        return;
      }

      toast.loading('Processing medical data with AI...');

      const { data, error } = await supabase.functions.invoke('process-medical-document', {
        body: {
          filename: extractionResult.filename,
          extractedText: extractedText
        }
      });

      if (error) throw error;

      // Save the processed result to database
      const { error: saveError } = await supabase
        .from('document_processing_logs')
        .insert({
          user_id: user.id,
          filename: `${extractionResult.filename}_processed`,
          file_size: selectedFile?.size || 0,
          processing_status: 'completed',
          ai_analysis_status: 'completed',
          extracted_text_preview: extractedText.substring(0, 1000),
          ai_structured_data: data,
          confidence_score: data.confidence || 0.95
        });

      if (saveError) throw saveError;

      toast.success('Medical data processed and saved successfully!');
      
    } catch (error: any) {
      console.error('Error processing medical data:', error);
      toast.error(`Failed to process: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enhanced PDF Text Extractor (with OCR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />
            
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? 'Processing...' : 'Extract Text'}
                </Button>
              </div>
            )}
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentStatus}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {extractedText && extractionResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Extracted Text</h3>
                  <p className="text-sm text-muted-foreground">
                    {extractionResult.pageCount} pages • {Math.round(extractionResult.processingTime / 1000)}s
                    {extractionResult.hasOCR && ' • OCR used'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSaveToDatabase}>
                    <Save className="h-4 w-4 mr-1" />
                    Save to DB
                  </Button>
                  <Button variant="default" size="sm" onClick={handleProcessMedicalData}>
                    <Brain className="h-4 w-4 mr-1" />
                    Process Medical Data
                  </Button>
                </div>
              </div>
              
              <Textarea
                value={extractedText}
                readOnly
                className="h-96 font-mono text-sm resize-none"
                placeholder="Extracted text will appear here..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedPDFExtractor;