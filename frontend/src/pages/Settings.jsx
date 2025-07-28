import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Settings() {
  return (
    <div className="space-y-6">
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
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              App preferences will be implemented here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}