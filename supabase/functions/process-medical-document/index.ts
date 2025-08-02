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
    const req_body = await req.json();
    const { text, extractedText, filename, patient_id, documentType } = req_body;
    
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

    const databaseSchema = `
Database Schema for Medical Data Extraction:

clinical_diagnostic_lab_tests:
- patient_id (uuid, required)
- test_name (text, required) 
- test_category (text, required) - Categories: "Liver Function Test", "Kidney Function Test", "Electrolytes", "Lipid Profile", "Glucose/Diabetes", "Vitamins", "Thyroid Profile", "Iron Studies", "Cardiac Risk", "Enzymes", "Hemogram/CBC", "Differential Leucocyte Count", "Absolute Leucocyte Count", "Urine Physical", "Urine Chemical", "Urine Microscopy", "ESR", "Coagulation", "Tumor Markers", "Hormones"
- test_type (text, required) - Types: "Biochemistry", "Hematology", "Urine Analysis", "Immunology", "Serology", "Microbiology", "Molecular", "Cytology", "Histopathology"
- numeric_value (numeric, optional) - For quantitative results
- result_value (text, optional) - For qualitative results (e.g., "Negative", "Positive", "Pale yellow")
- unit (text, optional) - Units: "mg/dL", "g/dL", "U/L", "IU/L", "mEq/L", "mmol/L", "µg/dL", "pg/mL", "nmol/L", "ng/mL", "µIU/mL", "mill/mm3", "thou/mm3", "fL", "pg", "%", "mm/hr", "RBC/HPF", "WBC/HPF", "Epi cells/hpf", "/Lpf"
- reference_range_min (numeric, optional)
- reference_range_max (numeric, optional)
- measurement_time (timestamp, required)
- data_source (text, required)

COMPREHENSIVE LAB TEST CATEGORIES TO EXTRACT:

1. LIVER & KIDNEY PANEL:
   - Creatinine, GFR Estimated, Urea, Urea Nitrogen Blood, Uric Acid
   - AST (SGOT), ALT (SGPT), GGTP, Alkaline Phosphatase (ALP)
   - Bilirubin (Total, Direct, Indirect), Total Protein, Albumin, A:G Ratio, Globulin
   - Calcium Total, Phosphorus

2. ELECTROLYTES:
   - Sodium, Potassium, Chloride

3. LIPID PROFILE:
   - Cholesterol Total, Triglycerides, HDL, LDL, VLDL, Non-HDL Cholesterol

4. GLUCOSE & DIABETES:
   - Glucose Fasting, HbA1c, Estimated average glucose (eAG)

5. VITAMINS:
   - Vitamin B12, Vitamin D 25-Hydroxy

6. THYROID PROFILE:
   - T3 Total, T4 Total, TSH

7. IRON STUDIES:
   - Iron, TIBC, Transferrin Saturation

8. CARDIAC RISK:
   - C-Reactive Protein (hsCRP), Apolipoprotein A1, Apolipoprotein B, Apo B/A1 Ratio

9. ENZYMES:
   - Amylase, Lipase

10. HEMOGRAM/CBC (Complete Blood Count):
    - Hemoglobin, Packed Cell Volume (PCV), RBC Count
    - MCV, MCH, MCHC, Red Cell Distribution Width (RDW)
    - Total Leukocyte Count (TLC), Platelet Count, Mean Platelet Volume
    - E.S.R. (Erythrocyte Sedimentation Rate)

11. DIFFERENTIAL LEUCOCYTE COUNT:
    - Segmented Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils (all in %)

12. ABSOLUTE LEUCOCYTE COUNT:
    - Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils (all in thou/mm3)

13. URINE EXAMINATION:
    Physical: Colour, Specific Gravity, pH
    Chemical: Proteins, Glucose, Ketones, Bilirubin, Urobilinogen, Leucocyte Esterase, Nitrite
    Microscopy: R.B.C., Pus Cells, Epithelial Cells, Casts, Crystals, Others

biomarker_heart:
- patient_id (uuid, required)
- measurement_time (timestamp, required)
- device_type (text, required)
- data_source (text, required)
- resting_heart_rate (integer, optional)
- max_heart_rate (integer, optional)
- systolic_bp (integer, optional)
- diastolic_bp (integer, optional)
- hrv_score (integer, optional)

biomarker_activity:
- patient_id (uuid, required)
- measurement_date (date, required)
- measurement_time (timestamp, required)
- device_type (text, required)
- data_source (text, required)
- steps_count (integer, optional)
- total_calories (integer, optional)
- distance_walked_meters (numeric, optional)

biomarker_sleep:
- patient_id (uuid, required)
- sleep_date (date, required)
- measurement_time (timestamp, required)
- device_type (text, required)
- data_source (text, required)
- total_sleep_time (integer, optional)
- sleep_efficiency (numeric, optional)
`;

    // Determine document type and create appropriate system prompt
    let systemPrompt = '';
    
    if (documentType === 'biomarker') {
      systemPrompt = `You are a biomarker data extraction AI. Extract structured data from fitness trackers, health apps, and biomarker documents. Return data in the exact JSON format specified below.

IMPORTANT INSTRUCTIONS:
1. Extract ALL relevant biomarker data from the document
2. Return data in the exact JSON structure specified below
3. Use null for missing values, not empty strings
4. Ensure all dates are in YYYY-MM-DD format
5. Ensure all timestamps are in ISO 8601 format (YYYY-MM-DDTHH:MM:SS.000Z)
6. For numeric values, use actual numbers, not strings
7. Generate appropriate INSERT SQL statements for the extracted data
8. Detect the biomarker category and route data to appropriate tables

BIOMARKER DATABASE SCHEMAS:

Table: biomarker_heart
- patient_id: UUID, measurement_time: timestamp, data_source: text, device_type: text
- resting_heart_rate: integer, average_heart_rate: integer, min_heart_rate: integer, max_heart_rate: integer
- walking_heart_rate: integer, workout_heart_rate: integer, recovery_heart_rate: integer
- hrv_rmssd: numeric, hrv_sdnn: numeric, hrv_score: integer
- systolic_bp: integer, diastolic_bp: integer, vo2_max: numeric
- cardio_fitness_level: text, ecg_rhythm_classification: text
- afib_detected: boolean, irregular_rhythm_detected: boolean

Table: biomarker_activity
- patient_id: UUID, measurement_date: date, measurement_time: timestamp, data_source: text, device_type: text
- steps_count: integer, distance_walked_meters: numeric, distance_ran_meters: numeric, distance_cycled_meters: numeric
- flights_climbed: integer, total_calories: integer, active_calories: integer, basal_calories: integer
- workout_calories: integer, exercise_minutes: integer, vigorous_activity_minutes: integer
- moderate_activity_minutes: integer, sedentary_minutes: integer, stand_hours: integer, stand_goal_hours: integer
- workout_duration_minutes: integer, workout_distance_meters: numeric, workout_avg_heart_rate: integer, workout_max_heart_rate: integer

Table: biomarker_sleep
- patient_id: UUID, sleep_date: date, measurement_time: timestamp, data_source: text, device_type: text
- bedtime: timestamp, sleep_start: timestamp, sleep_end: timestamp, wake_time: timestamp
- total_sleep_time: integer, time_in_bed: integer, rem_sleep_minutes: integer, deep_sleep_minutes: integer
- light_sleep_minutes: integer, awake_minutes: integer, sleep_efficiency: numeric, sleep_latency: integer
- sleep_score: integer, sleep_debt: integer, sleep_disturbances: integer, restfulness_score: integer
- avg_heart_rate: integer, min_heart_rate: integer, max_heart_rate: integer, avg_hrv: numeric
- avg_respiratory_rate: numeric, avg_spo2: integer, min_spo2: integer
- avg_body_temperature: numeric, temperature_deviation: numeric

Table: biomarker_nutrition
- patient_id: UUID, measurement_date: date, measurement_time: timestamp, data_source: text
- total_calories: integer, carbohydrates_grams: numeric, protein_grams: numeric, fat_grams: numeric
- fiber_grams: numeric, sugar_grams: numeric, added_sugar_grams: numeric, sodium_mg: numeric
- potassium_mg: numeric, calcium_mg: numeric, magnesium_mg: numeric, iron_mg: numeric, zinc_mg: numeric
- vitamin_a_iu: numeric, vitamin_c_mg: numeric, vitamin_d_iu: numeric, vitamin_e_mg: numeric
- vitamin_k_mcg: numeric, thiamine_mg: numeric, riboflavin_mg: numeric, niacin_mg: numeric
- vitamin_b6_mg: numeric, folate_mcg: numeric, vitamin_b12_mcg: numeric, biotin_mcg: numeric
- water_intake_ml: integer, caffeine_mg: numeric, alcohol_grams: numeric

Table: biomarker_biological_genetic_microbiome
- patient_id: UUID, test_date: date, measurement_time: timestamp, data_source: text, test_provider: text
- alpha_diversity: numeric, beta_diversity: numeric, species_richness: integer, microbial_diversity_shannon: numeric
- dysbiosis_index: numeric, firmicutes_bacteroidetes_ratio: numeric, beneficial_bacteria_score: integer
- pathogenic_bacteria_score: integer, bifidobacterium_level: numeric, lactobacillus_level: numeric
- akkermansia_level: numeric, proteobacteria_level: numeric, candida_level: numeric
- acetate_production: numeric, butyrate_production: numeric, propionate_production: numeric
- vitamin_b_production: integer, vitamin_k_production: integer, folate_production: integer
- fiber_utilization_score: integer, protein_utilization_score: integer, carb_utilization_score: integer
- fat_utilization_score: integer, immune_function_score: integer, mitochondrial_health_score: integer
- oxidative_stress_score: integer, inflammatory_pathways_score: integer, recovery_score: integer
- strain_score: numeric, hrv_score: integer, resting_hr_score: integer, sleep_performance_score: integer
- stress_score: integer, cardiovascular_load: integer, hydration_level: integer, microbiome_age: numeric

Return response as JSON with this structure:
{
  "documentType": "biomarker_data",
  "confidence": 0.95,
  "extractedFields": {
    "biomarker_heart": [...],
    "biomarker_activity": [...],
    "biomarker_sleep": [...],
    "biomarker_nutrition": [...],
    "biomarker_biological_genetic_microbiome": [...]
  },
  "sqlQuery": "INSERT INTO biomarker_heart (...) VALUES (...); INSERT INTO biomarker_activity (...) VALUES (...);"
}`;
    } else {
      systemPrompt = `You are a medical document processor that extracts structured data from medical documents and maps it to database schema.

Database Schema:
${databaseSchema}

Your task is to:
1. Analyze the provided medical document text
2. Extract relevant medical data and map it to the appropriate database tables
3. Return structured JSON data that matches the database schema exactly
4. Provide confidence scores and validation flags

IMPORTANT EXTRACTION RULES:
- Extract ALL lab test results mentioned in the document - do not skip any tests
- Include BIOCHEMISTRY tests (liver, kidney, electrolytes, lipids, glucose, vitamins, thyroid, cardiac, enzymes)
- Include HEMATOLOGY tests (CBC, hemoglobin, WBC, RBC, platelets, differential counts, ESR)
- Include URINE ANALYSIS tests (physical, chemical, microscopy parameters)
- Extract both numeric values (for quantitative tests) and text results (for qualitative tests)
- For each test, extract: test_name, category, type, value, unit, reference ranges
- Map test categories correctly: "Hemogram/CBC", "Differential Leucocyte Count", "Urine Physical", etc.
- Map test types correctly: "Biochemistry", "Hematology", "Urine Analysis"
- For dates, convert them to ISO format (YYYY-MM-DD)
- For timestamps, use ISO format with timezone (YYYY-MM-DDTHH:MM:SSZ)
- Use the provided patient_id in ALL extracted records
- Include confidence scores for each extracted field (0-100)
- Flag out-of-range values in _validation_flags array

Response format:
{
  "documentType": "string (e.g., 'lab_results', 'biomarker_report', 'heart_monitor')",
  "confidence": number (0-100),
  "extractedFields": {
    "table_name": [
      {
        "patient_id": "uuid",
        "field_name": "extracted_value",
        "measurement_time": "timestamp",
        "_confidence": number,
        "_validation_flags": ["flag1", "flag2"],
        ...
      }
    ]
  }
}`;
    }

    const userPrompt = `Analyze this medical document and extract structured data according to the medical data extraction protocol:

FILENAME: ${filename}
PATIENT_ID: ${patient_id}
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
10. Use the provided patient_id: ${patient_id} for ALL extracted records

Return the complete structured JSON response with confidence scoring and uncertainty flags as specified in the format above.`;

    console.log('📤 SENDING REQUEST TO AZURE OPENAI:');
    console.log('=====================================');
    console.log('🌐 ENDPOINT URL:', `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-01`);
    console.log('🤖 MODEL DEPLOYMENT:', azureDeployment);
    console.log('📊 SYSTEM PROMPT LENGTH:', systemPrompt.length);
    console.log('📝 USER PROMPT LENGTH:', userPrompt.length);
    console.log('🎯 MAX TOKENS:', 12000);
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
            max_tokens: 12000,
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
      extractedFields: parsedResult.extractedFields || {}
    };

    console.log('🎯 FINAL PROCESSED RESULT:');
    console.log('=====================================');
    console.log('📋 Document Type:', result.documentType);
    console.log('🎯 Confidence:', result.confidence);
    console.log('📊 Extracted Fields Count:', Object.keys(result.extractedFields).length);
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
      extractedFields: {}
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});