import { Settings, LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ping, logout, getContainerInfo } from '../lib/api'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

type ServiceStatus = 'initializing' | 'online' | 'offline'

export default function TopBar() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<ServiceStatus>('initializing')
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkServiceStatus = async (): Promise<boolean> => {
    try {
      // 
      await ping()
      
      // État du conteneur
      const containerInfo = await getContainerInfo()
      const isContainerRunning = containerInfo.status === 'running'
      
      return isContainerRunning
    } catch {
      return false
    }
  }

  useEffect(() => {
    let initializeInterval: ReturnType<typeof setInterval> | null = null
    let hasStartedOnlineCheck = false

    const checkServiceStatusAndTransition = async () => {
      const isOnline = await checkServiceStatus()
      
      if (isOnline) {
        // ，État
        setStatus('online')
        
        // 
        if (initializeInterval) {
          clearInterval(initializeInterval)
          initializeInterval = null
        }
        
        // 
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        
        // （30）
        if (!hasStartedOnlineCheck && !checkIntervalRef.current) {
          hasStartedOnlineCheck = true
          checkIntervalRef.current = setInterval(async () => {
            const stillOnline = await checkServiceStatus()
            setStatus(stillOnline ? 'online' : 'offline')
          }, 30000)
        }
      }
    }

    // 
    checkServiceStatusAndTransition()

    // 2
    initializeInterval = setInterval(() => {
      checkServiceStatusAndTransition()
    }, 2000)

    // 30
    timeoutRef.current = setTimeout(async () => {
      // 30，État
      const isOnline = await checkServiceStatus()
      if (!isOnline) {
        setStatus('offline')
      }
      
      // 
      if (initializeInterval) {
        clearInterval(initializeInterval)
        initializeInterval = null
      }
    }, 30000)

    return () => {
      if (initializeInterval) {
        clearInterval(initializeInterval)
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case 'initializing':
        return {
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-500',
          dotColor: 'bg-yellow-500',
          text: 'Service en cours d'initialisation',
        }
      case 'online':
        return {
          borderColor: 'border-accent-green/30',
          textColor: 'text-accent-green',
          dotColor: 'bg-accent-green',
          text: 'Service opérationnel',
        }
      case 'offline':
        return {
          borderColor: 'border-accent-red/30',
          textColor: 'text-accent-red',
          dotColor: 'bg-accent-red',
          text: 'Service hors ligne',
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <header className="flex h-14 items-center justify-between border-b border-dark-border bg-dark-sidebar px-6">
      <div />

      {/* Right side */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${statusConfig.borderColor} ${statusConfig.textColor}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${statusConfig.dotColor} ${
              status === 'initializing' ? 'animate-pulse' : ''
            }`}
          />
          {statusConfig.text}
        </div>

        {/*  */}
        <ThemeToggle />

        {/* ✅  */}
        <NotificationBell />

        {/*  */}
        <button
          onClick={() => navigate('/settings')}
          className="text-dark-text-secondary hover:text-dark-text transition-colors"
          title="Paramètres système"
        >
          <Settings size={20} />
        </button>

        {/*  */}
        <button
          onClick={() => logout()}
          className="text-dark-text-secondary hover:text-accent-red transition-colors"
          title="Se déconnecter"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  )
}