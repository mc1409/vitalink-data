import React from 'react';
import { cn } from '@/lib/utils';

interface LabRangeIndicatorProps {
  value: number;
  minRange: number;
  maxRange: number;
  unit?: string;
  testName: string;
  className?: string;
}

const LabRangeIndicator: React.FC<LabRangeIndicatorProps> = ({
  value,
  minRange,
  maxRange,
  unit,
  testName,
  className
}) => {
  // Calculate position percentage (0-100)
  const range = maxRange - minRange;
  const valuePosition = Math.max(0, Math.min(100, ((value - minRange) / range) * 100));
  
  // Determine status and color
  const getStatus = () => {
    if (value < minRange) return 'low';
    if (value > maxRange) return 'high';
    return 'normal';
  };

  const status = getStatus();
  
  const getColorClasses = () => {
    switch (status) {
      case 'low':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'normal':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getIndicatorPosition = () => {
    if (status === 'low') return Math.min(valuePosition, 15); // Cap at 15% for visibility
    if (status === 'high') return Math.max(valuePosition, 85); // Cap at 85% for visibility
    return valuePosition;
  };

  return (
    <div className={cn('w-full space-y-3', className)}>
      {/* Value Display */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {testName}
        </span>
        <span className={cn(
          'text-lg font-bold px-2 py-1 rounded text-center min-w-[80px]',
          getColorClasses()
        )}>
          {value} {unit}
        </span>
      </div>

      {/* Range Indicator Bar */}
      <div className="relative">
        {/* Background bar with gradient zones */}
        <div className="h-6 w-full rounded-full bg-gradient-to-r from-destructive/20 via-success/40 to-destructive/20 border border-border">
          {/* Normal range highlight */}
          <div className="absolute inset-y-0 bg-success/30 rounded-full" 
               style={{ 
                 left: '20%', 
                 right: '20%' 
               }} 
          />
        </div>

        {/* Value indicator */}
        <div 
          className="absolute top-0 h-6 w-1 bg-foreground border border-background rounded shadow-sm transition-all duration-300"
          style={{ left: `${getIndicatorPosition()}%`, transform: 'translateX(-50%)' }}
        />

        {/* Range labels */}
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{minRange} {unit}</span>
          <span className="text-success font-medium">Normal Range</span>
          <span>{maxRange} {unit}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex justify-center">
        <span className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
          status === 'normal' ? 'bg-success/10 text-success border border-success/20' :
          'bg-destructive/10 text-destructive border border-destructive/20'
        )}>
          {status === 'normal' ? '✓ Within Normal Range' : 
           status === 'low' ? '↓ Below Normal Range' : 
           '↑ Above Normal Range'}
        </span>
      </div>
    </div>
  );
};

export default LabRangeIndicator;