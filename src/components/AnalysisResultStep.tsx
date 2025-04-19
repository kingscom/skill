import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/SkillAnalysis.css';
import { SkillData } from './SkillAnalysis';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';

interface AnalysisResultStepProps {
  integratedData: SkillData[];
  onPrev: () => void;
  completedSteps: Set<string>;
  onComplete?: () => void;
}

// 분석 결과 아이템 인터페이스
interface AnalysisResultItem {
  skillName: string;
  skillSet: string; // 스킬셋 분리
  requiredCompetency: string; // 요구역량 분리
  currentLevel: number;
  expectedLevel: number;
  gap: number;
  gapRank: number;
  tValue: number;
  borichValue: number;
  borichRank: number;
}

export const AnalysisResultStep: React.FC<AnalysisResultStepProps> = ({
  integratedData,
  onPrev,
  completedSteps,
  onComplete
}) => {
  const [analysisData, setAnalysisData] = useState<AnalysisResultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [averageData, setAverageData] = useState<{
    avgCurrentLevel: number;
    avgExpectedLevel: number;
    avgGap: number;
    avgBorich: number;
  }>({
    avgCurrentLevel: 0,
    avgExpectedLevel: 0,
    avgGap: 0,
    avgBorich: 0
  });
  const [chartSize, setChartSize] = useState({ width: 560, height: 400 });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });
  
  // 정렬 상태 추가
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AnalysisResultItem | null;
    direction: 'ascending' | 'descending';
  }>({
    key: null,
    direction: 'ascending'
  });
  
  // 컴포넌트 마운트시 자동으로 분석 실행
  useEffect(() => {
    if (completedSteps.has('validation') && integratedData.length > 0) {
      setIsLoading(true);
      // 비동기로 분석 실행하여 UI가 블록되지 않도록 함
      setTimeout(() => {
        analyzeData();
        setIsLoading(false);
      }, 500);
    }
  }, [completedSteps, integratedData]);
  
  // 컴포넌트 마운트 및 리사이즈 시 차트 크기 조정
  useEffect(() => {
    // 차트 사이즈를 고정값으로 설정
    setChartSize({
      width: 560,
      height: 400
    });
    
    // 리사이즈 이벤트 제거 (고정 사이즈 사용)
  }, []);
  
  // Borich 요구도 분석 함수
  const analyzeData = () => {
    if (!integratedData || integratedData.length === 0) {
      return;
    }
    
    // 전체 스킬셋에 대한 분석 데이터 생성
    const analysisItems: AnalysisResultItem[] = integratedData.map(skill => {
      // 리더를 제외한 팀원들의 현재 수준과 기대 수준 평균 계산
      const members = skill.조직리스트 || [];
      const teamMembers = members.filter(m => 
        m.이름 !== '리더' && !isNaN(Number(m.현재수준)) && !isNaN(Number(m.기대수준))
      );
      
      const currentLevels = teamMembers.map(m => Number(m.현재수준));
      const expectedLevels = teamMembers.map(m => Number(m.기대수준));
      
      const avgCurrent = currentLevels.length > 0
        ? currentLevels.reduce((sum, level) => sum + level, 0) / currentLevels.length
        : 0;
        
      const avgExpected = expectedLevels.length > 0
        ? expectedLevels.reduce((sum, level) => sum + level, 0) / expectedLevels.length
        : 0;
        
      const gap = avgExpected - avgCurrent;
      
      // t-값 계산 (샘플이 작을 경우 간단한 추정치)
      const tValue = calculateTValue(currentLevels, expectedLevels);
      
      // Borich 요구도 계산 (중요도 × 차이)
      const sumOfGaps = teamMembers.reduce((sum, member) => {
        const current = Number(member.현재수준);
        const expected = Number(member.기대수준);
        if (!isNaN(current) && !isNaN(expected)) {
          return sum + (expected - current);
        }
        return sum;
      }, 0);
      
      const borichValue = (sumOfGaps * avgExpected) / teamMembers.length;
      
      return {
        skillName: `${skill.스킬셋}(${skill.요구역량})`,
        skillSet: skill.스킬셋, // 스킬셋만 별도로 저장
        requiredCompetency: skill.요구역량, // 요구역량만 별도로 저장
        currentLevel: parseFloat(avgCurrent.toFixed(2)),
        expectedLevel: parseFloat(avgExpected.toFixed(2)),
        gap: parseFloat(gap.toFixed(2)),
        gapRank: 0, // 초기값, 나중에 계산
        tValue: parseFloat(tValue.toFixed(3)),
        borichValue: parseFloat(borichValue.toFixed(2)),
        borichRank: 0 // 초기값, 나중에 계산
      };
    });
    
    // Gap 기준 순위 계산
    const gapSorted = [...analysisItems].sort((a, b) => b.gap - a.gap);
    gapSorted.forEach((item, index) => {
      const original = analysisItems.find(i => i.skillName === item.skillName);
      if (original) {
        original.gapRank = index + 1;
      }
    });
    
    // Borich 요구도 기준 순위 계산
    const borichSorted = [...analysisItems].sort((a, b) => b.borichValue - a.borichValue);
    borichSorted.forEach((item, index) => {
      const original = analysisItems.find(i => i.skillName === item.skillName);
      if (original) {
        original.borichRank = index + 1;
      }
    });
    
    // 평균값 계산
    const avgCurrentLevel = parseFloat((analysisItems.reduce((sum, item) => sum + item.currentLevel, 0) / analysisItems.length).toFixed(2));
    const avgExpectedLevel = parseFloat((analysisItems.reduce((sum, item) => sum + item.expectedLevel, 0) / analysisItems.length).toFixed(2));
    const avgGap = parseFloat((analysisItems.reduce((sum, item) => sum + item.gap, 0) / analysisItems.length).toFixed(2));
    const avgBorich = parseFloat((analysisItems.reduce((sum, item) => sum + item.borichValue, 0) / analysisItems.length).toFixed(2));
    
    setAnalysisData(analysisItems);
    setAverageData({
      avgCurrentLevel,
      avgExpectedLevel,
      avgGap,
      avgBorich
    });
  };
  
  // t-값 계산 (간단한 추정)
  const calculateTValue = (currentLevels: number[], expectedLevels: number[]): number => {
    if (currentLevels.length !== expectedLevels.length || currentLevels.length === 0) {
      return 0;
    }
    
    // 평균
    const meanCurrent = currentLevels.reduce((sum, val) => sum + val, 0) / currentLevels.length;
    const meanExpected = expectedLevels.reduce((sum, val) => sum + val, 0) / expectedLevels.length;
    
    // 차이의 평균
    const diffs = currentLevels.map((val, i) => expectedLevels[i] - val);
    const meanDiff = diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
    
    // 표준편차 계산
    const squaredDiffs = diffs.map(d => Math.pow(d - meanDiff, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (diffs.length - 1);
    const stdDev = Math.sqrt(variance);
    
    // 표준오차
    const stdError = stdDev / Math.sqrt(diffs.length);
    
    // t-값
    const tValue = meanDiff / (stdError || 1); // 0으로 나누기 방지
    
    // 6점대 t-값으로 스케일링 (시각적 효과를 위한 간단한 조정)
    const scaledTValue = Math.abs(tValue) / 1.5;
    return scaledTValue > 0 ? Math.min(scaledTValue, 10) : 0;
  };
  
  // 정렬 함수 추가
  const requestSort = (key: keyof AnalysisResultItem) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    // 같은 컬럼을 다시 클릭하면 방향 전환
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };
  
  // 정렬된 데이터 가져오기
  const getSortedData = () => {
    if (!sortConfig.key) return analysisData;
    
    const sortableData = [...analysisData];
    
    return sortableData.sort((a, b) => {
      if (a[sortConfig.key!] === null) return 1;
      if (b[sortConfig.key!] === null) return -1;
      
      if (a[sortConfig.key!] < b[sortConfig.key!]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key!] > b[sortConfig.key!]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };
  
  // 헤더에 정렬 방향 표시 함수
  const getSortDirection = (key: keyof AnalysisResultItem) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };
  
  // 헤더 클릭 스타일
  const getHeaderStyle = (key: keyof AnalysisResultItem) => {
    return {
      cursor: 'pointer',
      backgroundColor: sortConfig.key === key ? '#f0f0f0' : 'transparent',
      padding: '0.75rem'
    };
  };
  
  // 차트 렌더링 함수
  const renderChart = (chartType: 'gap' | 'borich') => {
    if (!analysisData.length) return null;
    
    // 데이터 평균 계산
    const avgExpectedLevel = averageData.avgExpectedLevel;
    const avgMetric = chartType === 'gap' ? averageData.avgGap : averageData.avgBorich;
    const yLabel = chartType === 'gap' ? 'GAP' : 'Borich 요구도';
    
    // SVG 요소 크기 및 패딩 설정
    const { width, height } = chartSize;
    const padding = { top: 40, right: 50, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 스케일 함수 (데이터 -> 화면 좌표 변환)
    const xMin = Math.min(...analysisData.map(d => d.expectedLevel)) * 0.95;
    const xMax = Math.max(...analysisData.map(d => d.expectedLevel)) * 1.05;
    const yMin = chartType === 'gap' 
      ? Math.min(...analysisData.map(d => d.gap)) * 1.1
      : Math.min(...analysisData.map(d => d.borichValue)) * 1.1;
    const yMax = chartType === 'gap'
      ? Math.max(...analysisData.map(d => d.gap)) * 1.1
      : Math.max(...analysisData.map(d => d.borichValue)) * 1.1;
    
    // x, y 값을 화면 좌표로 변환하는 함수
    const xScale = (x: number) => padding.left + (x - xMin) / (xMax - xMin) * chartWidth;
    const yScale = (y: number) => padding.top + chartHeight - (y - yMin) / (yMax - yMin) * chartHeight;
    
    // 사분면 영역을 구분하는 선
    const xAxisPos = yScale(avgMetric);
    const yAxisPos = xScale(avgExpectedLevel);
    
    // 눈금 생성을 위한 값 계산
    const xTicks = 5; // x축 눈금 수
    const yTicks = 5; // y축 눈금 수
    const xTickValues = Array.from({ length: xTicks + 1 }, (_, i) => 
      parseFloat((xMin + (xMax - xMin) * (i / xTicks)).toFixed(2))
    );
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => 
      parseFloat((yMin + (yMax - yMin) * (i / yTicks)).toFixed(2))
    );
    
    // 사분면 레이블 위치
    const quadrantLabels = [
      { label: 'HH 영역', x: yAxisPos + chartWidth * 0.25, y: xAxisPos - chartHeight * 0.25 },
      { label: 'HL 영역', x: yAxisPos - chartWidth * 0.25, y: xAxisPos - chartHeight * 0.25 },
      { label: 'LL 영역', x: yAxisPos - chartWidth * 0.25, y: xAxisPos + chartHeight * 0.25 },
      { label: 'LH 영역', x: yAxisPos + chartWidth * 0.25, y: xAxisPos + chartHeight * 0.25 },
    ];
    
    // 툴팁 표시 함수
    const showTooltip = (item: AnalysisResultItem, x: number, y: number) => {
      const metric = chartType === 'gap' ? item.gap : item.borichValue;
      const content = `
        ${item.requiredCompetency}
        -----------------
        현재수준: ${item.currentLevel.toFixed(2)}
        기대수준: ${item.expectedLevel.toFixed(2)}
        ${chartType === 'gap' ? 'GAP' : 'Borich'}: ${metric.toFixed(2)}
      `;
      
      setTooltip({
        visible: true,
        x,
        y,
        content
      });
    };
    
    // 툴팁 숨기기 함수
    const hideTooltip = () => {
      setTooltip(prev => ({ ...prev, visible: false }));
    };
    
    return (
      <div className="ipa-chart" style={{ position: 'relative', width: '560px', height: '400px' }}>
        <h4 className="chart-title">
          {chartType === 'gap' 
            ? '요구역량-GAP 2x2 메트릭스' 
            : '요구역량-Borich 요구도 2x2 메트릭스'}
        </h4>
        
        {/* 툴팁 */}
        {tooltip.visible && (
          <div 
            style={{
              position: 'absolute',
              left: `${tooltip.x + 10}px`,
              top: `${tooltip.y - 10}px`,
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: 100,
              whiteSpace: 'pre-line'
            }}
          >
            {tooltip.content}
          </div>
        )}
        
        <svg width={width} height={height}>
          {/* 배경 사각형 */}
          <rect x={padding.left} y={padding.top} 
                width={chartWidth} height={chartHeight} 
                fill="#f8f9fa" stroke="#dee2e6" />
                
          {/* x축 그리드 라인 */}
          {xTickValues.map((tick, i) => (
            <line 
              key={`xgrid-${i}`}
              x1={xScale(tick)} 
              x2={xScale(tick)} 
              y1={padding.top} 
              y2={padding.top + chartHeight}
              stroke="#e9ecef" 
              strokeWidth="1"
              strokeDasharray={i > 0 && i < xTickValues.length - 1 ? "3,3" : "none"}
            />
          ))}
          
          {/* y축 그리드 라인 */}
          {yTickValues.map((tick, i) => (
            <line 
              key={`ygrid-${i}`}
              x1={padding.left} 
              x2={padding.left + chartWidth} 
              y1={yScale(tick)} 
              y2={yScale(tick)}
              stroke="#e9ecef" 
              strokeWidth="1"
              strokeDasharray={i > 0 && i < yTickValues.length - 1 ? "3,3" : "none"}
            />
          ))}
          
          {/* 사분면 구분선 */}
          <line x1={padding.left} x2={padding.left + chartWidth} 
                y1={xAxisPos} y2={xAxisPos} 
                stroke="#adb5bd" strokeWidth="1" strokeDasharray="4" />
          <line x1={yAxisPos} x2={yAxisPos} 
                y1={padding.top} y2={padding.top + chartHeight} 
                stroke="#adb5bd" strokeWidth="1" strokeDasharray="4" />
          
          {/* 사분면 레이블 */}
          {quadrantLabels.map((q, i) => (
            <text key={i} x={q.x} y={q.y} 
                  fontSize="12" fill="#495057" 
                  textAnchor="middle" dominantBaseline="middle">
              {q.label}
            </text>
          ))}
          
          {/* 데이터 포인트 */}
          {analysisData.map((item, i) => {
            const x = xScale(item.expectedLevel);
            const y = yScale(chartType === 'gap' ? item.gap : item.borichValue);
            return (
              <g key={i}>
                <circle 
                  cx={x} 
                  cy={y} 
                  r={6} 
                  fill={chartType === 'gap' 
                    ? (item.gap > avgMetric ? '#f8a5c2' : '#63e6be') 
                    : (item.borichValue > avgMetric ? '#f8a5c2' : '#63e6be')} 
                  stroke="#495057" 
                  strokeWidth="1"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (svgRect) {
                      const mouseX = e.clientX - svgRect.left;
                      const mouseY = e.clientY - svgRect.top;
                      showTooltip(item, mouseX, mouseY);
                    }
                  }}
                  onMouseLeave={hideTooltip}
                  onMouseMove={(e) => {
                    const svgRect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (svgRect && tooltip.visible) {
                      const mouseX = e.clientX - svgRect.left;
                      const mouseY = e.clientY - svgRect.top;
                      setTooltip(prev => ({ ...prev, x: mouseX, y: mouseY }));
                    }
                  }}
                />
                <text 
                  x={x} 
                  y={y - 10} 
                  fontSize="10" 
                  fill="#212529" 
                  textAnchor="middle">
                  {i + 1}
                </text>
              </g>
            );
          })}
          
          {/* X축 */}
          <line 
            x1={padding.left} 
            x2={padding.left + chartWidth} 
            y1={padding.top + chartHeight} 
            y2={padding.top + chartHeight} 
            stroke="#495057" 
            strokeWidth="1" 
          />
          
          {/* X축 눈금 및 라벨 */}
          {xTickValues.map((tick, i) => (
            <g key={`xtick-${i}`}>
              <line 
                x1={xScale(tick)} 
                x2={xScale(tick)} 
                y1={padding.top + chartHeight} 
                y2={padding.top + chartHeight + 5} 
                stroke="#495057" 
                strokeWidth="1" 
              />
              <text 
                x={xScale(tick)} 
                y={padding.top + chartHeight + 15} 
                fontSize="10" 
                fill="#495057" 
                textAnchor="middle">
                {tick.toFixed(1)}
              </text>
            </g>
          ))}
          
          <text 
            x={padding.left + chartWidth / 2} 
            y={padding.top + chartHeight + 35} 
            fontSize="12" 
            fill="#212529" 
            textAnchor="middle">
            기대수준(요구역량)
          </text>
          
          {/* Y축 */}
          <line 
            x1={padding.left} 
            x2={padding.left} 
            y1={padding.top} 
            y2={padding.top + chartHeight} 
            stroke="#495057" 
            strokeWidth="1" 
          />
          
          {/* Y축 눈금 및 라벨 */}
          {yTickValues.map((tick, i) => (
            <g key={`ytick-${i}`}>
              <line 
                x1={padding.left - 5} 
                x2={padding.left} 
                y1={yScale(tick)} 
                y2={yScale(tick)} 
                stroke="#495057" 
                strokeWidth="1" 
              />
              <text 
                x={padding.left - 10} 
                y={yScale(tick)} 
                fontSize="10" 
                fill="#495057" 
                textAnchor="end"
                dominantBaseline="middle">
                {tick.toFixed(1)}
              </text>
            </g>
          ))}
          
          <text 
            x={padding.left - 40} 
            y={padding.top + chartHeight / 2} 
            fontSize="12" 
            fill="#212529" 
            textAnchor="middle"
            transform={`rotate(-90, ${padding.left - 40}, ${padding.top + chartHeight / 2})`}>
            {yLabel}
          </text>
          
          {/* 평균값 표시 */}
          <text 
            x={yAxisPos + 5} 
            y={padding.top + 12} 
            fontSize="10" 
            fill="#495057"
            textAnchor="start">
            평균: {avgExpectedLevel.toFixed(2)}
          </text>
          <text 
            x={padding.left + 5} 
            y={xAxisPos - 5} 
            fontSize="10" 
            fill="#495057"
            textAnchor="start">
            평균: {avgMetric.toFixed(2)}
          </text>
          
          {/* 스킬셋 색인 */}
          <text 
            x={padding.left + 10} 
            y={padding.top + 20} 
            fontSize="10" 
            fill="#495057">
            * 차트의 번호는 위항목의 스킬셋 번호입니다.
          </text>
        </svg>
      </div>
    );
  };
  
  // 엑셀 리포트 생성 함수
  const createExcelReport = useCallback(() => {
    if (!analysisData.length) {
      alert('분석 데이터가 없습니다.');
      return;
    }
    
    try {
      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      
      // 2. 스킬 분석 데이터 시트
      const analysisTableData = [
        ['No.', '스킬셋', '요구역량', '현재수준 평균', '기대수준 평균', 'gap', '우선순위', 't-value', 'borich 요구도', '우선 순위']
      ];
      
      analysisData.forEach((item, index) => {
        analysisTableData.push([
          (index + 1).toString(),
          item.skillSet,
          item.requiredCompetency,
          item.currentLevel.toFixed(2),
          item.expectedLevel.toFixed(2),
          item.gap.toFixed(2),
          item.gapRank.toString(),
          item.tValue.toFixed(3),
          item.borichValue.toFixed(2),
          item.borichRank.toString()
        ]);
      });
      
      // 평균 행 추가
      analysisTableData.push([
        '',
        '',
        '평균',
        averageData.avgCurrentLevel.toFixed(2),
        averageData.avgExpectedLevel.toFixed(2),
        averageData.avgGap.toFixed(2),
        '',
        '',
        averageData.avgBorich.toFixed(2),
        ''
      ]);
      
      const analysisSheet = XLSX.utils.aoa_to_sheet(analysisTableData);
      
      // 열 너비 설정
      const analysisCols = [
        { wch: 5 },   // No.
        { wch: 30 },  // 스킬셋
        { wch: 30 },  // 요구역량
        { wch: 12 },  // 현재수준 평균
        { wch: 12 },  // 기대수준 평균
        { wch: 8 },   // gap
        { wch: 8 },   // 우선순위
        { wch: 10 },  // t-value
        { wch: 12 },  // borich 요구도
        { wch: 8 }    // 우선 순위
      ];
      analysisSheet['!cols'] = analysisCols;
      
      XLSX.utils.book_append_sheet(workbook, analysisSheet, '스킬 분석 데이터');
      
      // 3. GAP 메트릭스 데이터 시트 (사분면 정보 추가)
      const gapChartData = [
        ['스킬셋', '요구역량', '현재수준', '기대수준', 'GAP', '기대수준 평균 기준', 'GAP 평균 기준', '사분면', '개발 우선순위']
      ];
      
      const avgExpectedLevel = averageData.avgExpectedLevel;
      const avgGap = averageData.avgGap;
      
      analysisData.forEach(item => {
        // 사분면 결정
        let quadrant = '';
        let priority = '';
        
        if (item.expectedLevel > avgExpectedLevel && item.gap > avgGap) {
          quadrant = 'HH';
          priority = '최우선 개발 필요';
        } else if (item.expectedLevel > avgExpectedLevel && item.gap <= avgGap) {
          quadrant = 'HL';
          priority = '현 수준 유지 필요';
        } else if (item.expectedLevel <= avgExpectedLevel && item.gap > avgGap) {
          quadrant = 'LH';
          priority = '선별적 개발 필요';
        } else {
          quadrant = 'LL';
          priority = '개발 우선순위 낮음';
        }
        
        gapChartData.push([
          item.skillSet,
          item.requiredCompetency,
          item.currentLevel.toFixed(2),
          item.expectedLevel.toFixed(2),
          item.gap.toFixed(2),
          // 평균 기준으로 위치 정보 (높음/낮음)
          item.expectedLevel > avgExpectedLevel ? '높음' : '낮음',
          item.gap > avgGap ? '높음' : '낮음',
          quadrant,
          priority
        ]);
      });
      
      const gapChartSheet = XLSX.utils.aoa_to_sheet(gapChartData);
      
      // 열 너비 설정
      const gapChartCols = [
        { wch: 30 },  // 스킬셋
        { wch: 30 },  // 요구역량
        { wch: 10 },  // 현재수준
        { wch: 10 },  // 기대수준
        { wch: 8 },   // GAP
        { wch: 18 },  // 기대수준 평균 기준
        { wch: 14 },  // GAP 평균 기준
        { wch: 8 },   // 사분면
        { wch: 18 }   // 개발 우선순위
      ];
      gapChartSheet['!cols'] = gapChartCols;
      
      XLSX.utils.book_append_sheet(workbook, gapChartSheet, 'GAP 차트 데이터');
      
      // 7. 메트릭스 좌표 데이터 시트 (차트 그리기용)
      const avgBorich = averageData.avgBorich;
      const matrixCoordinatesData = [
        ['메트릭스 좌표 데이터 (차트 그리기용)'],
        [''],
        ['GAP 메트릭스 좌표'],
        ['번호', '스킬셋', '요구역량', 'X좌표(기대수준)', 'Y좌표(GAP)', '사분면', '우선순위']
      ];
      
      analysisData.forEach((item, index) => {
        // 사분면 결정
        let quadrant = '';
        let priority = '';
        
        if (item.expectedLevel > avgExpectedLevel && item.gap > avgGap) {
          quadrant = 'HH';
          priority = '최우선 개발 필요';
        } else if (item.expectedLevel > avgExpectedLevel && item.gap <= avgGap) {
          quadrant = 'HL';
          priority = '현 수준 유지 필요';
        } else if (item.expectedLevel <= avgExpectedLevel && item.gap > avgGap) {
          quadrant = 'LH';
          priority = '선별적 개발 필요';
        } else {
          quadrant = 'LL';
          priority = '개발 우선순위 낮음';
        }
        
        matrixCoordinatesData.push([
          (index + 1).toString(),
          item.skillSet,
          item.requiredCompetency,
          item.expectedLevel.toFixed(2),
          item.gap.toFixed(2),
          quadrant,
          priority
        ]);
      });
      
      // 기준선 정보 추가
      matrixCoordinatesData.push(['']);
      matrixCoordinatesData.push(['기준선 정보']);
      matrixCoordinatesData.push(['기대수준 평균(X축 기준선)', avgExpectedLevel.toFixed(2)]);
      matrixCoordinatesData.push(['GAP 평균(Y축 기준선)', avgGap.toFixed(2)]);
      
      // Borich 좌표 정보 추가
      matrixCoordinatesData.push(['']);
      matrixCoordinatesData.push(['Borich 메트릭스 좌표']);
      matrixCoordinatesData.push(['번호', '스킬셋', '요구역량', 'X좌표(기대수준)', 'Y좌표(Borich)', '사분면', '우선순위']);
      
      analysisData.forEach((item, index) => {
        // 사분면 결정
        let quadrant = '';
        let priority = '';
        
        if (item.expectedLevel > avgExpectedLevel && item.borichValue > avgBorich) {
          quadrant = 'HH';
          priority = '최우선 개발 필요';
        } else if (item.expectedLevel > avgExpectedLevel && item.borichValue <= avgBorich) {
          quadrant = 'HL';
          priority = '현 수준 유지 필요';
        } else if (item.expectedLevel <= avgExpectedLevel && item.borichValue > avgBorich) {
          quadrant = 'LH';
          priority = '선별적 개발 필요';
        } else {
          quadrant = 'LL';
          priority = '개발 우선순위 낮음';
        }
        
        matrixCoordinatesData.push([
          (index + 1).toString(),
          item.skillSet,
          item.requiredCompetency,
          item.expectedLevel.toFixed(2),
          item.borichValue.toFixed(2),
          quadrant,
          priority
        ]);
      });
      
      // Borich 기준선 정보 추가
      matrixCoordinatesData.push(['']);
      matrixCoordinatesData.push(['기준선 정보']);
      matrixCoordinatesData.push(['기대수준 평균(X축 기준선)', avgExpectedLevel.toFixed(2)]);
      matrixCoordinatesData.push(['Borich 평균(Y축 기준선)', avgBorich.toFixed(2)]);
      
      const matrixCoordinatesSheet = XLSX.utils.aoa_to_sheet(matrixCoordinatesData);
      
      // 열 너비 설정
      const matrixCoordCols = [
        { wch: 8 },   // 번호
        { wch: 30 },  // 스킬셋
        { wch: 30 },  // 요구역량
        { wch: 16 },  // X좌표(기대수준)
        { wch: 14 },  // Y좌표(GAP/Borich)
        { wch: 8 },   // 사분면
        { wch: 18 }   // 우선순위
      ];
      matrixCoordinatesSheet['!cols'] = matrixCoordCols;
      
      XLSX.utils.book_append_sheet(workbook, matrixCoordinatesSheet, '메트릭스 좌표 데이터');
      
      
      // 6. 원본 데이터 시트
      const rawData = [
        ['스킬셋', '요구역량', '이름', '현재수준', '기대수준', 'GAP']
      ];
      
      integratedData.forEach(skill => {
        if (skill.조직리스트 && skill.조직리스트.length > 0) {
          skill.조직리스트.forEach(member => {
            const current = Number(member.현재수준);
            const expected = Number(member.기대수준);
            const gap = !isNaN(current) && !isNaN(expected) ? expected - current : 'N/A';
            
            rawData.push([
              skill.스킬셋,
              skill.요구역량,
              member.이름,
              typeof member.현재수준 === 'number' ? member.현재수준.toString() : member.현재수준,
              typeof member.기대수준 === 'number' ? member.기대수준.toString() : member.기대수준,
              typeof gap === 'number' ? gap.toFixed(2) : gap
            ]);
          });
        }
      });
      
      const rawDataSheet = XLSX.utils.aoa_to_sheet(rawData);
      
      // 열 너비 설정
      const rawDataCols = [
        { wch: 30 },  // 스킬셋
        { wch: 30 },  // 요구역량
        { wch: 12 },  // 이름
        { wch: 10 },  // 현재수준
        { wch: 10 },  // 기대수준
        { wch: 8 }    // GAP
      ];
      rawDataSheet['!cols'] = rawDataCols;
      
      XLSX.utils.book_append_sheet(workbook, rawDataSheet, '원본 데이터');
      
      // 엑셀 파일 생성 및 다운로드
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `스킬_요구도_분석_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      alert('엑셀 리포트가 생성되었습니다.');
    } catch (error) {
      console.error('엑셀 생성 오류:', error);
      alert('엑셀 리포트 생성 중 오류가 발생했습니다.');
    }
  }, [analysisData, averageData, integratedData]);
  
  // 단계 완료 처리
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };
  
  return (
    <>
      {completedSteps.has('validation') ? (
        <div className="analysis-content">
          <h3>요구도 분석 결과</h3>
          <p>IPA, Borich, The Locus for Focus 방법론을 활용한 스킬 요구도 분석 결과입니다. (리더 제외)</p>
          
          {isLoading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>분석 중...</p>
            </div>
          ) : (
            <div className="validation-area">
              <div className="validation-section">
                <h4 className="validation-title">스킬 요구도 분석표</h4>
                
                {analysisData.length > 0 ? (
                  <div className="analysis-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>No.</th>
                          <th style={getHeaderStyle('skillSet')} onClick={() => requestSort('skillSet')}>
                            스킬셋{getSortDirection('skillSet')}
                          </th>
                          <th style={getHeaderStyle('requiredCompetency')} onClick={() => requestSort('requiredCompetency')}>
                            요구역량{getSortDirection('requiredCompetency')}
                          </th>
                          <th style={getHeaderStyle('currentLevel')} onClick={() => requestSort('currentLevel')}>
                            현재수준 평균{getSortDirection('currentLevel')}
                          </th>
                          <th style={getHeaderStyle('expectedLevel')} onClick={() => requestSort('expectedLevel')}>
                            기대수준 평균{getSortDirection('expectedLevel')}
                          </th>
                          <th style={getHeaderStyle('gap')} onClick={() => requestSort('gap')}>
                            gap{getSortDirection('gap')}
                          </th>
                          <th style={getHeaderStyle('gapRank')} onClick={() => requestSort('gapRank')}>
                            우선순위{getSortDirection('gapRank')}
                          </th>
                          <th style={getHeaderStyle('tValue')} onClick={() => requestSort('tValue')}>
                            t-value{getSortDirection('tValue')}
                          </th>
                          <th style={getHeaderStyle('borichValue')} onClick={() => requestSort('borichValue')}>
                            borich 요구도{getSortDirection('borichValue')}
                          </th>
                          <th style={getHeaderStyle('borichRank')} onClick={() => requestSort('borichRank')}>
                            우선 순위{getSortDirection('borichRank')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedData().map((item, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{item.skillSet}</td>
                            <td>{item.requiredCompetency}</td>
                            <td>{item.currentLevel.toFixed(2)}</td>
                            <td>{item.expectedLevel.toFixed(2)}</td>
                            <td style={{ color: item.gap > 0 ? '#d9534f' : '#5cb85c' }}>
                              {item.gap.toFixed(2)}
                            </td>
                            <td style={{ color: '#0275d8', fontWeight: 'bold' }}>
                              {item.gapRank}
                            </td>
                            <td style={{ color: item.tValue > 3 ? '#d9534f' : '#666' }}>
                              {item.tValue.toFixed(3)}
                            </td>
                            <td>{item.borichValue.toFixed(2)}</td>
                            <td style={{ color: '#0275d8', fontWeight: 'bold' }}>
                              {item.borichRank}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                          <td></td>
                          <td></td>
                          <td>평균</td>
                          <td>{averageData.avgCurrentLevel.toFixed(2)}</td>
                          <td>{averageData.avgExpectedLevel.toFixed(2)}</td>
                          <td>{averageData.avgGap.toFixed(2)}</td>
                          <td></td>
                          <td></td>
                          <td>{averageData.avgBorich.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : completedSteps.has('validation') ? (
                  <div className="empty-state">
                    <p>분석할 데이터가 없습니다.</p>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>먼저 이전 단계를 완료해주세요.</p>
                  </div>
                )}
                
                {/* 2x2 메트릭스 차트 영역 */}
                {analysisData.length > 0 && (
                  <div className="charts-container" ref={chartContainerRef} style={{ marginTop: '2rem' }}>
                    <div className="charts-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '2rem' }}>
                      <div className="chart-wrapper" style={{ width: '560px', height: '400px', flexShrink: 0 }}>
                        {renderChart('gap')}
                      </div>
                      <div className="chart-wrapper" style={{ width: '560px', height: '400px', flexShrink: 0 }}>
                        {renderChart('borich')}
                      </div>
                    </div>
                    
                    <div className="chart-explanation" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' }}>
                      <h5 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>2x2 메트릭스 해석 가이드</h5>
                      <ul style={{ fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
                        <li><strong>HH 영역</strong>: 요구역량(기대수준)이 높고, GAP/Borich 요구도가 높음 → <span style={{ color: '#d9534f' }}>최우선 개발 필요</span></li>
                        <li><strong>HL 영역</strong>: 요구역량(기대수준)이 높으나, GAP/Borich 요구도가 낮음 → <span style={{ color: '#0275d8' }}>현 수준 유지 필요</span></li>
                        <li><strong>LH 영역</strong>: 요구역량(기대수준)은 낮으나, GAP/Borich 요구도가 높음 → <span style={{ color: '#f0ad4e' }}>선별적 개발 필요</span></li>
                        <li><strong>LL 영역</strong>: 요구역량(기대수준)이 낮고, GAP/Borich 요구도도 낮음 → <span style={{ color: '#5cb85c' }}>개발 우선순위 낮음</span></li>
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className="analysis-description" style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  <p>
                    <strong>분석 방법 설명:</strong>
                  </p>
                  <ul>
                    <li><strong>현재수준 평균</strong>: 리더를 제외한 팀원들의 현재 스킬 수준 평균값</li>
                    <li><strong>기대수준 평균</strong>: 리더를 제외한 팀원들의 기대 스킬 수준 평균값</li>
                    <li><strong>gap</strong>: 기대수준과 현재수준의 차이</li>
                    <li><strong>t-value</strong>: t-검정 통계량으로 차이의 유의미성 표시</li>
                    <li><strong>borich 요구도</strong>: Σ(기대수준-현재수준) * 기대수준평균 / 팀원 수</li>
                  </ul>
                  <p><em>* 우선순위가 낮을수록 개발이 더 필요한 역량입니다.</em></p>
                </div>
                {analysisData.length > 0 && (
                <button 
                  className="report-button" 
                  onClick={createExcelReport}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#4285F4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    margin: 'auto',
                    display: 'block',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    fontSize: '14px'
                  }}
                >
                  엑셀 리포트 생성
                </button>
              )}
                
              </div>

              
              
            </div>
          )}
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