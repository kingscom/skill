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
}

export function SkillAnalysis({ onBack }: SkillAnalysisProps) {
  // 파일 입력 참조
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 상태 관리
  const [dataset, setDataset] = useState<DataSheet[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          // 시트의 JSON 데이터 얻기 (header: 1은 첫 번째 행을 헤더로 사용)
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (rawData.length > 0) {
            // 첫 번째 행을 헤더로 사용
            const headers = rawData[0] as string[];
            
            // 나머지 행을 데이터로 사용
            const rows = rawData.slice(1).map((row: any) => {
              const obj: Record<string, any> = {};
              headers.forEach((header, index) => {
                if (header) { // 빈 헤더 건너뛰기
                  obj[header] = row[index] ?? ''; // undefined인 경우 빈 문자열로 처리
                }
              });
              return obj;
            });
            
            sheets.push({
              name: sheetName,
              data: rows
            });
          }
        });
        
        setDataset(sheets);
        setIsLoading(false);
        console.log('데이터셋 로드 완료:', sheets);
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
        
        {dataset.length > 0 && (
          <div className="dataset-summary">
            <h2 className="dataset-title">업로드된 데이터</h2>
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
              {dataset.map(sheet => (
                <div key={sheet.name} className="dataset-sheet">
                  <h3 className="sheet-name">{sheet.name}</h3>
                  {sheet.data.length > 0 ? (
                    <div className="sheet-preview">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {Object.keys(sheet.data[0]).map(header => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sheet.data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {Object.values(row).map((value, valueIndex) => (
                                <td key={valueIndex}>{value !== undefined ? String(value) : ''}</td>
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
          </div>
        )}
      </div>
    </div>
  )
} 