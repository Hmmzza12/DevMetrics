import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorCardProps {
  message?: string;
  onRetry: () => void;
}

/** Inline, section-scoped error state — never take down the rest of the dashboard. */
export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-red-400" />
      <p className="text-sm text-muted">
        {message ?? "Couldn't load this section."}
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </Card>
  );
}
