import React from 'react'
import { AlertCircle, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title = "Confirm Action",
  description = "Are you sure you want to perform this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // default, destructive
  icon: Icon = AlertCircle,
  onConfirm,
  onCancel,
  loading = false,
  children
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  const isDestructive = variant === "destructive"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDestructive ? 'text-destructive' : ''}`}>
            <Icon className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {children && (
          <div className="py-4">
            {children}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                {isDestructive ? 'Deleting...' : 'Processing...'}
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Specialized delete confirmation dialog
export const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  title = "Delete Item",
  itemName = "this item",
  itemType = "item",
  onConfirm,
  onCancel,
  loading = false,
  additionalWarning
}) => {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`Are you sure you want to delete ${itemName}? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
      icon={Trash2}
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
    >
      {additionalWarning && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive font-medium">
            {additionalWarning}
          </p>
        </div>
      )}
    </ConfirmationDialog>
  )
}