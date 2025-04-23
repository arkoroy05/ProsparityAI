'use client';

import React from 'react';
import { Card, CardHeader, CardContent, Box, Text } from '@/components/ui';

export function MetricCard({ title, value, description, trend, trendValue }) {
  return (
    <Card>
      <CardHeader pb={0}>
        <Text fontSize="sm" color="gray.500">{title}</Text>
      </CardHeader>
      <CardContent>
        <Box display="flex" alignItems="baseline">
          <Text fontSize="3xl" fontWeight="bold" mr={2}>{value}</Text>
          {trend && (
            <Text 
              fontSize="sm" 
              color={trend === 'up' ? 'green.500' : 'red.500'}
              fontWeight="medium"
            >
              {trend === 'up' ? '↑' : '↓'} {trendValue}
            </Text>
          )}
        </Box>
        <Text fontSize="sm" color="gray.600" mt={1}>{description}</Text>
      </CardContent>
    </Card>
  );
} 