import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmailVerificationStatus } from '@/components/common/EmailVerificationStatus'
import { UserProfile } from '@/components/settings/UserProfile'
import { AccountSettings } from '@/components/settings/AccountSettings'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { ExportSection } from '@/components/settings/ExportSection'
import { SyncSettings } from '@/components/settings/SyncSettings'
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Profile</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Account & Security</span>
            <span className="sm:hidden">Account</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Auto-Sync</span>
            <span className="sm:hidden">Sync</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Preferences</span>
            <span className="sm:hidden">Prefs</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <UserProfile />
        </TabsContent>
        
        <TabsContent value="account" className="space-y-6">
          <AccountSettings />
        </TabsContent>
        
        <TabsContent value="sync" className="space-y-6">
          <SyncSettings />
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Export Data section */}
            <ExportSection />

            {/* Help & Support section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Help & Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Button 
                    variant="outline" 
                    onClick={handleStartTour}
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Take Guided Tour
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Learn how to use FiscalFlow with an interactive tour
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* App Preferences section */}
          <div className="mt-6">
            <PreferencesSection />
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