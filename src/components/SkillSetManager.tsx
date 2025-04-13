import { useState } from 'react'
import { SkillModal } from './SkillModal'
import '../styles/SkillSetManager.css'

interface SkillItem {
  스킬셋: string
  요구역량: string
  L1: string
  L2: string
  L3: string
  L4: string
  L5: string
}

export function SkillSetManager() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [skillList, setSkillList] = useState<SkillItem[]>([])
  const [isShowDetail, setIsShowDetail] = useState(false)

  const handleAddSkill = (skill: SkillItem) => {
    // 이미 추가된 스킬인지 확인
    const isDuplicate = skillList.some(item => item.스킬셋 === skill.스킬셋)
    if (!isDuplicate) {
      setSkillList(prev => [...prev, skill])
    }
    setIsModalOpen(false)
  }

  const handleRemoveSkill = (skillName: string) => {
    setSkillList(prev => prev.filter(skill => skill.스킬셋 !== skillName))
  }

  const handleShowDetail = (showDetail: boolean) => {
    setIsShowDetail(showDetail)
  }

  return (
    <div className="skill-set-manager">
      <div className="skill-set-header">
        <h1 className="skill-set-title">스킬셋 리스트</h1>
        <button 
          className="add-skill-button"
          onClick={() => setIsModalOpen(true)}
        >
          스킬셋 추가하기
        </button>
      </div>

      <div className="skill-list">
        {skillList.length > 0 ? (
          skillList.map((skill, index) => (
            <div key={index} className="skill-card">
              <div className="skill-card-header">
                <h3 className="skill-name">{skill.스킬셋}</h3>
                <button 
                  className="delete-button"
                  onClick={() => handleRemoveSkill(skill.스킬셋)}
                >
                  삭제
                </button>
              </div>
              <p className="skill-requirement">{skill.요구역량}</p>
              <div className="skill-levels">
                <div className="skill-level">
                  <span className="level-label">L1</span>
                  <span className="level-value">{skill.L1}</span>
                </div>
                <div className="skill-level">
                  <span className="level-label">L2</span>
                  <span className="level-value">{skill.L2}</span>
                </div>
                <div className="skill-level">
                  <span className="level-label">L3</span>
                  <span className="level-value">{skill.L3}</span>
                </div>
                <div className="skill-level">
                  <span className="level-label">L4</span>
                  <span className="level-value">{skill.L4}</span>
                </div>
                <div className="skill-level">
                  <span className="level-label">L5</span>
                  <span className="level-value">{skill.L5}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>추가된 스킬셋이 없습니다.</p>
          </div>
        )}
      </div>

      <SkillModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddSkill={handleAddSkill}
        onShowDetail={handleShowDetail}
        isShowDetail={isShowDetail}
      />
    </div>
  )
} 