'use client';

import React from 'react';
import { Card, CardHeader, CardBody, Text, Box } from '@/components/ui';

export function MetricCard({ title, value, description, trend, trendValue }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-0">
        <Text className="text-sm text-gray-500">{title}</Text>
      </CardHeader>
      <CardBody>
        <Box className="flex items-baseline">
          <Text className="text-3xl font-bold mr-2">{value}</Text>
          {trend && (
            <Text 
              className={`text-sm font-medium ${
                trend === 'up' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </Text>
          )}
        </Box>
        <Text className="text-sm text-gray-600 mt-1">{description}</Text>
      </CardBody>
    </Card>
  );
} 