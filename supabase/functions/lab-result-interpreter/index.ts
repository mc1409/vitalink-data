import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { labResult, patientId } = await req.json();
    console.log('Processing lab result interpretation for:', labResult.test_name);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we already have cached insights for this specific lab result
    const { data: cachedInsight, error: cacheError } = await supabase
      .from('ai_insights_cache')
      .select('*')
      .eq('patient_id', patientId)
      .eq('insight_type', 'lab_result_interpretation')
      .contains('generated_data', { lab_result_id: labResult.id })
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedInsight && !cacheError) {
      console.log('Returning cached lab result interpretation');
      return new Response(JSON.stringify(cachedInsight.generated_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Azure OpenAI credentials
    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const azureDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');

    if (!azureApiKey || !azureEndpoint || !azureDeployment) {
      console.error('Missing Azure OpenAI configuration:', {
        hasApiKey: !!azureApiKey,
        hasEndpoint: !!azureEndpoint,
        hasDeployment: !!azureDeployment
      });
      throw new Error('Azure OpenAI configuration missing');
    }

    // Prepare detailed lab result context
    const status = labResult.is_out_of_range === true ? 'abnormal (out of range)' : 
                  labResult.is_out_of_range === false ? 'normal (within range)' : 'unknown';
    
    const referenceRange = labResult.reference_range_min && labResult.reference_range_max 
      ? `${labResult.reference_range_min} - ${labResult.reference_range_max} ${labResult.unit || ''}`
      : 'Not provided';

    const prompt = `As a medical AI assistant, provide a comprehensive interpretation of this lab result for a patient. 

LAB RESULT DETAILS:
- Test Name: ${labResult.test_name}
- Category: ${labResult.test_category}
- Result Value: ${labResult.result_value} ${labResult.unit || ''}
- Reference Range: ${referenceRange}
- Status: ${status}
- Sample Type: ${labResult.sample_type || 'Not specified'}
- Collection Date: ${labResult.collection_date || 'Not specified'}

Please provide a detailed interpretation in JSON format with these exact fields:

{
  "lab_result_id": "${labResult.id}",
  "test_overview": {
    "what_it_measures": "Brief explanation of what this test measures",
    "normal_function": "What normal levels indicate about body function",
    "aliases": ["common alternative names for this test"]
  },
  "result_interpretation": {
    "status": "normal|abnormal|borderline",
    "meaning": "What this specific result means for the patient",
    "significance": "Clinical significance of this result level",
    "risk_level": "low|moderate|high"
  },
  "health_implications": {
    "immediate_concerns": "Any immediate health concerns (or 'None' if normal)",
    "long_term_effects": "Potential long-term health effects if levels persist",
    "related_conditions": ["conditions this test helps diagnose or monitor"]
  },
  "recommendations": {
    "lifestyle_changes": ["specific lifestyle modifications to improve levels"],
    "dietary_suggestions": ["specific foods to eat more/less of"],
    "monitoring": "How often this should be retested",
    "follow_up": "When to see a healthcare provider"
  },
  "educational_notes": {
    "factors_affecting_results": ["factors that can influence test results"],
    "when_to_be_concerned": "Specific situations requiring immediate medical attention",
    "improvement_timeline": "Expected timeframe for improvement with changes"
  }
}

Important guidelines:
- Use patient-friendly language while being medically accurate
- Be specific and actionable in recommendations
- Include disclaimers about consulting healthcare providers
- Focus on empowering the patient with understanding
- If the result is normal, focus on maintenance and prevention`;

    // Call Azure OpenAI
    console.log('Calling Azure OpenAI with endpoint:', azureEndpoint);
    const response = await fetch(`${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-08-01-preview`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${azureApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: azureDeployment,
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant specializing in lab result interpretation. Provide accurate, patient-friendly explanations while always recommending consultation with healthcare providers for medical decisions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Azure OpenAI response received');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid Azure OpenAI response structure:', data);
      throw new Error('Invalid response from Azure OpenAI');
    }
    
    const interpretationText = data.choices[0].message.content;
    console.log('Raw AI response length:', interpretationText?.length);

    // Parse the JSON response, handling markdown code blocks
    let interpretation;
    try {
      // Remove markdown code blocks if present
      const cleanedText = interpretationText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      console.log('Cleaned text preview:', cleanedText.substring(0, 200));
      interpretation = JSON.parse(cleanedText);
      console.log('Successfully parsed AI interpretation');
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response preview:', interpretationText?.substring(0, 500));
      
      // Return a fallback response instead of throwing
      interpretation = {
        lab_result_id: labResult.id,
        test_overview: {
          what_it_measures: `${labResult.test_name} is a ${labResult.test_category} test`,
          normal_function: "This test measures important health parameters",
          aliases: []
        },
        result_interpretation: {
          status: labResult.is_out_of_range ? "abnormal" : "normal",
          meaning: `Your ${labResult.test_name} result is ${labResult.result_value} ${labResult.unit || ''}`,
          significance: "Please consult your healthcare provider for detailed interpretation",
          risk_level: "low"
        },
        health_implications: {
          immediate_concerns: "None identified",
          long_term_effects: "Consult your healthcare provider",
          related_conditions: []
        },
        recommendations: {
          lifestyle_changes: ["Maintain a healthy lifestyle"],
          dietary_suggestions: ["Follow a balanced diet"],
          monitoring: "Regular follow-up as recommended by your doctor",
          follow_up: "Discuss with your healthcare provider"
        },
        educational_notes: {
          factors_affecting_results: ["Various factors can affect test results"],
          when_to_be_concerned: "Contact your healthcare provider if you have concerns",
          improvement_timeline: "Varies by individual"
        },
        fallback: true
      };
    }

    // Add metadata
    interpretation.generated_at = new Date().toISOString();
    interpretation.confidence_score = 85; // Default confidence for Azure OpenAI
    interpretation.version = '1.0';

    // Cache the interpretation (expires in 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: insertError } = await supabase
      .from('ai_insights_cache')
      .insert({
        patient_id: patientId,
        insight_type: 'lab_result_interpretation',
        generated_data: interpretation,
        confidence_score: 85,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Error caching interpretation:', insertError);
      // Continue anyway, don't fail the request
    }

    console.log('Generated new lab result interpretation for:', labResult.test_name);

    return new Response(JSON.stringify(interpretation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in lab-result-interpreter function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      lab_result_id: null,
      fallback_message: 'Unable to generate interpretation at this time. Please consult your healthcare provider for detailed analysis of this result.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});