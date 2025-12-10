'use client';

import React from 'react';
import { Button, Section, Card } from '@/components/ui';
import type { QuickAction } from '@/lib/types';

interface QuickActionsProps {
  onLocationSearch?: () => void;
  onCitiesClick?: () => void;
  onShowsClick?: () => void;
  actions?: QuickAction[];
}

export function QuickActions({ 
  onLocationSearch, 
  onCitiesClick, 
  onShowsClick,
  actions 
}: QuickActionsProps) {
  const defaultActions = [
    {
      id: 'near-me',
      title: 'Near Me',
      description: 'Find TV chef restaurants in your area',
      icon: '📍',
      href: '#',
      action: 'location' as const
    },
    {
      id: 'browse-cities',
      title: 'Browse Cities',
      description: 'Explore popular food destinations',
      icon: '🏙️',
      href: '#',
      action: 'link' as const
    },
    {
      id: 'browse-shows',
      title: 'Browse Shows',
      description: 'Discover restaurants by TV show',
      icon: '📺',
      href: '#',
      action: 'link' as const
    }
  ];

  const quickActions = actions || defaultActions;

  const handleActionClick = (action: QuickAction) => {
    switch (action.id) {
      case 'near-me':
        onLocationSearch?.();
        break;
      case 'browse-cities':
        onCitiesClick?.();
        break;
      case 'browse-shows':
        onShowsClick?.();
        break;
      default:
        // Handle custom actions with href
        if (action.href !== '#') {
          window.location.href = action.href;
        }
    }
  };

  return (
    <Section spacing="md" background="gray">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {quickActions.map((action) => (
          <Card
            key={action.id}
            variant="elevated"
            padding="lg"
            className="text-center hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            onClick={() => handleActionClick(action)}
          >
            <div className="text-3xl mb-3">{action.icon}</div>
            <h3 className="text-subheading text-gray-900 mb-2">
              {action.title}
            </h3>
            <p className="text-small text-gray-600 mb-4">
              {action.description}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
            >
              {action.title}
            </Button>
          </Card>
        ))}
      </div>
    </Section>
  );
}