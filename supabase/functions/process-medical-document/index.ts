import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, extractedText, filename } = await req.json();
    
    // Accept either 'text' or 'extractedText' parameter
    const documentText = text || extractedText;

    console.log('🤖 AZURE OPENAI REQUEST INITIATED:');
    console.log('=====================================');
    console.log('📄 FILENAME:', filename);
    console.log('📝 TEXT LENGTH:', documentText?.length || 0);
    console.log('📊 TEXT PREVIEW:', documentText?.substring(0, 500) + '...');
    console.log('⏰ REQUEST TIMESTAMP:', new Date().toISOString());

    if (!documentText) {
      throw new Error('No text provided for processing');
    }

    // Get Azure OpenAI credentials from Supabase secrets
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');

    console.log('🔑 AZURE CREDENTIALS CHECK:');
    console.log('=====================================');
    console.log('🌐 ENDPOINT:', azureEndpoint ? '✅ Set' : '❌ Missing');
    console.log('🔐 API KEY:', azureApiKey ? '✅ Set' : '❌ Missing');
    console.log('🚀 DEPLOYMENT:', azureDeployment ? '✅ Set' : '❌ Missing');

    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      throw new Error('Azure OpenAI configuration missing');
    }

    // Enhanced medical data extraction prompt
    const systemPrompt = `You are a medical data extraction specialist. Analyze the provided medical document text and extract structured data that maps EXACTLY to the application's database schema.

CRITICAL: Your response must use EXACT column names and data types as specified below. Do not invent column names.

DATABASE SCHEMA - EXACT COLUMN MAPPINGS:

PATIENTS TABLE:
- first_name (text, required) - Patient's first name
- last_name (text, required) - Patient's last name  
- date_of_birth (date, required) - Format: YYYY-MM-DD
- gender (text, optional) - MUST be exactly: "male", "female", "other", or "prefer_not_to_say"
- medical_record_number (text, optional) - MRN from document
- phone_primary (text, optional) - Primary phone number
- email (text, optional) - Email address
- address_line1 (text, optional) - Street address
- address_line2 (text, optional) - Apt/Suite
- city (text, optional) - City name
- state (text, optional) - State/Province
- zip_code (text, optional) - Postal code
- insurance_provider (text, optional) - Insurance company
- insurance_policy_number (text, optional) - Policy number
- emergency_contact_name (text, optional) - Emergency contact
- emergency_contact_phone (text, optional) - Emergency phone

LAB_TESTS TABLE:
- test_name (text, required) - Name of lab test/panel
- test_category (text, required) - Category like "Hematology", "Chemistry", "Immunology"
- order_date (date, required) - When test was ordered, format: YYYY-MM-DD
- collection_date (date, optional) - When sample collected, format: YYYY-MM-DD
- result_date (date, optional) - When results finalized, format: YYYY-MM-DD
- ordering_physician (text, optional) - Doctor who ordered test
- performing_lab (text, optional) - Laboratory name
- test_code (text, optional) - Lab test code
- specimen_type (text, optional) - "blood", "urine", "saliva", etc.
- test_status (text, optional) - "ordered", "collected", "completed", "cancelled"
- priority (text, optional) - "routine", "urgent", "stat"
- fasting_required (boolean, optional) - true/false

LAB_RESULTS TABLE:
- result_name (text, required) - Exact name of lab parameter
- numeric_value (numeric, optional) - Numerical result value
- text_value (text, optional) - Text result if not numeric
- units (text, optional) - Units exactly as written (g/dL, mg/dL, etc.)
- reference_range_min (numeric, optional) - Lower bound of normal range
- reference_range_max (numeric, optional) - Upper bound of normal range
- reference_range_text (text, optional) - Text description of range
- abnormal_flag (text, optional) - MUST be exactly: "normal", "high", "low", "critical_high", or "critical_low"
- result_status (text, optional) - "final", "preliminary", "corrected"
- interpretation (text, optional) - Clinical interpretation
- reviewing_physician (text, optional) - Doctor who reviewed

HEART_METRICS TABLE:
- device_type (text, required) - "manual", "ecg", "holter", "smartwatch", etc.
- measurement_timestamp (timestamp, required) - Format: YYYY-MM-DDTHH:MM:SSZ
- resting_heart_rate (integer, optional) - BPM at rest
- max_heart_rate (integer, optional) - Maximum BPM
- min_heart_rate (integer, optional) - Minimum BPM
- average_heart_rate (integer, optional) - Average BPM
- systolic_bp (integer, optional) - Systolic blood pressure
- diastolic_bp (integer, optional) - Diastolic blood pressure
- hrv_score (integer, optional) - Heart rate variability score
- vo2_max (numeric, optional) - VO2 max value

ACTIVITY_METRICS TABLE:
- device_type (text, required) - "manual", "smartwatch", "fitness_tracker", etc.
- measurement_date (date, required) - Format: YYYY-MM-DD
- measurement_timestamp (timestamp, required) - Format: YYYY-MM-DDTHH:MM:SSZ
- steps_count (integer, optional) - Number of steps
- total_calories (integer, optional) - Total calories burned
- active_calories (integer, optional) - Active calories burned
- exercise_minutes (integer, optional) - Minutes of exercise
- distance_walked_meters (numeric, optional) - Walking distance in meters

CARDIOVASCULAR_TESTS TABLE:
- test_type (text, required) - "ecg", "stress_test", "echocardiogram", "holter"
- test_date (date, required) - Format: YYYY-MM-DD
- heart_rate (integer, optional) - Heart rate during test
- max_heart_rate (integer, optional) - Peak heart rate
- blood_pressure_peak (text, optional) - Peak BP reading
- ecg_interpretation (text, optional) - ECG findings
- performing_physician (text, optional) - Doctor performing test
- performing_facility (text, optional) - Facility name

IMAGING_STUDIES TABLE:
- study_type (text, required) - "x-ray", "ct", "mri", "ultrasound", "mammogram"
- study_date (date, required) - Format: YYYY-MM-DD
- body_part (text, optional) - Anatomical area imaged
- findings (text, optional) - Radiological findings
- impression (text, optional) - Radiologist impression
- radiologist (text, optional) - Reading radiologist
- performing_facility (text, optional) - Imaging facility

ALLERGIES TABLE:
- allergen (text, required) - Substance causing allergy
- reaction (text, required) - Type of allergic reaction
- severity (text, optional) - "mild", "moderate", "severe"
- onset_date (date, optional) - When allergy first noted, format: YYYY-MM-DD
- active (boolean, optional) - true/false if allergy is current

RESPONSE FORMAT - USE EXACT TABLE NAMES AS KEYS:
{
  "documentType": "lab_report|imaging_study|cardiovascular_test|medical_record|other",
  "confidence": 0.95,
  "extractedFields": {
    "PATIENTS": {
      "first_name": "John",
      "last_name": "Smith",
      "date_of_birth": "1985-03-15",
      "gender": "male"
    },
    "LAB_TESTS": {
      "test_name": "Complete Blood Count",
      "test_category": "Hematology",
      "order_date": "2024-01-15"
    },
    "LAB_RESULTS_1": {
      "result_name": "Hemoglobin",
      "numeric_value": 14.5,
      "units": "g/dL",
      "reference_range_min": 12.0,
      "reference_range_max": 16.0,
      "abnormal_flag": "normal"
    },
    "LAB_RESULTS_2": {
      "result_name": "White Blood Cell Count",
      "numeric_value": 7500,
      "units": "/uL",
      "abnormal_flag": "normal"
    },
    "HEART_METRICS": {
      "device_type": "manual",
      "measurement_timestamp": "2024-01-15T09:30:00Z",
      "systolic_bp": 120,
      "diastolic_bp": 80
    }
  },
  "recommendations": []
}

CRITICAL RULES:
1. Use EXACT table names: PATIENTS, LAB_TESTS, LAB_RESULTS_1, LAB_RESULTS_2, etc.
2. Use EXACT column names from schema above
3. For multiple lab results, use LAB_RESULTS_1, LAB_RESULTS_2, LAB_RESULTS_3, etc.
4. Date format: YYYY-MM-DD (e.g., "2024-01-15")
5. Timestamp format: YYYY-MM-DDTHH:MM:SSZ (e.g., "2024-01-15T09:30:00Z")
6. abnormal_flag: ONLY "normal", "high", "low", "critical_high", "critical_low"
7. gender: ONLY "male", "female", "other", "prefer_not_to_say"
8. Include only fields that have actual values from the document
9. Use proper data types: numbers as numbers, booleans as true/false, text as strings

Be thorough and extract ALL available data points that match the schema with high confidence.`;

    const userPrompt = `Analyze this medical document and extract structured data according to the medical data extraction protocol:

FILENAME: ${filename}
DOCUMENT TEXT:
${documentText}

EXTRACTION REQUIREMENTS:
1. Identify document type first
2. Extract patient demographics if present  
3. Map all lab test results with values and reference ranges
4. Extract vital signs and physiological measurements
5. Capture imaging study findings if applicable
6. Note any allergies or adverse reactions
7. Extract physician and facility information
8. Preserve all timestamps and dates
9. Flag uncertain extractions for manual review
10. Provide recommendations based on findings

Return the complete structured JSON response with confidence scoring and uncertainty flags as specified in the format above.`;

    console.log('📤 SENDING REQUEST TO AZURE OPENAI:');
    console.log('=====================================');
    console.log('🌐 ENDPOINT URL:', `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-01`);
    console.log('🤖 MODEL DEPLOYMENT:', azureDeployment);
    console.log('📊 SYSTEM PROMPT LENGTH:', systemPrompt.length);
    console.log('📝 USER PROMPT LENGTH:', userPrompt.length);
    console.log('🎯 MAX TOKENS:', 4000);
    console.log('🌡️ TEMPERATURE:', 0.1);
    console.log('📋 RESPONSE FORMAT:', 'json_object');
    console.log('⏰ REQUEST SENT AT:', new Date().toISOString());

    // Call Azure OpenAI API
    const response = await fetch(`${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-01`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${azureApiKey}`,
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    console.log('📥 AZURE OPENAI RESPONSE RECEIVED:');
    console.log('=====================================');
    console.log('✅ RESPONSE STATUS:', response.status);
    console.log('📊 RESPONSE OK:', response.ok);
    console.log('⏰ RESPONSE RECEIVED AT:', new Date().toISOString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ AZURE OPENAI API ERROR:');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Body:', errorText);
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📄 RAW AZURE RESPONSE:', JSON.stringify(data, null, 2));

    if (!data.choices?.[0]?.message?.content) {
      console.error('❌ NO CONTENT IN AZURE RESPONSE:', JSON.stringify(data, null, 2));
      throw new Error('No content in Azure OpenAI response');
    }

    const rawContent = data.choices[0].message.content;
    console.log('📝 RAW AI RESPONSE CONTENT:');
    console.log('=====================================');
    console.log(rawContent);

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawContent);
      console.log('✅ PARSED AI RESPONSE:', JSON.stringify(parsedResult, null, 2));
    } catch (parseError) {
      console.error('❌ FAILED TO PARSE AI RESPONSE:', rawContent);
      console.error('Parse Error:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and clean the response
    const result = {
      documentType: parsedResult.documentType || 'other',
      confidence: Math.min(1.0, Math.max(0.0, parsedResult.confidence || 0.5)),
      extractedFields: parsedResult.extractedFields || {},
      recommendations: Array.isArray(parsedResult.recommendations) 
        ? parsedResult.recommendations.slice(0, 10)
        : []
    };

    console.log('🎯 FINAL PROCESSED RESULT:');
    console.log('=====================================');
    console.log('📋 Document Type:', result.documentType);
    console.log('🎯 Confidence:', result.confidence);
    console.log('📊 Extracted Fields Count:', Object.keys(result.extractedFields).length);
    console.log('💡 Recommendations Count:', result.recommendations.length);
    console.log('📄 Full Result:', JSON.stringify(result, null, 2));
    console.log('⏰ PROCESSING COMPLETED:', new Date().toISOString());

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-medical-document function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      documentType: 'error',
      confidence: 0,
      extractedFields: {},
      recommendations: ['Please check the document format and try again']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});