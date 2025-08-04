import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

/**
 * Comprehensive Style Guide Component
 * Documents all design tokens, components, and usage patterns
 */
const StyleGuide = () => {
  const [copiedToken, setCopiedToken] = useState(null);

  const copyToClipboard = (text, tokenName) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(tokenName);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Design tokens data
  const colorTokens = {
    primary: {
      'primary-blue-50': '#eff6ff',
      'primary-blue-500': '#3b82f6',
      'primary-blue-600': '#2563eb',
      'primary-blue-900': '#1e3a8a'
    },
    secondary: {
      'primary-green-50': '#ecfdf5',
      'primary-green-500': '#10b981',
      'primary-green-600': '#059669',
      'primary-green-900': '#064e3b'
    },
    accent: {
      'accent-orange-500': '#f59e0b',
      'accent-teal-500': '#14b8a6',
      'accent-pink-500': '#ec4899'
    },
    semantic: {
      'success-500': '#22c55e',
      'warning-500': '#f59e0b',
      'error-500': '#ef4444',
      'info-500': '#3b82f6'
    }
  };

  const typographyTokens = {
    display: { size: '36px/48px', weight: '700', usage: 'Hero sections' },
    h1: { size: '30px/36px', weight: '600', usage: 'Page titles' },
    h2: { size: '24px/30px', weight: '600', usage: 'Section headers' },
    h3: { size: '20px/24px', weight: '600', usage: 'Card titles' },
    h4: { size: '18px/20px', weight: '600', usage: 'Subsections' },
    'body-lg': { size: '16px/18px', weight: '400', usage: 'Important content' },
    body: { size: '14px/16px', weight: '400', usage: 'Regular content' },
    'body-sm': { size: '12px/14px', weight: '400', usage: 'Secondary content' },
    caption: { size: '12px', weight: '500', usage: 'Labels, metadata' }
  };

  const spacingTokens = {
    'space-1': '4px',
    'space-2': '8px',
    'space-3': '12px',
    'space-4': '16px',
    'space-5': '20px',
    'space-6': '24px',
    'space-8': '32px',
    'space-10': '40px',
    'space-12': '48px',
    'space-16': '64px'
  };

  const animationTokens = {
    'duration-75': '75ms',
    'duration-150': '150ms',
    'duration-300': '300ms',
    'duration-500': '500ms',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    'ease-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  };

  const ColorSwatch = ({ name, value, category }) => (
    <div 
      className="group cursor-pointer"
      onClick={() => copyToClipboard(`hsl(var(--${name}))`, name)}
    >
      <div 
        className="w-16 h-16 rounded-lg border border-gray-200 mb-2 transition-transform group-hover:scale-105"
        style={{ backgroundColor: value }}
      />
      <div className="text-xs">
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-gray-500">{value}</p>
        {copiedToken === name && (
          <p className="text-green-600 font-medium">Copied!</p>
        )}
      </div>
    </div>
  );

  const TokenRow = ({ name, value, description }) => (
    <div 
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer group"
      onClick={() => copyToClipboard(`var(--${name})`, name)}
    >
      <div className="flex-1">
        <code className="text-sm  text-blue-600">--{name}</code>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700">{value}</span>
        {copiedToken === name ? (
          <Badge variant="default" className="text-xs">Copied!</Badge>
        ) : (
          <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Copy
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-display">Design System Style Guide</h1>
        <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive documentation of design tokens, components, and usage patterns for the modern UI design system.
        </p>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="animations">Animations</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Color System</CardTitle>
              <CardDescription>
                Our color palette is designed for modern fintech applications, providing trust, clarity, and visual hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {Object.entries(colorTokens).map(([category, colors]) => (
                <div key={category}>
                  <h3 className="text-h4 mb-4 capitalize">{category} Colors</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {Object.entries(colors).map(([name, value]) => (
                      <ColorSwatch key={name} name={name} value={value} category={category} />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Usage Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-h4 mb-3">Primary Colors</h4>
                  <ul className="space-y-2 text-body">
                    <li><strong>Blue:</strong> Trust, stability, primary actions</li>
                    <li><strong>Green:</strong> Growth, success, positive values</li>
                    <li><strong>Purple:</strong> Premium features, innovation</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-h4 mb-3">Semantic Colors</h4>
                  <ul className="space-y-2 text-body">
                    <li><strong>Success:</strong> Profits, achievements, confirmations</li>
                    <li><strong>Warning:</strong> Caution, alerts, pending states</li>
                    <li><strong>Error:</strong> Losses, errors, destructive actions</li>
                    <li><strong>Info:</strong> Information, neutral notifications</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Typography Scale</CardTitle>
              <CardDescription>
                Responsive typography system with Apple-inspired font stacks and consistent vertical rhythm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(typographyTokens).map(([name, token]) => (
                <div key={name} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm  text-blue-600">.text-{name}</code>
                    <Badge variant="outline">{token.usage}</Badge>
                  </div>
                  <div className={`text-${name} mb-2`}>
                    The quick brown fox jumps over the lazy dog
                  </div>
                  <div className="text-xs text-gray-500">
                    Size: {token.size} • Weight: {token.weight}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Font Stacks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-h4 mb-2">Display & Headings</h4>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
                  </code>
                </div>
                <div>
                  <h4 className="text-h4 mb-2">Body Text</h4>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
                  </code>
                </div>
                <div>
                  <h4 className="text-h4 mb-2">Monospace (Financial Data)</h4>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    "SF Mono", "JetBrains Mono", "Fira Code", monospace
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spacing System</CardTitle>
              <CardDescription>
                Consistent spacing scale based on 4px increments for visual harmony and rhythm.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(spacingTokens).map(([name, value]) => (
                  <TokenRow key={name} name={name} value={value} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spacing Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-h4 mb-4">Padding Examples</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['space-2', 'space-4', 'space-6', 'space-8'].map(space => (
                    <div key={space} className="text-center">
                      <div 
                        className="bg-blue-100 border-2 border-blue-300 rounded mb-2 flex items-center justify-center text-xs "
                        style={{ padding: `var(--${space})` }}
                      >
                        {space}
                      </div>
                      <code className="text-xs">{spacingTokens[space]}</code>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Animations Tab */}
        <TabsContent value="animations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Animation System</CardTitle>
              <CardDescription>
                Smooth, performant animations with consistent timing and easing functions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(animationTokens).map(([name, value]) => (
                  <TokenRow key={name} name={name} value={value} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Animation Classes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-blue-500 text-white card-hover cursor-pointer text-center">
                  .card-hover
                </div>
                <div className="p-4 rounded-lg bg-green-500 text-white hover-lift cursor-pointer text-center">
                  .hover-lift
                </div>
                <div className="p-4 rounded-lg bg-purple-500 text-white hover-scale cursor-pointer text-center">
                  .hover-scale
                </div>
                <div className="p-4 rounded-lg bg-orange-500 text-white interactive cursor-pointer text-center">
                  .interactive
                </div>
                <div className="p-4 rounded-lg bg-teal-500 text-white mobile-touch cursor-pointer text-center">
                  .mobile-touch
                </div>
                <div className="p-4 rounded-lg bg-pink-500 text-white ripple cursor-pointer text-center">
                  .ripple
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-h4 mb-4">Button Variants</h4>
                <div className="flex flex-wrap gap-4">
                  <Button className="btn-modern gradient-primary">Primary</Button>
                  <Button variant="secondary" className="btn-modern">Secondary</Button>
                  <Button variant="outline" className="ghost-fill">Ghost</Button>
                  <Button variant="destructive" className="btn-animate">Destructive</Button>
                  <Button size="sm" className="btn-animate gradient-success">Small</Button>
                  <Button size="lg" className="btn-animate gradient-purple">Large</Button>
                </div>
              </div>

              <div>
                <h4 className="text-h4 mb-4">Button States</h4>
                <div className="flex flex-wrap gap-4">
                  <Button>Normal</Button>
                  <Button className="hover:shadow-primary">Hover</Button>
                  <Button disabled>Disabled</Button>
                  <Button className="focus:ring-2 focus:ring-primary">Focused</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-4">
                <div>
                  <Label htmlFor="example-input">Enhanced Input</Label>
                  <Input 
                    id="example-input"
                    placeholder="Type something..." 
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="example-select">Select Dropdown</Label>
                  <select 
                    id="example-select"
                    className="w-full mt-2 px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  >
                    <option>Choose an option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="modern-card card-hover">
                  <CardHeader>
                    <CardTitle>Modern Card</CardTitle>
                    <CardDescription>Enhanced with gradients and shadows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-body">This card uses the modern-card class with hover effects.</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card-subtle hover-lift">
                  <CardHeader>
                    <CardTitle>Gradient Card</CardTitle>
                    <CardDescription>Subtle gradient background</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-body">This card has a subtle gradient and lift animation.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns</CardTitle>
              <CardDescription>
                Common patterns and best practices for implementing the design system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-h4 mb-4">Component Composition</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`// Good: Using design system classes
<div className="modern-card p-6 space-y-4">
  <h3 className="text-h3 text-primary-blue">Portfolio Summary</h3>
  <p className="text-body text-muted-foreground">Your investment overview</p>
  <button className="btn-primary btn-modern">
    View Details
  </button>
</div>`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="text-h4 mb-4">Responsive Design</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`// Responsive typography
<h1 className="text-responsive-base">Responsive Heading</h1>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>`}
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="text-h4 mb-4">Animation Best Practices</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`// GPU-accelerated animations
<div className="card-hover gpu-accelerated">
  {/* Content */}
</div>

// Respect reduced motion preferences
<div className="transition-normal">
  {/* Automatically respects prefers-reduced-motion */}
</div>`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accessibility Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-h4 mb-2">Color Contrast</h4>
                  <p className="text-body">All color combinations meet WCAG AA standards (4.5:1 contrast ratio).</p>
                </div>
                <div>
                  <h4 className="text-h4 mb-2">Touch Targets</h4>
                  <p className="text-body">Interactive elements have minimum 44px touch targets on mobile.</p>
                </div>
                <div>
                  <h4 className="text-h4 mb-2">Focus Management</h4>
                  <p className="text-body">All interactive elements have visible focus indicators.</p>
                </div>
                <div>
                  <h4 className="text-h4 mb-2">Reduced Motion</h4>
                  <p className="text-body">Animations respect user's motion preferences automatically.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
          <CardDescription>
            Essential classes and tokens for rapid development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="text-h4 mb-3">Common Classes</h4>
              <ul className="space-y-1 text-sm ">
                <li>.modern-card</li>
                <li>.btn-modern</li>
                <li>.card-hover</li>
                <li>.interactive</li>
                <li>.gradient-primary</li>
                <li>.text-financial</li>
              </ul>
            </div>
            <div>
              <h4 className="text-h4 mb-3">Animation Classes</h4>
              <ul className="space-y-1 text-sm ">
                <li>.transition-fast</li>
                <li>.hover-lift</li>
                <li>.mobile-touch</li>
                <li>.fade-in-up</li>
                <li>.scale-in</li>
                <li>.ripple</li>
              </ul>
            </div>
            <div>
              <h4 className="text-h4 mb-3">Utility Classes</h4>
              <ul className="space-y-1 text-sm ">
                <li>.touch-target</li>
                <li>.gpu-accelerated</li>
                <li>.shadow-primary</li>
                <li>.text-balance</li>
                <li>.sr-only</li>
                <li>.keyboard-navigation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StyleGuide;