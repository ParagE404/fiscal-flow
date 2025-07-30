import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// Mobile-friendly table that converts to cards on small screens
export function ResponsiveTable({ 
  children, 
  className,
  mobileCardView = true,
  ...props 
}) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop table view */}
      <div className={cn(
        "overflow-x-auto",
        mobileCardView && "hidden sm:block"
      )}>
        <Table {...props}>
          {children}
        </Table>
      </div>
      
      {/* Mobile card view placeholder - to be implemented by parent component */}
      {mobileCardView && (
        <div className="sm:hidden">
          {/* This will be replaced by mobile card content */}
        </div>
      )}
    </div>
  )
}

// Mobile card component for table rows
export function MobileCard({ children, className, ...props }) {
  return (
    <Card className={cn("mb-4", className)} {...props}>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  )
}

// Mobile field component for displaying table data
export function MobileField({ label, value, className }) {
  return (
    <div className={cn("flex justify-between items-center py-1", className)}>
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

// Responsive table header that hides on mobile when using card view
export function ResponsiveTableHeader({ children, mobileCardView = true }) {
  return (
    <TableHeader className={cn(mobileCardView && "hidden sm:table-header-group")}>
      {children}
    </TableHeader>
  )
}

// Responsive table body that hides on mobile when using card view
export function ResponsiveTableBody({ children, mobileCardView = true }) {
  return (
    <TableBody className={cn(mobileCardView && "hidden sm:table-row-group")}>
      {children}
    </TableBody>
  )
}