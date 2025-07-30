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
    const { extractedText, filename } = await req.json();

    if (!extractedText) {
      throw new Error('No extracted text provided');
    }

    // Get Azure OpenAI credentials from Supabase secrets
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');

    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      throw new Error('Azure OpenAI configuration missing');
    }

    console.log('Processing document:', filename);
    console.log('Text length:', extractedText.length);

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
    "tableName": {
      "field1": "value1",
      "field2": "value2"
    }
  },
  "recommendations": ["suggestion1", "suggestion2"]
}

EXTRACTION RULES:
1. Only extract data that exists in the document - do not infer or guess
2. Match extracted data to the appropriate database table schema
3. For dates, use YYYY-MM-DD format
4. For numeric values, extract just the number without units
5. Store units separately in the units field
6. Use null for missing values
7. Confidence should reflect how certain you are about the extractions
8. Multiple tables can be populated from one document

EXAMPLES OF GOOD EXTRACTIONS:
- Lab results: Extract test names, values, units, reference ranges, dates
- Patient info: Names, DOB, contact information, demographics  
- Imaging: Study type, body part examined, findings, radiologist notes
- Vitals: Heart rate, blood pressure, temperature measurements
- Prescriptions: Medication names, dosages, frequencies

Be thorough but accurate. Higher confidence scores for clear, unambiguous data.`;

    const userPrompt = `Analyze this medical document and extract structured data:

FILENAME: ${filename}

DOCUMENT TEXT:
${extractedText}

Extract all relevant medical data that matches the database schema. Focus on:
- Patient demographics if present
- Lab test results with values and reference ranges
- Imaging study findings
- Vital signs and measurements
- Medication information
- Allergy information
- Any quantifiable health metrics

Return the structured JSON response as specified.`;

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', errorText);
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Azure OpenAI response received');

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('No content in Azure OpenAI response');
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', data.choices[0].message.content);
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

    console.log('Analysis complete. Document type:', result.documentType, 'Confidence:', result.confidence);

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