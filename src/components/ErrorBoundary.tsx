import React, { Component, ErrorInfo, ReactNode, useContext } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { LanguageContext } from '@/contexts/LanguageContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Default translations for error boundary (used when LanguageProvider is not available)
const defaultTranslations: Record<string, { pt: string; en: string }> = {
  somethingWentWrong: {
    pt: 'Algo correu mal',
    en: 'Something went wrong',
  },
  unexpectedError: {
    pt: 'Ocorreu um erro inesperado. Por favor, tenta novamente.',
    en: 'An unexpected error occurred. Please try again.',
  },
  tryAgain: {
    pt: 'Tentar novamente',
    en: 'Try again',
  },
  goToHome: {
    pt: 'Ir para início',
    en: 'Go to home',
  },
};

const ErrorFallback = ({ error, onReset }: { error?: Error; onReset: () => void }) => {
  // Try to get language context, but don't throw if not available
  const languageContext = useContext(LanguageContext);
  
  // Detect browser language as fallback
  const browserLang = navigator.language.startsWith('pt') ? 'pt' : 'en';
  
  // Use translations from context if available, otherwise use defaults
  const getTranslation = (key: string): string => {
    if (languageContext) {
      try {
        return languageContext.t(`common.${key}`);
      } catch {
        // Fallback to default if translation fails
      }
    }
    const translation = defaultTranslations[key];
    if (translation) {
      return translation[browserLang] || translation.en;
    }
    return key;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-xl max-w-md w-full text-center space-y-4">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
        <h2 className="text-2xl font-bold">{getTranslation('somethingWentWrong')}</h2>
        <p className="text-muted-foreground">
          {getTranslation('unexpectedError')}
        </p>
        {error && (
          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={onReset}>{getTranslation('tryAgain')}</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            {getTranslation('goToHome')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
