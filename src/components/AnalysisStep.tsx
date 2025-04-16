import React, { useMemo } from 'react';
import '../styles/SkillAnalysis.css';
import { DataSheet, SkillData } from './SkillAnalysis';

interface AnalysisStepProps {
  dataset: DataSheet[];
  integratedData: SkillData[];
  onPrev: () => void;
  completedSteps: Set<string>;
}

export const AnalysisStep: React.FC<AnalysisStepProps> = ({ 
  dataset, 
  integratedData,
  onPrev, 
  completedSteps 
}) => {
  // 통합 데이터셋을 기반으로 분석 수행
  const analysis = useMemo(() => {
    // 스킬셋 별 분류
    const skillSetGroups = integratedData.reduce((acc, item) => {
      const skillSet = item.스킬셋;
      if (!acc[skillSet]) {
        acc[skillSet] = [];
      }
      acc[skillSet].push(item);
      return acc;
    }, {} as Record<string, SkillData[]>);

    // 현재수준과 기대수준의 차이 계산
    const levelGaps = integratedData.map(item => {
      const currentLevel = item.현재수준 || 0;
      const expectedLevel = item.기대수준 || 0;
      const gap = expectedLevel - currentLevel;
      
      return {
        ...item,
        gap
      };
    });

    // 차이가 큰 요구역량 찾기 (우선 개발 필요 항목)
    const priorityItems = [...levelGaps]
      .filter(item => item.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 5);

    return {
      skillSetGroups,
      levelGaps,
      priorityItems,
      totalSkillSets: Object.keys(skillSetGroups).length,
      totalRequirements: integratedData.length
    };
  }, [integratedData]);

  return (
    <>
      {completedSteps.has('validation') ? (
        <div className="analysis-content">
          <h3>스킬 분석 결과</h3>
          <p>통합된 데이터셋 기반 분석 결과입니다.</p>
          
          <div className="analysis-summary">
            <div className="analysis-card">
              <h4>데이터 요약</h4>
              <ul className="analysis-list">
                <li>총 스킬셋 수: {analysis.totalSkillSets}개</li>
                <li>총 요구역량 수: {analysis.totalRequirements}개</li>
              </ul>
            </div>
            
            {analysis.priorityItems.length > 0 && (
              <div className="analysis-card">
                <h4>우선 개발 필요 역량 (수준 차이 큰 순)</h4>
                <ul className="analysis-list">
                  {analysis.priorityItems.map((item, index) => (
                    <li key={index}>
                      <strong>{item.스킬셋} - {item.요구역량}</strong>
                      <div className="level-indicator">
                        <span className="current-level">현재: {item.현재수준}</span>
                        <span className="level-gap">{item.gap}↑</span>
                        <span className="expected-level">기대: {item.기대수준}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="step-navigation">
            <button 
              className="nav-button prev"
              onClick={onPrev}
            >
              이전 단계
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>먼저 입력값을 검증해주세요.</p>
          <button 
            className="nav-button"
            onClick={onPrev}
          >
            입력값 검증 단계로 이동
          </button>
        </div>
      )}
    </>
  );
}; 