import { useState, useRef, useCallback } from 'react'
import '../styles/SkillAnalysis.css'
import * as XLSX from 'xlsx'
import { ValidationStep } from './ValidationStep'
import { AnalysisResultStep } from './AnalysisResultStep'
import SkillFrequencyStep from './SkillFrequencyStep'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 초기화
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface SkillAnalysisProps {
  onBack: () => void
}

// 데이터셋 타입 정의
export interface DataSheet {
  name: string;
  data: Record<string, any>[];
  originalColumns?: string[]; // 원본 열 이름 저장
}

// 통합 데이터셋 인터페이스 정의
export interface SkillData {
  팀: string;
  팀업무: string;
  핵심기술: string;
  스킬셋: string;
  업무스킬: string;
  구분: string;
  현재수준: number;
  기대수준: number;
  L1: string;
  L2: string;
  L3: string;
  L4: string;
  L5: string;
  조직리스트: Array<{
    이름: string;
    현재수준: string | number;
    기대수준: string | number;
  }>;
}

// 단계 타입 정의
type Step = 'upload' | 'data' | 'validation' | 'analysis' | 'frequency';

export function SkillAnalysis({ onBack }: SkillAnalysisProps) {
  // 파일 입력 참조
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 상태 관리
  const [dataset, setDataset] = useState<DataSheet[]>([]);
  const [integratedData, setIntegratedData] = useState<SkillData[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 단계 관리
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  
  // 패널 열기/닫기 상태
  const [expandedPanels, setExpandedPanels] = useState<Set<Step>>(new Set(['upload']));
  
  // 유효성 검사 후 데이터 업데이트 처리
  const handleDataUpdate = useCallback((updatedData: SkillData[]) => {
    console.log('SkillAnalysis - 데이터 업데이트 수신:', updatedData);
    
    if (updatedData && updatedData.length > 0) {
      // 업데이트된 데이터의 깊은 복사본 생성
      const newData = JSON.parse(JSON.stringify(updatedData));
      setIntegratedData(newData);
      console.log('SkillAnalysis - 업데이트된 통합 데이터:', newData);
    } else {
      console.warn('SkillAnalysis - 빈 데이터가 전달되었습니다');
    }
  }, []);
  
  // 파일 업로드 및 처리 함수
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    
    // FileReader를 사용하여 파일 읽기
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // 워크북에서 모든 시트 읽기
        const sheets: DataSheet[] = [];
        const rawSheets: Record<string, any[]> = {};
        
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          const worksheet = workbook.Sheets[sheetName];
          // 시트의 JSON 데이터 얻기 (header: 1은 첫 번째 행을 헤더로 사용)
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (rawData.length > 0) {
            // 첫 번째 행을 헤더로 사용
            const allHeaders = rawData[0] as string[];
            let headers = [...allHeaders];
            
            // 시트 인덱스에 따라 표시할 열 필터링 (0부터 시작)
            if (sheetIndex === 1) { // 두 번째 시트
              headers = allHeaders.slice(0, 5); // 0~4번째 열만 표시
            } else if (sheetIndex === 2) { // 세 번째 시트
              // 4번째와 6번째 이후 열만 표시
              headers = [
                allHeaders[4], // 4번째 열
                ...allHeaders.slice(6) // 6번째 이후 열
              ].filter(Boolean); // undefined 제거
            }
            
            // 나머지 행을 데이터로 사용
            const rows = rawData.slice(1).map((row: any) => {
              const obj: Record<string, any> = {};
              
              if (sheetIndex === 1) { // 두 번째 시트
                // 0~4번째 열만 처리
                for (let i = 0; i < 5 && i < allHeaders.length; i++) {
                  if (allHeaders[i]) {
                    obj[allHeaders[i]] = row[i] ?? '';
                  }
                }
              } else if (sheetIndex === 2) { // 세 번째 시트
                // 4번째 열 처리
                if (allHeaders[4]) {
                  obj[allHeaders[4]] = row[4] ?? '';
                }
                
                // 6번째 이후 열 처리
                for (let i = 6; i < allHeaders.length; i++) {
                  if (allHeaders[i]) {
                    let value = row[i] ?? '';
                    
                    // "L3"와 같은 형식에서 숫자만 추출
                    if (typeof value === 'string' && value.startsWith('L')) {
                      const numericValue = value.replace(/\D/g, '');
                      if (numericValue) {
                        value = parseInt(numericValue, 10);
                      }
                    }
                    
                    obj[allHeaders[i]] = value;
                  }
                }
              } else { // 첫 번째 시트와 나머지 시트
                allHeaders.forEach((header, index) => {
                  if (header) {
                    obj[header] = row[index] ?? '';
                  }
                });
              }
              
              return obj;
            });
            
            sheets.push({
              name: sheetName,
              data: rows,
              originalColumns: allHeaders
            });
            
            // 원시 데이터 저장 (통합을 위해)
            rawSheets[sheetName] = rows;
          }
        });
        
        // 데이터셋 통합
        const integrated = integrateDatasets(rawSheets);
        
        setDataset(sheets);
        setIntegratedData(integrated);
        setIsLoading(false);
        console.log('데이터셋 로드 완료:', sheets);
        console.log('통합 데이터셋:', integrated);
        
        // 업로드 완료 후 다음 단계로 이동
        setCompletedSteps(prev => {
          const newSet = new Set(prev);
          newSet.add('upload');
          return newSet;
        });
        
        // 데이터 단계로 이동하고 해당 패널만 펼침
        setCurrentStep('data');
        setExpandedPanels(new Set(['data']));
      } catch (err) {
        console.error('파일 처리 중 오류 발생:', err);
        setError('파일을 처리하는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('파일을 읽는 중 오류가 발생했습니다.');
      setIsLoading(false);
    };
    
    // 파일을 binary string으로 읽기
    reader.readAsBinaryString(file);
  };
  
  // 데이터셋 통합 함수
  const integrateDatasets = (rawSheets: Record<string, any[]>): SkillData[] => {
    console.log('데이터셋 통합 시작:', rawSheets);
    const integrated: SkillData[] = [];
    const sheetNames = Object.keys(rawSheets);
    
    // 첫 번째, 두 번째, 세 번째 시트 이름 가져오기
    const teamSheetName = sheetNames[0] || '';
    const skillSheetName = sheetNames[1] || '';
    const levelSheetName = sheetNames[2] || '';
    
    const teamSheet = rawSheets[teamSheetName] || []; // 첫 번째 시트 (팀 정보)
    const skillSheet = rawSheets[skillSheetName] || []; // 두 번째 시트 (스킬셋, 요구역량)
    const levelSheet = rawSheets[levelSheetName] || []; // 세 번째 시트 (현재/기대 수준, L1-L5)
    
    // 팀 정보 가져오기
    const teamInfo = teamSheet.length > 0 ? teamSheet[0] : {};
    const teamName = teamInfo['팀'] || '';
    const teamWork = teamInfo['팀업무'] || '';
    const coreSkill = teamInfo['핵심기술'] || '';
    
    // 요구역량 맵 생성 (스킬셋 + 요구역량을 키로 사용)
    const skillMap = new Map<string, any>();
    
    // 스킬셋 및 요구역량 데이터 처리
    skillSheet.forEach(skill => {
      const skillSet = skill['스킬셋'] || '';
      const requirement = skill['업무스킬'] || skill['요구역량'] || '';
      const currentLevel = skill['현재수준'] || '';
      const expectedLevel = skill['기대수준'] || '';
      const category = skill['구분'] || '미분류';
      
      if (skillSet && requirement) {
        const key = `${skillSet}:${requirement}`;
        skillMap.set(key, {
          팀: teamName,
          팀업무: teamWork,
          핵심기술: coreSkill,
          스킬셋: skillSet,
          업무스킬: requirement,
          구분: category,
          조직리스트 : []
        });

        skillMap.get(key).조직리스트.push({
          이름:'리더',
          현재수준: currentLevel,
          기대수준: expectedLevel
        });
      }
    });
    
    // 레벨 데이터 처리
    levelSheet.forEach(level => {
      const name = level['이름'] || '';
      
      // 스킬맵 키를 배열로 변환
      const skillKeys = Array.from(skillMap.keys());
      console.log('스킬 키 목록:', skillKeys);

      for (let i = 0; i < skillKeys.length; i++) {
        const skillKey = skillKeys[i];
        
        // 각 조직원의 데이터 객체 생성
        const data = {
          이름: name,
          현재수준: '',
          기대수준: ''
        };

        console.log('레벨 데이터:', i);
        
        // 인덱스에 따라 현재/기대 수준 필드 이름 결정
        const currentLevelField = i === 0 ? '현재수준' : `현재수준${i+1}`;
        const expectedLevelField = i === 0 ? '기대수준' : `기대수준${i+1}`;
        
        // 레벨 데이터 가져오기
        data.현재수준 = level[currentLevelField] || '';
        data.기대수준 = level[expectedLevelField] || '';
        
        // console.log(`조직원 ${name} 스킬 ${skillKey} 데이터:`, data);
        
        // 유효한 키인 경우에만 조직리스트에 추가
        if (skillMap.has(skillKey)) {
          skillMap.get(skillKey).조직리스트.push(data);
        }
      }
    });
    
    // Map을 배열로 변환
    skillMap.forEach(value => {
      integrated.push(value);
    });
    
    console.log('통합된 데이터셋:', integrated);
    return integrated;
  };
  
  // 파일 업로드 트리거 함수
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  // 시트 인덱스에 따라 표시할 열 결정
  const getDisplayColumns = (sheet: DataSheet, sheetIndex: number) => {
    const dataKeys = Object.keys(sheet.data[0] || {});
    
    if (sheetIndex === 1) { // 두 번째 시트
      // 이미 데이터 처리 단계에서 필터링됨
      return dataKeys;
    } else if (sheetIndex === 2) { // 세 번째 시트
      // 이미 데이터 처리 단계에서 필터링됨
      return dataKeys;
    }
    
    return dataKeys;
  };
  
  // 특정 단계로 이동하는 함수
  const handleGoToStep = (step: Step) => {
    // 이전 단계가 완료되었는지 검증
    if (step === 'data' && !completedSteps.has('upload')) {
      alert('먼저 파일을 업로드해주세요.');
      return;
    }
    
    if (step === 'validation' && !completedSteps.has('data')) {
      alert('먼저 데이터를 확인해주세요.');
      return;
    }

    if (step === 'analysis' && !completedSteps.has('validation')) {
      alert('먼저 입력값을 검증해주세요.');
      return;
    }
    
    // 해당 단계로 이동하고 해당 패널만 펼침
    setCurrentStep(step);
    setExpandedPanels(new Set([step]));
  };
  
  // 다음 단계로 이동
  const handleNext = () => {
    if (currentStep === 'upload' && completedSteps.has('upload')) {
      handleGoToStep('data');
    } else if (currentStep === 'data' && completedSteps.has('data')) {
      handleGoToStep('validation');
    } else if (currentStep === 'validation' && completedSteps.has('validation')) {
      handleGoToStep('analysis');
    } else if (currentStep === 'analysis' && completedSteps.has('analysis')) {
      handleGoToStep('frequency');
    }
  };
  
  // 이전 단계로 이동
  const handlePrev = () => {
    if (currentStep === 'data') {
      handleGoToStep('upload');
    } else if (currentStep === 'validation') {
      handleGoToStep('data');
    } else if (currentStep === 'analysis') {
      handleGoToStep('validation');
    } else if (currentStep === 'frequency') {
      handleGoToStep('analysis');
    }
  };
  
  // 데이터 확인 완료 처리
  const completeDataStep = () => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add('data');
      return newSet;
    });
    
    // 입력값 검증 단계로 이동하고 해당 패널만 펼침
    setCurrentStep('validation');
    setExpandedPanels(new Set(['validation']));
  };

  // 입력값 검증 완료 처리
  const completeValidationStep = async () => {
    console.log('입력값 검증 완료, 현재 통합 데이터:', integratedData);

    await saveIntegratedData(integratedData);
    
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add('validation');
      return newSet;
    });
    
    // 분석 단계로 이동하고 해당 패널만 펼침
    setCurrentStep('analysis');
    setExpandedPanels(new Set(['analysis']));
  };
  
  const saveIntegratedData = async (data: SkillData[]) => {
    if (!data || data.length === 0) return;
    
    try {
      // Supabase에 데이터 저장을 위해 기존 데이터를 확인
      // 먼저 기존 데이터 삭제 후 저장
      const teamName = data[0]?.팀 || '미지정';
      
      console.log(data);

      var saveNo = 0;
      // 각 스킬에 대한 평균 기대역량 및 현재역량 계산
      const skillAnalysisData = data.map(skill => {
        if (!skill.조직리스트 || skill.조직리스트.length === 0) {
          return {
            팀명: teamName,
            스킬셋: skill.스킬셋,
            업무스킬: skill.업무스킬,
            현재역량평균: 0,
            기대역량평균: 0,
            분석일자: new Date()
          };
        }
        
        // 데이터 계산을 위한 변수
        let totalCurrent = 0;
        let totalExpected = 0;
        let validCount = 0;
        
        // 각 조직원의 데이터 집계
        skill.조직리스트.forEach(member => {
          const current = Number(member.현재수준);
          const expected = Number(member.기대수준);
          
          if (!isNaN(current) && !isNaN(expected)) {
            totalCurrent += current;
            totalExpected += expected;
            validCount++;
          }
        });
        
        // 평균 계산
        const avgCurrent = validCount > 0 ? totalCurrent / validCount : 0;
        const avgExpected = validCount > 0 ? totalExpected / validCount : 0;
        
        return {
          팀명: teamName,
          순번: saveNo++,
          스킬셋: skill.스킬셋,
          업무스킬: skill.업무스킬,
          구분: skill.구분 || '미분류',
          현재역량: parseFloat(avgCurrent.toFixed(2)),
          기대역량: parseFloat(avgExpected.toFixed(2)),
          분석일자: new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString()
        };
      });
      
      // 1. 해당 팀의 기존 데이터 삭제
      const { error: deleteError } = await supabase
        .from('frequency_data')
        .delete()
        .eq('팀명', teamName);
      
      if (deleteError) {
        console.error('기존 데이터 삭제 오류:', deleteError);
        // 삭제 실패해도 계속 진행
      }
      
      // 2. 새 데이터 삽입
      const { data: insertedData, error: insertError } = await supabase
        .from('frequency_data')
        .insert(skillAnalysisData)
        .select();
      
      if (insertError) {
        console.error('데이터 저장 오류:', insertError);
        alert('데이터 저장에 실패했습니다: ' + insertError.message);
      } else {
        console.log('데이터 저장 성공:', insertedData);
      }
    } catch (dbErr) {
      console.error('데이터베이스 작업 오류:', dbErr);
      alert('데이터베이스 작업 중 오류가 발생했습니다.');
    }
  };
  
  // 분석 결과 완료 처리
  const completeAnalysisStep = () => {
    console.log('분석 결과 완료, 스킬셋 빈도 분석으로 이동');
    
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add('analysis');
      return newSet;
    });
    
    // 스킬셋 빈도 분석 단계로 이동하고 해당 패널만 펼침
    setCurrentStep('frequency');
    setExpandedPanels(new Set(['frequency']));
  };
  
  // 패널 토글 함수
  const togglePanel = (panel: Step) => {
    setExpandedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panel)) {
        newSet.delete(panel);
      } else {
        // 나머지 패널은 모두 닫고 선택한 패널만 열기
        newSet.clear();
        newSet.add(panel);
      }
      return newSet;
    });
  };
  
  // 단계 완료 처리
  const completeStep = useCallback((step: string, nextStep: string) => {
    // ... existing code ...
  }, []);
  
  
  
  return (
    <div className="skill-analysis">
      <div className="button-group">
        <button 
          className="skill-set-button back-button"
          onClick={onBack}
        >
          홈으로
        </button>
      </div>
      
      <div className="skill-set-header">
        <h1 className="skill-set-title">스킬 분석</h1>
        
        {/* 단계 진행 표시기 */}
        <div className="step-progress">
          <div 
            className={`step-item ${currentStep === 'upload' ? 'active' : ''} ${completedSteps.has('upload') ? 'completed' : ''}`}
            onClick={() => handleGoToStep('upload')}
          >
            <div className="step-number">1</div>
            <div className="step-label">파일 업로드</div>
          </div>
          <div className="step-connector"></div>
          <div 
            className={`step-item ${currentStep === 'data' ? 'active' : ''} ${completedSteps.has('data') ? 'completed' : ''}`}
            onClick={() => completedSteps.has('upload') && handleGoToStep('data')}
          >
            <div className="step-number">2</div>
            <div className="step-label">업로드 데이터 확인</div>
          </div>
          <div className="step-connector"></div>
          <div 
            className={`step-item ${currentStep === 'validation' ? 'active' : ''} ${completedSteps.has('validation') ? 'completed' : ''}`}
            onClick={() => completedSteps.has('data') && handleGoToStep('validation')}
          >
            <div className="step-number">3</div>
            <div className="step-label">입력값 검증</div>
          </div>
          <div className="step-connector"></div>
          <div 
            className={`step-item ${currentStep === 'analysis' ? 'active' : ''} ${completedSteps.has('analysis') ? 'completed' : ''}`}
            onClick={() => completedSteps.has('validation') && handleGoToStep('analysis')}
          >
            <div className="step-number">4</div>
            <div className="step-label">분석 결과</div>
          </div>
          <div className="step-connector"></div>
          <div 
            className={`step-item ${currentStep === 'frequency' ? 'active' : ''} ${completedSteps.has('frequency') ? 'completed' : ''}`}
            onClick={() => completedSteps.has('analysis') && handleGoToStep('frequency')}
          >
            <div className="step-number">5</div>
            <div className="step-label">스킬셋 빈도</div>
          </div>
        </div>
        
        {/* 파일 업로드 단계 */}
        <div className={`step-panel ${expandedPanels.has('upload') ? 'expanded' : 'collapsed'}`}>
          <div className="panel-header" onClick={() => togglePanel('upload')}>
            <h2 className="step-title">Step 1. 파일 업로드</h2>
            <button className="toggle-button">
              {expandedPanels.has('upload') ? '접기' : '펼치기'}
            </button>
          </div>
          
          <div className="panel-content">
            <div className="file-upload-container">
              <div className="file-upload-box" onClick={triggerFileUpload}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="file-input" 
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div className="upload-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path fillRule="evenodd" d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="upload-text">
                  {fileName ? fileName : 'Excel 파일을 업로드하세요 (.xlsx, .xls)'}
                </p>
                <p className="upload-hint">클릭하여 파일 선택 또는 파일을 여기에 드래그하세요</p>
              </div>
              
              {isLoading && (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <p>파일 처리 중...</p>
                </div>
              )}
              
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}
            </div>
            
            {completedSteps.has('upload') && (
              <div className="step-navigation">
                <button 
                  className="nav-button next"
                  onClick={handleNext}
                >
                  다음 단계
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 데이터 확인 단계 */}
        <div className={`step-panel ${expandedPanels.has('data') ? 'expanded' : 'collapsed'}`}>
          <div className="panel-header" onClick={() => togglePanel('data')}>
            <h2 className="step-title">Step 2. 업로드 데이터 확인</h2>
            <button className="toggle-button">
              {expandedPanels.has('data') ? '접기' : '펼치기'}
            </button>
          </div>
          
          <div className="panel-content">
            {dataset.length > 0 ? (
              <div className="dataset-summary">
                <div className="dataset-info">
                  <p>파일명: {fileName}</p>
                  <p>시트 수: {dataset.length}개</p>
                  <p>데이터 항목: 
                    {dataset.map(sheet => (
                      <span key={sheet.name}>{sheet.name} ({sheet.data.length}개)</span>
                    )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[])}
                  </p>
                </div>
                
                <div className="dataset-sheets">
                  {dataset.map((sheet, sheetIndex) => (
                    <div key={sheet.name} className="dataset-sheet">
                      <h3 className="sheet-name">{sheet.name}</h3>
                      {sheet.data.length > 0 ? (
                        <div className="sheet-preview">
                          <table className="data-table">
                            <thead>
                              <tr>
                                {getDisplayColumns(sheet, sheetIndex).map(header => (
                                  <th key={header}>{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sheet.data.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {getDisplayColumns(sheet, sheetIndex).map(key => (
                                    <td key={key}>{row[key] !== undefined ? String(row[key]) : ''}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="no-data">데이터가 없습니다.</p>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="step-navigation">
                  <button 
                    className="nav-button prev"
                    onClick={handlePrev}
                  >
                    이전 단계
                  </button>
                  
                  <button 
                    className="nav-button next"
                    onClick={completeDataStep}
                  >
                    다음 단계
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>먼저 파일을 업로드해주세요.</p>
                <button 
                  className="nav-button"
                  onClick={() => handleGoToStep('upload')}
                >
                  업로드 단계로 이동
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 입력값 검증 단계 */}
        <div className={`step-panel ${expandedPanels.has('validation') ? 'expanded' : 'collapsed'}`}>
          <div className="panel-header" onClick={() => togglePanel('validation')}>
            <h2 className="step-title">Step 3. 입력값 검증</h2>
            <button className="toggle-button">
              {expandedPanels.has('validation') ? '접기' : '펼치기'}
            </button>
          </div>
          
          <div className="panel-content">
            <ValidationStep 
              dataset={dataset}
              integratedData={integratedData}
              onPrev={() => handlePrev()}
              onComplete={() => completeValidationStep()}
              completedSteps={completedSteps}
              onDataUpdate={handleDataUpdate}
            />
          </div>
        </div>
        
        {/* 분석 결과 단계 */}
        <div className={`step-panel ${expandedPanels.has('analysis') ? 'expanded' : 'collapsed'}`}>
          <div className="panel-header" onClick={() => togglePanel('analysis')}>
            <h2 className="step-title">Step 4. 분석 결과</h2>
            <button className="toggle-button">
              {expandedPanels.has('analysis') ? '접기' : '펼치기'}
            </button>
          </div>
          
          <div className="panel-content">
            <AnalysisResultStep 
              integratedData={integratedData}
              onPrev={() => handlePrev()}
              completedSteps={completedSteps}
            />
            
            <div className="step-navigation">
              <button 
                className="nav-button prev"
                onClick={handlePrev}
              >
                이전 단계
              </button>
              
              <button 
                className="nav-button next"
                onClick={completeAnalysisStep}
              >
                다음 단계
              </button>
            </div>
          </div>
        </div>
        
        {/* 스킬셋 빈도 분석 단계 */}
        <div className={`step-panel ${expandedPanels.has('frequency') ? 'expanded' : 'collapsed'}`}>
          <div className="panel-header" onClick={() => togglePanel('frequency')}>
            <h2 className="step-title">Step 5. 스킬셋 빈도 분석</h2>
            <button className="toggle-button">
              {expandedPanels.has('frequency') ? '접기' : '펼치기'}
            </button>
          </div>
          
          <div className="panel-content">
            <SkillFrequencyStep 
              integratedData={integratedData}
              onPrev={() => handlePrev()}
              completedSteps={completedSteps}
              onComplete={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 