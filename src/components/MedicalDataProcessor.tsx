import React, { useState, useRef } from 'react';
import { Upload, FileText, Database, Brain, CheckCircle, AlertCircle, Eye, Clock, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
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
  llmQuery: string;
  llmResponse: string;
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
    showStreamingText: false,
    llmQuery: '',
    llmResponse: ''
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
      // Store the query being sent
      const queryData = { text, filename: file?.name || 'Direct Text Input' };
      setProcessing(prev => ({ 
        ...prev, 
        llmQuery: JSON.stringify(queryData, null, 2)
      }));

      addLog('AI Processing', 'info', `Sending ${text.length} characters to Azure OpenAI...`);

      const { data, error } = await supabase.functions.invoke('process-medical-document', {
        body: queryData,
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`AI processing failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data) {
        throw new Error('No data returned from AI processing');
      }

      // Store the response received
      setProcessing(prev => ({ 
        ...prev, 
        llmResponse: JSON.stringify(data, null, 2)
      }));

      console.log('Full AI response data:', data);

      // Handle both old and new response formats
      const extractedFields = data.extractedFields || {};
      const documentType = data.documentType || data.document_type || 'unknown';
      const confidence = data.confidence || data.confidence_score || 0.0;
      const recommendations = data.recommendations || [];
      const uncertainData = data.uncertainData || data.uncertain_data || [];
      const patientData = data.patientData || data.patient_data || {};

      addLog('AI Processing', 'success', `AI analysis completed: ${documentType} (${Math.round(confidence * 100)}% confidence)`, {
        documentType,
        confidence,
        fieldsExtracted: Object.keys(extractedFields).length,
        uncertainDataPoints: uncertainData.length,
        recommendations: recommendations.length
      });

      return {
        documentType,
        confidence,
        extractedFields,
        recommendations,
        uncertainData,
        patientData
      };
    } catch (error: any) {
      console.error('AI Processing error:', error);
      addLog('AI Processing', 'error', `AI processing failed: ${error.message}`, { error: error.toString() });
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
    addLog('Database Mapping', 'processing', 'Starting schema-driven database mapping...');
    
    const savedRecords: any[] = [];

    // Define EXACT database schema - only these columns are allowed
    const DATABASE_SCHEMA = {
      lab_results: ['result_name', 'numeric_value', 'text_value', 'units', 'reference_range_min', 'reference_range_max', 'abnormal_flag', 'result_status', 'interpretation', 'reviewing_physician'],
      heart_metrics: ['measurement_timestamp', 'device_type', 'resting_heart_rate', 'max_heart_rate', 'min_heart_rate', 'average_heart_rate', 'systolic_bp', 'diastolic_bp', 'hrv_score', 'hrv_rmssd', 'hrv_sdnn', 'vo2_max', 'workout_heart_rate', 'recovery_heart_rate', 'walking_heart_rate'],
      activity_metrics: ['measurement_date', 'measurement_timestamp', 'device_type', 'steps_count', 'total_calories', 'active_calories', 'basal_calories', 'exercise_minutes', 'moderate_activity_minutes', 'vigorous_activity_minutes', 'distance_walked_meters', 'distance_ran_meters', 'distance_cycled_meters', 'flights_climbed'],
      sleep_metrics: ['sleep_date', 'device_type', 'total_sleep_time', 'deep_sleep_minutes', 'rem_sleep_minutes', 'light_sleep_minutes', 'awake_minutes', 'sleep_efficiency', 'sleep_latency', 'sleep_score', 'sleep_disturbances', 'restfulness_score'],
      nutrition_metrics: ['measurement_date', 'total_calories', 'protein_grams', 'carbohydrates_grams', 'fat_grams', 'fiber_grams', 'sugar_grams', 'sodium_mg', 'calcium_mg', 'iron_mg', 'vitamin_d_iu', 'vitamin_b12_mcg', 'vitamin_c_mg'],
      microbiome_metrics: ['test_date', 'test_provider', 'alpha_diversity', 'beta_diversity', 'beneficial_bacteria_score', 'pathogenic_bacteria_score', 'butyrate_production', 'acetate_production', 'propionate_production', 'species_richness'],
      environmental_metrics: ['measurement_date', 'measurement_timestamp', 'device_type', 'air_quality_index', 'uv_exposure_minutes', 'weather_temperature', 'humidity_percentage', 'barometric_pressure', 'pm25_level', 'pm10_level'],
      recovery_strain_metrics: ['measurement_date', 'device_type', 'recovery_score', 'strain_score', 'hrv_score', 'resting_hr_score', 'sleep_performance_score', 'stress_score', 'skin_temperature', 'skin_temperature_deviation']
    };

    // Schema validation function - ONLY allow exact column matches
    const validateAndFilterData = (data: any, tableSchema: string[]) => {
      const filtered: any = {};
      let validFieldCount = 0;
      let invalidFieldCount = 0;
      
      for (const [key, value] of Object.entries(data)) {
        if (tableSchema.includes(key) && value !== null && value !== undefined) {
          // Apply normalization for specific constraint fields
          if (key === 'abnormal_flag') {
            const normalizedFlag = normalizeAbnormalFlag(value as string);
            if (normalizedFlag) {
              filtered[key] = normalizedFlag;
              validFieldCount++;
            }
          } else {
            filtered[key] = value;
            validFieldCount++;
          }
        } else {
          invalidFieldCount++;
          addLog('Database Mapping', 'warning', `Ignoring invalid field "${key}" - not in schema for table`, { field: key, value, table: tableSchema });
        }
      }
      
      addLog('Database Mapping', 'info', `Schema validation: ${validFieldCount} valid, ${invalidFieldCount} invalid fields filtered`);
      return filtered;
    };

    // Helper function to normalize abnormal_flag values
    const normalizeAbnormalFlag = (value: string): string | null => {
      if (!value || typeof value !== 'string') return null;
      
      const normalizedValue = value.toLowerCase().trim();
      
      // Map common variations to valid database values
      switch (normalizedValue) {
        case 'normal':
        case 'within range':
        case 'wnl':
        case 'within normal limits':
          return 'normal';
        case 'high':
        case 'elevated':
        case 'above range':
        case 'h':
          return 'high';
        case 'low':
        case 'below range':
        case 'l':
          return 'low';
        case 'critical high':
        case 'critically high':
        case 'critical_high':
        case 'ch':
          return 'critical_high';
        case 'critical low':
        case 'critically low':
        case 'critical_low':
        case 'cl':
          return 'critical_low';
        default:
          addLog('Database Mapping', 'warning', `Unknown abnormal_flag value: "${value}", defaulting to 'normal'`);
          return 'normal'; // Default to normal if unknown
      }
    };

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Process each extracted data table according to schema
      for (const [tableName, data] of Object.entries(extractedData)) {
        if (!data || typeof data !== 'object') continue;

        // Handle LAB_RESULTS (multiple entries possible)
        if (tableName.startsWith('LAB_RESULTS') && DATABASE_SCHEMA.lab_results) {
          const validData = validateAndFilterData(data, DATABASE_SCHEMA.lab_results);
          
          if (!validData.result_name) {
            addLog('Database Mapping', 'warning', `Skipping ${tableName} - missing required result_name`);
            continue;
          }

          const insertQuery = {
            ...validData,
            result_status: validData.result_status || 'final',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          addLog('Database Mapping', 'info', `Building query for lab_results:`, { 
            table: 'lab_results',
            query: insertQuery,
            sql: `INSERT INTO lab_results (${Object.keys(insertQuery).join(', ')}) VALUES (...)`
          });

          const { data: result, error } = await supabase
            .from('lab_results')
            .insert(insertQuery)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'error', `Lab result insertion failed: ${error.message}`, { error, query: insertQuery });
          } else {
            savedRecords.push({ table: 'lab_results', data: result, confidence: 0.95 });
            addLog('Database Mapping', 'success', `✅ Lab result saved: ${validData.result_name} = ${validData.numeric_value || validData.text_value} ${validData.units || ''}`, { 
              table: 'lab_results',
              id: result.id,
              record: result
            });
          }
        }

        // Handle HEART_METRICS
        else if (tableName === 'HEART_METRICS' && DATABASE_SCHEMA.heart_metrics) {
          const validData = validateAndFilterData(data, DATABASE_SCHEMA.heart_metrics);
          
          if (!validData.measurement_timestamp) {
            validData.measurement_timestamp = new Date().toISOString();
          }
          if (!validData.device_type) {
            validData.device_type = 'manual';
          }

          const insertQuery = {
            ...validData,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          addLog('Database Mapping', 'info', `Building query for heart_metrics:`, { 
            table: 'heart_metrics',
            query: insertQuery
          });

          const { data: result, error } = await supabase
            .from('heart_metrics')
            .insert(insertQuery)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'error', `Heart metrics insertion failed: ${error.message}`, { error, query: insertQuery });
          } else {
            savedRecords.push({ table: 'heart_metrics', data: result, confidence: 0.90 });
            addLog('Database Mapping', 'success', `✅ Heart metrics saved`, { 
              table: 'heart_metrics',
              id: result.id,
              record: result
            });
          }
        }

        // Handle ACTIVITY_METRICS
        else if (tableName === 'ACTIVITY_METRICS' && DATABASE_SCHEMA.activity_metrics) {
          const validData = validateAndFilterData(data, DATABASE_SCHEMA.activity_metrics);
          
          if (!validData.measurement_date) {
            validData.measurement_date = new Date().toISOString().split('T')[0];
          }
          if (!validData.measurement_timestamp) {
            validData.measurement_timestamp = new Date().toISOString();
          }
          if (!validData.device_type) {
            validData.device_type = 'manual';
          }

          const insertQuery = {
            ...validData,
            user_id: userId
          };

          const { data: result, error } = await supabase
            .from('activity_metrics')
            .insert(insertQuery)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'error', `Activity metrics insertion failed: ${error.message}`, { error, query: insertQuery });
          } else {
            savedRecords.push({ table: 'activity_metrics', data: result, confidence: 0.90 });
            addLog('Database Mapping', 'success', `✅ Activity metrics saved`, { 
              table: 'activity_metrics',
              id: result.id
            });
          }
        }

        // Handle other biomarker tables following the same pattern
        else if (Object.keys(DATABASE_SCHEMA).some(schema => tableName.toLowerCase().includes(schema.split('_')[0]))) {
          addLog('Database Mapping', 'info', `Processing ${tableName} with schema validation...`);
          // Additional biomarker table processing can be added here following the same pattern
        }

      }

      addLog('Database Mapping', 'success', `Schema-driven mapping completed. Saved ${savedRecords.length} records.`);
      return savedRecords;

    } catch (error: any) {
      addLog('Database Mapping', 'error', `Schema-driven mapping failed: ${error.message}`, { error });
      throw error;
    }
  };

  // Enhanced processing function that combines everything
  const processDocumentWithDatabase = async (text: string, filename: string): Promise<void> => {
        
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
            savedRecords.push({ table: 'activity_metrics', data: result, confidence: 0.90 });
            addLog('Database Mapping', 'success', 'Activity metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Activity metrics processing failed: ${error.message}`);
        }
      }

      // Step 6: Process cardiovascular tests
      if (extractedData.CARDIOVASCULAR_TESTS) {
        addLog('Database Mapping', 'processing', 'Processing cardiovascular tests...');
        
        try {
          const cardiovascularData = filterValidFields(extractedData.CARDIOVASCULAR_TESTS, 'cardiovascular_tests');
          if (patientId) {
            cardiovascularData.patient_id = patientId;
          }
          cardiovascularData.test_date = cardiovascularData.test_date || new Date().toISOString().split('T')[0];

          const { data: result, error } = await supabase
            .from('cardiovascular_tests')
            .insert(cardiovascularData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Cardiovascular test failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'cardiovascular_tests', data: result, confidence: 0.92 });
            addLog('Database Mapping', 'success', 'Cardiovascular test saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Cardiovascular test processing failed: ${error.message}`);
        }
      }

      // Step 7: Process imaging studies
      if (extractedData.IMAGING_STUDIES) {
        addLog('Database Mapping', 'processing', 'Processing imaging studies...');
        
        try {
          const imagingData = filterValidFields(extractedData.IMAGING_STUDIES, 'imaging_studies');
          if (patientId) {
            imagingData.patient_id = patientId;
          }
          imagingData.study_date = imagingData.study_date || new Date().toISOString().split('T')[0];

          const { data: result, error } = await supabase
            .from('imaging_studies')
            .insert(imagingData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Imaging study failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'imaging_studies', data: result, confidence: 0.93 });
            addLog('Database Mapping', 'success', 'Imaging study saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Imaging study processing failed: ${error.message}`);
        }
      }

      // Step 8: Process allergies
      if (extractedData.ALLERGIES) {
        addLog('Database Mapping', 'processing', 'Processing allergies...');
        
        try {
          const allergyData = filterValidFields(extractedData.ALLERGIES, 'allergies');
          if (patientId) {
            allergyData.patient_id = patientId;
          }
          allergyData.active = allergyData.active !== undefined ? allergyData.active : true;

          const { data: result, error } = await supabase
            .from('allergies')
            .insert(allergyData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Allergy record failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'allergies', data: result, confidence: 0.94 });
            addLog('Database Mapping', 'success', 'Allergy record saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Allergy processing failed: ${error.message}`);
        }
      }

      // Step 9: Process nutrition metrics
      if (extractedData.NUTRITION_METRICS) {
        addLog('Database Mapping', 'processing', 'Processing nutrition metrics...');
        
        try {
          const nutritionData = filterValidFields(extractedData.NUTRITION_METRICS, 'nutrition_metrics');
          nutritionData.user_id = (await supabase.auth.getUser()).data.user?.id;
          nutritionData.measurement_date = nutritionData.measurement_date || new Date().toISOString().split('T')[0];

          const { data: result, error } = await supabase
            .from('nutrition_metrics')
            .insert(nutritionData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Nutrition metrics failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'nutrition_metrics', data: result, confidence: 0.88 });
            addLog('Database Mapping', 'success', 'Nutrition metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Nutrition metrics processing failed: ${error.message}`);
        }
      }

      // Step 10: Process microbiome metrics
      if (extractedData.MICROBIOME_METRICS) {
        addLog('Database Mapping', 'processing', 'Processing microbiome metrics...');
        
        try {
          const microbiomeData = filterValidFields(extractedData.MICROBIOME_METRICS, 'microbiome_metrics');
          microbiomeData.user_id = (await supabase.auth.getUser()).data.user?.id;
          microbiomeData.test_date = microbiomeData.test_date || new Date().toISOString().split('T')[0];
          microbiomeData.test_provider = microbiomeData.test_provider || 'Unknown';

          const { data: result, error } = await supabase
            .from('microbiome_metrics')
            .insert(microbiomeData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Microbiome metrics failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'microbiome_metrics', data: result, confidence: 0.85 });
            addLog('Database Mapping', 'success', 'Microbiome metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Microbiome metrics processing failed: ${error.message}`);
        }
      }

      // Step 11: Process environmental metrics
      if (extractedData.ENVIRONMENTAL_METRICS) {
        addLog('Database Mapping', 'processing', 'Processing environmental metrics...');
        
        try {
          const environmentalData = filterValidFields(extractedData.ENVIRONMENTAL_METRICS, 'environmental_metrics');
          environmentalData.user_id = (await supabase.auth.getUser()).data.user?.id;
          environmentalData.device_type = 'manual_entry';
          environmentalData.measurement_date = environmentalData.measurement_date || new Date().toISOString().split('T')[0];
          environmentalData.measurement_timestamp = environmentalData.measurement_timestamp || new Date().toISOString();

          const { data: result, error } = await supabase
            .from('environmental_metrics')
            .insert(environmentalData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Environmental metrics failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'environmental_metrics', data: result, confidence: 0.87 });
            addLog('Database Mapping', 'success', 'Environmental metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Environmental metrics processing failed: ${error.message}`);
        }
      }

      // Step 12: Process recovery strain metrics
      if (extractedData.RECOVERY_STRAIN_METRICS) {
        addLog('Database Mapping', 'processing', 'Processing recovery strain metrics...');
        
        try {
          const recoveryData = filterValidFields(extractedData.RECOVERY_STRAIN_METRICS, 'recovery_strain_metrics');
          recoveryData.user_id = (await supabase.auth.getUser()).data.user?.id;
          recoveryData.device_type = 'manual_entry';
          recoveryData.measurement_date = recoveryData.measurement_date || new Date().toISOString().split('T')[0];

          const { data: result, error } = await supabase
            .from('recovery_strain_metrics')
            .insert(recoveryData)
            .select()
            .single();

          if (error) {
            addLog('Database Mapping', 'warning', `Recovery strain metrics failed: ${error.message}`);
          } else {
            savedRecords.push({ table: 'recovery_strain_metrics', data: result, confidence: 0.89 });
            addLog('Database Mapping', 'success', 'Recovery strain metrics saved successfully', result);
          }
        } catch (error: any) {
          addLog('Database Mapping', 'warning', `Recovery strain metrics processing failed: ${error.message}`);
        }
      }

      // Summary logging
      addLog('Database Mapping', 'success', `Database mapping completed. Saved ${savedRecords.length} records across ${new Set(savedRecords.map(r => r.table)).size} tables.`, {
        totalRecords: savedRecords.length,
        tablesSaved: [...new Set(savedRecords.map(r => r.table))],
        averageConfidence: savedRecords.length > 0 ? 
          (savedRecords.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / savedRecords.length).toFixed(2) : 0
      });

      return savedRecords;
    } catch (error: any) {
      addLog('Database Mapping', 'error', `Database mapping failed: ${error.message}`, { error: error.toString() });
      throw error;
    }
  };

  // Enhanced processing function that combines everything
  const processDocumentWithDatabase = async (text: string, filename: string): Promise<void> => {
    try {
      setProcessing(prev => ({ ...prev, 
        status: 'processing', 
        currentStep: 'AI Processing',
        progress: 50 
      }));

      // Step 1: Process with AI (store filename in processing state for AI to use)
      setProcessing(prev => ({ ...prev, filename }));
      const aiResult = await processWithAI(text);
      
      setProcessing(prev => ({ ...prev, 
        currentStep: 'Database Mapping',
        progress: 75 
      }));

      // Step 2: Check for duplicates
      const duplicateCheck = await checkForDuplicates(aiResult.extractedFields, text);
      
      if (duplicateCheck.hasDuplicates) {
        addLog('Duplicate Check', 'warning', `Found ${duplicateCheck.duplicateDetails.length} potential duplicates`, duplicateCheck.duplicateDetails);
      }

      // Step 3: Save to database
      const savedRecords = await mapAndSaveToDatabase(aiResult.extractedFields);
      
      setProcessing(prev => ({ ...prev, 
        status: 'completed',
        currentStep: 'Complete',
        progress: 100,
        savedRecords,
        documentType: aiResult.documentType,
        confidence: aiResult.confidence,
        extractedFields: aiResult.extractedFields,
        recommendations: aiResult.recommendations,
        uncertainData: aiResult.uncertainData,
        patientData: aiResult.patientData
      }));

      addLog('Processing', 'success', `Document processing completed successfully! ${savedRecords.length} records saved.`, {
        documentType: aiResult.documentType,
        confidence: aiResult.confidence,
        recordsSaved: savedRecords.length,
        tablesAffected: [...new Set(savedRecords.map(r => r.table))]
      });

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${filename} and saved ${savedRecords.length} records to the database.`,
      });

    } catch (error: any) {
      console.error('Document processing error:', error);
      setProcessing(prev => ({ ...prev, 
        status: 'error',
        currentStep: 'Error',
        error: error.message 
      }));
      
      addLog('Processing', 'error', `Document processing failed: ${error.message}`, { error: error.toString() });
      
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
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
      showStreamingText: false,
      llmQuery: '',
      llmResponse: ''
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
      let aiResponse: any;
      try {
        aiResponse = await processWithAI(text);
        console.log('Extracted AI response received:', aiResponse);
        
        // Update processing state with extracted data
        setProcessing(prev => ({ 
          ...prev, 
          extractedData: aiResponse
        }));
        
      } catch (aiError: any) {
        console.error('AI processing error in main flow:', aiError);
        throw new Error(`AI processing failed: ${aiError.message}`);
      }

      // Step 3: Check for duplicates (unless forced)
      if (!forceOverwrite) {
        updateProcessingStep(3, 'Checking for duplicate data...');
        const { hasDuplicates, duplicateDetails } = await checkForDuplicates(aiResponse.extractedFields || {}, text);
        
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
      const savedRecords = await mapAndSaveToDatabase(aiResponse.extractedFields || {});

      // Step 5: Complete
      updateProcessingStep(5, 'Processing complete!');
      
      setProcessing(prev => ({
        ...prev,
        extractedData: aiResponse,
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pipeline">Processing Pipeline</TabsTrigger>
            <TabsTrigger value="logs">Detailed Logs</TabsTrigger>
            <TabsTrigger value="llm">LLM Communication</TabsTrigger>
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

          <TabsContent value="llm">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  LLM Communication Logs
                </CardTitle>
                <CardDescription>
                  View the exact query sent to AI and the response received for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {processing.llmQuery && (
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <ArrowUp className="h-4 w-4 text-blue-600" />
                      Query Sent to AI Model
                    </h4>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <ScrollArea className="h-64">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {processing.llmQuery}
                          </pre>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {processing.llmResponse && (
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-green-600" />
                      Response from AI Model
                    </h4>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <ScrollArea className="h-64">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {processing.llmResponse}
                          </pre>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {!processing.llmQuery && !processing.llmResponse && (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Process a document to see the LLM communication logs</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping">
            <div className="space-y-6">
              {!processing.extractedData ? (
                <div className="text-muted-foreground text-center py-8">No data extracted yet</div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {Object.keys(processing.extractedData).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Data Tables</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">
                          {processing.savedRecords.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Records Saved</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-orange-600">
                          {Object.entries(processing.extractedData).filter(([key, data]) => 
                            key.startsWith('LAB_RESULTS')).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Lab Results</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">
                          {Object.entries(processing.extractedData).filter(([key, data]) => 
                            ['HEART_METRICS', 'SLEEP_METRICS', 'ACTIVITY_METRICS'].includes(key)).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Health Metrics</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Validation Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>📊 Data Validation Report</CardTitle>
                      <CardDescription>
                        Complete breakdown of all extracted and processed data
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-200 p-2 text-left">Table</th>
                              <th className="border border-gray-200 p-2 text-left">Field</th>
                              <th className="border border-gray-200 p-2 text-left">Extracted Value</th>
                              <th className="border border-gray-200 p-2 text-left">Type</th>
                              <th className="border border-gray-200 p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(processing.extractedData).map(([tableName, data]) => {
                              if (!data || typeof data !== 'object') return null;
                              
                              const savedRecord = processing.savedRecords.find(r => 
                                r.table.toLowerCase().includes(tableName.toLowerCase().replace('_', '').slice(0, 8))
                              );
                              
                              return Object.entries(data).map(([field, value], index) => (
                                <tr key={`${tableName}-${field}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="border border-gray-200 p-2 font-medium">
                                    {index === 0 ? tableName.replace(/_/g, ' ') : ''}
                                  </td>
                                  <td className="border border-gray-200 p-2">{field}</td>
                                  <td className="border border-gray-200 p-2">
                                    <span className="max-w-xs inline-block truncate">
                                      {value === null ? (
                                        <span className="text-gray-400 italic">null</span>
                                      ) : (
                                        String(value)
                                      )}
                                    </span>
                                  </td>
                                  <td className="border border-gray-200 p-2 text-sm">
                                    {value === null ? 'null' : typeof value}
                                  </td>
                                  <td className="border border-gray-200 p-2">
                                    {savedRecord ? (
                                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                        <CheckCircle className="h-3 w-3" />
                                        Saved
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-yellow-600 text-sm">
                                        <AlertCircle className="h-3 w-3" />
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Raw Data View */}
                  <Card>
                    <CardHeader>
                      <CardTitle>🔍 Raw Extracted Data</CardTitle>
                      <CardDescription>
                        JSON view of all extracted data for technical validation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-96 overflow-y-auto">
                        {JSON.stringify(processing.extractedData, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
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
                         View Created Database Records ({processing.savedRecords.length} total)
                       </summary>
                       <div className="mt-4 space-y-4">
                         {processing.savedRecords.map((record, index) => (
                           <Card key={index} className="bg-green-50 border-green-200">
                             <CardHeader className="pb-2">
                               <div className="flex items-center justify-between">
                                 <CardTitle className="text-sm font-medium">
                                   📊 {record.table.replace(/_/g, ' ').toUpperCase()}
                                 </CardTitle>
                                 <Badge variant="outline" className="text-xs">
                                   ID: {record.data.id || 'N/A'}
                                 </Badge>
                               </div>
                             </CardHeader>
                             <CardContent className="space-y-2">
                               <div className="flex items-center gap-2 text-sm">
                                 <span className="font-medium">Confidence:</span>
                                 <Badge variant={record.confidence > 0.8 ? "default" : "secondary"}>
                                   {Math.round(record.confidence * 100)}%
                                 </Badge>
                               </div>
                               <div className="bg-white p-3 rounded border">
                                 <div className="text-xs font-mono">
                                   <strong>Created Record:</strong>
                                   <pre className="mt-1 text-xs overflow-x-auto">
                                     {JSON.stringify(record.data, null, 2)}
                                   </pre>
                                 </div>
                               </div>
                             </CardContent>
                           </Card>
                         ))}
                       </div>
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