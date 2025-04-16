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
  
  // 조직리스트 데이터 누락 확인
  const hasMissingOrganizationData = editedData.some(item => 
    item.조직리스트 && item.조직리스트.some(member => 
      !member.현재수준 || !member.기대수준
    )
  );

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

  return (
    <>
      {completedSteps.has('data') ? (
        <div className="validation-content">
          <h3>데이터 유효성 검증</h3>
          <p>업로드된 데이터의 유효성을 검증하고 필요시 수정합니다.</p>
          
          {/* 디버깅용 정보 표시 */}
          <div style={{ margin: '10px 0', padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px' }}>
            <p>데이터 항목 수: {editedData.length}</p>
            {selectedSkill !== null && (
              <p>선택된 스킬: {selectedSkill} - {editedData[selectedSkill]?.스킬셋} / {editedData[selectedSkill]?.요구역량}</p>
            )}
            {selectedSkillData && selectedSkillData.조직리스트 && (
              <p>조직 구성원 수: {selectedSkillData.조직리스트.length}</p>
            )}
          </div>
          
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