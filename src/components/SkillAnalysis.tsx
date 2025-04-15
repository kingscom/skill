import { useState, useRef } from 'react'
import '../styles/SkillAnalysis.css'
import * as XLSX from 'xlsx'

interface SkillAnalysisProps {
  onBack: () => void
}

// 데이터셋 타입 정의
interface DataSheet {
  name: string;
  data: Record<string, any>[];
  originalColumns?: string[]; // 원본 열 이름 저장
}

// 단계 타입 정의
type Step = 'upload' | 'data' | 'analysis';

export function SkillAnalysis({ onBack }: SkillAnalysisProps) {
  // 파일 입력 참조
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 상태 관리
  const [dataset, setDataset] = useState<DataSheet[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 단계 관리
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());
  
  // 패널 열기/닫기 상태
  const [expandedPanels, setExpandedPanels] = useState<Set<Step>>(new Set(['upload']));
  
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
          }
        });
        
        setDataset(sheets);
        setIsLoading(false);
        console.log('데이터셋 로드 완료:', sheets);
        
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
    
    if (step === 'analysis' && !completedSteps.has('data')) {
      alert('먼저 데이터를 확인해주세요.');
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
      handleGoToStep('analysis');
    }
  };
  
  // 이전 단계로 이동
  const handlePrev = () => {
    if (currentStep === 'data') {
      handleGoToStep('upload');
    } else if (currentStep === 'analysis') {
      handleGoToStep('data');
    }
  };
  
  // 데이터 확인 완료 처리
  const completeDataStep = () => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add('data');
      return newSet;
    });
    
    // 분석 단계로 이동하고 해당 패널만 펼침
    setCurrentStep('analysis');
    setExpandedPanels(new Set(['analysis']));
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
            <div className="step-label">데이터 확인</div>
          </div>
          <div className="step-connector"></div>
          <div 
            className={`step-item ${currentStep === 'analysis' ? 'active' : ''} ${completedSteps.has('analysis') ? 'completed' : ''}`}
            onClick={() => completedSteps.has('data') && handleGoToStep('analysis')}
          >
            <div className="step-number">3</div>
            <div className="step-label">분석 결과</div>
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
            <h2 className="step-title">Step 2. 데이터 확인</h2>
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
        
        {/* 분석 결과 단계 */}
        <div className={`step-panel ${expandedPanels.has('analysis') ? 'expanded' : 'collapsed'}`}>
          <div className="panel-header" onClick={() => togglePanel('analysis')}>
            <h2 className="step-title">Step 3. 분석 결과</h2>
            <button className="toggle-button">
              {expandedPanels.has('analysis') ? '접기' : '펼치기'}
            </button>
          </div>
          
          <div className="panel-content">
            {completedSteps.has('data') ? (
              <div className="analysis-content">
                <h3>스킬 분석 결과</h3>
                <p>선택한 데이터에 대한 분석 결과입니다.</p>
                
                <div className="analysis-placeholder">
                  <p>분석 결과가 여기에 표시됩니다.</p>
                </div>
                
                <div className="step-navigation">
                  <button 
                    className="nav-button prev"
                    onClick={handlePrev}
                  >
                    이전 단계
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>먼저 데이터를 확인해주세요.</p>
                <button 
                  className="nav-button"
                  onClick={() => handleGoToStep('data')}
                >
                  데이터 확인 단계로 이동
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 