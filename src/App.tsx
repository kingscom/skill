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
              <h1 className="hero-title">역량 향상 프레임워크</h1>
              <p className="hero-subtitle">우선순위 기반 맞춤형 교육과정 개발</p>
              <div className="hero-actions">
                <button 
                  className="hero-button primary"
                  onClick={() => setCurrentView('selection')}
                >
                  스킬셋 선택하기
                </button>
                <button 
                  className="hero-button secondary"
                  onClick={() => setCurrentView('analysis')}
                >
                  스킬 분석하기
                </button>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="feature-section">
            <h2 className="section-title">주요 기능</h2>
            <div className="feature-grid">
              <div className="feature-card" onClick={() => setCurrentView('selection')}>
                <div className="card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L5.4 5.272a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l1.313.98c.1.075.173.22.173.35 0 .285-.012.57-.037.855a.534.534 0 01-.163.31l-1.296.97a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.919-.615c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.919.615a1.875 1.875 0 002.282-.818l.922-1.597a1.875 1.875 0 00-.432-2.385l-1.296-.97a.534.534 0 01-.163-.31c-.024-.285-.037-.57-.037-.855 0-.13.073-.276.173-.35l1.313-.98a1.875 1.875 0 00.432-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.919.615c-.114.043-.282.031-.449-.083a7.48 7.48 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="card-title">스킬셋 선택</h3>
                <p className="card-description">조직에 맞는 스킬셋을 체계적으로 선택하고 관리합니다</p>
                <ul className="card-features">
                  <li>주스킬셋 하나를 선택</li>
                  <li>멀티스킬셋 최대 2개 선택</li>
                  <li>스킬셋 데이터 Excel 다운로드</li>
                </ul>
                <div className="card-action">
                  <span>선택하기</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
              
              <div className="feature-card" onClick={() => setCurrentView('analysis')}>
                <div className="card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="card-title">스킬 분석</h3>
                <p className="card-description">스킬을 분석하고 개선 방향을 제시합니다</p>
                <ul className="card-features">
                  <li>데이터 기반 역량 분석</li>
                  <li>개인별 스킬 향상 방향 제시</li>
                  <li>시각화된 분석 결과 제공</li>
                </ul>
                <div className="card-action">
                  <span>분석하기</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="main-footer">
            <p>© 2023 역량 향상 프레임워크</p>
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
