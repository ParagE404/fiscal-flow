import React, { useState, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { User, Camera, Mail, Calendar, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { authStore } from '@/stores/AuthStore'
import { apiClient } from '@/lib/apiClient'

export const UserProfile = observer(() => {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileInputRef = useRef(null)

  const form = useForm({
    defaultValues: {
      name: authStore.user?.name || '',
      email: authStore.user?.email || '',
      avatar: authStore.user?.avatar || ''
    }
  })

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }
      
      // For now, we'll just show a preview
      // In a real app, you'd upload to a service like Cloudinary or AWS S3
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target.result)
        form.setValue('avatar', e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const response = await apiClient.updateUserProfile(data)
      
      // Update auth store with new user data
      authStore.user = response.user
      
      // Reset form with new data
      form.reset({
        name: response.user.name,
        email: response.user.email,
        avatar: response.user.avatar || ''
      })
      
      setIsEditing(false)
      setAvatarPreview(null)
      
      toast.success('Profile updated successfully')
      
      // If email was changed, show additional message
      if (response.emailVerificationRequired) {
        toast.info('Please check your email to verify your new email address')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    form.reset({
      name: authStore.user?.name || '',
      email: authStore.user?.email || '',
      avatar: authStore.user?.avatar || ''
    })
    setIsEditing(false)
    setAvatarPreview(null)
  }

  const currentAvatar = avatarPreview || authStore.user?.avatar

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {currentAvatar ? (
                <img 
                  src={currentAvatar} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            {isEditing && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={handleAvatarClick}
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div>
            <h3 className="font-medium">{authStore.user?.name}</h3>
            <p className="text-sm text-muted-foreground">{authStore.user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={authStore.user?.isEmailVerified ? "default" : "secondary"}>
                <Mail className="h-3 w-3 mr-1" />
                {authStore.user?.isEmailVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />

        {/* Profile Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Name must be less than 100 characters' }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing}
                      placeholder="Enter your full name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      disabled={!isEditing}
                      placeholder="Enter your email address"
                      type="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium">Member Since</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {authStore.user?.createdAt ? 
                      new Date(authStore.user.createdAt).toLocaleDateString() : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Last Login</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {authStore.user?.lastLogin ? 
                      new Date(authStore.user.lastLogin).toLocaleDateString() : 
                      'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              {isEditing ? (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button 
                  type="button" 
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
})