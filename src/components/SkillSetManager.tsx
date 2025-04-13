import { useState } from 'react'
import { SkillModal } from './SkillModal'
import '../styles/SkillSetManager.css'
import { SkillItem } from '../types/skill'

export function SkillSetManager() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubModalOpen, setIsSubModalOpen] = useState(false)
  const [skillList, setSkillList] = useState<SkillItem[]>([])
  const [subSkillList, setSubSkillList] = useState<SkillItem[]>([])
  const [isShowDetail, setIsShowDetail] = useState(false)

  const handleAddSkill = (skills: SkillItem[]) => {
    const isDuplicate = skillList.some(item => item.스킬셋 === skills[0].스킬셋)
    if (!isDuplicate) {
      setSkillList(prev => [...prev, ...skills])
    }
    setIsModalOpen(false)
  }

  const handleAddSubSkill = (skills: SkillItem[]) => {
    const isDuplicate = subSkillList.some(item => item.스킬셋 === skills[0].스킬셋)
    if (!isDuplicate) {
      setSubSkillList(prev => [...prev, ...skills])
    }
    setIsSubModalOpen(false)
  }

  const handleRemoveSkill = (skillName: string) => {
    setSkillList(prev => prev.filter(skill => skill.스킬셋 !== skillName))
  }

  const handleRemoveSubSkill = (skillName: string) => {
    setSubSkillList(prev => prev.filter(skill => skill.스킬셋 !== skillName))
  }

  const handleShowDetail = (showDetail: boolean) => {
    setIsShowDetail(showDetail)
  }

  const groupedSkills = skillList.reduce((acc, skill) => {
    if (!acc[skill.스킬셋]) {
      acc[skill.스킬셋] = [];
    }
    acc[skill.스킬셋].push(skill);
    return acc;
  }, {} as Record<string, SkillItem[]>);

  const groupedSubSkills = subSkillList.reduce((acc, skill) => {
    if (!acc[skill.스킬셋]) {
      acc[skill.스킬셋] = [];
    }
    acc[skill.스킬셋].push(skill);
    return acc;
  }, {} as Record<string, SkillItem[]>);

  return (
    <div className="skill-set-manager">
      <div className="skill-set-header">
        <h1 className="skill-set-title">스킬셋 리스트</h1>
      </div>

      <div className="skill-sections">
        <div className="skill-section">
          <div className="section-header">
            <h2 className="section-title">주스킬</h2>
            <button 
              className="skill-set-button skill-set-add-button"
              onClick={() => setIsModalOpen(true)}
            >
              주스킬 추가하기
            </button>
          </div>
          <div className="skill-list">
            {Object.entries(groupedSkills).length > 0 ? (
              Object.entries(groupedSkills).map(([skillSet, skills]) => (
                <div key={skillSet} className="skill-card">
                  <div className="skill-card-header">
                    <h3 className="skill-name">{skillSet}</h3>
                    <button 
                      className="delete-button"
                      onClick={() => handleRemoveSkill(skillSet)}
                    >
                      삭제
                    </button>
                  </div>
                  <div className="skill-requirements">
                    {skills.map((skill, index) => (
                      <p key={index} className="skill-requirement"> - {skill.요구역량}</p>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>추가된 주스킬이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        <div className="skill-section">
          <div className="section-header">
            <h2 className="section-title">부스킬</h2>
            <button 
              className="skill-set-button skill-set-add-button"
              onClick={() => setIsSubModalOpen(true)}
            >
              부스킬 추가하기
            </button>
          </div>
          <div className="skill-list">
            {Object.entries(groupedSubSkills).length > 0 ? (
              Object.entries(groupedSubSkills).map(([skillSet, skills]) => (
                <div key={skillSet} className="skill-card">
                  <div className="skill-card-header">
                    <h3 className="skill-name">{skillSet}</h3>
                    <button 
                      className="delete-button"
                      onClick={() => handleRemoveSubSkill(skillSet)}
                    >
                      삭제
                    </button>
                  </div>
                  <div className="skill-requirements">
                    {skills.map((skill, index) => (
                      <p key={index} className="skill-requirement">- {skill.요구역량}</p>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>추가된 부스킬이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SkillModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddSkill={handleAddSkill}
        onShowDetail={handleShowDetail}
        isShowDetail={isShowDetail}
      />

      <SkillModal 
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onAddSkill={handleAddSubSkill}
        onShowDetail={handleShowDetail}
        isShowDetail={isShowDetail}
      />
    </div>
  )
} 