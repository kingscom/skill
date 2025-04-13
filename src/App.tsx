import { useState } from 'react'
import { SkillSetManager } from './components/SkillSetManager'
import { SkillAnalysis } from './components/SkillAnalysis'
import './styles/App.css'

function App() {
  const [currentView, setCurrentView] = useState<'main' | 'selection' | 'analysis'>('main')

  const goToHome = () => {
    setCurrentView('main')
  }

  return (
    <div className="app">
      {currentView === 'main' ? (
        <div className="main-menu">
          <h1 className="main-title">스킬 분석 시스템</h1>
          <div className="button-container">
            <button 
              className="main-button" 
              onClick={() => setCurrentView('selection')}
            >
              스킬 선택
            </button>
            <button 
              className="main-button"
              onClick={() => setCurrentView('analysis')}
            >
              스킬 분석
            </button>
          </div>
        </div>
      ) : currentView === 'selection' ? (
        <SkillSetManager onBack={goToHome} />
      ) : (
        <SkillAnalysis onBack={goToHome} />
      )}
    </div>
  )
}

export default App
