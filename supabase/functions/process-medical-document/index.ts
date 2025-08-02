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

    // Schema-driven medical data extraction prompt
    const systemPrompt = `You are a medical data extraction specialist. Your ONLY job is to extract data from medical documents that EXACTLY matches the predefined database schema below.

CRITICAL RULE: You can ONLY extract data for columns that exist in the schema. If a data point doesn't match any column name below, IGNORE IT completely.

DATABASE SCHEMA - EXTRACT ONLY THESE EXACT COLUMNS:

LAB_RESULTS (Primary biomarker data):
- result_name (text) - MUST match medical test names like "Hemoglobin", "Glucose", "Cholesterol", "TSH", etc.
- numeric_value (number) - The numerical result value
- units (text) - Units exactly as written (g/dL, mg/dL, U/L, etc.)
- abnormal_flag (text) - ONLY: "normal", "high", "low", "critical_high", "critical_low"
- reference_range_min (number) - Lower bound of normal range
- reference_range_max (number) - Upper bound of normal range

HEART_METRICS (Cardiovascular biomarkers):
- measurement_timestamp (timestamp) - Format: YYYY-MM-DDTHH:MM:SSZ
- device_type (text) - "manual", "ecg", "monitor"
- resting_heart_rate (integer) - Resting heart rate in BPM
- max_heart_rate (integer) - Maximum heart rate in BPM
- systolic_bp (integer) - Systolic blood pressure
- diastolic_bp (integer) - Diastolic blood pressure
- hrv_score (integer) - Heart rate variability score

ACTIVITY_METRICS (Physical activity biomarkers):
- measurement_date (date) - Format: YYYY-MM-DD
- measurement_timestamp (timestamp) - Format: YYYY-MM-DDTHH:MM:SSZ
- device_type (text) - "manual", "tracker", "smartwatch"
- steps_count (integer) - Number of steps
- total_calories (integer) - Total calories burned
- active_calories (integer) - Active calories burned
- exercise_minutes (integer) - Exercise duration in minutes

SLEEP_METRICS (Sleep biomarkers):
- sleep_date (date) - Format: YYYY-MM-DD
- device_type (text) - "manual", "tracker", "study"
- total_sleep_time (integer) - Total sleep in minutes
- deep_sleep_minutes (integer) - Deep sleep duration
- rem_sleep_minutes (integer) - REM sleep duration
- light_sleep_minutes (integer) - Light sleep duration
- sleep_efficiency (numeric) - Sleep efficiency percentage
- sleep_score (integer) - Overall sleep quality score

NUTRITION_METRICS (Nutritional biomarkers):
- measurement_date (date) - Format: YYYY-MM-DD
- total_calories (integer) - Total daily calories
- protein_grams (numeric) - Protein intake in grams
- carbohydrates_grams (numeric) - Carbs in grams
- fat_grams (numeric) - Fat in grams
- fiber_grams (numeric) - Fiber in grams
- vitamin_d_iu (numeric) - Vitamin D in IU
- vitamin_b12_mcg (numeric) - B12 in micrograms
- calcium_mg (numeric) - Calcium in milligrams
- iron_mg (numeric) - Iron in milligrams

MICROBIOME_METRICS (Gut health biomarkers):
- test_date (date) - Format: YYYY-MM-DD
- test_provider (text) - Lab/company name
- alpha_diversity (numeric) - Alpha diversity score
- beneficial_bacteria_score (integer) - Beneficial bacteria percentage
- pathogenic_bacteria_score (integer) - Pathogenic bacteria percentage
- butyrate_production (numeric) - Butyrate production level

ENVIRONMENTAL_METRICS (Environmental biomarkers):
- measurement_date (date) - Format: YYYY-MM-DD
- measurement_timestamp (timestamp) - Format: YYYY-MM-DDTHH:MM:SSZ
- device_type (text) - "manual", "sensor", "monitor"
- air_quality_index (integer) - AQI value
- uv_exposure_minutes (integer) - UV exposure time
- weather_temperature (numeric) - Temperature

RECOVERY_STRAIN_METRICS (Recovery biomarkers):
- measurement_date (date) - Format: YYYY-MM-DD
- device_type (text) - "manual", "wearable"
- recovery_score (integer) - Recovery score 0-100
- strain_score (numeric) - Strain/stress score
- hrv_score (integer) - HRV recovery score
- sleep_performance_score (integer) - Sleep contribution to recovery

REQUIRED RESPONSE FORMAT:
{
  "documentType": "lab_report|biomarker_report|health_metrics|other",
  "confidence": 0.95,
  "extractedFields": {
    "LAB_RESULTS_1": {
      "result_name": "Hemoglobin",
      "numeric_value": 14.5,
      "units": "g/dL",
      "abnormal_flag": "normal"
    },
    "LAB_RESULTS_2": {
      "result_name": "Glucose",
      "numeric_value": 95,
      "units": "mg/dL",
      "abnormal_flag": "normal"
    },
    "HEART_METRICS": {
      "measurement_timestamp": "2024-01-15T09:00:00Z",
      "device_type": "manual",
      "systolic_bp": 120,
      "diastolic_bp": 80
    }
  },
  "recommendations": []
}

EXTRACTION RULES:
1. ONLY extract data for columns that exist in the schema above
2. If document contains data not in schema, IGNORE it completely
3. Use exact column names from schema (result_name, numeric_value, etc.)
4. For multiple lab results, use LAB_RESULTS_1, LAB_RESULTS_2, etc.
5. Extract result name, value, units, and date for each biomarker
6. Map similar test names to standard names (e.g., "HGB" → "Hemoglobin")
7. Only include data you are >90% confident about
8. If no schema-matching data found, return empty extractedFields

CRITICAL: Your response must be valid JSON that only contains columns from the schema above.

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

    // Call Azure OpenAI API with retry logic for rate limiting
    let retryCount = 0;
    const maxRetries = 3;
    let response: Response | null = null;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`🚀 ATTEMPT ${retryCount + 1}/${maxRetries + 1} - CALLING AZURE OPENAI`);
        
        response = await fetch(`${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-01`, {
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

        // Handle rate limiting (429 status)
        if (response.status === 429) {
          const errorText = await response.text();
          console.log('❌ RATE LIMIT ERROR (429):');
          console.log('Status Text:', response.statusText);
          console.log('Error Body:', errorText);
          console.log('=====================================');
          
          // Parse retry-after header or use exponential backoff
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 2000;
          
          if (retryCount < maxRetries) {
            console.log(`⏳ WAITING ${waitTime / 1000} seconds before retry (attempt ${retryCount + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          } else {
            throw new Error(`Rate limit exceeded after ${maxRetries + 1} attempts. The Azure OpenAI API is currently rate-limited. Please wait a few minutes and try again.`);
          }
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ AZURE OPENAI API ERROR:');
          console.error('Status:', response.status);
          console.error('Status Text:', response.statusText);
          console.error('Error Body:', errorText);
          console.error('=====================================');
          throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
        }
        
        // Success - break out of retry loop
        break;
        
      } catch (error) {
        if (retryCount < maxRetries && error.message.includes('fetch')) {
          console.log(`🔄 NETWORK ERROR - RETRYING (${retryCount + 1}/${maxRetries}): ${error.message}`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      throw new Error('Failed to get response from Azure OpenAI after retries');
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