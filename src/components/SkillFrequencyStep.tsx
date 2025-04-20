import React, { useState, useEffect, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { createClient } from '@supabase/supabase-js';
import '../styles/SkillFrequencyStep.css';
// @ts-ignore
import * as d3 from 'd3-scale-chromatic';
// @ts-ignore
import * as d3Scale from 'd3-scale';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

interface GraphNode {
  id: string;
  name: string;
  type: 'team' | 'category' | 'skill' | 'requirement';
  level?: number;
  requiredLevel?: number;
  team?: string | number;
  category?: string;
  val: number;
  x?: number;
  y?: number;
  frequency: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const SkillFrequencyStep: React.FC<SkillFrequencyStepProps> = ({ onComplete, onPrev, integratedData, completedSteps }) => {
  const [skillData, setSkillData] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedSkillSet, setSelectedSkillSet] = useState<string>('all');
  const [skillSets, setSkillSets] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'expected' | 'current'>('expected');

  // Color scale function for the nodes based on their level
  const getColorScale = (value: number, min: number, max: number): string => {
    const colorScale = d3Scale.scaleSequential<string>()
      .domain([min, max])
      .interpolator(d3.interpolateYlOrRd);
    return colorScale(value);
  };

  // Colors for node types
  const nodeTypeColors: Record<string, string> = {
    skill: '#4285F4',     // Blue for skill/requirement nodes
    requirement: '#34A853' // Green for level nodes
  };

  // 스킬셋 필터링을 포함하도록 그래프 데이터 구성 함수 수정
  const constructGraphData = useCallback((skills: SkillRecord[], _: string, skillSetFilter: string) => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // 스킬셋으로 스킬 필터링
    let filteredSkills = skills;
    
    if (skillSetFilter !== 'all') {
      filteredSkills = filteredSkills.filter(skill => skill.skill_set === skillSetFilter);
    }

    // 노드 크기 조정을 위한 최대 빈도 계산
    const maxFrequency = Math.max(...filteredSkills.map(skill => skill.frequency || 1), 1);

    // 요구역량 노드 추가
    filteredSkills.forEach(skill => {
      const skillId = `skill-${skill.id}`;
      
      if (!nodeIds.has(skillId)) {
        // 빈도를 기반으로 노드 크기 조정, 기본 크기 15에 정규화된 빈도를 추가
        const normalizedSize = 15 + (skill.frequency / maxFrequency) * 25;
        
        nodes.push({
          id: skillId,
          name: skill.skill_name,
          type: 'skill',
          category: skill.category,
          team: skill.team,
          level: skill.current_level,
          requiredLevel: skill.required_level,
          frequency: skill.frequency,
          val: normalizedSize
        });
        nodeIds.add(skillId);
      }
    });

    setGraphData({ nodes, links });
  }, []);

  // 데이터 로딩 함수
  const fetchSkillData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let skillRecords: SkillRecord[] = [];
      
      // 통합 데이터를 사용하는 경우
      if (integratedData && integratedData.length > 0) {
        console.log('Using integrated data from parent component:', integratedData);
        
        // 통합 데이터를 SkillRecord 형식으로 변환
        skillRecords = integratedData.map((item, index) => {
          // 같은 요구역량에 대한 평균 계산
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
            skill_name: item.요구역량 || '',
            category: item.구분 || '미분류',
            team: item.팀 || '',
            frequency: validCount, // 데이터 개수를 빈도로 사용
            required_level: avgExpected,
            current_level: avgCurrent,
            skill_set: item.스킬셋 || ''
          };
        });
      } else {
        // 기존 방식으로 데이터 가져오기
        console.log('Fetching data from Supabase frequency_data table');
        const { data, error } = await supabase
          .from('frequency_data')
          .select('*');

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          console.log('No data found in frequency_data table');
          throw new Error('데이터를 찾을 수 없습니다. 이전 단계에서 데이터를 먼저 저장해주세요.');
        }
        
        console.log('Fetched data from Supabase:', data);
        
        // 데이터를 SkillRecord 형식으로 변환
        skillRecords = data.map((item, index) => ({
          id: index,
          skill_name: item.요구역량 || '',
          category: item.구분 || '미분류',
          team: item.팀명 || '',
          frequency: 1, // 기본 빈도
          required_level: item.기대역량 || 0,
          current_level: item.현재역량 || 0,
          skill_set: item.스킬셋 || ''
        }));
      }
      
      setSkillData(skillRecords);
      
      // 고유한 스킬셋 추출
      const uniqueSkillSets = Array.from(
        new Set(
          skillRecords
            .map(skill => skill.skill_set)
            .filter((skillSet): skillSet is string => typeof skillSet === 'string' && skillSet !== '')
        )
      );
      setSkillSets(uniqueSkillSets);
      
      // 기본 스킬셋 선택
      if (uniqueSkillSets.length > 0) {
        setSelectedSkillSet(uniqueSkillSets[0]);
      }
      
      // 초기 그래프 데이터 구성
      constructGraphData(
        skillRecords, 
        'all', 
        uniqueSkillSets.length > 0 ? uniqueSkillSets[0] : 'all'
      );
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching skill data:', err);
      setError(err.message || 'Failed to load skill data. Please try again later.');
      setLoading(false);
    }
  }, [integratedData, constructGraphData]);

  useEffect(() => {
    fetchSkillData();
  }, [fetchSkillData]);

  // 노드 초기 위치 설정
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      // Deep copy the graph data
      const newGraphData = {
        nodes: [...graphData.nodes.map(node => ({...node}))],
        links: [...graphData.links.map(link => ({...link}))]
      };
      
      // Calculate grid dimensions based on node count
      const nodeCount = newGraphData.nodes.length;
      const cols = Math.ceil(Math.sqrt(nodeCount));
      
      // Get container size
      const containerElement = document.querySelector('.graph-container');
      const containerWidth = containerElement ? containerElement.clientWidth : 600;
      const containerHeight = containerElement ? containerElement.clientHeight : 500;
      
      // Set initial positions for nodes in a grid that fits the canvas
      newGraphData.nodes.forEach((node, i) => {
        // Calculate grid position with padding
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        // Center the grid and distribute nodes evenly
        const totalWidth = cols * 100; // Assume 100px per node
        const startX = (containerWidth - totalWidth) / 2;
        
        node.x = startX + col * 100 + 50; // 50px offset from grid cell start
        node.y = 80 + row * 100; // Start from 80px from top with 100px per row
      });
      
      setGraphData(newGraphData);
    }
  }, [skillData]);

  // 윈도우 리사이즈 처리
  useEffect(() => {
    const handleResize = () => {
      // 그래프 데이터가 있을 때만 처리
      if (graphData.nodes.length > 0) {
        // Deep copy the graph data
        const newGraphData = {
          nodes: [...graphData.nodes.map(node => ({...node}))],
          links: [...graphData.links.map(link => ({...link}))]
        };
        
        // 컨테이너 크기 가져오기
        const containerElement = document.querySelector('.graph-container');
        const containerWidth = containerElement ? containerElement.clientWidth : 600;
        const containerHeight = containerElement ? containerElement.clientHeight : 500;
        
        // 노드 수에 따른 그리드 차원 계산
        const nodeCount = newGraphData.nodes.length;
        const cols = Math.ceil(Math.sqrt(nodeCount));
        
        // 노드 위치 업데이트
        newGraphData.nodes.forEach((node, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          
          // 그리드 중앙 정렬 및 노드 고르게 분포
          const totalWidth = cols * 100;
          const startX = (containerWidth - totalWidth) / 2;
          
          node.x = startX + col * 100 + 50;
          node.y = 80 + row * 100;
        });
        
        setGraphData(newGraphData);
      }
    };
    
    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    
    // 컴포넌트 언마운트시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [graphData.nodes.length]);

  // 스킬셋 필터 변경 처리
  const handleSkillSetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const skillSet = event.target.value;
    setSelectedSkillSet(skillSet);
    constructGraphData(skillData, 'all', skillSet);
  };

  // 색상 모드 변경 처리
  const handleColorModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setViewMode(event.target.value as 'expected' | 'current');
  };

  // Node color based on selected mode
  const getNodeColor = (node: GraphNode): string => {
    // 노드 수준에 따라 색상 적용
    if (node.type === 'skill') {
      const levelValue = viewMode === 'expected' ? 
        (node.requiredLevel || 3) : 
        (node.level || 3);
      return getColorScale(levelValue, 1, 5);
    }
    
    return '#999';
  };

  if (loading) {
    return <div className="loading">Loading skill frequency data...</div>;
  }

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
              onClick={fetchSkillData}
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
        <ForceGraph2D
          graphData={graphData}
          nodeAutoColorBy={undefined}
          nodeColor={(node) => getNodeColor(node as GraphNode)}
          nodeLabel={(node: GraphNode) => {
            if (node.type === 'skill') {
              const levelValue = viewMode === 'expected' ? 
                node.requiredLevel?.toFixed(1) : 
                node.level?.toFixed(1);
              const levelType = viewMode === 'expected' ? '기대역량' : '현재역량';
              
              return `${node.name}\n${levelType}: ${levelValue}\n빈도: ${node.frequency || 0}`;
            }
            return node.name;
          }}
          linkWidth={(link: any) => Math.sqrt(link.value)}
          linkCurvature={0}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.4}
          warmupTicks={100}
          cooldownTicks={50}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = getNodeColor(node as GraphNode);
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, node.val, 0, 2 * Math.PI);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(label, node.x || 0, node.y || 0);
          }}
        />
      </div>

      <div className="legend">
        <div className="legend-content">
          <h4>그래프 범례</h4>
          <div className="node-info">
            <h5>노드 정보</h5>
            <div className="legend-item">
              <span className="legend-item">노드 크기: 요구역량 빈도수</span>
              <span className="legend-item">노드 색상: {viewMode === 'current' ? '현재역량' : '기대역량'} 수준</span>
            </div>
          </div>
          
          <div className="level-colors">
            <h5>{viewMode === 'current' ? '현재역량 척도' : '기대역량 척도'}</h5>
            <div className="color-scale">
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className="color-item">
                  <span className="color-box" style={{ backgroundColor: getColorScale(level, 1, 5) }}></span>
                  <span>수준 {level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="step-navigation" style={{ marginTop: '20px' }}>
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
  );
};

export default SkillFrequencyStep; 