import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmailVerificationStatus } from '@/components/common/EmailVerificationStatus'
import { UserProfile } from '@/components/settings/UserProfile'
import { AccountSettings } from '@/components/settings/AccountSettings'
import { GuidedTour } from '@/components/onboarding/GuidedTour'
import { HelpCircle, Play } from 'lucide-react'

export function Settings() {
  const [showGuidedTour, setShowGuidedTour] = useState(false)

  const handleStartTour = () => {
    setShowGuidedTour(true)
  }

  const handleTourComplete = () => {
    setShowGuidedTour(false)
  }

  return (
    <div className="space-y-6">
      {/* Email Verification Status */}
      <EmailVerificationStatus />
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account & Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <UserProfile />
        </TabsContent>
        
        <TabsContent value="account" className="space-y-6">
          <AccountSettings />
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Data section */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Data export functionality will be implemented here
                </div>
              </CardContent>
            </Card>

            {/* App Preferences section */}
            <Card>
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Help & Support</h4>
                    <Button 
                      variant="outline" 
                      onClick={handleStartTour}
                      className="w-full justify-start"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Take Guided Tour
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Learn how to use FiscalFlow with an interactive tour
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      More preferences will be implemented here
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Guided Tour */}
      {showGuidedTour && (
        <GuidedTour
          isActive={showGuidedTour}
          onComplete={handleTourComplete}
          onSkip={handleTourComplete}
        />
      )}
    </div>
  )
}