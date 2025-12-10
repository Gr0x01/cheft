import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'chef' | 'stats' | 'brutal' | 'industrial' | 'elevated' | 'outline';
  skew?: number; // 1, 2, 3, 4 for different angular variations
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  as?: 'div' | 'article' | 'section';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', skew, padding = 'md', as: Component = 'div', children, ...props }, ref) => {
    const baseClasses = `
      relative overflow-hidden
      transition-all duration-300 ease-out
      group bg-absolute-black border-4 border-steel-light
    `;
    
    const getVariantStyles = () => {
      switch (variant) {
        case 'chef':
          return 'hover:border-safety-orange hover:shadow-orange hover:scale-105';
        case 'stats':
          return 'bg-steel-dark border-2 border-concrete-medium hover:border-safety-orange hover:scale-105';
        case 'industrial':
          return 'border-4 border-steel-light shadow-concrete';
        case 'brutal':
          return 'bg-steel-dark border-l-4 border-safety-orange';
        case 'elevated':
          return 'shadow-lg hover:shadow-xl hover:border-safety-orange hover:scale-105';
        case 'outline':
          return 'bg-transparent border-2 border-concrete-medium hover:border-safety-orange';
        default:
          return 'hover:border-safety-orange hover:shadow-orange';
      }
    };
    
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-12'
    };
    
    const getSkewTransform = () => {
      if (!skew) return {};
      const skewMap = {
        1: 'skew(-2deg) rotate(-1deg)',
        2: 'skew(3deg) rotate(1deg)',
        3: 'skew(-1deg) rotate(-2deg)',
        4: 'skew(2deg) rotate(1deg)'
      };
      return { transform: skewMap[skew as keyof typeof skewMap] };
    };
    
    const skewStyle = getSkewTransform();
    
    return (
      <Component
        className={cn(
          baseClasses,
          getVariantStyles(),
          paddingClasses[padding],
          skew ? `skew-brutal-${skew}` : '',
          className
        )}
        style={skewStyle}
        ref={ref}
        {...props}
      >
        <div className="relative z-20">
          {children}
        </div>
        
        {/* Industrial accent line */}
        {variant === 'chef' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-safety-orange to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        
        {/* Crack animation trigger */}
        <div className="absolute inset-0 group-hover:animate-concrete-crack pointer-events-none" />
      </Component>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  status?: string;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, status, children, ...props }, ref) => {
    return (
      <div className="relative">
        <div
          className={cn('gradient-concrete h-48 relative overflow-hidden', className)}
          ref={ref}
          {...props}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-transparent" />
          {status && (
            <div className="absolute top-4 right-4 bg-safety-orange text-absolute-black px-2 py-1 text-tiny-brutal transform skew-x-[-3deg]">
              {status}
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  name?: string;
  shows?: string;
  metrics?: string[];
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, name, shows, metrics, children, ...props }, ref) => {
    return (
      <div
        className={cn('p-6', className)}
        ref={ref}
        {...props}
      >
        {name && (
          <h3 className="text-heading-brutal text-pure-white text-2xl mb-2">{name}</h3>
        )}
        {shows && (
          <div className="text-small-brutal text-safety-orange mb-4 leading-relaxed">{shows}</div>
        )}
        {metrics && (
          <div className="flex gap-4 mb-4">
            {metrics.map((metric, index) => (
              <span key={index} className="text-tiny-brutal text-concrete-light">
                {metric}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, actionText = 'TRACK CHEF', onAction, children, ...props }, ref) => {
    return (
      <div
        className={cn('px-6 pb-6', className)}
        ref={ref}
        {...props}
      >
        {onAction ? (
          <button 
            onClick={onAction}
            className="w-full btn-brutal btn-brutal-secondary p-3 text-small-brutal">
            {actionText}
          </button>
        ) : children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps };