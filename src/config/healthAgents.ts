import { 
  Activity, Heart, Moon, Zap, TrendingUp, Brain, 
  BarChart3, Shield, Pill, Apple, Clock, Waves,
  Target, Eye, Thermometer
} from "lucide-react";

export interface HealthAgentConfig {
  id: string;
  name: string;
  icon: any;
  status: 'active' | 'running' | 'pending' | 'inactive';
  lastRun: string;
  priority: 'high' | 'medium' | 'low';
  color: string;
  description: string;
  metrics: { accuracy: number; insights: number; recommendations: number };
  
  // Data configuration
  dataSources: string[];
  analysisType: string;
  promptTemplate: string;
  timeWindow: number; // days of data to fetch
  
  // UI configuration
  chartTypes: string[];
  keyMetrics: string[];
  insightCategories: string[];
  
  // Analysis settings
  refreshInterval: number; // minutes
  aiModel: 'azure-openai' | 'openai';
  analysisComplexity: 'basic' | 'advanced' | 'comprehensive';
}

export const healthAgents: HealthAgentConfig[] = [
  {
    id: 'sleep-coach',
    name: 'Sleep Coach',
    icon: Moon,
    status: 'active',
    lastRun: '2 hours ago',
    priority: 'high',
    color: '#00ff88',
    description: 'AI sleep analysis using biomarker patterns',
    metrics: { accuracy: 92, insights: 47, recommendations: 12 },
    dataSources: ['biomarker_sleep', 'biomarker_heart', 'biomarker_activity'],
    analysisType: 'sleep_intelligence',
    promptTemplate: 'sleep_comprehensive_v2',
    timeWindow: 7,
    chartTypes: ['sleep_efficiency', 'sleep_stages', 'hrv_trend'],
    keyMetrics: ['sleep_score', 'sleep_debt', 'efficiency', 'deep_sleep', 'rem_sleep', 'hrv'],
    insightCategories: ['sleep_quality', 'recovery', 'optimization', 'health_alerts'],
    refreshInterval: 60,
    aiModel: 'azure-openai',
    analysisComplexity: 'comprehensive'
  },
  {
    id: 'activity-coach',
    name: 'FitBot',
    icon: Activity,
    status: 'running',
    lastRun: 'Live',
    priority: 'medium',
    color: '#5352ed',
    description: 'Workout optimization and recovery tracking',
    metrics: { accuracy: 94, insights: 31, recommendations: 15 },
    dataSources: ['biomarker_activity', 'biomarker_heart'],
    analysisType: 'activity_analysis',
    promptTemplate: 'activity_insights_v2',
    timeWindow: 7,
    chartTypes: ['steps_trend', 'calories_bar', 'activity_distribution'],
    keyMetrics: ['steps_avg', 'active_calories', 'exercise_minutes', 'movement_consistency'],
    insightCategories: ['movement_patterns', 'calorie_efficiency', 'consistency', 'performance'],
    refreshInterval: 30,
    aiModel: 'azure-openai',
    analysisComplexity: 'advanced'
  },
  {
    id: 'heart-optimizer',
    name: 'CardioAI',
    icon: Heart,
    status: 'active',
    lastRun: '1 hour ago',
    priority: 'high',
    color: '#ff4757',
    description: 'Heart rate variability and cardiovascular optimization',
    metrics: { accuracy: 89, insights: 23, recommendations: 8 },
    dataSources: ['biomarker_heart', 'biomarker_activity', 'biomarker_sleep'],
    analysisType: 'cardiovascular_health',
    promptTemplate: 'cardiovascular_analysis_v2',
    timeWindow: 14,
    chartTypes: ['hrv_trend', 'resting_hr_trend', 'heart_rate_zones'],
    keyMetrics: ['resting_hr', 'hrv_score', 'max_hr', 'recovery_hr', 'cardio_fitness'],
    insightCategories: ['heart_health', 'hrv_patterns', 'recovery_status', 'cardiovascular_risk'],
    refreshInterval: 120,
    aiModel: 'azure-openai',
    analysisComplexity: 'comprehensive'
  },
  {
    id: 'stress-manager',
    name: 'ZenAI',
    icon: Zap,
    status: 'active',
    lastRun: '30 min ago',
    priority: 'medium',
    color: '#ffaa00',
    description: 'Stress detection and management strategies',
    metrics: { accuracy: 87, insights: 19, recommendations: 6 },
    dataSources: ['biomarker_heart', 'biomarker_sleep', 'biomarker_activity'],
    analysisType: 'stress_analysis',
    promptTemplate: 'stress_management_v2',
    timeWindow: 7,
    chartTypes: ['stress_timeline', 'hrv_stress', 'recovery_balance'],
    keyMetrics: ['stress_score', 'recovery_balance', 'hrv_variability', 'strain_coach'],
    insightCategories: ['stress_patterns', 'recovery_optimization', 'lifestyle_factors'],
    refreshInterval: 45,
    aiModel: 'azure-openai',
    analysisComplexity: 'advanced'
  },
  {
    id: 'nutrition-guide',
    name: 'NutriBot',
    icon: Apple,
    status: 'pending',
    lastRun: '6 hours ago',
    priority: 'low',
    color: '#2ed573',
    description: 'Nutrition analysis and meal optimization',
    metrics: { accuracy: 91, insights: 28, recommendations: 9 },
    dataSources: ['biomarker_nutrition', 'biomarker_activity', 'clinical_diagnostic_lab_tests'],
    analysisType: 'nutrition_optimization',
    promptTemplate: 'nutrition_analysis_v2',
    timeWindow: 14,
    chartTypes: ['calorie_balance', 'macro_distribution', 'nutrient_timing'],
    keyMetrics: ['calorie_balance', 'protein_intake', 'carb_timing', 'hydration'],
    insightCategories: ['nutrition_balance', 'meal_timing', 'deficiency_alerts'],
    refreshInterval: 180,
    aiModel: 'azure-openai',
    analysisComplexity: 'advanced'
  },
  {
    id: 'lab-analyzer',
    name: 'LabAI',
    icon: BarChart3,
    status: 'active',
    lastRun: '4 hours ago',
    priority: 'high',
    color: '#ff6b6b',
    description: 'Biomarker analysis and lab result interpretation',
    metrics: { accuracy: 96, insights: 42, recommendations: 11 },
    dataSources: ['clinical_diagnostic_lab_tests', 'biomarker_biological_genetic_microbiome'],
    analysisType: 'lab_analysis',
    promptTemplate: 'lab_interpretation_v2',
    timeWindow: 90,
    chartTypes: ['biomarker_trends', 'risk_assessment', 'lab_timeline'],
    keyMetrics: ['risk_score', 'trend_analysis', 'out_of_range', 'improvement_areas'],
    insightCategories: ['lab_insights', 'health_risks', 'optimization_targets'],
    refreshInterval: 1440, // daily
    aiModel: 'azure-openai',
    analysisComplexity: 'comprehensive'
  },
  {
    id: 'recovery-coach',
    name: 'RecovBot',
    icon: Shield,
    status: 'active',
    lastRun: '1 hour ago',
    priority: 'medium',
    color: '#70a1ff',
    description: 'Recovery optimization and injury prevention',
    metrics: { accuracy: 90, insights: 25, recommendations: 7 },
    dataSources: ['biomarker_sleep', 'biomarker_heart', 'biomarker_activity'],
    analysisType: 'recovery_optimization',
    promptTemplate: 'recovery_analysis_v2',
    timeWindow: 7,
    chartTypes: ['recovery_trend', 'strain_balance', 'readiness_score'],
    keyMetrics: ['recovery_score', 'strain_coach', 'readiness', 'fatigue_level'],
    insightCategories: ['recovery_status', 'training_readiness', 'injury_prevention'],
    refreshInterval: 60,
    aiModel: 'azure-openai',
    analysisComplexity: 'advanced'
  },
  {
    id: 'supplement-advisor',
    name: 'SupplAI',
    icon: Pill,
    status: 'inactive',
    lastRun: '2 days ago',
    priority: 'low',
    color: '#a4b0be',
    description: 'Supplement recommendations based on biomarkers',
    metrics: { accuracy: 85, insights: 16, recommendations: 4 },
    dataSources: ['clinical_diagnostic_lab_tests', 'biomarker_nutrition'],
    analysisType: 'supplement_optimization',
    promptTemplate: 'supplement_analysis_v2',
    timeWindow: 30,
    chartTypes: ['deficiency_analysis', 'supplement_timeline', 'effectiveness_tracking'],
    keyMetrics: ['deficiency_score', 'supplement_need', 'interaction_risk'],
    insightCategories: ['supplement_recommendations', 'deficiency_alerts', 'interaction_warnings'],
    refreshInterval: 2880, // twice daily
    aiModel: 'azure-openai',
    analysisComplexity: 'advanced'
  },
  {
    id: 'circadian-optimizer',
    name: 'ChronoAI',
    icon: Clock,
    status: 'active',
    lastRun: '3 hours ago',
    priority: 'medium',
    color: '#ffa502',
    description: 'Circadian rhythm optimization and light therapy',
    metrics: { accuracy: 88, insights: 22, recommendations: 8 },
    dataSources: ['biomarker_sleep', 'biomarker_heart', 'biomarker_activity'],
    analysisType: 'circadian_optimization',
    promptTemplate: 'circadian_analysis_v2',
    timeWindow: 14,
    chartTypes: ['circadian_rhythm', 'light_exposure', 'sleep_timing'],
    keyMetrics: ['circadian_alignment', 'chronotype_match', 'light_timing'],
    insightCategories: ['circadian_health', 'light_optimization', 'timing_strategies'],
    refreshInterval: 180,
    aiModel: 'azure-openai',
    analysisComplexity: 'advanced'
  },
  {
    id: 'hrv-analyzer',
    name: 'HRVBot',
    icon: Waves,
    status: 'running',
    lastRun: 'Live',
    priority: 'high',
    color: '#ff6348',
    description: 'Heart rate variability pattern analysis',
    metrics: { accuracy: 93, insights: 35, recommendations: 10 },
    dataSources: ['biomarker_heart', 'biomarker_sleep', 'biomarker_activity'],
    analysisType: 'hrv_analysis',
    promptTemplate: 'hrv_deep_analysis_v2',
    timeWindow: 14,
    chartTypes: ['hrv_trend', 'autonomic_balance', 'stress_recovery'],
    keyMetrics: ['hrv_score', 'autonomic_balance', 'stress_resistance', 'recovery_capacity'],
    insightCategories: ['hrv_patterns', 'autonomic_health', 'stress_resilience'],
    refreshInterval: 30,
    aiModel: 'azure-openai',
    analysisComplexity: 'comprehensive'
  },
  {
    id: 'performance-tracker',
    name: 'PerfAI',
    icon: Target,
    status: 'active',
    lastRun: '45 min ago',
    priority: 'medium',
    color: '#3742fa',
    description: 'Performance optimization and goal tracking',
    metrics: { accuracy: 91, insights: 29, recommendations: 13 },
    dataSources: ['biomarker_activity', 'biomarker_heart', 'biomarker_sleep'],
    analysisType: 'performance_optimization',
    promptTemplate: 'performance_analysis_v2',
    timeWindow: 21,
    chartTypes: ['performance_trends', 'training_load', 'peak_performance'],
    keyMetrics: ['performance_score', 'training_load', 'peak_readiness', 'goal_progress'],
    insightCategories: ['performance_insights', 'training_optimization', 'goal_tracking'],
    refreshInterval: 60,
    aiModel: 'azure-openai',
    analysisComplexity: 'comprehensive'
  },
  {
    id: 'vision-health',
    name: 'EyeAI',
    icon: Eye,
    status: 'pending',
    lastRun: '1 day ago',
    priority: 'low',
    color: '#2f3542',
    description: 'Eye health and screen time optimization',
    metrics: { accuracy: 82, insights: 14, recommendations: 5 },
    dataSources: ['biomarker_activity', 'biomarker_sleep'],
    analysisType: 'vision_health',
    promptTemplate: 'vision_analysis_v2',
    timeWindow: 7,
    chartTypes: ['screen_time_analysis', 'eye_strain_patterns', 'blue_light_exposure'],
    keyMetrics: ['screen_time', 'eye_strain_score', 'blue_light_exposure'],
    insightCategories: ['eye_health', 'screen_optimization', 'vision_protection'],
    refreshInterval: 720, // twice daily
    aiModel: 'azure-openai',
    analysisComplexity: 'basic'
  }
];

export const getAgentById = (id: string): HealthAgentConfig | undefined => {
  return healthAgents.find(agent => agent.id === id);
};

export const getActiveAgents = (): HealthAgentConfig[] => {
  return healthAgents.filter(agent => agent.status === 'active' || agent.status === 'running');
};

export const getAgentsByDataSource = (dataSource: string): HealthAgentConfig[] => {
  return healthAgents.filter(agent => agent.dataSources.includes(dataSource));
};