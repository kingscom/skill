import { useState } from 'react'
import '../styles/SkillAnalysis.css'

interface SkillAnalysisProps {
  onBack: () => void
}

export function SkillAnalysis({ onBack }: SkillAnalysisProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  return (
    <div className="skill-analysis">
      <div className="analysis-header">
        <h1 className="analysis-title">스킬 분석</h1>
        <button 
          className="back-button"
          onClick={onBack}
        >
          홈으로
        </button>
      </div>

      <div className="analysis-content">
        <div className="analysis-section">
          <h2 className="section-title">선택된 스킬</h2>
          <div className="selected-skills">
            {selectedSkills.length === 0 ? (
              <p className="empty-state">선택된 스킬이 없습니다.</p>
            ) : (
              selectedSkills.map((skill, index) => (
                <div key={index} className="skill-item">
                  {skill}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="analysis-section">
          <h2 className="section-title">분석 결과</h2>
          <div className="analysis-result">
            <p className="empty-state">분석할 스킬을 선택해주세요.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 