'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside component:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-400 bg-red-950/20 border border-red-500/30 rounded-xl overflow-auto custom-scrollbar">
          <h2 className="text-lg font-bold mb-2">Error inesperado en el visualizador</h2>
          <p className="text-sm mb-4">Algo falló al intentar renderizar este artefacto.</p>
          <pre className="text-xs break-all whitespace-pre-wrap">
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}
