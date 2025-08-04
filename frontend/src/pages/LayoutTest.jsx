import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Layout Test Page
 * Simple page to test if layout, navigation, and basic components are working
 */
const LayoutTest = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Layout Test Page</h1>
        <p className="text-body text-muted-foreground mt-2">
          This page tests if the layout, navigation, and basic components are working correctly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>Modern Card</CardTitle>
            <CardDescription>Testing the modern card component</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body">This card should have a gradient background and hover effects.</p>
            <Button className="mt-4 btn-modern gradient-primary">Test Button</Button>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Hover Card</CardTitle>
            <CardDescription>Testing card hover animations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body">This card should lift on hover.</p>
            <Button variant="secondary" className="mt-4">Secondary Button</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regular Card</CardTitle>
            <CardDescription>Standard card component</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body">This is a regular card without special effects.</p>
            <Button variant="outline" className="mt-4">Outline Button</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-h2">Typography Test</h2>
        <div className="space-y-2">
          <p className="text-display">Display Text</p>
          <p className="text-h1">Heading 1</p>
          <p className="text-h2">Heading 2</p>
          <p className="text-h3">Heading 3</p>
          <p className="text-h4">Heading 4</p>
          <p className="text-body-lg">Large Body Text</p>
          <p className="text-body">Regular Body Text</p>
          <p className="text-body-sm">Small Body Text</p>
          <p className="text-caption">Caption Text</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-h2">Animation Test</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-blue-500 text-white card-hover cursor-pointer text-center">
            Card Hover
          </div>
          <div className="p-4 rounded-lg bg-green-500 text-white hover-lift cursor-pointer text-center">
            Hover Lift
          </div>
          <div className="p-4 rounded-lg bg-purple-500 text-white hover-scale cursor-pointer text-center">
            Hover Scale
          </div>
          <div className="p-4 rounded-lg bg-orange-500 text-white interactive cursor-pointer text-center">
            Interactive
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-h2">Layout Classes Test</h2>
        <div className="mobile-padding bg-gray-100 rounded-lg">
          <p className="text-body">This div uses the mobile-padding class.</p>
        </div>
      </div>
    </div>
  );
};

export default LayoutTest;