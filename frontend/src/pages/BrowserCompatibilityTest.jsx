import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BrowserDetection, 
  CSSFeatureDetection, 
  JSFeatureDetection, 
  PerformanceTesting,
  ResponsiveDesignTesting,
  generateCompatibilityReport,
  testCrosseBrowserAnimations
} from '@/lib/browserCompatibility';
import { SummaryCard } from '@/components/common/SummaryCard';
import { FinancialDataCard } from '@/components/common/FinancialDataCard';

/**
 * Browser Compatibility Testing Page
 * Tests all modern UI components across different browsers and devices
 */
const BrowserCompatibilityTest = () => {
  const [compatibilityReport, setCompatibilityReport] = useState(null);
  const [animationResults, setAnimationResults] = useState(null);
  const [fpsTest, setFpsTest] = useState(null);
  const [isTestingAnimations, setIsTestingAnimations] = useState(false);
  const [isTestingFPS, setIsTestingFPS] = useState(false);

  useEffect(() => {
    // Generate initial compatibility report
    const report = generateCompatibilityReport();
    setCompatibilityReport(report);
  }, []);

  const runAnimationTests = async () => {
    setIsTestingAnimations(true);
    try {
      const results = await testCrosseBrowserAnimations();
      setAnimationResults(results);
    } catch (error) {
      console.error('Animation test failed:', error);
    } finally {
      setIsTestingAnimations(false);
    }
  };

  const runFPSTest = async () => {
    setIsTestingFPS(true);
    try {
      const fps = await PerformanceTesting.measureFPS(2000);
      setFpsTest(fps);
    } catch (error) {
      console.error('FPS test failed:', error);
    } finally {
      setIsTestingFPS(false);
    }
  };

  const getFeatureStatus = (supported) => (
    <Badge variant={supported ? "default" : "destructive"}>
      {supported ? "✓ Supported" : "✗ Not Supported"}
    </Badge>
  );

  const getPerformanceColor = (fps) => {
    if (fps >= 55) return "text-success";
    if (fps >= 30) return "text-warning";
    return "text-error";
  };

  if (!compatibilityReport) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading compatibility report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-display">Browser Compatibility Test</h1>
        <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive testing of modern UI components across different browsers and devices.
          This page validates design consistency, animation performance, and feature support.
        </p>
      </div>

      {/* Browser Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🌐 Browser Information
          </CardTitle>
          <CardDescription>
            Current browser and device information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-label">Browser</p>
              <p className="text-h4">{compatibilityReport.browser.name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-label">Version</p>
              <p className="text-h4">{compatibilityReport.browser.version}</p>
            </div>
            <div className="space-y-2">
              <p className="text-label">Device Type</p>
              <p className="text-h4">{compatibilityReport.browser.isMobile ? 'Mobile' : 'Desktop'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-label">Platform</p>
              <p className="text-h4">
                {compatibilityReport.browser.isIOS ? 'iOS' : 
                 compatibilityReport.browser.isAndroid ? 'Android' : 'Desktop'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features">Feature Support</TabsTrigger>
          <TabsTrigger value="components">UI Components</TabsTrigger>
          <TabsTrigger value="animations">Animations</TabsTrigger>
          <TabsTrigger value="responsive">Responsive</TabsTrigger>
        </TabsList>

        {/* Feature Support Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSS Features */}
            <Card>
              <CardHeader>
                <CardTitle>🎨 CSS Features</CardTitle>
                <CardDescription>Modern CSS feature support</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(compatibilityReport.cssFeatures).map(([feature, supported]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <span className="text-body capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    {getFeatureStatus(supported)}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* JavaScript Features */}
            <Card>
              <CardHeader>
                <CardTitle>⚡ JavaScript Features</CardTitle>
                <CardDescription>Modern JavaScript API support</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(compatibilityReport.jsFeatures).map(([feature, supported]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <span className="text-body capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    {getFeatureStatus(supported)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* UI Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-h3 mb-4">Modern Card Components</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SummaryCard
                  title="Total Portfolio"
                  value="₹2,45,678"
                  change="+12.5%"
                  trend="up"
                  icon="TrendingUp"
                />
                <SummaryCard
                  title="Monthly SIP"
                  value="₹15,000"
                  change="+5.2%"
                  trend="up"
                  icon="Calendar"
                />
                <SummaryCard
                  title="Fixed Deposits"
                  value="₹1,25,000"
                  change="-2.1%"
                  trend="down"
                  icon="PiggyBank"
                />
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Financial Data Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FinancialDataCard
                  title="Mutual Funds"
                  amount="₹1,85,432"
                  change="+8.7%"
                  trend="positive"
                  description="Total investment across 5 funds"
                />
                <FinancialDataCard
                  title="Stocks Portfolio"
                  amount="₹95,246"
                  change="-3.2%"
                  trend="negative"
                  description="15 stocks in portfolio"
                />
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Interactive Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button className="btn-modern gradient-primary">Primary Button</Button>
                <Button variant="secondary" className="btn-modern">Secondary Button</Button>
                <Button variant="outline" className="ghost-fill">Ghost Button</Button>
                <Button size="sm" className="btn-animate gradient-success">Success Button</Button>
                <Button size="lg" className="btn-animate gradient-purple">Purple Button</Button>
              </div>
            </div>

            <div>
              <h3 className="text-h3 mb-4">Form Components</h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="text-label block mb-2">Enhanced Input</label>
                  <input 
                    type="text" 
                    placeholder="Type something..." 
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="text-label block mb-2">Select Dropdown</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200">
                    <option>Choose an option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Animations Tab */}
        <TabsContent value="animations" className="space-y-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🎬 Animation Performance Testing</CardTitle>
                <CardDescription>
                  Test animation performance across different browsers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={runAnimationTests}
                    disabled={isTestingAnimations}
                    className="btn-animate"
                  >
                    {isTestingAnimations ? 'Testing...' : 'Test Animations'}
                  </Button>
                  <Button 
                    onClick={runFPSTest}
                    disabled={isTestingFPS}
                    className="btn-animate gradient-success"
                  >
                    {isTestingFPS ? 'Testing...' : 'Test FPS'}
                  </Button>
                </div>

                {fpsTest && (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-label mb-2">Frame Rate Test Result</p>
                    <p className={`text-h3 ${getPerformanceColor(fpsTest)}`}>
                      {fpsTest} FPS
                    </p>
                    <p className="text-body-sm text-muted-foreground">
                      {fpsTest >= 55 ? 'Excellent performance' : 
                       fpsTest >= 30 ? 'Good performance' : 'Performance issues detected'}
                    </p>
                  </div>
                )}

                {animationResults && (
                  <div className="space-y-4">
                    <h4 className="text-h4">Animation Test Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(animationResults).map(([animation, result]) => (
                        <div key={animation} className="p-4 rounded-lg bg-muted">
                          <p className="text-label mb-2">{animation}</p>
                          {result.error ? (
                            <p className="text-error">Error: {result.error}</p>
                          ) : (
                            <div className="space-y-1">
                              <p className={`text-body ${getPerformanceColor(result.fps)}`}>
                                {result.fps} FPS
                              </p>
                              <p className="text-body-sm text-muted-foreground">
                                Drop rate: {result.dropRate}%
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Animation Showcase */}
            <Card>
              <CardHeader>
                <CardTitle>Animation Showcase</CardTitle>
                <CardDescription>Visual test of all animation classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-primary text-primary-foreground card-hover cursor-pointer">
                    Card Hover Effect
                  </div>
                  <div className="p-4 rounded-lg bg-success text-success-foreground hover-lift cursor-pointer">
                    Hover Lift Effect
                  </div>
                  <div className="p-4 rounded-lg bg-warning text-warning-foreground hover-scale cursor-pointer">
                    Hover Scale Effect
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500 text-white interactive cursor-pointer">
                    Interactive Element
                  </div>
                  <div className="p-4 rounded-lg bg-teal-500 text-white mobile-touch cursor-pointer">
                    Mobile Touch Feedback
                  </div>
                  <div className="p-4 rounded-lg bg-pink-500 text-white ripple cursor-pointer">
                    Ripple Effect
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Responsive Tab */}
        <TabsContent value="responsive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📱 Responsive Design Information</CardTitle>
              <CardDescription>Current viewport and responsive behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-label">Viewport Size</p>
                  <p className="text-h4">
                    {compatibilityReport.responsive.viewport.width} × {compatibilityReport.responsive.viewport.height}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-label">Current Breakpoint</p>
                  <p className="text-h4">{compatibilityReport.responsive.breakpoint}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-label">Orientation</p>
                  <p className="text-h4 capitalize">{compatibilityReport.responsive.orientation}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-label">Device Pixel Ratio</p>
                  <p className="text-h4">{compatibilityReport.responsive.viewport.devicePixelRatio}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-label">Touch Support</p>
                  <p className="text-h4">{compatibilityReport.responsive.isTouch ? 'Yes' : 'No'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-label">Reduced Motion</p>
                  <p className="text-h4">{compatibilityReport.responsive.prefersReducedMotion ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Responsive Grid Test */}
          <Card>
            <CardHeader>
              <CardTitle>Grid Responsiveness Test</CardTitle>
              <CardDescription>Test how grid layouts adapt to different screen sizes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="p-4 rounded-lg bg-primary/10 text-center">
                    Item {i + 1}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Performance Summary</CardTitle>
          <CardDescription>Overall browser performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {compatibilityReport.performance.paintTiming && (
              <div className="space-y-2">
                <p className="text-label">First Paint</p>
                <p className="text-h4">
                  {Math.round(compatibilityReport.performance.paintTiming['first-paint'] || 0)}ms
                </p>
              </div>
            )}
            {compatibilityReport.performance.memoryUsage && (
              <div className="space-y-2">
                <p className="text-label">Memory Usage</p>
                <p className="text-h4">
                  {Math.round(compatibilityReport.performance.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB
                </p>
              </div>
            )}
            {fpsTest && (
              <div className="space-y-2">
                <p className="text-label">Animation FPS</p>
                <p className={`text-h4 ${getPerformanceColor(fpsTest)}`}>
                  {fpsTest} FPS
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Report */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Export Report</CardTitle>
          <CardDescription>Download compatibility report for documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => {
              const dataStr = JSON.stringify(compatibilityReport, null, 2);
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
              const exportFileDefaultName = `browser-compatibility-${Date.now()}.json`;
              
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', dataUri);
              linkElement.setAttribute('download', exportFileDefaultName);
              linkElement.click();
            }}
            className="btn-animate gradient-primary"
          >
            Download Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrowserCompatibilityTest;