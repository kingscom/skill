import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import '../styles/SkillFrequencyStep.css';
import * as d3 from 'd3';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants
const CIRCLE_MIN_SIZE = 80;
const CIRCLE_MAX_SIZE = 200;
const PADDING = 10;

interface SkillFrequencyStepProps {
  onComplete: () => void;
  onPrev: () => void;
  integratedData?: any[];
  completedSteps?: Set<string>;
}

interface SkillRecord {
  id: number;
  skill_name: string;
  category: string;
  team: string;
  frequency: number;
  required_level: number;
  current_level: number;
  skill_set?: string;
}

interface BubbleDataPoint {
  id: number;
  name: string;
  category: string;
  team: string | number;
  requiredLevel: number;
  currentLevel: number;
  frequency: number;
  color: string;
  radius: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
  vx?: number;
  vy?: number;
}

const SkillFrequencyStep: React.FC<SkillFrequencyStepProps> = ({ onComplete, onPrev, integratedData, completedSteps }) => {
  // Initialization refs to prevent re-renders
  const initializedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [skillData, setSkillData] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bubbleData, setBubbleData] = useState<BubbleDataPoint[]>([]);
  const [selectedSkillSet, setSelectedSkillSet] = useState<string>('all');
  const [skillSets, setSkillSets] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'expected' | 'current'>('expected');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 색상 스케일 함수
  const getColorScale = useMemo(() => {
    return d3.scaleSequential()
      .domain([1, 5])
      .interpolator(d3.interpolateYlOrRd);
  }, []);

  // Transform skill data to bubble chart data
  const processBubbleData = useCallback((
    skills: SkillRecord[], 
    skillSetFilter: string, 
    currentViewMode: 'expected' | 'current'
  ) => {
    if (!skills || skills.length === 0) return [];
    
    // Filter skills by skill set
    let filteredSkills = skills;
    if (skillSetFilter !== 'all') {
      filteredSkills = filteredSkills.filter(skill => skill.skill_set === skillSetFilter);
    }

    // Calculate max frequency for size normalization
    const maxFrequency = Math.max(...filteredSkills.map(skill => skill.frequency || 1), 1);
    
    // Map skills to bubble data points
    return filteredSkills.map((skill) => {
      // Set default frequency if not provided
      const frequency = skill.frequency || 1;
      
      // Calculate bubble size based on frequency
      const scaleFactor = frequency / maxFrequency;
      const radius = CIRCLE_MIN_SIZE + scaleFactor * (CIRCLE_MAX_SIZE - CIRCLE_MIN_SIZE);
      
      // Determine color based on view mode
      const levelValue = currentViewMode === 'expected' ? skill.required_level : skill.current_level;
      const color = getColorScale(levelValue);
      
      return {
        id: skill.id,
        name: skill.skill_name,
        category: skill.category || '미분류',
        team: skill.team,
        requiredLevel: skill.required_level,
        currentLevel: skill.current_level,
        frequency,
        color,
        radius: Math.sqrt(radius) * 4  // Increased from *3 to *4 for even larger nodes
      };
    });
  }, [getColorScale]);

  // Load data from Supabase or from integrated data
  const loadData = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    setLoading(true);
    setError(null);
    
    try {
      let skillRecords: SkillRecord[] = [];
      
      // Process integrated data if available
      if (integratedData && integratedData.length > 0) {
        console.log('Using integrated data from parent component');
        
        skillRecords = integratedData.map((item, index) => {
          // Calculate averages for each skill
          let totalCurrent = 0;
          let totalExpected = 0;
          let validCount = 0;
          
          if (item.조직리스트 && item.조직리스트.length > 0) {
            item.조직리스트.forEach((member: any) => {
              const current = Number(member.현재수준);
              const expected = Number(member.기대수준);
              
              if (!isNaN(current) && !isNaN(expected)) {
                totalCurrent += current;
                totalExpected += expected;
                validCount++;
              }
            });
          }
          
          const avgCurrent = validCount > 0 ? totalCurrent / validCount : 0;
          const avgExpected = validCount > 0 ? totalExpected / validCount : 0;
          
          return {
            id: index,
            skill_name: item.업무스킬 || '',
            category: item.구분 || '미분류',
            team: item.팀 || '',
            frequency: validCount,
            required_level: avgExpected,
            current_level: avgCurrent,
            skill_set: item.스킬셋 || ''
          };
        });
      } else {
        // Fetch from Supabase if no integrated data
        console.log('Fetching data from Supabase');
        const { data, error } = await supabase
          .from('frequency_data')
          .select('*');

        if (error) {
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('데이터를 찾을 수 없습니다. 이전 단계에서 데이터를 먼저 저장해주세요.');
        }
        
        // Convert to SkillRecord format
        skillRecords = data.map((item, index) => ({
          id: index,
          skill_name: item.업무스킬 || '',
          category: item.구분 || '미분류',
          team: item.팀명 || '',
          frequency: 1,
          required_level: item.기대역량 || 0,
          current_level: item.현재역량 || 0,
          skill_set: item.스킬셋 || ''
        }));
      }
      
      // Extract unique skill sets
      const uniqueSkillSets = Array.from(
        new Set(
          skillRecords
            .map(skill => skill.skill_set)
            .filter((skillSet): skillSet is string => typeof skillSet === 'string' && skillSet !== '')
        )
      );
      
      // Update state with new data
      setSkillData(skillRecords);
      setSkillSets(uniqueSkillSets);
      if (uniqueSkillSets.length > 0) {
        setSelectedSkillSet(uniqueSkillSets[0]);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading skill data:', err);
      setError(err.message || 'Failed to load skill data. Please try again later.');
      setLoading(false);
    }
  }, [integratedData]);

  // Initial data loading on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update bubble data when selection changes
  useEffect(() => {
    if (skillData.length > 0 && !loading) {
      const newBubbleData = processBubbleData(skillData, selectedSkillSet, viewMode);
      setBubbleData(newBubbleData);
    }
  }, [skillData, selectedSkillSet, viewMode, loading, processBubbleData]);

  // D3.js 차트 생성 및 업데이트
  useEffect(() => {
    if (!svgRef.current || !bubbleData.length || loading) return;

    // 차트 크기 및 여백 설정
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // 기존 요소 삭제
    d3.select(svgRef.current).selectAll("*").remove();

    // SVG 설정
    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 시뮬레이션 설정 - 노드들이 서로 충돌하지 않도록 배치
    const simulation = d3.forceSimulation<BubbleDataPoint>(bubbleData)
      .force("x", d3.forceX<BubbleDataPoint>(width / 2).strength(0.05))
      .force("y", d3.forceY<BubbleDataPoint>(height / 2).strength(0.05))
      .force("collide", d3.forceCollide<BubbleDataPoint>().radius(d => d.radius + PADDING).strength(0.9))
      .alphaDecay(0.02)
      .on("tick", ticked);

    // 툴팁 설정
    const tooltip = d3.select(tooltipRef.current);

    // 노드 그룹 생성
    const nodeGroup = svg.selectAll<SVGGElement, BubbleDataPoint>(".node")
      .data(bubbleData)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .on("mouseover", function(event: MouseEvent, d: BubbleDataPoint) {
        tooltip.style("display", "block");
        
        // 레벨 값과 레이블 설정
        const levelValue = viewMode === 'expected' ? d.requiredLevel : d.currentLevel;
        const levelLabel = viewMode === 'expected' ? '기대역량' : '현재역량';
        
        // 툴팁 내용 설정
        tooltip.html(`
          <div class="tooltip-title">${d.name}</div>
          <p><strong>${levelLabel}:</strong> ${levelValue.toFixed(1)}</p>
          <p><strong>빈도:</strong> ${d.frequency}</p>
        `);
        
        // 툴팁 위치 설정
        const tooltipWidth = (tooltipRef.current as HTMLElement).offsetWidth;
        const tooltipHeight = (tooltipRef.current as HTMLElement).offsetHeight;
        const tooltipX = event.pageX - tooltipWidth / 2;
        const tooltipY = event.pageY - tooltipHeight - 10;
        
        tooltip
          .style("left", `${tooltipX}px`)
          .style("top", `${tooltipY}px`);
      })
      .on("mousemove", function(event: MouseEvent) {
        const tooltipWidth = (tooltipRef.current as HTMLElement).offsetWidth;
        const tooltipHeight = (tooltipRef.current as HTMLElement).offsetHeight;
        const tooltipX = event.pageX - tooltipWidth / 2;
        const tooltipY = event.pageY - tooltipHeight - 10;
        
        tooltip
          .style("left", `${tooltipX}px`)
          .style("top", `${tooltipY}px`);
      })
      .on("mouseout", function() {
        tooltip.style("display", "none");
      });
      
    // 원 그리기
    nodeGroup.append("circle")
      .attr("r", (d: BubbleDataPoint) => d.radius)
      .attr("fill", (d: BubbleDataPoint) => d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .attr("stroke-opacity", 0.8);

    // 텍스트 그리기
    nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#ffffff")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .style("text-shadow", "0 0 3px rgba(0,0,0,0.8)")
      .style("user-select", "none")
      .attr("font-size", (d: BubbleDataPoint) => {
        // 원 크기에 따라 폰트 크기 조정 (smaller text)
        return Math.max(10, Math.min(d.radius / 6, 14)) + "px";  // Reduced font size
      })
      .each(function(d: BubbleDataPoint) {
        // 원 크기에 따라 텍스트 크기 조정
        const maxLength = Math.floor(d.radius / 2.5);
        let name = d.name;
        
        if (maxLength <= 3) {
          // 너무 작은 원은 텍스트 표시 안함
          name = '';
        } else if (name.length > 10) {
          // 10자 이상이면 줄바꿈 처리
          const firstLine = name.substring(0, 10);
          let secondLine = name.substring(10);
          
          // 첫 번째 줄 추가
          d3.select(this)
            .append("tspan")
            .attr("x", 0)
            .attr("dy", "-0.6em")
            .text(firstLine);
            
          // 두 번째 줄 추가
          d3.select(this)
            .append("tspan")
            .attr("x", 0)
            .attr("dy", "1.2em")
            .text(secondLine);
            
          return;
        } else if (name.length > maxLength) {
          // 최대 길이보다 길지만 10자 미만이면 잘라서 표시
          name = name.substring(0, maxLength - 2) + '..';
        }
        
        // 한 줄로 표시할 텍스트
        if (name) {
          d3.select(this)
            .append("tspan")
            .attr("x", 0)
            .attr("dy", 0)
            .text(name);
        }
      });

    // 시뮬레이션 틱 함수 - 노드 위치 업데이트
    function ticked() {
      nodeGroup.attr("transform", (d: BubbleDataPoint) => {
        // 경계 체크
        d.x = Math.max(d.radius, Math.min(width - d.radius, d.x ?? width/2));
        d.y = Math.max(d.radius, Math.min(height - d.radius, d.y ?? height/2));
        return `translate(${d.x}, ${d.y})`;
      });
    }

    // 클린업 함수
    return () => {
      simulation.stop();
    };
  }, [bubbleData, dimensions, loading, viewMode]);

  // 창 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && svgRef.current.parentElement) {
        const containerWidth = svgRef.current.parentElement.clientWidth;
        const containerHeight = Math.min(600, window.innerHeight * 0.7);
        setDimensions({ width: containerWidth, height: containerHeight });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle skill set selection change
  const handleSkillSetChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSkillSet(event.target.value);
  }, []);

  // Handle view mode change
  const handleColorModeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setViewMode(event.target.value as 'expected' | 'current');
  }, []);

  // Retry loading data
  const handleRetry = useCallback(() => {
    initializedRef.current = false;
    loadData();
  }, [loadData]);

  // Loading state
  if (loading) {
    return <div className="loading">Loading skill frequency data...</div>;
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
            <li>다시 시도하거나 이전 단계로 돌아가기</li>
          </ul>
          <div className="button-group">
            <button 
              className="nav-button retry"
              onClick={handleRetry}
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

  return (
    <div className="skill-frequency-container">
      <div className="controls">
        <div className="skill-set-selector">
          <label htmlFor="skill-set">스킬셋:</label>
          <select 
            id="skill-set" 
            value={selectedSkillSet}
            onChange={handleSkillSetChange}
          >
            <option value="all">모든 스킬셋</option>
            {skillSets.map(skillSet => (
              <option key={skillSet} value={skillSet}>{skillSet}</option>
            ))}
          </select>
        </div>
        
        <div className="color-mode-selector">
          <label htmlFor="color-mode">표시 모드:</label>
          <select 
            id="color-mode" 
            value={viewMode} 
            onChange={handleColorModeChange}
          >
            <option value="expected">기대역량</option>
            <option value="current">현재역량</option>
          </select>
        </div>
      </div>

      <div className="graph-container">
        <svg ref={svgRef} className="bubble-chart"></svg>
        <div ref={tooltipRef} className="custom-tooltip" style={{ display: 'none', position: 'absolute' }}></div>
        
        {bubbleData.length === 0 && !loading && (
          <div className="no-data-message">
            <p>표시할 데이터가 없습니다.</p>
            <p>다른 스킬셋을 선택하거나 이전 단계에서 데이터를 확인해주세요.</p>
          </div>
        )}
      </div>
      
      <div className="legend">
        <div className="legend-content-row">
          <div className="legend-item-row">
            범례색상 
            <div className="color-scale">
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className="color-item">
                  <span className="color-box" style={{ backgroundColor: getColorScale(level) }}></span>
                  <span>{level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="step-navigation">
        <div className="nav-buttons-container">
          <button 
            className="nav-button prev"
            onClick={onPrev}
          >
            이전 단계
          </button>
          
          <button 
            className="nav-button next"
            onClick={onComplete}
          >
            처음으로
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillFrequencyStep; 