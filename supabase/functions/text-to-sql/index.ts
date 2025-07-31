import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const databaseSchema = `
Available tables and their key columns:

1. profiles: user_id, display_name, date_of_birth, gender
2. patients: id, user_id, first_name, last_name, date_of_birth, gender, medical_record_number
3. lab_tests: id, patient_id, test_name, test_category, order_date, result_date, test_status
4. lab_results: id, lab_test_id, result_name, numeric_value, text_value, units, abnormal_flag
5. heart_metrics: id, user_id, measurement_timestamp, resting_heart_rate, average_heart_rate, max_heart_rate, hrv_score
6. activity_metrics: id, user_id, measurement_date, steps_count, total_calories, device_type
7. sleep_metrics: id, user_id, sleep_date, total_sleep_time, deep_sleep_minutes, rem_sleep_minutes, sleep_score
8. nutrition_metrics: id, user_id, measurement_date, total_calories, protein_grams, carbohydrates_grams
9. imaging_studies: id, patient_id, study_date, study_type, body_part, findings, impression
10. cardiovascular_tests: id, patient_id, test_date, test_type, heart_rate, blood_pressure_peak
11. allergies: id, patient_id, allergen, reaction, severity, onset_date
12. document_processing_logs: id, user_id, filename, processing_status, ai_analysis_status, created_at

Key relationships:
- profiles.user_id links to patients.user_id (one user can have multiple patients)
- patients.id links to lab_tests.patient_id, imaging_studies.patient_id, etc.
- lab_tests.id links to lab_results.lab_test_id
- All metrics tables link directly to user_id from auth
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert SQL generator for a medical data management system. 
    
    Database Schema:
    ${databaseSchema}
    
    Rules:
    1. ONLY generate SELECT statements - no INSERT, UPDATE, DELETE, DROP, etc.
    2. Always use proper table joins when needed
    3. Use LIMIT clauses to prevent large result sets (default to 10-50 rows)
    4. When filtering by user data, always include user_id conditions for security
    5. Use proper date formatting and comparisons
    6. Return only the SQL query without any explanations or markdown formatting
    7. For patient-related queries, join through the patients table to filter by user_id
    8. Use meaningful column aliases when helpful
    
    Examples:
    - "patients with heart rate above 100" → SELECT p.first_name, p.last_name, h.resting_heart_rate FROM patients p JOIN heart_metrics h ON p.user_id = h.user_id WHERE h.resting_heart_rate > 100 LIMIT 20;
    - "recent lab results" → SELECT lr.result_name, lr.numeric_value, lr.units, lt.test_date FROM lab_results lr JOIN lab_tests lt ON lr.lab_test_id = lt.id ORDER BY lt.test_date DESC LIMIT 10;
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedSQL = data.choices[0].message.content.trim();

    // Basic validation - ensure it's a SELECT statement
    if (!generatedSQL.toLowerCase().trim().startsWith('select')) {
      throw new Error('Generated query is not a SELECT statement');
    }

    console.log('Generated SQL:', generatedSQL);

    return new Response(
      JSON.stringify({ sql: generatedSQL }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in text-to-sql function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});