'use client';

import { AlertTriangle, Clock, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface GapWarning {
  afterServiceIndex: number;
  gapMinutes: number;
  suggestion: string;
}

interface GapWarningBannerProps {
  warnings: GapWarning[];
  onApplySuggestion?: (warning: GapWarning) => void;
  onDismiss?: () => void;
}

/**
 * Banner component to display gap warnings between services
 * Shows warnings when there are gaps in service scheduling
 */
export function GapWarningBanner({
  warnings,
  onApplySuggestion,
  onDismiss,
}: GapWarningBannerProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Alert variant="default" className="border-yellow-300 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Scheduling Gaps Detected</AlertTitle>
      <AlertDescription className="text-yellow-700">
        <div className="space-y-2 mt-2">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 p-2 bg-yellow-100/50 rounded"
            >
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm">
                    {warning.gapMinutes > 0
                      ? `${warning.gapMinutes} minute gap after service ${warning.afterServiceIndex + 1}`
                      : warning.suggestion}
                  </p>
                  {warning.gapMinutes > 0 && warning.suggestion && (
                    <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                      <Lightbulb className="h-3 w-3" />
                      {warning.suggestion}
                    </p>
                  )}
                </div>
              </div>
              {onApplySuggestion && warning.gapMinutes > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 border-yellow-400 hover:bg-yellow-100"
                  onClick={() => onApplySuggestion(warning)}
                >
                  Apply Fix
                </Button>
              )}
            </div>
          ))}
        </div>
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default GapWarningBanner;
