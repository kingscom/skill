import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import '../styles/SkillFrequencyStep.css';
import * as d3 from 'd3';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants
const CIRCLE_MIN_SIZE = 30;
const CIRCLE_MAX_SIZE = 75;
const PADDING = 15;
const MAIN_SKILL_MULTIPLIER = 1.3;

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
  // For drag functionality
  fx?: number | null;
  fy?: number | null;
}

// For link representation
interface SkillLink {
  source: GroupedDataItem;
  target: GroupedDataItem;
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
    const containerElement = svgRef.current.parentElement;
    const width = containerElement ? containerElement.clientWidth : 800;
    const height = containerElement ? containerElement.clientHeight : 500;
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

    // Categorize data into main skills and multi-skills
    const mainSkills = groupedData.filter(d => d.구분 === '주스킬');
    const multiSkills = groupedData.filter(d => d.구분 !== '주스킬');
    
    // Group multi-skills by 스킬셋
    const skillSetGroups = d3.group(multiSkills, d => d.스킬셋);
    
    // Scale for bubble size based on frequency - with better distribution
    const rScale = d3.scaleSqrt()
      .domain([1, d3.max(groupedData, d => d.빈도수) || 10])
      .range([CIRCLE_MIN_SIZE, CIRCLE_MAX_SIZE]);
    
    // Create the custom force simulation with wider layout
    const simulation = d3.forceSimulation<GroupedDataItem>(groupedData)
      // Center force - slightly reduced strength for more spread
      .force("center", d3.forceCenter(centerX, centerY).strength(0.8))
      // Stronger repulsion between nodes for better distribution
      .force("charge", d3.forceManyBody().strength((d) => {
        const node = d as unknown as GroupedDataItem;
        // Stronger repulsion for better spread across the width
        return node.구분 === '주스킬' ? -150 : -80;
      }))
      // Prevent overlap with stronger collision for main skills
      .force("collide", d3.forceCollide<GroupedDataItem>().radius((d) => {
        const node = d as unknown as GroupedDataItem;
        const baseRadius = node.빈도수 ? rScale(node.빈도수) : CIRCLE_MIN_SIZE;
        // Main skills get larger collision radius
        return node.구분 === '주스킬' ? baseRadius * MAIN_SKILL_MULTIPLIER + PADDING : baseRadius + PADDING;
      }).strength(1)) // Full strength for collision prevention
      // X-positioning force to spread across width
      .force("x", d3.forceX().x(centerX).strength(0.05))
      // Y-positioning with slight vertical separation
      .force("y", d3.forceY().y(centerY).strength(0.05));
    
    // Add force to group multi-skills by skillset - with wider distribution
    if (skillSetGroups.size > 1) {
      // Create positions for each skill set group - spreading across the width better
      const groupPositions: {[key: string]: {x: number, y: number}} = {};
      const groupCount = skillSetGroups.size;
      
      // Use an elliptical distribution to better use width
      const radiusX = width * 0.4; // Use more of the available width
      const radiusY = height * 0.3; // Less vertical spread
      
      // Position skill set groups in an elliptical pattern around the center
      let index = 0;
      skillSetGroups.forEach((_, key) => {
        const angle = (index / groupCount) * 2 * Math.PI;
        groupPositions[key] = {
          x: centerX + radiusX * Math.cos(angle),
          y: centerY + radiusY * Math.sin(angle)
        };
        index++;
      });
      
      // Custom force to attract nodes to their skill set group position
      simulation.force("group", d3.forceX<GroupedDataItem>().x(d => {
        const node = d as unknown as GroupedDataItem;
        if (node.구분 === '주스킬') return centerX;
        return groupPositions[node.스킬셋]?.x || centerX;
      }).strength(0.3)); // Increased strength for better grouping
      
      simulation.force("group-y", d3.forceY<GroupedDataItem>().y(d => {
        const node = d as unknown as GroupedDataItem;
        if (node.구분 === '주스킬') return centerY;
        return groupPositions[node.스킬셋]?.y || centerY;
      }).strength(0.3)); // Increased strength for better grouping
    }

