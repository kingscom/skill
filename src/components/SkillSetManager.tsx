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
  
  // 팀 정보 데이터 객체
  const [teamInfo, setTeamInfo] = useState({
    teamName: '',
    teamWork: '',
    coreTech: ''
  })

  // 입력 필드 변경 핸들러
  const handleTeamInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setTeamInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 팀 정보 입력 필드 데이터
  const teamInfoFields = [
    { 
      id: 'teamName', 
      label: '팀명', 
      placeholder: '팀 이름을 입력하세요' 
    },
    { 
      id: 'teamWork', 
      label: '팀 업무 요약', 
      placeholder: '팀의 주요 업무를 요약해주세요' 
    },
    { 
      id: 'coreTech', 
      label: '핵심 기술', 
      placeholder: '팀에서 사용하는 핵심 기술을 입력하세요' 
    }
  ]

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
    // Excel 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 첫 번째 시트: 팀 정보
    const teamData = [{
      팀: teamInfo.teamName,
      팀업무: teamInfo.teamWork,
      핵심기술: teamInfo.coreTech
    }];
    
    // 팀 정보 워크시트 생성
    const teamWs = XLSX.utils.json_to_sheet(teamData, {
      header: ['팀', '팀업무', '핵심기술']
    });
    
    // 열 너비 자동 조정 (팀 정보 시트)
    const teamColWidths = [
      { wch: 20 }, // 팀
      { wch: 40 }, // 팀업무
      { wch: 20 }  // 핵심기술
    ];
    teamWs['!cols'] = teamColWidths;
    
    // 팀 정보 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, teamWs, '팀 정보');
    
    // 두 번째 시트: 스킬 정보
    // 주스킬과 부스킬 데이터를 하나의 배열로 합치기
    const allSkills = [
      ...skillList.map(skill => ({ 
        ...skill, 
        구분: '주스킬'
      })),
      ...subSkillList.map(skill => ({ 
        ...skill, 
        구분: '멀티스킬'
      }))
    ];
    
    // 스킬 정보 워크시트 생성
    const skillWs = XLSX.utils.json_to_sheet(allSkills, {
      header: ['구분', '스킬셋', '요구역량', '현재수준', '기대수준', 'L1', 'L2', 'L3', 'L4', 'L5']
    });
    
    // 열 너비 자동 조정 (스킬 정보 시트)
    const skillColWidths = [
      { wch: 10 }, // 구분
      { wch: 20 }, // 스킬셋
      { wch: 40 }, // 요구역량
      { wch: 10 }, // 현재수준
      { wch: 10 }, // 기대수준
      { wch: 30 }, // L1
      { wch: 30 }, // L2
      { wch: 30 }, // L3
      { wch: 30 }, // L4
      { wch: 30 }  // L5
    ];
    skillWs['!cols'] = skillColWidths;
    
    // 스킬 정보 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, skillWs, '스킬셋 목록');
    
    // 파일명에 팀명 포함 (입력된 경우)
    const fileName = teamInfo.teamName 
      ? `${teamInfo.teamName}_skillset_list.xlsx`
      : 'skillset_list.xlsx';
    
    // Excel 파일 다운로드
    XLSX.writeFile(wb, fileName);
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

      <div className="skill-set-header">
        <h1 className="skill-set-title">팀 업무 정의</h1>
        
        <div className="team-info-container">
          {teamInfoFields.map(field => (
            <div className="team-info-item" key={field.id}>
              <p className="skill-set-description">{field.label}</p>
              <input 
                type="text" 
                name={field.id}
                value={teamInfo[field.id as keyof typeof teamInfo]}
                onChange={handleTeamInfoChange}
                className="skill-set-input" 
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div className="skill-set-header">
        <h1 className="skill-set-title">주스킬1개, 멀티스킬 최대 2개를 선택</h1>
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
            <h2 className="section-title">멀티 스킬</h2>
            <button 
              className="skill-set-button skill-set-add-button"
              onClick={() => setIsSubModalOpen(true)}
            >
              멀티 스킬 추가하기
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