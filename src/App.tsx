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
        <div className="main-container">
          {/* Hero Section */}
          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">스킬 분석 시스템</h1>
              <p className="hero-subtitle">개인의 스킬을 분석하고 성장을 도와드립니다</p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="feature-section">
            <div className="feature-grid">
              <div className="feature-card" onClick={() => setCurrentView('selection')}>
                <div className="card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.532 0-.87-.595-.707-1.061l1.586-1.586c.218-.218.595-.292 1.061-.292s.843.074 1.061.292l1.586 1.586c.36.36.303.924-.062 1.285-.36.36-.924.303-1.285-.061l-1.29-1.29a1.95 1.95 0 01-.062-1.285c0-.213-.074-.427-.293-.586-.185-.12-.471-.186-.707-.186zm4.707 1.061-1.586 1.586c-.78.78-2.043.107-2.043-.707V9.75c0-.894.46-1.715 1.203-2.124.504-.293 1.052-.439 1.574-.439.522 0 1.07.146 1.575.439.743.409 1.203 1.23 1.203 2.124v4.914c0 .813-.78 1.487-2.043.707z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="card-title">스킬 선택</h3>
                <p className="card-description">조직에 맞는 스킬을 선택 하세요</p>
                <p className="card-description">1) 주스킬 하나를 선택합니다.</p>
                <p className="card-description">2) 부스킬 여러개를 선택합니다.</p>
                <p className="card-description">3) 선택한 데이터를 Excel로 다운로드 합니다.</p>
                
              </div>
              <div className="feature-card" onClick={() => setCurrentView('analysis')}>
                <div className="card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-3.75 10.5a.75.75 0 10-1.5 0v-3a.75.75 0 00-1.5 0v3a2.25 2.25 0 01-2.25 2.25H3a2.25 2.25 0 01-2.25-2.25V9.75A2.25 2.25 0 013 7.5h3.75A2.25 2.25 0 019 9.75v3zm7.5 0a.75.75 0 10-1.5 0v-3a.75.75 0 00-1.5 0v3a2.25 2.25 0 01-2.25 2.25H15a2.25 2.25 0 012.25-2.25v-3zm3.75 0a.75.75 0 10-1.5 0v-3a.75.75 0 00-1.5 0v3a2.25 2.25 0 01-2.25 2.25h3.75a2.25 2.25 0 012.25-2.25v3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="card-title">스킬 분석</h3>
                <p className="card-description">스킬을 분석하고 개선 방향을 제시합니다</p>
              </div>
            </div>
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
