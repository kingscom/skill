import { useState } from 'react'
import { SkillModal } from './SkillModal'
import '../styles/SkillSetManager.css'
import { SkillItem } from '../types/skill'
import * as XLSX from 'xlsx'

interface SkillSetManagerProps {
  onBack: () => void
}

export function SkillSetManager({ onBack }: SkillSetManagerProps) {
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

  const handleDownloadExcel = () => {
    // 주스킬과 부스킬 데이터를 하나의 배열로 합치기
    const allSkills = [
      ...skillList.map(skill => ({ ...skill, 구분: '주스킬' })),
      ...subSkillList.map(skill => ({ ...skill, 구분: '부스킬' }))
    ]

    // Excel 워크북 생성
    const wb = XLSX.utils.book_new()
    
    // 데이터를 워크시트로 변환
    const ws = XLSX.utils.json_to_sheet(allSkills, {
      header: ['구분', '스킬셋', '요구역량', '현재수준', '기대수준', 'L1', 'L2', 'L3', 'L4', 'L5']
    })

    // 열 너비 자동 조정
    const colWidths = [
      { wch: 8 },  // 구분
      { wch: 15 }, // 스킬셋
      { wch: 30 }, // 요구역량
      { wch: 10 }, // 현재수준
      { wch: 10 }, // 기대수준
      { wch: 20 }, // L1
      { wch: 20 }, // L2
      { wch: 20 }, // L3
      { wch: 20 }, // L4
      { wch: 20 }  // L5
    ]
    ws['!cols'] = colWidths

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, 'skillset')

    // Excel 파일 다운로드
    XLSX.writeFile(wb, 'skillset_list.xlsx')
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
        <div className="button-group">
          <button 
            className="skill-set-button back-button"
            onClick={onBack}
          >
            홈으로
          </button>
          <button 
            className="skill-set-button skill-set-add-button"
            onClick={handleDownloadExcel}
          >
            Excel로 다운로드
          </button>
        </div>
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