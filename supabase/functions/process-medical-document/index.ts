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
    const { text, extractedText, filename, patient_id } = await req.json();
    
    // Accept either 'text' or 'extractedText' parameter
    const documentText = text || extractedText;

    console.log('🤖 AZURE OPENAI REQUEST INITIATED:');
    console.log('=====================================');
    console.log('📄 FILENAME:', filename);
    console.log('👤 PATIENT ID:', patient_id);
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

    // Enhanced medical data extraction prompt with SQL generation
    const systemPrompt = `You are a medical data extraction specialist and SQL query generator. Your job is to:
1. Extract structured data from medical documents according to the database schema
2. Generate complete SQL INSERT statements for the extracted data using the provided patient ID

DATABASE SCHEMA FOR SQL GENERATION:

clinical_diagnostic_lab_tests table (for LAB_RESULTS):
- id (uuid, auto-generated)
- patient_id (uuid, use the provided patient_id: ${patient_id})
- test_name (text, required)
- test_category (text, default: 'lab_work') 
- test_type (text, default: 'blood_chemistry')
- numeric_value (numeric, nullable)
- result_value (text, nullable)
- unit (text, nullable)
- reference_range_min (numeric, nullable)
- reference_range_max (numeric, nullable)
- measurement_time (timestamp, use current timestamp)
- data_source (text, default: 'document_upload')
- created_at (timestamp, auto-generated)
- updated_at (timestamp, auto-generated)

biomarker_heart table (for HEART_METRICS):
- id (uuid, auto-generated)
- patient_id (uuid, use the provided patient_id: ${patient_id})
- measurement_time (timestamp, use current timestamp)
- device_type (text, default: 'manual')
- data_source (text, default: 'document_upload')
- resting_heart_rate (integer, nullable)
- max_heart_rate (integer, nullable)
- systolic_bp (integer, nullable) 
- diastolic_bp (integer, nullable)
- hrv_score (integer, nullable)
- created_at (timestamp, auto-generated)
- updated_at (timestamp, auto-generated)

REQUIRED RESPONSE FORMAT:
{
  "documentType": "lab_report|biomarker_report|health_metrics|other",
  "confidence": 0.95,
  "extractedFields": {
    "LAB_RESULTS_1": {
      "test_name": "Hemoglobin A1c",
      "numeric_value": 6.1,
      "unit": "%",
      "result_value": "6.1",
      "reference_range_min": 5.7,
      "reference_range_max": 6.4
    }
  },
  "sqlQueries": [
    "INSERT INTO clinical_diagnostic_lab_tests (patient_id, test_name, test_category, test_type, numeric_value, result_value, unit, reference_range_min, reference_range_max, measurement_time, data_source) VALUES ('${patient_id}', 'Hemoglobin A1c', 'lab_work', 'blood_chemistry', 6.1, '6.1', '%', 5.7, 6.4, '${new Date().toISOString()}', 'document_upload');"
  ],
  "recommendations": []
}

SQL GENERATION RULES:
1. Generate complete INSERT statements for each extracted data point
2. ALWAYS use the provided patient_id: '${patient_id}' for patient_id values (do NOT use placeholders)
3. Use current timestamp in ISO format for timestamp values
4. Include proper NULL handling for missing values
5. Escape single quotes in text values by doubling them
6. Only generate SQL for data you extract in extractedFields
7. Each SQL statement must be complete and executable
8. Use appropriate table based on data type (clinical_diagnostic_lab_tests for lab results, etc.)

EXTRACTION RULES:
1. Extract medical test results, vital signs, and biomarker data
2. Map test names to standard terminology
3. Include units, reference ranges, and numeric values
4. Only include data you are >90% confident about
5. Generate corresponding SQL INSERT for each extracted field using the actual patient_id: ${patient_id}
6. Maintain data consistency between extractedFields and sqlQueries

Be thorough and generate both structured data and corresponding SQL statements with the real patient ID.`;

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
      sqlQueries: Array.isArray(parsedResult.sqlQueries) 
        ? parsedResult.sqlQueries.slice(0, 20)
        : [],
      recommendations: Array.isArray(parsedResult.recommendations) 
        ? parsedResult.recommendations.slice(0, 10)
        : []
    };

    console.log('🎯 FINAL PROCESSED RESULT:');
    console.log('=====================================');
    console.log('📋 Document Type:', result.documentType);
    console.log('🎯 Confidence:', result.confidence);
    console.log('📊 Extracted Fields Count:', Object.keys(result.extractedFields).length);
    console.log('🔍 SQL Queries Generated:', result.sqlQueries.length);
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