"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

// Simple duration bar component with variant-specific colors
function ToastDurationBar({ variant }: { variant?: 'default' | 'destructive' | 'success' | 'warning' }) {
  const getBarColor = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-600' // Darker red
      case 'success':
        return 'bg-green-600' // Darker green
      case 'warning':
        return 'bg-yellow-600' // Darker yellow
      default:
        return 'bg-gray-600' // Darker gray for default
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
      <div 
        className={`h-full ${getBarColor()} animate-duration-bar`}
        style={{
          animation: 'durationBar 5.4s linear forwards'
        }}
      />
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string | null) => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "destructive":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle>
                  <div className="flex items-center gap-2">
                    {getIcon(variant)}
                    {title}
                  </div>
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            <ToastDurationBar variant={variant || undefined} />
          </Toast>
        )
      })}
      <ToastViewport />
      <style jsx>{`
        @keyframes durationBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastProvider>
  )
} 