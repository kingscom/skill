import React, { useState, useMemo, useCallback, useEffect } from 'react';
import '../styles/SkillAnalysis.css';
import { DataSheet, SkillData } from './SkillAnalysis';
import { useTable, useSortBy, useFilters, Column } from 'react-table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ValidationStepProps {
  dataset: DataSheet[];
  integratedData: SkillData[];
  onPrev: () => void;
  onComplete: () => void;
  completedSteps: Set<string>;
  onDataUpdate?: (updatedData: SkillData[]) => void;
}

// 조직원 데이터 타입
interface OrganizationMember {
  이름: string;
  현재수준: string | number;
  기대수준: string | number;
}

// 수정된 데이터 저장을 위한 타입
interface EditableData {
  skillIndex: number;
  memberIndex: number;
  value: string | number;
  field: '현재수준' | '기대수준';
}

// 행/셀 타입 정의
interface TableRow {
  index: number;
  original: OrganizationMember;
  cells: any[];
  getRowProps: () => any;
}

interface TableCell {
  render: (type: string) => React.ReactNode;
  getCellProps: () => any;
}

// 데이터 분석 결과 인터페이스
interface AnalysisResult {
  id: string;
  title: string;
  description: string;
  detected: boolean;
  details: string;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({ 
  dataset, 
  integratedData,
  onPrev, 
  onComplete, 
  completedSteps,
  onDataUpdate
}) => {
  // 수정된 데이터 상태 관리
  const [editedData, setEditedData] = useState<SkillData[]>(integratedData);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  // integratedData가 변경될 때마다 editedData 업데이트
  useEffect(() => {
    if (integratedData && integratedData.length > 0) {
      console.log('인테그레이티드 데이터 업데이트:', integratedData);
      setEditedData(integratedData);
      
      // 선택된 스킬이 없거나 유효하지 않은 경우 첫 번째 스킬 선택
      if (selectedSkill === null || selectedSkill >= integratedData.length) {
        setSelectedSkill(0);
      }
    }
  }, [integratedData]);

  // 통합 데이터셋 검증
  const hasSkillSets = editedData.some(item => item.스킬셋);
  const hasRequirements = editedData.some(item => item.요구역량);
  
  // 조직리스트 존재 여부 확인
  const hasOrganizationList = editedData.some(item => 
    item.조직리스트 && item.조직리스트.length > 0
  );
  
  // 조직리스트 데이터 누락 확인 - 수정된 부분
  const hasMissingOrganizationData = editedData.some(item => 
    item.조직리스트 && item.조직리스트.some(member => {
      // 현재수준 검사
      const currentLevel = member.현재수준;
      const isCurrentLevelMissing = 
        currentLevel === undefined || 
        currentLevel === null || 
        (typeof currentLevel === 'string' && currentLevel.trim() === '');
      
      // 기대수준 검사
      const expectedLevel = member.기대수준;
      const isExpectedLevelMissing = 
        expectedLevel === undefined || 
        expectedLevel === null || 
        (typeof expectedLevel === 'string' && expectedLevel.trim() === '');
      
      // 둘 중 하나라도 누락되었는지 확인
      return isCurrentLevelMissing || isExpectedLevelMissing;
    })
  );

  // 디버깅 용도로 추가
  useEffect(() => {
    if (hasMissingOrganizationData) {
      console.log('누락된 데이터가 있는 조직리스트:', 
        editedData.filter(item => 
          item.조직리스트 && item.조직리스트.some(member => {
            // 현재수준 검사
            const currentLevel = member.현재수준;
            const isCurrentLevelMissing = 
              currentLevel === undefined || 
              currentLevel === null || 
              (typeof currentLevel === 'string' && currentLevel.trim() === '');
            
            // 기대수준 검사
            const expectedLevel = member.기대수준;
            const isExpectedLevelMissing = 
              expectedLevel === undefined || 
              expectedLevel === null || 
              (typeof expectedLevel === 'string' && expectedLevel.trim() === '');
            
            // 둘 중 하나라도 누락되었는지 확인
            return isCurrentLevelMissing || isExpectedLevelMissing;
          })
        )
      );
    }
  }, [hasMissingOrganizationData, editedData]);

  // 데이터 유효성 검사
  const hasInvalidData = editedData.some(item => 
    item.조직리스트 && item.조직리스트.some(member => {
      const currentLevel = Number(member.현재수준);
      const expectedLevel = Number(member.기대수준);
      return (
        isNaN(currentLevel) || 
        isNaN(expectedLevel) || 
        currentLevel < 0 || 
        currentLevel > 5 || 
        expectedLevel < 0 || 
        expectedLevel > 5
      );
    })
  );

  // 선택된 스킬셋의 조직리스트 데이터 가져오기
  const selectedSkillData = useMemo(() => {
    if (selectedSkill !== null && selectedSkill < editedData.length) {
      return editedData[selectedSkill];
    }
    return null;
  }, [selectedSkill, editedData]);

  // 데이터 변경 처리 함수
  const handleDataChange = useCallback((
    skillIndex: number,
    memberIndex: number,
    value: string | number,
    field: '현재수준' | '기대수준'
  ) => {
    setEditedData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)); // 깊은 복사
      if (
        newData[skillIndex] && 
        newData[skillIndex].조직리스트 && 
        newData[skillIndex].조직리스트[memberIndex]
      ) {
        newData[skillIndex].조직리스트[memberIndex][field] = value;
        console.log('데이터 변경됨:', newData[skillIndex].조직리스트[memberIndex]);
      }
      return newData;
    });
  }, []);

  // react-table 컬럼 정의
  const columns = useMemo(
    () => [
      {
        Header: '이름',
        accessor: '이름' as keyof OrganizationMember,
      },
      {
        Header: '현재수준',
        accessor: '현재수준' as keyof OrganizationMember,
        Cell: ({ row, value }: { row: TableRow; value: any }) => (
          <input
            type="number"
            min="0"
            max="5"
            value={value !== undefined && value !== null ? value : ''}
            onChange={(e) => handleDataChange(
              selectedSkill as number, 
              row.index, 
              e.target.value === '' ? '' : Number(e.target.value), 
              '현재수준'
            )}
            className="validation-input"
          />
        ),
      },
      {
        Header: '기대수준',
        accessor: '기대수준' as keyof OrganizationMember,
        Cell: ({ row, value }: { row: TableRow; value: any }) => (
          <input
            type="number"
            min="0"
            max="5"
            value={value !== undefined && value !== null ? value : ''}
            onChange={(e) => handleDataChange(
              selectedSkill as number, 
              row.index, 
              e.target.value === '' ? '' : Number(e.target.value), 
              '기대수준'
            )}
            className="validation-input"
          />
        ),
      },
      {
        Header: '차이',
        accessor: (row: OrganizationMember) => {
          const current = Number(row.현재수준) || 0;
          const expected = Number(row.기대수준) || 0;
          return expected - current;
        },
        id: 'gap',
        Cell: ({ value }: { value: any }) => {
          const cellClass = value > 0 
            ? 'validation-cell-positive' 
            : value < 0 
              ? 'validation-cell-negative' 
              : 'validation-cell-neutral';
          
          return (
            <div className={cellClass}>
              {value > 0 ? `+${value}` : value}
            </div>
          );
        },
      },
    ],
    [selectedSkill, handleDataChange]
  );

  // react-table 인스턴스 생성
  const tableData = useMemo(() => {
    if (selectedSkillData && selectedSkillData.조직리스트) {
      console.log('테이블 데이터 업데이트:', selectedSkillData.조직리스트);
      return selectedSkillData.조직리스트;
    }
    return [];
  }, [selectedSkillData]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      data: tableData,
    },
    useFilters,
    useSortBy
  );

  // 데이터 저장 함수
  const saveChanges = useCallback(() => {
    // 유효성 검사
    if (hasInvalidData) {
      setAlertMessage('일부 데이터에 오류가 있습니다. 0-5 사이의 값을 입력해주세요.');
      return;
    }
    
    // 수정된 데이터를 부모 컴포넌트로 전달
    if (onDataUpdate) {
      console.log('저장된 데이터:', editedData);
      onDataUpdate(editedData);
    }
    
    setAlertMessage('데이터가 성공적으로 저장되었습니다.');
    setTimeout(() => setAlertMessage(null), 3000);
  }, [hasInvalidData, editedData, onDataUpdate]);

  // 다음 단계로 이동하기 전에 수정된 데이터를 전달
  const handleComplete = useCallback(() => {
    // 유효성 검사
    if (hasInvalidData) {
      setAlertMessage('일부 데이터에 오류가 있습니다. 0-5 사이의 값을 입력해주세요.');
      return;
    }
    
    // 수정된 데이터를 부모 컴포넌트로 전달
    if (onDataUpdate) {
      onDataUpdate(editedData);
    }
    
    onComplete();
  }, [hasInvalidData, editedData, onDataUpdate, onComplete]);

  // 차트 데이터 준비
  const chartData = useMemo(() => {
    if (!selectedSkillData || !selectedSkillData.조직리스트) {
      return [];
    }

    return selectedSkillData.조직리스트.map(member => ({
      name: member.이름,
      현재수준: Number(member.현재수준) || 0,
      기대수준: Number(member.기대수준) || 0,
      차이: (Number(member.기대수준) || 0) - (Number(member.현재수준) || 0)
    }));
  }, [selectedSkillData]);

  // 데이터 분석 함수
  const analyzeData = useCallback(() => {
    if (!editedData || editedData.length === 0) {
      setAlertMessage('분석할 데이터가 없습니다.');
      return;
    }
    
    const results: AnalysisResult[] = [];
    
    // ① 고정값 입력 의심
    const fixedValueSkills = editedData.filter(skill => {
      if (!skill.조직리스트 || skill.조직리스트.length <= 1) return false;
      
      // 현재수준 고정값 확인
      const currentLevels = skill.조직리스트.map(member => Number(member.현재수준));
      const uniqueCurrentLevels = new Set(currentLevels.filter(level => !isNaN(level)));
      
      // 기대수준 고정값 확인
      const expectedLevels = skill.조직리스트.map(member => Number(member.기대수준));
      const uniqueExpectedLevels = new Set(expectedLevels.filter(level => !isNaN(level)));
      
      // 모든 값이 3 또는 5로 고정된 경우
      const allCurrentAre3 = uniqueCurrentLevels.size === 1 && uniqueCurrentLevels.has(3);
      const allCurrentAre5 = uniqueCurrentLevels.size === 1 && uniqueCurrentLevels.has(5);
      const allExpectedAre3 = uniqueExpectedLevels.size === 1 && uniqueExpectedLevels.has(3);
      const allExpectedAre5 = uniqueExpectedLevels.size === 1 && uniqueExpectedLevels.has(5);
      
      return allCurrentAre3 || allCurrentAre5 || allExpectedAre3 || allExpectedAre5;
    });
    
    if (fixedValueSkills.length > 0) {
      results.push({
        id: '1',
        title: '고정값 입력 의심',
        description: '모든 역량에 같은 점수를 입력한 응답',
        detected: true,
        details: `${fixedValueSkills.length}개 스킬에서 고정값 입력 발견. 영향 받는 스킬: ${
          fixedValueSkills.map(s => `${s.스킬셋}(${s.요구역량})`).join(', ')
        }`
      });
    } else {
      results.push({
        id: '1',
        title: '고정값 입력 의심',
        description: '모든 역량에 같은 점수를 입력한 응답',
        detected: false,
        details: '문제 없음'
      });
    }
    
    // ② 자기기대 과도
    const highExpectationMembers: Record<string, string[]> = {};
    
    editedData.forEach(skill => {
      if (!skill.조직리스트) return;
      
      skill.조직리스트.forEach(member => {
        if (member.이름 === '리더') return; // 리더는 제외
        
        const expectedLevel = Number(member.기대수준);
        if (!isNaN(expectedLevel) && expectedLevel >= 4.8) {
          if (!highExpectationMembers[member.이름]) {
            highExpectationMembers[member.이름] = [];
          }
          highExpectationMembers[member.이름].push(`${skill.스킬셋}(${skill.요구역량})`);
        }
      });
    });
    
    const highExpectationMembersCount = Object.keys(highExpectationMembers).length;
    
    if (highExpectationMembersCount > 0) {
      results.push({
        id: '2',
        title: '자기기대 과도',
        description: '구성원이 스스로에게 매우 높은 기대치를 설정',
        detected: true,
        details: `${highExpectationMembersCount}명의 구성원이 매우 높은 기대수준(4.8 이상)을 설정함. ${
          Object.entries(highExpectationMembers)
            .map(([name, skills]) => `${name}: ${skills.length}개 스킬`)
            .join(', ')
        }`
      });
    } else {
      results.push({
        id: '2',
        title: '자기기대 과도',
        description: '구성원이 스스로에게 매우 높은 기대치를 설정',
        detected: false,
        details: '문제 없음'
      });
    }
    
    // ④ 리더-구성원 기대수준 차이
    const leaderExpectationGapSkills: string[] = [];
    
    editedData.forEach(skill => {
      if (!skill.조직리스트 || skill.조직리스트.length <= 1) return;
      
      // 리더의 기대수준 찾기
      const leaderMember = skill.조직리스트.find(m => m.이름 === '리더');
      if (!leaderMember) return;
      
      const leaderExpectation = Number(leaderMember.기대수준);
      if (isNaN(leaderExpectation)) return;
      
      // 구성원들의 기대수준 평균 계산
      const membersExpectations = skill.조직리스트
        .filter(m => m.이름 !== '리더')
        .map(m => Number(m.기대수준))
        .filter(level => !isNaN(level));
      
      if (membersExpectations.length === 0) return;
      
      const membersExpectationAvg = membersExpectations.reduce((sum, level) => sum + level, 0) / membersExpectations.length;
      
      // 리더와 구성원들의 기대수준 차이가 큰 경우
      if (Math.abs(leaderExpectation - membersExpectationAvg) >= 1.0) {
        leaderExpectationGapSkills.push(`${skill.스킬셋}(${skill.요구역량}): 리더 ${leaderExpectation.toFixed(1)} vs 구성원 ${membersExpectationAvg.toFixed(1)}`);
      }
    });
    
    if (leaderExpectationGapSkills.length > 0) {
      results.push({
        id: '4',
        title: '리더-구성원 기대수준 차이',
        description: '같은 역량에 대해 리더와 구성원의 기대 수준이 크게 다름',
        detected: true,
        details: `${leaderExpectationGapSkills.length}개 역량에서 리더와 구성원 간 기대수준 차이가 큼. ${leaderExpectationGapSkills.join(', ')}`
      });
    } else {
      results.push({
        id: '4',
        title: '리더-구성원 기대수준 차이',
        description: '같은 역량에 대해 리더와 구성원의 기대 수준이 크게 다름',
        detected: false,
        details: '문제 없음'
      });
    }
    
    // ⑤ 극단값 포함
    const extremeValueSkills: string[] = [];
    
    editedData.forEach(skill => {
      if (!skill.조직리스트) return;
      
      // 현재수준이 1이나 5인 구성원 수
      const currentExtreme1Count = skill.조직리스트.filter(m => Number(m.현재수준) === 1).length;
      const currentExtreme5Count = skill.조직리스트.filter(m => Number(m.현재수준) === 5).length;
      
      // 기대수준이 1이나 5인 구성원 수
      const expectedExtreme1Count = skill.조직리스트.filter(m => Number(m.기대수준) === 1).length;
      const expectedExtreme5Count = skill.조직리스트.filter(m => Number(m.기대수준) === 5).length;
      
      // 극단값 비율 계산
      const totalMembers = skill.조직리스트.length;
      const extremeRatio = (currentExtreme1Count + currentExtreme5Count + expectedExtreme1Count + expectedExtreme5Count) / (totalMembers * 2);
      
      // 50% 이상이 극단값인 경우
      if (extremeRatio >= 0.5) {
        extremeValueSkills.push(`${skill.스킬셋}(${skill.요구역량}): ${Math.round(extremeRatio * 100)}%가 극단값`);
      }
    });
    
    if (extremeValueSkills.length > 0) {
      results.push({
        id: '5',
        title: '극단값 포함',
        description: '현재수준 또는 기대수준이 1점, 5점처럼 극단값에 몰려 있음',
        detected: true,
        details: `${extremeValueSkills.length}개 역량에서 극단값이 많음. ${extremeValueSkills.join(', ')}`
      });
    } else {
      results.push({
        id: '5',
        title: '극단값 포함',
        description: '현재수준 또는 기대수준이 1점, 5점처럼 극단값에 몰려 있음',
        detected: false,
        details: '문제 없음'
      });
    }
    
    // ⑥ 기대수준 분산 과도
    const highVarianceSkills: string[] = [];
    
    editedData.forEach(skill => {
      if (!skill.조직리스트 || skill.조직리스트.length <= 1) return;
      
      // 구성원들의 기대수준 (리더 제외)
      const expectationLevels = skill.조직리스트
        .filter(m => m.이름 !== '리더')
        .map(m => Number(m.기대수준))
        .filter(level => !isNaN(level));
      
      if (expectationLevels.length <= 1) return;
      
      // 최대값과 최소값의 차이 계산
      const maxExpectation = Math.max(...expectationLevels);
      const minExpectation = Math.min(...expectationLevels);
      const range = maxExpectation - minExpectation;
      
      // 차이가 2.5 이상인 경우
      if (range >= 2.5) {
        highVarianceSkills.push(`${skill.스킬셋}(${skill.요구역량}): ${minExpectation}~${maxExpectation}`);
      }
    });
    
    if (highVarianceSkills.length > 0) {
      results.push({
        id: '6',
        title: '기대수준 분산 과도',
        description: '동일 직무 또는 팀에서 기대수준이 지나치게 다양',
        detected: true,
        details: `${highVarianceSkills.length}개 역량에서 기대수준 범위가 넓음. ${highVarianceSkills.join(', ')}`
      });
    } else {
      results.push({
        id: '6',
        title: '기대수준 분산 과도',
        description: '동일 직무 또는 팀에서 기대수준이 지나치게 다양',
        detected: false,
        details: '문제 없음'
      });
    }
    
    // ⑧ 팀 내 현재수준 편차 큼
    const highStdDevSkills: string[] = [];
    
    editedData.forEach(skill => {
      if (!skill.조직리스트 || skill.조직리스트.length <= 2) return;
      
      // 구성원들의 현재수준
      const currentLevels = skill.조직리스트
        .map(m => Number(m.현재수준))
        .filter(level => !isNaN(level));
      
      if (currentLevels.length <= 1) return;
      
      // 평균 계산
      const mean = currentLevels.reduce((sum, level) => sum + level, 0) / currentLevels.length;
      
      // 분산 계산
      const variance = currentLevels.reduce((sum, level) => sum + Math.pow(level - mean, 2), 0) / currentLevels.length;
      
      // 표준편차 계산
      const stdDev = Math.sqrt(variance);
      
      // 표준편차가 1.0 이상인 경우
      if (stdDev >= 1.0) {
        highStdDevSkills.push(`${skill.스킬셋}(${skill.요구역량}): 표준편차 ${stdDev.toFixed(2)}`);
      }
    });
    
    if (highStdDevSkills.length > 0) {
      results.push({
        id: '8',
        title: '팀 내 현재수준 편차 큼',
        description: '한 팀 구성원들의 현재수준 편차가 과도함',
        detected: true,
        details: `${highStdDevSkills.length}개 역량에서 현재수준 표준편차가 큼. ${highStdDevSkills.join(', ')}`
      });
    } else {
      results.push({
        id: '8',
        title: '팀 내 현재수준 편차 큼',
        description: '한 팀 구성원들의 현재수준 편차가 과도함',
        detected: false,
        details: '문제 없음'
      });
    }
    
    // ⑨ 응답 불균형 (결측 포함)
    // (이미 결측치 확인 부분이 구현되어 있음)
    if (hasMissingOrganizationData) {
      results.push({
        id: '9',
        title: '응답 불균형 (결측 포함)',
        description: '특정 역량에 응답 누락 또는 일부만 응답',
        detected: true,
        details: '일부 조직원 데이터에 누락된 값이 있습니다.'
      });
    } else {
      results.push({
        id: '9',
        title: '응답 불균형 (결측 포함)',
        description: '특정 역량에 응답 누락 또는 일부만 응답',
        detected: false,
        details: '모든 조직원 데이터가 설정되어 있습니다.'
      });
    }
    
    // ⑩ 리더 vs 구성원 GAP 차이
    const gapDifferenceSkills: string[] = [];
    
    editedData.forEach(skill => {
      if (!skill.조직리스트 || skill.조직리스트.length <= 1) return;
      
      // 리더 멤버 찾기
      const leaderMember = skill.조직리스트.find(m => m.이름 === '리더');
      if (!leaderMember) return;
      
      // 리더의 GAP 계산
      const leaderCurrent = Number(leaderMember.현재수준);
      const leaderExpected = Number(leaderMember.기대수준);
      
      if (isNaN(leaderCurrent) || isNaN(leaderExpected)) return;
      
      const leaderGap = leaderExpected - leaderCurrent;
      
      // 구성원들의 GAP 계산
      const memberGaps = skill.조직리스트
        .filter(m => m.이름 !== '리더')
        .map(m => {
          const current = Number(m.현재수준);
          const expected = Number(m.기대수준);
          return !isNaN(current) && !isNaN(expected) ? expected - current : null;
        })
        .filter(gap => gap !== null) as number[];
      
      if (memberGaps.length === 0) return;
      
      // 구성원 GAP 평균 계산
      const avgMemberGap = memberGaps.reduce((sum, gap) => sum + gap, 0) / memberGaps.length;
      
      // 리더와 구성원 GAP 차이가 0.9 이상인 경우
      if (Math.abs(leaderGap - avgMemberGap) >= 0.9) {
        gapDifferenceSkills.push(`${skill.스킬셋}(${skill.요구역량}): 리더 GAP ${leaderGap.toFixed(1)} vs 구성원 GAP ${avgMemberGap.toFixed(1)}`);
      }
    });
    
    if (gapDifferenceSkills.length > 0) {
      results.push({
        id: '10',
        title: '리더 vs 구성원 GAP 차이',
        description: '구성원이 기대하는 GAP과 리더 기대 GAP 차이 큼',
        detected: true,
        details: `${gapDifferenceSkills.length}개 역량에서 리더와 구성원의 GAP 차이가 큼. ${gapDifferenceSkills.join(', ')}`
      });
    } else {
      results.push({
        id: '10',
        title: '리더 vs 구성원 GAP 차이',
        description: '구성원이 기대하는 GAP과 리더 기대 GAP 차이 큼',
        detected: false,
        details: '문제 없음'
      });
    }
    
    // ⑫ GAP 방향 반전
    const reversedGapSkills: string[] = [];
    
    editedData.forEach(skill => {
      if (!skill.조직리스트 || skill.조직리스트.length <= 1) return;
      
      // 리더 멤버 찾기
      const leaderMember = skill.조직리스트.find(m => m.이름 === '리더');
      if (!leaderMember) return;
      
      // 리더의 GAP 계산
      const leaderCurrent = Number(leaderMember.현재수준);
      const leaderExpected = Number(leaderMember.기대수준);
      
      if (isNaN(leaderCurrent) || isNaN(leaderExpected)) return;
      
      const leaderGap = leaderExpected - leaderCurrent;
      
      // 리더 GAP이 작은 경우 건너뜀
      if (leaderGap < 1.0) return;
      
      // 구성원들 중 GAP이 매우 작거나 음수인 구성원 확인
      const lowGapMembers = skill.조직리스트
        .filter(m => m.이름 !== '리더')
        .filter(m => {
          const current = Number(m.현재수준);
          const expected = Number(m.기대수준);
          if (isNaN(current) || isNaN(expected)) return false;
          
          const gap = expected - current;
          return gap <= 0.3; // 0.3 이하인 경우 (방향 반전이거나 매우 작은 GAP)
        });
      
      if (lowGapMembers.length > 0) {
        reversedGapSkills.push(`${skill.스킬셋}(${skill.요구역량}): 리더 GAP ${leaderGap.toFixed(1)} vs ${lowGapMembers.length}명 구성원 GAP ≤0.3`);
      }
    });
    
    if (reversedGapSkills.length > 0) {
      results.push({
        id: '12',
        title: 'GAP 방향 반전',
        description: '리더는 GAP이 크다고 보지만 구성원은 작다고 응답',
        detected: true,
        details: `${reversedGapSkills.length}개 역량에서 GAP 방향 반전 발견. ${reversedGapSkills.join(', ')}`
      });
    } else {
      results.push({
        id: '12',
        title: 'GAP 방향 반전',
        description: '리더는 GAP이 크다고 보지만 구성원은 작다고 응답',
        detected: false,
        details: '문제 없음'
      });
    }
    
    setAnalysisResults(results);
    setShowAnalysis(true);
  }, [editedData, hasMissingOrganizationData, setAlertMessage]);

  return (
    <>
      {completedSteps.has('data') ? (
        <div className="validation-content">
          <h3>데이터 유효성 검증</h3>
          <p>업로드된 데이터의 유효성을 검증하고 필요시 수정합니다.</p>
          
          {alertMessage && (
            <div className={`alert-message ${hasInvalidData ? 'error' : 'success'}`}>
              {alertMessage}
            </div>
          )}
          
          <div className="validation-area">
            <div className="validation-section">
              <h4 className="validation-title">필수 항목 검증</h4>
              <div className="validation-items">
                <div className={`validation-item ${hasSkillSets ? 'success' : 'error'}`}>
                  <span className="validation-icon">{hasSkillSets ? '✓' : '✗'}</span>
                  <span className="validation-text">
                    {hasSkillSets 
                      ? '스킬셋 항목이 존재합니다.' 
                      : '스킬셋 항목이 존재하지 않습니다.'}
                  </span>
                </div>
                <div className={`validation-item ${hasRequirements ? 'success' : 'error'}`}>
                  <span className="validation-icon">{hasRequirements ? '✓' : '✗'}</span>
                  <span className="validation-text">
                    {hasRequirements 
                      ? '요구역량 항목이 존재합니다.' 
                      : '요구역량 항목이 존재하지 않습니다.'}
                  </span>
                </div>
                <div className={`validation-item ${hasOrganizationList ? 'success' : 'error'}`}>
                  <span className="validation-icon">{hasOrganizationList ? '✓' : '✗'}</span>
                  <span className="validation-text">
                    {hasOrganizationList 
                      ? '조직리스트가 존재합니다.' 
                      : '조직리스트가 존재하지 않습니다.'}
                  </span>
                </div>
                <div className={`validation-item ${!hasMissingOrganizationData ? 'success' : 'warning'}`}>
                  <span className="validation-icon">{!hasMissingOrganizationData ? '✓' : '!'}</span>
                  <span className="validation-text">
                    {!hasMissingOrganizationData 
                      ? '모든 조직원 데이터가 설정되어 있습니다.' 
                      : '일부 조직원 데이터에 누락된 값이 있습니다.'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="validation-section">
              <h4 className="validation-title">데이터 그리드 및 차트</h4>
              
              <div className="skill-selector">
                <label htmlFor="skill-select">스킬셋/역량 선택:</label>
                <select 
                  id="skill-select"
                  value={selectedSkill !== null ? selectedSkill : ''}
                  onChange={(e) => setSelectedSkill(e.target.value ? Number(e.target.value) : null)}
                  className="validation-select"
                >
                  <option value="">선택하세요</option>
                  {editedData.map((skill, index) => (
                    <option key={index} value={index}>
                      {skill.스킬셋} - {skill.요구역량}
                    </option>
                  ))}
                </select>
                
                <div className="view-toggle">
                  <button 
                    className={`toggle-button ${!showCharts ? 'active' : ''}`}
                    onClick={() => setShowCharts(false)}
                  >
                    그리드 보기
                  </button>
                  <button 
                    className={`toggle-button ${showCharts ? 'active' : ''}`}
                    onClick={() => setShowCharts(true)}
                  >
                    차트 보기
                  </button>
                </div>
              </div>
              
              {selectedSkill !== null && (
                <div className="validation-data-view">
                  {!showCharts ? (
                    <div className="data-grid-container">
                      {tableData.length > 0 ? (
                        <>
                          <table {...getTableProps()} className="validation-table">
                            <thead>
                              {headerGroups.map((headerGroup: any) => (
                                <tr {...headerGroup.getHeaderGroupProps()}>
                                  {headerGroup.headers.map((column: any) => (
                                    <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                                      {column.render('Header')}
                                      <span>
                                        {column.isSorted
                                          ? column.isSortedDesc
                                            ? ' 🔽'
                                            : ' 🔼'
                                          : ''}
                                      </span>
                                    </th>
                                  ))}
                                </tr>
                              ))}
                            </thead>
                            <tbody {...getTableBodyProps()}>
                              {rows.map((row: any) => {
                                prepareRow(row);
                                return (
                                  <tr {...row.getRowProps()}>
                                    {row.cells.map((cell: any) => (
                                      <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          
                          <div className="grid-actions">
                            <button 
                              className="action-button save"
                              onClick={saveChanges}
                            >
                              변경사항 저장
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="empty-table-message">
                          <p>조직원 데이터가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="chart-container">
                      {chartData.length > 0 ? (
                        <>
                          <h5>조직원 현재/기대 수준 비교</h5>
                          
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={chartData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 30,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis domain={[0, 5]} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="현재수준" fill="#8884d8" name="현재수준" />
                              <Bar dataKey="기대수준" fill="#82ca9d" name="기대수준" />
                            </BarChart>
                          </ResponsiveContainer>
                          
                          <h5>조직원 수준 차이 분석</h5>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={chartData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 30,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis domain={[-5, 5]} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="차이" fill={chartData.some(d => d.차이 < 0) ? "#ff7300" : "#00C49F"} name="수준 차이" />
                            </BarChart>
                          </ResponsiveContainer>
                        </>
                      ) : (
                        <div className="empty-chart-message">
                          <p>차트를 표시할 데이터가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 데이터 분석 섹션 - 더 뚜렷하게 표시 */}
            <div className="validation-section" style={{ marginTop: '2rem', borderTop: '2px solid #4CAF50', paddingTop: '1rem' }}>
              <h4 className="validation-title" style={{ fontSize: '1.2rem', color: '#2E7D32' }}>
                스킬 데이터 분석
                <span style={{ fontSize: '0.9rem', marginLeft: '10px', fontWeight: 'normal', color: '#666' }}>
                  (데이터 품질 및 일관성 검사)
                </span>
              </h4>
              
              <div className="analysis-actions" style={{ margin: '1.5rem 0', textAlign: 'center' }}>
                <button 
                  className="action-button analysis"
                  onClick={analyzeData}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    fontSize: '1rem', 
                    backgroundColor: '#4CAF50',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  데이터 분석 실행
                </button>
              </div>
              
              {showAnalysis && (
                <div className="analysis-results">
                  <h5>분석 결과</h5>
                  
                  <div className="analysis-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>번호</th>
                          <th>점검 항목</th>
                          <th>설명</th>
                          <th>상태</th>
                          <th>세부 정보</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResults.map(result => (
                          <tr key={result.id} className={result.detected ? 'warning-row' : 'success-row'}>
                            <td>{result.id}</td>
                            <td>{result.title}</td>
                            <td>{result.description}</td>
                            <td>
                              <span className={`status-badge ${result.detected ? 'warning' : 'success'}`}>
                                {result.detected ? '주의' : '정상'}
                              </span>
                            </td>
                            <td className="details-cell">{result.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="step-navigation">
            <button 
              className="nav-button prev"
              onClick={onPrev}
            >
              이전 단계
            </button>
            
            <button 
              className="nav-button next"
              onClick={handleComplete}
            >
              다음 단계
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>먼저 데이터를 확인해주세요.</p>
          <button 
            className="nav-button"
            onClick={onPrev}
          >
            업로드 데이터 확인 단계로 이동
          </button>
        </div>
      )}
    </>
  );
}; 