    // 5단계 색상 스케일로 변경 (노랑->빨강 계열)
    const colors = ['#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#B71C1C'];
    
    const colorScale = d3.scaleQuantize<string>()
      .domain([0, colorMode === '기대역량' 
        ? d3.max(groupedData, d => d.평균기대역량) || 5
        : d3.max(groupedData, d => d.평균현재역량) || 5
      ])
      .range(colors);

    // Create tooltip with improved styling
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "rgba(255, 255, 255, 0.95)")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "12px")
      .style("z-index", "1000")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)");

    // Draw bubble groups - first create links between main skills and their related multi-skills
    if (mainSkills.length > 0 && multiSkills.length > 0) {
      const links: SkillLink[] = [];
      
      // Create links between main skills and their related multi-skills
      for (const multiSkill of multiSkills) {
        // Find matching main skill with same skillset
        const relatedMainSkill = mainSkills.find(main => main.스킬셋 === multiSkill.스킬셋);
        if (relatedMainSkill) {
          links.push({
            source: relatedMainSkill,
            target: multiSkill
          });
        }
      }
      
      // Draw links with pale color and low opacity to not interfere with bubbles
      container.selectAll<SVGLineElement, SkillLink>(".skill-link")
        .data(links)
        .join("line")
        .attr("class", "skill-link")
        .attr("stroke", "#cccccc")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.3)
        .attr("x1", d => centerX)
        .attr("y1", d => centerY)
        .attr("x2", d => centerX)
        .attr("y2", d => centerY);
    }

    // Draw bubbles with improved styling
    const bubbles = container
      .selectAll(".bubble")
      .data(groupedData)
      .join("circle")
      .attr("class", d => `bubble ${d.구분 === '주스킬' ? 'main-skill' : 'multi-skill'}`)
      .attr("r", (d: GroupedDataItem) => {
        const baseRadius = rScale(d.빈도수);
        return d.구분 === '주스킬' ? baseRadius * MAIN_SKILL_MULTIPLIER : baseRadius;
      })
      .attr("fill", (d: GroupedDataItem) => colorScale(colorMode === "기대역량" ? d.평균기대역량 : d.평균현재역량))
      .attr("stroke", (d: GroupedDataItem) => d.구분 === '주스킬' ? '#333' : '#fff')
      .attr("stroke-width", (d: GroupedDataItem) => d.구분 === '주스킬' ? 2 : 1)
      .attr("cx", (d: GroupedDataItem) => centerX)
      .attr("cy", (d: GroupedDataItem) => centerY)
      .attr("opacity", 0.9) // Increased opacity
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`
          <strong>스킬셋:</strong> ${d.스킬셋}<br/>
          <strong>업무스킬:</strong> ${d.업무스킬}<br/>
          <strong>구분:</strong> ${d.구분}<br/>
          <strong>빈도수:</strong> ${d.빈도수}<br/>
          <strong>평균 기대역량:</strong> ${d.평균기대역량.toFixed(2)}<br/>
          <strong>평균 현재역량:</strong> ${d.평균현재역량.toFixed(2)}<br/>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
        
        // Highlight related skills (same skillset)
        container.selectAll(".bubble")
          .filter((o: any) => o.스킬셋 === d.스킬셋)
          .transition().duration(300)
          .attr("stroke-width", 3)
          .attr("stroke", "#333");
        
        // Highlight connections
        container.selectAll<SVGLineElement, SkillLink>(".skill-link")
          .filter((o: any) => 
            (o.source.스킬셋 === d.스킬셋) || (o.target.스킬셋 === d.스킬셋)
          )
          .transition().duration(300)
          .attr("stroke", "#666")
          .attr("stroke-width", 2)
          .attr("stroke-opacity", 0.6);
      })
      .on("mouseout", (event, d) => {
        tooltip.transition().duration(500).style("opacity", 0);
        
        // Reset highlight
        container.selectAll(".bubble")
          .transition().duration(300)
          .attr("stroke-width", (d: any) => d.구분 === '주스킬' ? 2 : 1)
          .attr("stroke", (d: any) => d.구분 === '주스킬' ? '#333' : '#fff');
        
        // Reset connections
        container.selectAll<SVGLineElement, SkillLink>(".skill-link")
          .transition().duration(300)
          .attr("stroke", "#cccccc")
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.3);
      })
      // Add drag capability with improved behavior
      .call(d3.drag<SVGCircleElement, GroupedDataItem>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          // Keep position fixed after drag to prevent bouncing back
          // Comment out these lines to allow nodes to return to simulation
          // d.fx = null;
          // d.fy = null;
        }) as any
      );

    // Add labels with improved sizing
    container.selectAll(".bubble-text")
      .data(groupedData)
      .join("text")
      .attr("class", "bubble-text")
      .attr("text-anchor", "middle")
      .attr("x", (d: GroupedDataItem) => centerX)
      .attr("y", (d: GroupedDataItem) => centerY)
      .attr("dy", ".3em")
      .attr("font-size", (d: GroupedDataItem) => {
        const baseSize = Math.min(2 * rScale(d.빈도수) / 3, 12);
        return d.구분 === '주스킬' ? baseSize * 1.2 : baseSize;
      })
      .attr("fill", "white")
      .style("pointer-events", "none")
      .style("font-weight", "bold")
      .style("text-shadow", "0px 0px 3px rgba(0, 0, 0, 0.9)")
      .text((d: GroupedDataItem) => {
        return d.업무스킬;
      });

    // Run simulation steps initially to position nodes better
    for (let i = 0; i < 100; i++) { // Increased initial ticks for better starting positions
      simulation.tick();
    }

    // Update links positions based on node positions
    const updateLinks = () => {
      container.selectAll<SVGLineElement, SkillLink>(".skill-link")
        .attr("x1", d => d.source.x || centerX)
        .attr("y1", d => d.source.y || centerY)
        .attr("x2", d => d.target.x || centerX)
        .attr("y2", d => d.target.y || centerY);
    };

    // Position bubbles based on simulation
    bubbles
      .attr("cx", function(d) { return (d as GroupedDataItem).x || centerX; })
      .attr("cy", function(d) { return (d as GroupedDataItem).y || centerY; });
    
    container.selectAll(".bubble-text")
      .attr("x", function(d) { return (d as GroupedDataItem).x || centerX; })
      .attr("y", function(d) { return (d as GroupedDataItem).y || centerY; });
    
    updateLinks();

    // Configure simulation with slower cooling
    simulation
      .alpha(0.3) // Lower alpha for gentler movement
      .alphaDecay(0.02) // Slower decay for more settling time
      .restart();
    
    // Update positions on each tick
    simulation.on("tick", () => {
      bubbles
        .attr("cx", function(d) { return (d as GroupedDataItem).x || centerX; })
        .attr("cy", function(d) { return (d as GroupedDataItem).y || centerY; });
      
      container.selectAll(".bubble-text")
        .attr("x", function(d) { return (d as GroupedDataItem).x || centerX; })
        .attr("y", function(d) { return (d as GroupedDataItem).y || centerY; });
      
      updateLinks();
    });
    
    // Handle simulation end
    simulation.on("end", () => {
      console.log("Force simulation ended");
    });

    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = width - legendWidth - 20;
    const legendY = 20;

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
          <label>스킬셋 선택</label>
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
          <label>역량</label>
          <select 
            value={colorMode} 
            onChange={(e) => handleColorModeChange(e.target.value as ColorMode)}
          >
            <option value="기대역량">기대역량</option>
            <option value="현재역량">현재역량</option>
          </select>
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