import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: 'section' | 'div' | 'article' | 'aside';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  container?: boolean;
  background?: 'none' | 'gray' | 'white';
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ 
    className, 
    as: Component = 'section', 
    spacing = 'lg', 
    container = true,
    background = 'none',
    children, 
    ...props 
  }, ref) => {
    const spacingClasses = {
      none: '',
      sm: 'py-8',
      md: 'py-12',
      lg: 'py-16',
      xl: 'py-24'
    };

    const backgroundClasses = {
      none: '',
      gray: 'bg-gray-50',
      white: 'bg-white'
    };
    
    return (
      <Component
        className={cn(
          spacingClasses[spacing],
          backgroundClasses[background],
          className
        )}
        ref={ref as React.Ref<HTMLElement>}
        {...props}
      >
        {container ? (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {children}
          </div>
        ) : (
          children
        )}
      </Component>
    );
  }
);

Section.displayName = 'Section';

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  centered?: boolean;
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, centered = false, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'mb-8',
          centered && 'text-center',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SectionHeader.displayName = 'SectionHeader';

interface SectionTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const SectionTitle = React.forwardRef<HTMLHeadingElement, SectionTitleProps>(
  ({ className, level = 2, children, ...props }, ref) => {
    const Component = `h${level}` as keyof JSX.IntrinsicElements;
    
    const levelClasses = {
      1: 'text-display',
      2: 'text-heading',
      3: 'text-subheading',
      4: 'text-lg font-semibold',
      5: 'text-base font-semibold',
      6: 'text-sm font-semibold'
    };
    
    return (
      <Component
        className={cn(levelClasses[level], className)}
        ref={ref as React.Ref<HTMLHeadingElement>}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

SectionTitle.displayName = 'SectionTitle';

interface SectionDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const SectionDescription = React.forwardRef<HTMLParagraphElement, SectionDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        className={cn('text-body mt-2', className)}
        style={{color: 'rgba(248, 248, 242, 0.8)'}}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

SectionDescription.displayName = 'SectionDescription';

export { Section, SectionHeader, SectionTitle, SectionDescription };
export type { SectionProps, SectionHeaderProps, SectionTitleProps, SectionDescriptionProps };