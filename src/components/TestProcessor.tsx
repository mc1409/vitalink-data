import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePatient } from '@/contexts/PatientContext';

const TestProcessor: React.FC = () => {
  const { primaryPatient } = usePatient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testData = `GLYCATED HAEMOGLOBIN (HbA1c)
Hemoglobin A1c (%), EDTA Blood by HPLC 6.1 %
Remarks :-
Glucose combines with Hb continuously and nearly irreversibly during the lifespan of RBC i.e.120days. Therefore, glycosylated Hb
(GHb) will be proportional to mean plasma glucose level during previous 6-12 weeks. Factors such as duration of diabetes, adherence
to therapy and the age of patient should also be considered in assessing the degree of blood glucose control. These values are for
non-pregnant individual...`;

  const runTest = async () => {
    if (!primaryPatient?.id) {
      toast.error('No primary patient found');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      console.log('🧪 STARTING TEST WITH DATA:', {
        textLength: testData.length,
        patientId: primaryPatient.id,
        testData: testData.substring(0, 100) + '...'
      });

      // Step 1: Process with AI
      const { data: aiResult, error: aiError } = await supabase.functions.invoke(
        'process-medical-document',
        {
          body: {
            text: testData,
            filename: 'Test Data',
            patient_id: primaryPatient.id
          }
        }
      );

      if (aiError) throw aiError;

      console.log('🧪 AI PROCESSING RESULT:', aiResult);
      setResult({ step: 'AI Processing', data: aiResult });

      // Step 2: Try to save to database
      const extractedFields = aiResult.extractedFields || {};
      let savedCount = 0;

      for (const [key, labData] of Object.entries(extractedFields)) {
        if (key.startsWith('LAB_RESULTS') && labData && typeof labData === 'object') {
          const data = labData as any;
          
          if (!data.test_name) {
            console.log('🧪 SKIPPING - No test_name:', data);
            continue;
          }

          const insertPayload = {
            patient_id: primaryPatient.id,
            test_name: data.test_name,
            test_category: 'lab_work',
            test_type: 'blood_chemistry',
            numeric_value: data.numeric_value,
            result_value: data.result_value || data.numeric_value?.toString(),
            unit: data.unit,
            reference_range_min: data.reference_range_min,
            reference_range_max: data.reference_range_max,
            measurement_time: new Date().toISOString(),
            data_source: 'test_upload'
          };

          console.log('🧪 ATTEMPTING INSERT WITH REAL PATIENT ID:', insertPayload);
          console.log('🧪 PATIENT ID:', primaryPatient.id, 'TYPE:', typeof primaryPatient.id);
          
          // Show the exact SQL that would be executed
          console.log('🧪 EQUIVALENT SQL QUERY:');
          console.log(`INSERT INTO clinical_diagnostic_lab_tests (
            patient_id, test_name, test_category, test_type, 
            numeric_value, result_value, unit, reference_range_min, 
            reference_range_max, measurement_time, data_source
          ) VALUES (
            '${insertPayload.patient_id}',
            '${insertPayload.test_name}',
            '${insertPayload.test_category}',
            '${insertPayload.test_type}',
            ${insertPayload.numeric_value},
            '${insertPayload.result_value}',
            '${insertPayload.unit}',
            ${insertPayload.reference_range_min || 'NULL'},
            ${insertPayload.reference_range_max || 'NULL'},
            '${insertPayload.measurement_time}',
            '${insertPayload.data_source}'
          )`);

          const { data: insertedData, error: saveError } = await supabase
            .from('clinical_diagnostic_lab_tests')
            .insert(insertPayload)
            .select();

          console.log('🧪 INSERT RESULT:', { insertedData, saveError });

          if (!saveError && insertedData && insertedData.length > 0) {
            savedCount++;
            console.log('🧪 ✅ SUCCESSFULLY SAVED:', insertedData[0]);
          } else {
            console.error('🧪 ❌ SAVE FAILED:', saveError);
          }
        }
      }

      setResult(prev => ({ 
        ...prev, 
        step: 'Database Save', 
        savedCount, 
        totalFields: Object.keys(extractedFields).length 
      }));

      toast.success(`Test completed! Saved ${savedCount} records`);

    } catch (error: any) {
      console.error('🧪 TEST FAILED:', error);
      setResult({ step: 'Error', error: error.message });
      toast.error('Test failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>🧪 Test Processor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Test the AI processing and database insertion with the provided HbA1c data
          </p>
          
          <Button 
            onClick={runTest} 
            disabled={isProcessing || !primaryPatient?.id}
            variant="outline"
          >
            {isProcessing ? 'Processing...' : 'Run Test'}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TestProcessor;