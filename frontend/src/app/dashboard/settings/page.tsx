// app/dashboard/settings/page.tsx
'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { useProfile } from '@/hooks/auth/useProfile'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useState } from 'react'

export default function SettingsPage() {
  const { profile, loading, updateProfile } = useProfile()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    
    const formData = new FormData(e.currentTarget)
    
    try {
      await updateProfile({
        full_name: formData.get('fullName') as string,
      })
      setMessage('Profile updated successfully!')
    } catch (error) {
      setMessage('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Profile Information
            </h3>
            
            {message && (
              <div className={`mb-4 p-3 rounded ${
                message.includes('success') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Email cannot be changed from here.
                </p>
              </div>
              
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  defaultValue={profile?.full_name || ''}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="planType">Plan type</Label>
                <Input
                  id="planType"
                  type="text"
                  value={profile?.plan_type || 'Free'}
                  disabled
                  className="mt-1 capitalize"
                />
              </div>
              
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </form>
          </div>
        </div>
        
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Account Actions
            </h3>
            
            <div className="space-y-4">
              <div>
                <Button variant="outline" asChild>
                  <a href="/dashboard/billing">
                    Manage Billing
                  </a>
                </Button>
              </div>
              
              <div>
                <Button variant="outline">
                  Export Data
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <Button variant="destructive">
                  Delete Account
                </Button>
                <p className="text-sm text-gray-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
