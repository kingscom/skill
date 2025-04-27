import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import '../styles/SkillFrequencyStep.css';
import * as d3 from 'd3';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants
const CIRCLE_MIN_SIZE = 20;
const CIRCLE_MAX_SIZE = 100;
const PADDING = 20;

// Types
interface SkillFrequencyStepProps {
  onComplete: () => void;
  onPrev: () => void;
  integratedData?: any[];
  completedSteps?: Set<string>;
}

interface RawDataItem {
  팀명: string;
  스킬셋: string;
  업무스킬: string;
  기대역량: number;
  현재역량: number;
  구분: string;
  순번: number;
  분석일자: string;
}

// 새로운 계층 구조 데이터를 위한 인터페이스
interface SkillHierarchyItem {
  스킬셋: string;
  구분: string;
  업무스킬: string;
}

interface GroupedDataItem {
  스킬셋: string;
  업무스킬: string;
  구분: string;
  팀명: string;
  빈도수: number;
  평균기대역량: number;
  평균현재역량: number;
  // For D3 force simulation
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  index?: number;
}

// Color mode options
type ColorMode = '기대역량' | '현재역량';

const SkillFrequencyStep: React.FC<SkillFrequencyStepProps> = ({ onComplete, onPrev, integratedData }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RawDataItem[]>([]);
  const [selectedSkillSet, setSelectedSkillSet] = useState<string>('전체');
  const [colorMode, setColorMode] = useState<ColorMode>('기대역량');
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<{scale?: number, translate?: [number, number]}>({});
  
  // 계층 구조 데이터
  const [hierarchyData, setHierarchyData] = useState<SkillHierarchyItem[]>([]);
  // 데이터 표시 모드 (기본/계층)
  const [displayMode, setDisplayMode] = useState<'기본' | '계층'>('기본');
  // 주스킬 목록
  const [mainSkills, setMainSkills] = useState<string[]>([]);
  // 주스킬별 데이터 그룹
  const [skillGroups, setSkillGroups] = useState<Map<string, RawDataItem[]>>(new Map());

  // Get unique skillsets for filter dropdown
  const skillSets = useMemo(() => {
    // 주스킬 목록을 필터 옵션으로 사용
    const options = ['전체', ...mainSkills];
    return options;
  }, [mainSkills]);

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    try {
    setLoading(true);
      
      let rawData: any[] = [];
    
      const { data, error } = await supabase.from('frequency_data').select('*');
      
      if (error) throw error;
        
        if (!data || data.length === 0) {
          throw new Error('데이터를 찾을 수 없습니다. 이전 단계에서 데이터를 먼저 저장해주세요.');
        }
        
      rawData = data;
      
      // 주스킬-부스킬 계층 구조 데이터 생성
      generateHierarchyData(rawData);
    
      setData(rawData);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, []);
  
  // 주스킬-부스킬 계층 구조 데이터 생성 함수
  const generateHierarchyData = useCallback((rawData: RawDataItem[]) => {
    try {
      // 1. 주스킬만 필터링
      const mainSkillList = Array.from(new Set(rawData.filter(item => item.구분 === '주스킬').map(item => item.스킬셋)));
      
      // 상태에 주스킬 목록 저장
      setMainSkills(mainSkillList);

      // 주스킬별로 데이터 그룹화
      const skillGroupsMap = new Map<string, RawDataItem[]>();
      
      // 각 주스킬을 key로 하는 그룹 초기화
      mainSkillList.forEach(mainSkill => {
        skillGroupsMap.set(mainSkill, []);
      });
      

      // 팀명 기준으로 데이터 그룹화
      const teamGroups = rawData.reduce((groups: { [key: string]: RawDataItem[] }, item) => {
        const team = item.팀명 || '미지정';
        if (!groups[team]) {
          groups[team] = [];
        }
        groups[team].push(item);
        return groups;
      }, {});
      
      console.log("teamGroups", teamGroups);
      // 각 팀의 데이터를 순회하며 주스킬과 일치하는 데이터를 skillGroupsMap에 추가
      Object.values(teamGroups).forEach(teamData => {
        // 해당 팀에 주스킬이 하나라도 있는지 확인
        const hasMainSkill = teamData.some(item => mainSkillList.includes(item.스킬셋));
        const mainSkillName = teamData.find(item => mainSkillList.includes(item.스킬셋))?.스킬셋;
        
        if (hasMainSkill && mainSkillName) {
          // 주스킬이 있는 경우 팀의 모든 데이터를 해당하는 스킬셋 그룹에 추가
          teamData.forEach(item => {
              const currentGroup = skillGroupsMap.get(mainSkillName) || [];
              
              // 이미 동일한 스킬셋과 업무스킬 조합이 있는지 확인
              const exists = currentGroup.some(existing => 
                existing.스킬셋 === item.스킬셋 && 
                existing.업무스킬 === item.업무스킬
              );

              // 중복되지 않은 경우에만 추가
              if (!exists) {
                skillGroupsMap.set(mainSkillName, [...currentGroup, item]);
              }
          });

        }
      });
      
      console.log("스킬 그룹:", skillGroupsMap);

      setSkillGroups(skillGroupsMap);

    } catch (err) {
      console.error("계층 구조 데이터 생성 중 오류:", err);
    }
  }, []);

  // Process and group data
  const { groupedData, filteredData } = useMemo(() => {
    // Map data to standard format
    const mappedData = data.map(d => ({
      팀명: d.팀명 || "",
      스킬셋: d.스킬셋 || "",
      업무스킬: d.업무스킬 || "",
      기대역량: parseFloat(d.기대역량?.toString() || "0"),
      현재역량: parseFloat(d.현재역량?.toString() || "0"),
      구분: d.구분 || ""
    }));

    // 선택된 스킬셋에 따라 필터링할 데이터 결정
    let filteredMappedData;
    
    if (selectedSkillSet === '전체') {
      // 전체 데이터 사용
      filteredMappedData = mappedData;
    } else {
      // 선택된 스킬셋에 해당하는 데이터만 필터링
      const selectedSkillGroup = skillGroups.get(selectedSkillSet) || [];
      
      // 선택된 스킬셋 그룹에서 스킬셋과 업무스킬 쌍을 추출
      const skillPairs = selectedSkillGroup.map(item => ({
        스킬셋: item.스킬셋,
        업무스킬: item.업무스킬
      }));
      
      // 추출된 스킬 쌍과 일치하는 데이터만 필터링
      filteredMappedData = mappedData.filter(item => 
        skillPairs.some(pair => 
          pair.스킬셋 === item.스킬셋 && pair.업무스킬 === item.업무스킬
        )
      );
      
      // console.log("선택된 스킬셋:", selectedSkillSet);
      // console.log("필터링된 데이터:", filteredMappedData);
    }

    // Group and aggregate data by 스킬셋 and 업무스킬
    const groupKey = (d: any) => `${d.스킬셋}-${d.업무스킬}`;
    
    const groupedMap = new Map<string, any>();
    
    filteredMappedData.forEach(d => {
      const key = groupKey(d);
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          스킬셋: d.스킬셋,
          업무스킬: d.업무스킬,
          구분: d.구분 || '미분류',
          팀명: d.팀명,
          기대역량값: [d.기대역량],
          현재역량값: [d.현재역량],
          count: 1
        });
          } else {
        const group = groupedMap.get(key);
        group.기대역량값.push(d.기대역량);
        group.현재역량값.push(d.현재역량);
        group.count += 1;
      }
    });
    
    // Convert grouped data for visualization
    const processedData = Array.from(groupedMap.values()).map(group => ({
      스킬셋: group.스킬셋,
      업무스킬: group.업무스킬,
      구분: group.구분,
      팀명: group.팀명,
      빈도수: group.count,
      평균기대역량: d3.mean(group.기대역량값) || 0,
      평균현재역량: d3.mean(group.현재역량값) || 0
    }));

    
    return { 
      groupedData: processedData,
      filteredData: filteredMappedData
    };
  }, [data, selectedSkillSet, skillGroups]);

  // Create and render the bubble chart
  const renderBubbleChart = useCallback(() => {
    if (!svgRef.current || !groupedData.length) return;

    // Clear existing chart
    d3.select(svgRef.current).selectAll("*").remove();
    d3.select("body").selectAll(".tooltip").remove();

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;
    svg.attr("width", width).attr("height", height);

    // 이전 줌 상태
    const savedScale = zoomRef.current.scale;
    const savedTranslate = zoomRef.current.translate;

    // Create a zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5]) // Set min/max zoom scale
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
        // 줌 상태 저장
        zoomRef.current.scale = event.transform.k;
        zoomRef.current.translate = [event.transform.x, event.transform.y];
      });

    // Apply zoom behavior to svg
    svg.call(zoom as any);
    
    // Add container group that will be zoomed
    const container = svg.append("g");
    
    // 이전 줌 레벨이 있으면 적용
    if (savedScale && savedTranslate) {
      setTimeout(() => {
        const transform = d3.zoomIdentity
          .translate(savedTranslate[0], savedTranslate[1])
          .scale(savedScale);
        svg.call(zoom.transform as any, transform);
      }, 100);
    }

    // Calculate center coordinates
    const centerX = width / 2;
    const centerY = height / 2;

    if (groupedData.length === 0) {
      setError("처리할 데이터가 없습니다.");
      return;
    }

    // Scale for bubble size based on frequency - MOVED THIS UP before it's used
    const rScale = d3.scaleSqrt()
      .domain([1, d3.max(groupedData, d => d.빈도수) || 10])
      .range([CIRCLE_MIN_SIZE, CIRCLE_MAX_SIZE]);

    // Define a force simulation for bubble positioning
    const simulation = d3.forceSimulation<GroupedDataItem>(groupedData)
      .force("center", d3.forceCenter(centerX, centerY)) // Center the bubbles
      .force("charge", d3.forceManyBody().strength(5)) // A small repulsion between nodes
      .force("collide", d3.forceCollide<GroupedDataItem>().radius(d => d.빈도수 ? rScale(d.빈도수) + PADDING : PADDING)); // Prevent overlap

    // 5단계 색상 스케일로 변경 (노랑->빨강 계열)
    const colors = ['#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#B71C1C'];
    
    const colorScale = d3.scaleQuantize<string>()
      .domain([0, colorMode === '기대역량' 
        ? d3.max(groupedData, d => d.평균기대역량) || 5
        : d3.max(groupedData, d => d.평균현재역량) || 5
      ])
      .range(colors);

    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("z-index", "1000")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)");

    // Draw bubbles
    const bubbles = container
      .selectAll(".bubble")
      .data(groupedData)
      .join("circle")
      .attr("class", "bubble")
      .attr("r", (d: GroupedDataItem) => rScale(d.빈도수))
      .attr("fill", (d: GroupedDataItem) => colorScale(colorMode === "기대역량" ? d.평균기대역량 : d.평균현재역량))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("cx", (d: GroupedDataItem) => centerX)  // 시작 위치를 중앙으로 설정
      .attr("cy", (d: GroupedDataItem) => centerY)
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`
          <strong>스킬셋:</strong> ${d.스킬셋}<br/>
          <strong>업무스킬:</strong> ${d.업무스킬}<br/>
          <strong>구분:</strong> ${d.구분}<br/>
          <strong>팀명:</strong> ${d.팀명}<br/>
          <strong>빈도수:</strong> ${d.빈도수}<br/>
          <strong>평균 기대역량:</strong> ${d.평균기대역량.toFixed(2)}<br/>
          <strong>평균 현재역량:</strong> ${d.평균현재역량.toFixed(2)}<br/>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    // Add labels to all bubbles (changed to show text always)
    container.selectAll(".bubble-text")
      .data(groupedData)
      .join("text")
      .attr("class", "bubble-text")
      .attr("text-anchor", "middle")
      .attr("x", (d: GroupedDataItem) => centerX)  // 시작 위치를 중앙으로 설정
      .attr("y", (d: GroupedDataItem) => centerY)
      .attr("dy", ".3em")
      .attr("font-size", (d: GroupedDataItem) => Math.min(2 * rScale(d.빈도수) / 3, 24))
      .attr("fill", "white")  // 항상 흰색 텍스트
      .style("pointer-events", "none")
      .style("font-weight", "bold")
      .style("text-shadow", "0px 0px 3px rgba(0, 0, 0, 0.9)")  // 더 진한 그림자로 가독성 향상
      .text((d: GroupedDataItem) => d.업무스킬);

    // 최초 위치 설정을 위해 simulation을 일정 횟수 실행
    for (let i = 0; i < 50; i++) {
      simulation.tick();
    }

    // 일시적으로 애니메이션 없이 바로 위치 설정
    bubbles
      .attr("cx", function(d) { return (d as GroupedDataItem).x || centerX; })
      .attr("cy", function(d) { return (d as GroupedDataItem).y || centerY; });
    
    container.selectAll(".bubble-text")
      .attr("x", function(d) { return (d as GroupedDataItem).x || centerX; })
      .attr("y", function(d) { return (d as GroupedDataItem).y || centerY; });

    // 시뮬레이션 재시작 (tick 이벤트 핸들러 유지)
    simulation.restart();
    
    // Update node positions on each tick of the simulation (tick 이벤트 핸들러 다시 추가)
    simulation.on("tick", () => {
      bubbles
        .attr("cx", function(d) { return (d as GroupedDataItem).x || centerX; })
        .attr("cy", function(d) { return (d as GroupedDataItem).y || centerY; });
      
      container.selectAll(".bubble-text")
        .attr("x", function(d) { return (d as GroupedDataItem).x || centerX; })
        .attr("y", function(d) { return (d as GroupedDataItem).y || centerY; });
    });
    
    // 시뮬레이션 이벤트 처리
    simulation.on("end", () => {
      console.log("Force simulation ended");
    });

    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width - legendWidth - 20;
    const legendY = 20;
    
    // 개별 색상 블록으로 범례 생성
    const legendBlockWidth = legendWidth / 5;
    
    for (let i = 0; i < 5; i++) {
      svg.append("rect")
        .attr("x", legendX + (i * legendBlockWidth))
        .attr("y", legendY)
        .attr("width", legendBlockWidth)
        .attr("height", legendHeight)
        .style("fill", colors[i]);
        
            svg.append("text")
        .attr("x", legendX + (i * legendBlockWidth) + (legendBlockWidth / 2))
        .attr("y", legendY + legendHeight + 15)
              .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(i + 1);
    }

    // Add legend labels
    svg.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 5)
      .attr("text-anchor", "start")
      .style("font-size", "12px")
      .text("낮음");

    svg.append("text")
      .attr("x", legendX + legendWidth)
      .attr("y", legendY - 5)
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .text("높음");

    svg.append("text")
      .attr("x", legendX + legendWidth / 2)
      .attr("y", legendY - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(colorMode);

    // Add zoom controls
    const zoomControls = svg.append("g")
      .attr("transform", `translate(20, ${height - 60})`);
    
    // Zoom in button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#ccc")
      .attr("rx", 5)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(
          (zoom as any).scaleBy, 1.3
        );
        // 줌 상태 업데이트 (타이밍 조정을 위해 setTimeout 사용)
        setTimeout(() => {
          const currentTransform = d3.zoomTransform(svg.node() as any);
          zoomRef.current.scale = currentTransform.k;
          zoomRef.current.translate = [currentTransform.x, currentTransform.y];
        }, 350);
      });
    
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text("+");
    
    // Zoom out button
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 35)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#ccc")
      .attr("rx", 5)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(
          (zoom as any).scaleBy, 0.7
        );
        // 줌 상태 업데이트 (타이밍 조정을 위해 setTimeout 사용)
        setTimeout(() => {
          const currentTransform = d3.zoomTransform(svg.node() as any);
          zoomRef.current.scale = currentTransform.k;
          zoomRef.current.translate = [currentTransform.x, currentTransform.y];
        }, 350);
      });
    
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text("-");
    
    // 리셋 버튼 추가
    zoomControls.append("rect")
      .attr("x", 0)
      .attr("y", 70)
      .attr("width", 30)
      .attr("height", 30)
      .attr("fill", "#f0f0f0")
      .attr("stroke", "#ccc")
      .attr("rx", 5)
      .style("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(300).call(
          (zoom as any).transform, d3.zoomIdentity
        );
        // 줌 상태 초기화
        zoomRef.current.scale = 1;
        zoomRef.current.translate = [0, 0];
      });
    
    zoomControls.append("text")
      .attr("x", 15)
      .attr("y", 90)
          .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text("리셋");
      
  }, [groupedData, colorMode]);


  // Initialize component
  useEffect(() => {
    fetchData();

    // Cleanup on unmount
    return () => {
      d3.select("body").selectAll(".tooltip").remove();
    };
  }, [fetchData]);

  // Render chart when data changes or filter changes
  useEffect(() => {
    if (!loading && !error) {
        renderBubbleChart();
    }
  }, [loading, error, groupedData, renderBubbleChart, displayMode, hierarchyData]);

  // 스킬셋 필터 변경 핸들러
  const handleSkillSetChange = (value: string) => {
    setSelectedSkillSet(value);
  };
  
  // 색상 모드 변경 핸들러
  const handleColorModeChange = (value: ColorMode) => {
    setColorMode(value);
  };

  // Loading state
  if (loading) {
    return <div className="loading">스킬 데이터를 불러오는 중...</div>;
  }

  // Error state
  if (error) {
    return (
      <div className="error-container">
        <div className="error">
          <h3>데이터 로딩 오류</h3>
          <p>{error}</p>
          <p>다음을 확인해보세요:</p>
          <ul>
            <li>이전 단계에서 데이터가 제대로 저장되었는지 확인</li>
            <li>네트워크 연결 상태 확인</li>
          </ul>
          <div className="button-group">
            <button 
              className="nav-button retry"
              onClick={() => fetchData()}
            >
              다시 시도
            </button>
            <button 
              className="nav-button prev"
              onClick={onPrev}
            >
              이전 단계로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal render
  return (
    <div className="skill-frequency-container" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div className="controls">
        <div className="skill-set-selector">
          <label>스킬셋 필터:</label>
          <select 
            value={selectedSkillSet}
            onChange={(e) => handleSkillSetChange(e.target.value)}
          >
            {skillSets.map(skillSet => (
              <option key={skillSet} value={skillSet}>{skillSet}</option>
            ))}
          </select>
        </div>
        
        <div className="color-mode-selector">
          <label>색상 모드:</label>
          <select 
            value={colorMode} 
            onChange={(e) => handleColorModeChange(e.target.value as ColorMode)}
          >
            <option value="기대역량">기대역량</option>
            <option value="현재역량">현재역량</option>
          </select>
        </div>
        
        <div className="display-mode-selector">
          <label>표시 모드:</label>
          <div className="button-toggle">
            <button 
              className={`toggle-button ${displayMode === '기본' ? 'active' : ''}`}
              onClick={() => setDisplayMode('기본')}
            >
              기본 모드
            </button>
          </div>
      </div>
        </div>
        
      <div className="graph-container" style={{ position: 'relative', flex: 1, minHeight: '400px', width: '100%', overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
      </div>
      
      <div className="legend">
        <div className="legend-content-row">
          <h4>버블 차트 설명</h4>
          <div className="legend-item-row">
            <div className="node-info">
              <span>• 버블 크기: 해당 스킬의 빈도수</span>
              <span>• 버블 색상: {colorMode} 수준 (1~5점: 노랑→주황→빨강)</span>
              <span>• 버블 배치: 중앙에서 빈도수에 따라 자동 배치</span>
              <span>• 줌 기능: 좌측 하단의 +/- 버튼 또는 마우스 휠 사용 (리셋 버튼으로 초기화)</span>
              {displayMode === '계층' && (
                <>
                  <span>• 큰 원: 주스킬, 작은 원: 부스킬/멀티스킬</span>
                  <span>• 선으로 연결된 노드: 같은 스킬셋 내 주스킬과 부스킬 관계</span>
                  <span>• 노드 드래그: 노드를 드래그하여 위치 조정 가능</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="step-navigation">
        <div className="nav-buttons-container">
          <button className="nav-button prev" onClick={onPrev}>이전 단계</button>
          <button className="nav-button next" onClick={onComplete}>처음으로</button>
        </div>
      </div>
    </div>
  );
};

export default SkillFrequencyStep; 