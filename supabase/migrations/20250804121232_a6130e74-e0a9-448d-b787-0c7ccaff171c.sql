-- Create AI Sleep Insights table for storing agent analysis results
CREATE TABLE public.ai_sleep_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  analysis_date DATE NOT NULL,
  analysis_period TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly
  sleep_quality_score INTEGER CHECK (sleep_quality_score >= 0 AND sleep_quality_score <= 100),
  sleep_debt_hours NUMERIC,
  optimal_bedtime TIME,
  optimal_wake_time TIME,
  predicted_sleep_duration INTEGER, -- minutes
  sleep_pattern_trend TEXT CHECK (sleep_pattern_trend IN ('improving', 'declining', 'stable', 'inconsistent')),
  key_factors JSONB, -- factors affecting sleep (stress, exercise, caffeine, etc.)
  recommendations JSONB, -- personalized advice array
  confidence_level NUMERIC CHECK (confidence_level >= 0 AND confidence_level <= 1),
  agent_version TEXT DEFAULT 'v1.0',
  processing_time_ms INTEGER,
  data_sources_used JSONB, -- which tables/data were used for analysis
  next_analysis_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_sleep_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view sleep insights for their patients" 
ON public.ai_sleep_insights 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = ai_sleep_insights.patient_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create sleep insights for their patients" 
ON public.ai_sleep_insights 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = ai_sleep_insights.patient_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update sleep insights for their patients" 
ON public.ai_sleep_insights 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = ai_sleep_insights.patient_id 
  AND p.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_ai_sleep_insights_patient_date ON public.ai_sleep_insights(patient_id, analysis_date DESC);
CREATE INDEX idx_ai_sleep_insights_analysis_period ON public.ai_sleep_insights(analysis_period);
CREATE INDEX idx_ai_sleep_insights_next_analysis ON public.ai_sleep_insights(next_analysis_date) WHERE next_analysis_date IS NOT NULL;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_sleep_insights_updated_at
BEFORE UPDATE ON public.ai_sleep_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();