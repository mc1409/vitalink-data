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

    // Create comprehensive medical document analysis prompt
    const systemPrompt = `You are a medical document analysis AI that extracts structured data from medical documents. 

Your task is to analyze medical documents and extract structured data that can be stored in a health database.

Available database tables and their key fields:
1. PATIENTS: first_name, last_name, date_of_birth, gender, phone_primary, email, address
2. LAB_TESTS: test_name, test_category, order_date, collection_date, result_date, ordering_physician
3. LAB_RESULTS: result_name, numeric_value, text_value, units, reference_range_min, reference_range_max, abnormal_flag
4. IMAGING_STUDIES: study_type, study_date, body_part, findings, impression, radiologist
5. CARDIOVASCULAR_TESTS: test_type, test_date, heart_rate, blood_pressure, ecg_interpretation
6. ALLERGIES: allergen, reaction, severity, onset_date
7. ACTIVITY_METRICS: measurement_date, steps_count, total_calories, exercise_minutes
8. HEART_METRICS: measurement_timestamp, resting_heart_rate, max_heart_rate, hrv_score
9. SLEEP_METRICS: sleep_date, total_sleep_time, deep_sleep_minutes, sleep_score
10. NUTRITION_METRICS: measurement_date, total_calories, protein_grams, carbohydrates_grams

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
    },
    "SLEEP_METRICS": {
      "sleep_date": "2025-07-26",
      "total_sleep_time": 8,
      "deep_sleep_minutes": 72,
      "sleep_score": 91
    }
  },
  "recommendations": ["suggestion1", "suggestion2"]
}

CRITICAL EXTRACTION RULES:
1. For multiple lab results, create separate entries: LAB_RESULTS, LAB_RESULTS_2, LAB_RESULTS_3, etc.
2. Extract numeric values without units - store units separately
3. For dates, use YYYY-MM-DD format
4. Use null for missing values
5. For sleep times in hours, convert to total minutes (e.g., 8 hours = 480 minutes)
6. For heart metrics, extract HRV in milliseconds if available
7. Match field names exactly to database schema
8. Patient demographics go in PATIENTS table
9. Physiological biomarkers map to HEART_METRICS, SLEEP_METRICS, ACTIVITY_METRICS
10. Blood test results go in LAB_RESULTS (multiple entries for multiple tests)

EXAMPLES OF GOOD EXTRACTIONS:
- "Hemoglobin: 14.5 g/dL" → LAB_RESULTS: {"result_name": "Hemoglobin", "numeric_value": 14.5, "units": "g/dL"}
- "RBC Count: 4.8 million/uL" → LAB_RESULTS_2: {"result_name": "RBC Count", "numeric_value": 4.8, "units": "million/uL"}
- "Resting Heart Rate: 58 bpm" → HEART_METRICS: {"resting_heart_rate": 58}
- "Sleep Efficiency: 91%" → SLEEP_METRICS: {"sleep_score": 91}
- "Deep Sleep: 1.2 hours" → SLEEP_METRICS: {"deep_sleep_minutes": 72}

Be thorough and extract ALL available data points that match the schema.`;

    const userPrompt = `Analyze this medical document and extract structured data:

FILENAME: ${filename}

DOCUMENT TEXT:
${documentText}

Extract all relevant medical data that matches the database schema. Focus on:
- Patient demographics if present
- Lab test results with values and reference ranges
- Imaging study findings
- Vital signs and measurements
- Medication information
- Allergy information
- Any quantifiable health metrics

Return the structured JSON response as specified.`;

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
        ? parsedResult.recommendations.slice(0, 10) // Limit recommendations
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