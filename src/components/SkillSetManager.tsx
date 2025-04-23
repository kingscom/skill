import React, { useState, useEffect, useRef } from 'react';
import { utils, writeFile } from 'xlsx';
import '../styles/SkillSetManager.css';
import { SkillModal } from './SkillModal';
import { SkillItem } from '../types/skill';

interface SkillSetManagerProps {
  onBack: () => void;
}

export const SkillSetManager: React.FC<SkillSetManagerProps> = ({ onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [skillList, setSkillList] = useState<SkillItem[]>([]);
  const [subSkillList, setSubSkillList] = useState<SkillItem[]>([]);
  const [isShowDetail, setIsShowDetail] = useState(false);
  const [team, setTeam] = useState<string>('');
  const [teamWork, setTeamWork] = useState<string>('');
  const [coreSkill, setCoreSkill] = useState<string>('');

  const handleTeamInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'team') {
      setTeam(value);
    } else if (name === 'teamWork') {
      setTeamWork(value);
    } else if (name === 'coreSkill') {
      setCoreSkill(value);
    }
  };

  const teamInfoFields = [
    { id: 'team', label: '팀명', placeholder: '팀 이름을 입력하세요' },
    { id: 'teamWork', label: '팀 업무 요약', placeholder: '팀의 주요 업무를 요약해주세요' },
    { id: 'coreSkill', label: '핵심 기술', placeholder: '팀에서 사용하는 핵심 기술을 입력하세요' }
  ];

  const handleAddSkill = (skills: SkillItem[]) => {
    const isDuplicate = skillList.some(item => item.스킬셋 === skills[0].스킬셋);
    if (!isDuplicate) {
      setSkillList(prev => [...prev, ...skills]);
    }
    setIsModalOpen(false);
  };

  const handleAddSubSkill = (skills: SkillItem[]) => {
    const isDuplicate = subSkillList.some(item => item.스킬셋 === skills[0].스킬셋);
    if (!isDuplicate) {
      setSubSkillList(prev => [...prev, ...skills]);
    }
    setIsSubModalOpen(false);
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkillList(prev => prev.filter(skill => skill.스킬셋 !== skillName));
  };

  const handleRemoveSubSkill = (skillName: string) => {
    setSubSkillList(prev => prev.filter(skill => skill.스킬셋 !== skillName));
  };

  const handleShowDetail = (showDetail: boolean) => {
    setIsShowDetail(showDetail);
  };

  const handleDownload = () => {
    const wb = utils.book_new();
    
    const teamData = [{
      팀: team,
      팀업무: teamWork,
      핵심기술: coreSkill
    }];
    
    const teamWs = utils.json_to_sheet(teamData, {
      header: ['팀', '팀업무', '핵심기술']
    });
    
    const teamColWidths = [
      { wch: 20 },
      { wch: 40 },
      { wch: 20 }
    ];
    teamWs['!cols'] = teamColWidths;
    
    utils.book_append_sheet(wb, teamWs, '팀');
    
    const allSkills = [
      ...skillList.map(skill => {
        const { 팀, 팀업무, 핵심기술, ...rest } = skill;
        return { 
          ...rest, 
          구분: '주스킬'
        };
      }),
      ...subSkillList.map(skill => {
        const { 팀, 팀업무, 핵심기술, ...rest } = skill;
        return { 
          ...rest, 
          구분: '멀티스킬'
        };
      })
    ];
    
    const skillWs = utils.json_to_sheet(allSkills, {
      header: ['구분', '스킬셋', '업무스킬', '현재수준', '기대수준', '스킬셋정의', '업무스킬정의', 'L1', 'L2', 'L3', 'L4', 'L5']
    });
    
    const skillColWidths = [
      { wch: 10 },
      { wch: 20 },
      { wch: 40 },
      { wch: 10 },
      { wch: 10 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 },
      { wch: 30 }
    ];
    skillWs['!cols'] = skillColWidths;
    
    utils.book_append_sheet(wb, skillWs, '리더용');
    
    const fileName = team ? `${team}_skillset_list.xlsx` : 'skillset_list.xlsx';
    
    writeFile(wb, fileName);
  };

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
        <button className="skill-set-button back-button" onClick={onBack}>
          홈으로
        </button>
        <button
          className="skill-set-button skill-set-add-button"
          onClick={handleDownload}
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
                value={field.id === 'team' ? team : field.id === 'teamWork' ? teamWork : coreSkill}
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
                      <p key={index} className="skill-requirement"> - {skill.업무스킬}</p>
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
                      <p key={index} className="skill-requirement">- {skill.업무스킬}</p>
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
        team={team}
        teamWork={teamWork}
        coreSkill={coreSkill}
      />

      <SkillModal 
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onAddSkill={handleAddSubSkill}
        onShowDetail={handleShowDetail}
        isShowDetail={isShowDetail}
        team={team}
        teamWork={teamWork}
        coreSkill={coreSkill}
      />
    </div>
  );
}; 