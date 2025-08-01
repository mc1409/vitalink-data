import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Brain,
  Database,
  History,
  Eye,
  Loader2,
  File,
  Trash2,
  Type
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface ProcessingStep {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  timestamp?: Date;
}

interface ExtractedData {
  documentType: string;
  confidence: number;
  extractedFields: Record<string, any>;
  recommendations: string[];
}

interface ProcessingLog {
  id: string;
  filename: string;
  file_size: number;
  processing_status: string;
  upload_status: string;
  ai_analysis_status: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
  ai_structured_data?: any;
  extracted_text_preview?: string;
  error_message?: string;
  storage_path?: string;
}

interface ExtractionResult {
  success: boolean;
  extractedText: string;
  filename: string;
  fileSize: number;
  textLength: number;
  preview: string;
  error?: string;
}

const PDFUploadProcessor: React.FC = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [directText, setDirectText] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<ExtractedData | null>(null);
  const [uploadHistory, setUploadHistory] = useState<ProcessingLog[]>([]);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeInputMethod, setActiveInputMethod] = useState<'file' | 'text'>('file');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  // Add and update processing steps
  const addProcessingStep = useCallback((id: string, title: string, status: ProcessingStep['status'], message?: string) => {
    const newStep: ProcessingStep = {
      id: `${id}-${Date.now()}`,
      title,
      status,
      message,
      timestamp: new Date()
    };
    setProcessingSteps(prev => [...prev, newStep]);
    return newStep.id;
  }, []);

  const updateProcessingStep = useCallback((stepId: string, status: ProcessingStep['status'], message?: string) => {
    setProcessingSteps(prev => 
      prev.map(step => 
        step.id.startsWith(stepId) 
          ? { ...step, status, message, timestamp: new Date() }
          : step
      )
    );
  }, []);

  // Fetch upload history
  const fetchUploadHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const { data, error } = await supabase
        .from('document_processing_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setUploadHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching upload history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch upload history",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    fetchUploadHistory();
  }, [fetchUploadHistory]);

  const getFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.includes('pdf') || extension === 'pdf') return 'pdf';
    if (mimeType.includes('word') || extension === 'docx' || extension === 'doc') return 'docx';
    if (mimeType.includes('text') || extension === 'txt') return 'txt';
    if (mimeType.includes('csv') || extension === 'csv') return 'csv';
    if (mimeType.includes('spreadsheet') || extension === 'xlsx' || extension === 'xls') return 'xlsx';
    
    return extension || 'unknown';
  };

  // Extract text from PDF using client-side pdfjs-dist
  const extractTextFromPDF = useCallback(async (file: File): Promise<string> => {
    try {
      updateProcessingStep('extract', 'processing', 'Loading PDF document...');
      
      // Dynamic import of pdfjs-dist to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      updateProcessingStep('extract', 'processing', 'Parsing PDF structure...');
      
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const numPages = pdf.numPages;
      
      updateProcessingStep('extract', 'processing', `Extracting text from ${numPages} pages...`);
      
      let extractedText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        extractedText += `Page ${pageNum}:\n${pageText}\n\n`;
        
        // Update progress
        setProgress((pageNum / numPages) * 100);
      }
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No readable text found in the PDF. This may be a scanned document that requires OCR.');
      }
      
      updateProcessingStep('extract', 'completed', `Successfully extracted ${extractedText.length} characters from ${numPages} pages`);
      return extractedText.trim();
      
    } catch (error: any) {
      console.error('PDF extraction failed:', error);
      updateProcessingStep('extract', 'error', error.message);
      throw error;
    }
  }, [updateProcessingStep]);

  // Extract text from other document types using existing method
  const extractTextFromOtherDocuments = useCallback(async (file: File): Promise<string> => {
    try {
      updateProcessingStep('extract', 'processing', 'Analyzing document structure...');
      
      const fileType = getFileType(file);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      console.log(`Calling server-side extraction for ${file.name} (${fileType})`);

      const { data, error } = await supabase.functions.invoke('extract-document-text', {
        body: formData,
      });

      if (error) {
        console.error('Server extraction error:', error);
        throw new Error(`Server extraction failed: ${error.message}`);
      }

      const result = data as ExtractionResult;

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract text from document');
      }

      if (!result.extractedText || result.extractedText.trim().length === 0) {
        throw new Error('No readable text found in the document');
      }

      updateProcessingStep('extract', 'completed', `Successfully extracted ${result.textLength} characters`);
      return result.extractedText;
    } catch (error: any) {
      console.error('Text extraction failed:', error);
      updateProcessingStep('extract', 'error', error.message);
      throw error;
    }
  }, [updateProcessingStep]);

  // Main extraction method that routes to appropriate handler
  const extractTextFromDocument = useCallback(async (file: File): Promise<string> => {
    const fileType = getFileType(file);
    
    if (fileType === 'pdf') {
      return extractTextFromPDF(file);
    } else {
      return extractTextFromOtherDocuments(file);
    }
  }, [extractTextFromPDF, extractTextFromOtherDocuments]);

  // Process with AI - Enhanced with detailed logging
  const processWithAI = useCallback(async (text: string, filename: string): Promise<ExtractedData> => {
    try {
      updateProcessingStep('ai', 'processing', 'Preparing AI analysis request...');

      // Log the exact prompt being sent
      const requestPayload = { extractedText: text, filename };
      console.log('🤖 AI ANALYSIS REQUEST DETAILS:');
      console.log('=====================================');
      console.log('📤 REQUEST PAYLOAD:', JSON.stringify(requestPayload, null, 2));
      console.log('📝 TEXT LENGTH:', text.length);
      console.log('📄 FILENAME:', filename);
      console.log('🔗 SUPABASE FUNCTION:', 'process-medical-document');
      console.log('⏰ REQUEST TIMESTAMP:', new Date().toISOString());
      
      updateProcessingStep('ai', 'processing', `Sending ${text.length} characters to Azure OpenAI...`);

      const { data, error } = await supabase.functions.invoke('process-medical-document', {
        body: requestPayload
      });

      console.log('📥 AI ANALYSIS RESPONSE DETAILS:');
      console.log('=====================================');
      console.log('✅ RESPONSE SUCCESS:', !error);
      console.log('📊 RESPONSE DATA:', JSON.stringify(data, null, 2));
      if (error) {
        console.log('❌ RESPONSE ERROR:', JSON.stringify(error, null, 2));
      }
      console.log('⏰ RESPONSE TIMESTAMP:', new Date().toISOString());

      if (error) {
        console.error('AI processing error:', error);
        throw new Error(`AI analysis failed: ${error.message}`);
      }

      if (!data || data.documentType === 'error') {
        throw new Error(data?.error || 'AI analysis failed');
      }

      console.log('🎯 EXTRACTED FIELDS SUMMARY:');
      console.log('=====================================');
      Object.entries(data.extractedFields || {}).forEach(([table, fields]) => {
        console.log(`📋 TABLE: ${table}`);
        console.log(`📊 DATA:`, JSON.stringify(fields, null, 2));
      });

      updateProcessingStep('ai', 'completed', `Analysis complete with ${Math.round(data.confidence * 100)}% confidence`);
      return data;
    } catch (error: any) {
      console.error('❌ AI PROCESSING FAILED:', error);
      updateProcessingStep('ai', 'error', error.message);
      throw error;
    }
  }, [updateProcessingStep]);

  // Save to database - Enhanced with detailed logging and fixed field mapping
  const saveToDatabase = useCallback(async (logId: string, analysis: ExtractedData, textPreview: string, storagePath?: string) => {
    try {
      updateProcessingStep('save', 'processing', 'Saving results to database...');

      console.log('💾 DATABASE SAVE OPERATION STARTED:');
      console.log('=====================================');
      console.log('🔑 LOG ID:', logId);
      console.log('📊 ANALYSIS DATA:', JSON.stringify(analysis, null, 2));
      console.log('📝 TEXT PREVIEW LENGTH:', textPreview.length);
      console.log('🗂️ STORAGE PATH:', storagePath);
      console.log('⏰ SAVE TIMESTAMP:', new Date().toISOString());

      // First, update the processing log
      const logUpdateQuery = {
        processing_status: 'completed',
        ai_analysis_status: 'completed',
        ai_structured_data: analysis.extractedFields,
        confidence_score: analysis.confidence,
        extracted_text_preview: textPreview,
        ...(storagePath && { storage_path: storagePath })
      };

      console.log('📝 UPDATING PROCESSING LOG:');
      console.log('Query:', JSON.stringify(logUpdateQuery, null, 2));
      console.log('Table: document_processing_logs');
      console.log('WHERE id =', logId);

      const { error: logError } = await supabase
        .from('document_processing_logs')
        .update(logUpdateQuery)
        .eq('id', logId);

      if (logError) {
        console.log('❌ PROCESSING LOG UPDATE ERROR:', JSON.stringify(logError, null, 2));
        throw logError;
      }
      console.log('✅ PROCESSING LOG UPDATED SUCCESSFULLY');

      // Now save extracted medical data to appropriate tables
      let savedCount = 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('👤 USER CONTEXT:', user.id);
      console.log('🏥 PROCESSING MEDICAL DATA TABLES:');

      // Create patient first if patient data exists
      let patientId = null;
      const patientData = analysis.extractedFields.PATIENTS || analysis.extractedFields.patients;
      
      if (patientData) {
        console.log('\n👥 CREATING PATIENT RECORD:');
        console.log('📄 PATIENT DATA:', JSON.stringify(patientData, null, 2));
        
        const patientRecord = {
          user_id: user.id,
          first_name: patientData.first_name || 'Unknown',
          last_name: patientData.last_name || 'Patient',
          date_of_birth: patientData.date_of_birth,
          gender: patientData.gender,
          phone_primary: patientData.phone_primary,
          email: patientData.email,
          address_line1: patientData.address,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 INSERTING PATIENT:', JSON.stringify(patientRecord, null, 2));

        const { data: insertedPatient, error: patientError } = await supabase
          .from('patients')
          .insert(patientRecord)
          .select('id')
          .single();

        if (patientError) {
          console.log('❌ PATIENT INSERT ERROR:', JSON.stringify(patientError, null, 2));
        } else {
          console.log('✅ PATIENT CREATED SUCCESS:', JSON.stringify(insertedPatient, null, 2));
          patientId = insertedPatient.id;
          savedCount++;
        }
      }

      // Process each extracted table
      for (const [tableName, tableData] of Object.entries(analysis.extractedFields)) {
        if (tableName === 'PATIENTS' || tableName === 'patients') continue; // Already processed

        console.log(`\n📋 PROCESSING TABLE: ${tableName}`);
        console.log('📊 RAW TABLE DATA:', JSON.stringify(tableData, null, 2));
        
        try {
          // Map AI field names to database table names and fields
          const tableMapping: { [key: string]: { dbTable: string, mapFields: (data: any) => any } } = {
            'LAB_RESULTS': {
              dbTable: 'lab_results',
              mapFields: (data: any) => ({
                lab_test_id: null, // Will need to create lab_test first
                result_name: data.result_name,
                numeric_value: data.numeric_value,
                text_value: data.text_value,
                units: data.units,
                reference_range_min: data.reference_range_min,
                reference_range_max: data.reference_range_max,
                abnormal_flag: data.abnormal_flag,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            },
            'HEART_METRICS': {
              dbTable: 'heart_metrics',
              mapFields: (data: any) => ({
                user_id: user.id,
                measurement_timestamp: data.measurement_timestamp ? new Date(data.measurement_timestamp).toISOString() : new Date().toISOString(),
                device_type: 'manual_entry',
                resting_heart_rate: data.resting_heart_rate,
                max_heart_rate: data.max_heart_rate,
                hrv_score: data.hrv_score,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            },
            'SLEEP_METRICS': {
              dbTable: 'sleep_metrics',
              mapFields: (data: any) => ({
                user_id: user.id,
                sleep_date: data.sleep_date || new Date().toISOString().split('T')[0],
                device_type: 'manual_entry',
                total_sleep_time: data.total_sleep_time,
                deep_sleep_minutes: data.deep_sleep_minutes,
                sleep_score: data.sleep_score,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            },
            'ACTIVITY_METRICS': {
              dbTable: 'activity_metrics',
              mapFields: (data: any) => ({
                user_id: user.id,
                measurement_date: data.measurement_date || new Date().toISOString().split('T')[0],
                measurement_timestamp: new Date().toISOString(),
                device_type: 'manual_entry',
                steps_count: data.steps_count,
                total_calories: data.total_calories,
                exercise_minutes: data.exercise_minutes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            }
          };

          // Handle numbered lab results (LAB_RESULTS_2, LAB_RESULTS_3, etc.)
          const baseTableName = tableName.replace(/_\d+$/, '');
          const mapping = tableMapping[baseTableName] || tableMapping[tableName];

          if (!mapping) {
            console.log(`⚠️ NO MAPPING FOUND for table: ${tableName}`);
            continue;
          }

          const { dbTable, mapFields } = mapping;
          
          if (tableData && typeof tableData === 'object') {
            const mappedRecord = mapFields(tableData);
            
            // Special handling for lab results - need to create lab_test first
            if (dbTable === 'lab_results' && patientId) {
              console.log('\n🧪 CREATING LAB TEST FIRST:');
              const labTestRecord = {
                patient_id: patientId,
                test_name: tableData.result_name || 'Blood Work',
                test_category: 'Laboratory',
                order_date: new Date().toISOString().split('T')[0],
                test_status: 'completed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              console.log('📝 INSERTING LAB TEST:', JSON.stringify(labTestRecord, null, 2));

              const { data: labTest, error: labTestError } = await supabase
                .from('lab_tests')
                .insert(labTestRecord)
                .select('id')
                .single();

              if (!labTestError && labTest) {
                mappedRecord.lab_test_id = labTest.id;
                console.log('✅ LAB TEST CREATED:', labTest.id);
              } else {
                console.log('❌ LAB TEST ERROR:', JSON.stringify(labTestError, null, 2));
                continue;
              }
            }

            console.log(`\n📝 INSERTING INTO ${dbTable}:`);
            console.log('📄 MAPPED RECORD:', JSON.stringify(mappedRecord, null, 2));

            const { data: insertResult, error: insertError } = await supabase
              .from(dbTable as any)
              .insert(mappedRecord)
              .select();

            if (insertError) {
              console.log(`❌ INSERT ERROR for ${dbTable}:`, JSON.stringify(insertError, null, 2));
            } else {
              console.log(`✅ INSERT SUCCESS for ${dbTable}:`, JSON.stringify(insertResult, null, 2));
              savedCount++;
            }
          }
        } catch (error) {
          console.error(`❌ FAILED TO SAVE TO ${tableName}:`, error);
          console.log('Error details:', JSON.stringify(error, null, 2));
        }
      }

      console.log('\n📊 DATABASE SAVE SUMMARY:');
      console.log('=====================================');
      console.log('✅ RECORDS SUCCESSFULLY SAVED:', savedCount);
      console.log('📋 TABLES PROCESSED:', Object.keys(analysis.extractedFields).length);
      console.log('⏰ SAVE COMPLETED:', new Date().toISOString());

      updateProcessingStep('save', 'completed', `Results saved successfully. ${savedCount} medical records created.`);
    } catch (error: any) {
      console.error('❌ DATABASE SAVE FAILED:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      updateProcessingStep('save', 'error', 'Failed to save results');
      throw error;
    }
  }, [updateProcessingStep]);

  // Upload to storage
  const uploadToStorage = useCallback(async (file: File, logId: string): Promise<string> => {
    try {
      updateProcessingStep('upload', 'processing', 'Uploading file to storage...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const filename = `${user.id}/${logId}/${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('medical-pdfs')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      updateProcessingStep('upload', 'completed', 'File uploaded successfully');
      return filename;
    } catch (error: any) {
      console.error('Upload to storage failed:', error);
      updateProcessingStep('upload', 'error', error.message);
      throw error;
    }
  }, [updateProcessingStep]);

  // Create processing log
  const createProcessingLog = useCallback(async (file: File): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('document_processing_logs')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_size: file.size,
          upload_status: 'pending',
          processing_status: 'pending',
          ai_analysis_status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      console.error('Failed to create processing log:', error);
      throw error;
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload documents",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      });
      return;
    }

    // File size validation (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    await processDocument(file, file.name);
  }, [isAuthenticated, toast]);

  // Handle text processing
  const handleTextProcess = useCallback(async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to process text",
        variant: "destructive",
      });
      return;
    }

    if (!directText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to process",
        variant: "destructive",
      });
      return;
    }

    if (directText.length > 50000) {
      toast({
        title: "Text Too Long",
        description: "Please limit text to 50,000 characters",
        variant: "destructive",
      });
      return;
    }

    await processDocument(null, 'Direct Text Input');
  }, [isAuthenticated, directText, toast]);

  // Main processing function
  const processDocument = useCallback(async (file: File | null, displayName: string) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setCurrentFile(file);
      setExtractedText('');
      setAiAnalysis(null);
      setProcessingSteps([]);

      // Initialize processing steps
      const steps: ProcessingStep[] = file ? [
        { id: 'validate', title: 'Validating File', status: 'pending' },
        { id: 'extract', title: 'Extracting Text', status: 'pending' },
        { id: 'upload', title: 'Uploading File', status: 'pending' },
        { id: 'ai', title: 'AI Analysis', status: 'pending' },
        { id: 'save', title: 'Saving Results', status: 'pending' }
      ] : [
        { id: 'validate', title: 'Validating Text', status: 'pending' },
        { id: 'ai', title: 'AI Analysis', status: 'pending' },
        { id: 'save', title: 'Saving Results', status: 'pending' }
      ];
      setProcessingSteps(steps);

      // Step 1: Validation
      addProcessingStep('validate', file ? 'Validating File' : 'Validating Text', 'processing', file ? 'Checking file format and size...' : 'Validating text input...');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateProcessingStep('validate', 'completed', file ? 'File validation successful' : 'Text validation successful');
      setProgress(file ? 10 : 20);

      // Step 2: Create processing log
      const dummyFile = file || { name: 'direct-text.txt', size: directText.length } as File;
      const logId = await createProcessingLog(dummyFile);
      setProgress(file ? 20 : 30);

      let text = '';
      let storagePath = '';

      if (file) {
        // Step 3: Extract text from file
        text = await extractTextFromDocument(file);
        setExtractedText(text);
        setProgress(50);

        // Step 4: Upload file to storage
        storagePath = await uploadToStorage(file, logId);
        setProgress(70);
      } else {
        // Use direct text input
        text = directText;
        setExtractedText(text);
        setProgress(60);
      }

      // Step 5: Process with AI
      const analysis = await processWithAI(text, displayName);
      setAiAnalysis(analysis);
      setProgress(90);

      // Step 6: Save results to database
      await saveToDatabase(logId, analysis, text.substring(0, 1000), storagePath);
      setProgress(100);

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${displayName}`,
      });

      // Refresh upload history
      await fetchUploadHistory();

    } catch (error: any) {
      console.error('Document processing error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "An error occurred while processing the document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isAuthenticated, directText, toast, addProcessingStep, updateProcessingStep, extractTextFromDocument, uploadToStorage, processWithAI, saveToDatabase, createProcessingLog, fetchUploadHistory]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelection = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Status helpers
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': case 'pending': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">Please log in to access the document processor.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Medical Document Processor</h1>
        <p className="text-muted-foreground mt-2">Upload documents or paste text for AI-powered medical data extraction</p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Process
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2" disabled={!aiAnalysis}>
            <Brain className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2" disabled={processingSteps.length === 0}>
            <Eye className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Processing
              </CardTitle>
              <CardDescription>
                Upload medical documents or paste text directly for AI analysis and data extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isProcessing ? (
                <>
                  {/* Input Method Selection */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={activeInputMethod === 'file' ? 'default' : 'outline'}
                      onClick={() => setActiveInputMethod('file')}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload File
                    </Button>
                    <Button
                      variant={activeInputMethod === 'text' ? 'default' : 'outline'}
                      onClick={() => setActiveInputMethod('text')}
                      className="flex items-center gap-2"
                    >
                      <Type className="h-4 w-4" />
                      Paste Text
                    </Button>
                  </div>

                  {activeInputMethod === 'file' ? (
                    /* File Upload Area */
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragOver 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-muted">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Upload Medical Document</h3>
                          <p className="text-muted-foreground mb-4">
                            Drag and drop your file here, or click to browse
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center text-sm text-muted-foreground">
                            <Badge variant="secondary">PDF</Badge>
                            <Badge variant="secondary">DOCX</Badge>
                            <Badge variant="secondary">TXT</Badge>
                            <Badge variant="secondary">CSV</Badge>
                            <Badge variant="secondary">XLSX</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            className="hidden"
                            id="file-upload"
                            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls"
                            onChange={handleFileSelection}
                            disabled={isProcessing}
                          />
                          <Button 
                            onClick={() => document.getElementById('file-upload')?.click()}
                            disabled={isProcessing}
                          >
                            Choose File
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Text Input Area */
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="direct-text" className="block text-sm font-medium mb-2">
                          Paste Medical Text Content
                        </label>
                        <Textarea
                          id="direct-text"
                          placeholder="Paste your medical document text here (lab results, medical reports, etc.)..."
                          value={directText}
                          onChange={(e) => setDirectText(e.target.value)}
                          className="min-h-[200px] resize-none"
                          maxLength={50000}
                        />
                        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                          <span>Characters: {directText.length.toLocaleString()} / 50,000</span>
                          <span>Words: {directText.trim() ? directText.trim().split(/\s+/).length.toLocaleString() : 0}</span>
                        </div>
                      </div>
                      <Button 
                        onClick={handleTextProcess}
                        disabled={!directText.trim() || isProcessing}
                        className="w-full"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Process Text with AI
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                /* Processing Status */
                <div className="space-y-4">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <h3 className="text-lg font-semibold">Processing {currentFile?.name || 'Text Input'}</h3>
                    <p className="text-muted-foreground">Please wait while we analyze your document...</p>
                  </div>
                  
                  <Progress value={progress} className="w-full" />
                  
                  {/* Processing Steps */}
                  <div className="space-y-2">
                    {processingSteps.map((step) => (
                      <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-shrink-0">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{step.title}</div>
                          {step.message && (
                            <div className={`text-sm ${getStatusColor(step.status)}`}>
                              {step.message}
                            </div>
                          )}
                        </div>
                        {step.status === 'processing' && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Text Preview */}
              {extractedText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Extracted Text Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-40">
                      <pre className="text-sm whitespace-pre-wrap">{extractedText.substring(0, 2000)}...</pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Processing History
              </CardTitle>
              <CardDescription>
                View your previously processed documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents processed yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadHistory.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{log.filename}</h4>
                        <Badge variant={log.processing_status === 'completed' ? 'default' : 'secondary'}>
                          {log.processing_status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Size: {(log.file_size / 1024).toFixed(1)} KB • 
                        Processed: {new Date(log.created_at).toLocaleDateString()}
                        {log.confidence_score && ` • Confidence: ${Math.round(log.confidence_score * 100)}%`}
                      </div>
                      {log.extracted_text_preview && (
                        <div className="text-sm bg-muted p-2 rounded">
                          {log.extracted_text_preview}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {aiAnalysis ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Analysis Results
                  </CardTitle>
                  <CardDescription>
                    Structured medical data extracted from your document
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium">Document Type</label>
                      <p className="text-muted-foreground">{aiAnalysis.documentType}</p>
                    </div>
                    <div>
                      <label className="font-medium">Confidence Score</label>
                      <p className="text-muted-foreground">{Math.round(aiAnalysis.confidence * 100)}%</p>
                    </div>
                  </div>

                  {Object.keys(aiAnalysis.extractedFields).length > 0 && (
                    <div>
                      <label className="font-medium">Extracted Medical Data</label>
                      <div className="mt-2 space-y-3">
                        {Object.entries(aiAnalysis.extractedFields).map(([tableName, data]) => (
                          <Card key={tableName} className="border">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {tableName}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ScrollArea className="h-32">
                                <pre className="text-xs bg-muted p-2 rounded">
                                  {JSON.stringify(data, null, 2)}
                                </pre>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.recommendations.length > 0 && (
                    <div>
                      <label className="font-medium">Recommendations</label>
                      <ul className="mt-2 space-y-1">
                        {aiAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Database Link */}
              <Card>
                <CardContent className="text-center py-6">
                  <Database className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">View Saved Data in Database</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The extracted medical data has been saved to your database tables
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/dashboard?tab=database'}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Database Tables
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No analysis results available. Process a document first.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Processing Logs
              </CardTitle>
              <CardDescription>
                Detailed processing steps and status information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processingSteps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No processing logs available</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {processingSteps.map((step) => (
                      <div key={step.id} className="border-l-2 border-muted pl-4 pb-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(step.status)}
                          <span className="font-medium">{step.title}</span>
                          {step.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {step.timestamp.toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        {step.message && (
                          <p className={`text-sm mt-1 ${getStatusColor(step.status)}`}>
                            {step.message}
                          </p>
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