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
    const systemPrompt = `You are a medical data extraction specialist. Analyze the provided medical document text and extract structured data that can be mapped to specific database tables.

CRITICAL INSTRUCTIONS:
1. Extract data with high confidence only - flag uncertain information
2. Preserve original values and units exactly as written
3. Include timestamps/dates for all measurements
4. Identify document type first (lab report, imaging, prescription, etc.)
5. Map extracted data to the appropriate database table structure

AVAILABLE DATABASE TABLES TO MAP TO:
- patients: Demographics, contact info, insurance (first_name, last_name, date_of_birth, gender, phone_primary, email, address_line1, medical_record_number, insurance_provider)
- lab_tests + lab_results: Blood work, urine tests, all lab values (test_name, test_category, order_date, collection_date, result_date, ordering_physician, performing_lab)
- lab_results: (result_name, numeric_value, text_value, units, reference_range_min, reference_range_max, abnormal_flag, result_status)
- imaging_studies: X-rays, CT, MRI, ultrasound reports (study_type, study_date, body_part, findings, impression, radiologist, performing_facility)
- cardiovascular_tests: ECG, stress tests, heart procedures (test_type, test_date, heart_rate, max_heart_rate, blood_pressure_peak, ecg_interpretation, performing_physician)
- allergies: Allergic reactions and sensitivities (allergen, reaction, severity, onset_date, active)
- heart_metrics: Heart rate, blood pressure, HRV data (measurement_timestamp, resting_heart_rate, max_heart_rate, hrv_score, systolic_bp, diastolic_bp, vo2_max)
- activity_metrics: Exercise, steps, calorie data (measurement_date, measurement_timestamp, steps_count, total_calories, exercise_minutes, distance_walked_meters, active_calories)
- sleep_metrics: Sleep studies, sleep quality data (sleep_date, total_sleep_time, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, sleep_score, sleep_efficiency)
- nutrition_metrics: Dietary analysis, vitamin levels (measurement_date, total_calories, protein_grams, carbohydrates_grams, fat_grams, fiber_grams, vitamin_d_iu, vitamin_b12_mcg)
- microbiome_metrics: Gut health test results (test_date, alpha_diversity, beta_diversity, beneficial_bacteria_score, pathogenic_bacteria_score, butyrate_production, test_provider)
- environmental_metrics: Exposure data, environmental factors (measurement_date, measurement_timestamp, air_quality_index, uv_exposure_minutes, temperature_deviation)

RESPONSE FORMAT:
Return a JSON object with exactly this structure:
{
  "documentType": "lab_report|imaging_study|cardiovascular_test|medical_record|other",
  "confidence": 0.0-1.0,
  "extractedFields": {
    "PATIENTS": {
      "first_name": "value",
      "last_name": "value"
    },
    "LAB_RESULTS": {
      "result_name": "Hemoglobin",
      "numeric_value": 14.5,
      "units": "g/dL"
    },
    "LAB_RESULTS_2": {
      "result_name": "RBC Count",
      "numeric_value": 4.8,
      "units": "million/uL"
    },
    "HEART_METRICS": {
      "measurement_timestamp": "2025-07-26",
      "resting_heart_rate": 58,
      "hrv_score": 65
    }
  },
  "recommendations": ["suggestion1", "suggestion2"]
}

SPECIFIC EXTRACTION RULES:
- Lab Results: Extract test names, values, units, reference ranges, abnormal flags exactly as written
- Imaging: Extract study type, findings, impressions, radiologist notes
- Vitals: Map heart rate to heart_metrics, blood pressure to cardiovascular_tests or heart_metrics
- Medications: Note any drug allergies for allergies table  
- Patient Info: Update patient demographics if found
- Dates: Always extract test dates, collection dates, report dates in YYYY-MM-DD format
- Physicians: Capture ordering and reviewing physician names
- Labs: Extract performing laboratory information
- Reference Ranges: Parse "10-40 U/L" as min: 10, max: 40, units: "U/L"
- Multiple Values: Create separate entries for each lab result (LAB_RESULTS_1, LAB_RESULTS_2, etc.)
- Confidence Scoring: Only extract data with >0.8 confidence, flag uncertain data for review
- Preserve Units: Keep original units exactly as written in document
- Biomarker Data: Map physiological data to appropriate metrics tables (heart, sleep, activity, etc.)

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