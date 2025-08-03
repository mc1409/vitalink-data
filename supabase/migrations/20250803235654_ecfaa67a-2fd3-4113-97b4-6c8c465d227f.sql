-- Create table for caching AI insights to avoid repeated API calls
CREATE TABLE public.ai_insights_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- 'critical-analysis', 'daily-briefing', 'health-score'
  generated_data JSONB NOT NULL,
  confidence_score INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing generated health reports
CREATE TABLE public.health_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  report_type TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'annual'
  title TEXT NOT NULL,
  report_data JSONB NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  page_count INTEGER,
  shared_with TEXT[], -- Array of email addresses
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user feedback on AI recommendations
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  insight_id UUID,
  feedback_type TEXT NOT NULL, -- 'helpful', 'not_helpful', 'inaccurate'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_insights_cache
CREATE POLICY "Users can view insights for their patients" 
ON public.ai_insights_cache 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = ai_insights_cache.patient_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Users can create insights for their patients" 
ON public.ai_insights_cache 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = ai_insights_cache.patient_id 
  AND p.user_id = auth.uid()
));

-- Create RLS policies for health_reports
CREATE POLICY "Users can manage reports for their patients" 
ON public.health_reports 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = health_reports.patient_id 
  AND p.user_id = auth.uid()
));

-- Create RLS policies for user_feedback
CREATE POLICY "Users can manage their own feedback" 
ON public.user_feedback 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = user_feedback.patient_id 
  AND p.user_id = auth.uid()
));

-- Add indexes for performance
CREATE INDEX idx_ai_insights_cache_patient_id ON public.ai_insights_cache(patient_id);
CREATE INDEX idx_ai_insights_cache_type ON public.ai_insights_cache(insight_type);
CREATE INDEX idx_ai_insights_cache_expires ON public.ai_insights_cache(expires_at);
CREATE INDEX idx_health_reports_patient_id ON public.health_reports(patient_id);
CREATE INDEX idx_health_reports_type ON public.health_reports(report_type);
CREATE INDEX idx_user_feedback_patient_id ON public.user_feedback(patient_id);

-- Add trigger for updated_at timestamps
CREATE TRIGGER update_ai_insights_cache_updated_at
  BEFORE UPDATE ON public.ai_insights_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_reports_updated_at
  BEFORE UPDATE ON public.health_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();