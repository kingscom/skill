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
  isMainSkill: boolean;
  skillSet: string;
  isSelected?: boolean;
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
  const [selectedMainSkill, setSelectedMainSkill] = useState<string | null>(null);
  const [skillSets, setSkillSets] = useState<string[]>([]);
  const [mainSkillSets, setMainSkillSets] = useState<string[]>([]);
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
    currentViewMode: 'expected' | 'current',
    mainSkillFilter: string | null
  ) => {
    if (!skills || skills.length === 0) return [];
    
    // 첫 번째 단계: 스킬셋으로 필터링
    let filteredSkills: SkillRecord[] = [];
    
    console.log("처리 시작 - 전체 스킬 수:", skills.length);
    console.log("필터 상태: 스킬셋 =", skillSetFilter, "주스킬 =", mainSkillFilter);
    
    // 모든 주스킬과 멀티스킬 분리
    const allMainSkills = skills.filter(skill => skill.category === '주스킬');
    const allMultiSkills = skills.filter(skill => skill.category !== '주스킬');
    
    console.log(`전체 주스킬 수: ${allMainSkills.length}개, 전체 멀티스킬 수: ${allMultiSkills.length}개`);
    
    // 선택된 주스킬 객체 찾기
    let selectedSkill = null;
    if (mainSkillFilter) {
      selectedSkill = skills.find(skill => 
        skill.skill_name === mainSkillFilter && skill.category === '주스킬'
      );
      
      if (selectedSkill) {
        console.log(`선택된 주스킬 찾음: ${selectedSkill.skill_name}, 스킬셋: ${selectedSkill.skill_set}`);
      } else {
        console.warn(`선택된 주스킬을 찾을 수 없음: ${mainSkillFilter}`);
      }
    }
    
    // 필터링 로직
    if (skillSetFilter !== 'all' && selectedSkill) {
      // 스킬셋과 주스킬 모두 선택된 경우 - 주스킬과 같은 스킬셋만 표시
      console.log(`스킬셋(${skillSetFilter})과 주스킬(${selectedSkill.skill_name}) 모두 필터링 적용`);
      
      // 선택된 스킬셋의 주스킬 + 선택된 주스킬과 같은 스킬셋의 멀티스킬
      const mainSkillsInSelectedSet = allMainSkills.filter(skill => 
        skill.skill_set === skillSetFilter
      );
      
      const multiSkillsWithSelectedMainSkill = allMultiSkills.filter(skill => 
        skill.skill_set === selectedSkill.skill_set && skill.skill_set === skillSetFilter
      );
      
      filteredSkills = [...mainSkillsInSelectedSet, ...multiSkillsWithSelectedMainSkill];
      
    } else if (skillSetFilter !== 'all') {
      // 스킬셋만 선택된 경우
      console.log(`스킬셋 '${skillSetFilter}' 필터링 적용`);
      
      // 선택된 스킬셋의 주스킬과 멀티스킬 모두 표시
      const mainSkillsInSelectedSet = allMainSkills.filter(skill => 
        skill.skill_set === skillSetFilter
      );
      
      const multiSkillsInSelectedSet = allMultiSkills.filter(skill => 
        skill.skill_set === skillSetFilter
      );
      
      filteredSkills = [...mainSkillsInSelectedSet, ...multiSkillsInSelectedSet];
      
    } else if (selectedSkill) {
      // 주스킬만 선택된 경우
      console.log(`주스킬 '${selectedSkill.skill_name}' 필터링 적용`);
      
      // 선택된 주스킬과 같은 스킬셋의 모든 주스킬
      const mainSkillsInSameSet = allMainSkills.filter(skill => 
        skill.skill_set === selectedSkill.skill_set
      );
      
      // 선택된 주스킬과 같은 스킬셋의 멀티스킬
      const multiSkillsInSameSet = allMultiSkills.filter(skill => 
        skill.skill_set === selectedSkill.skill_set
      );
      
      filteredSkills = [...mainSkillsInSameSet, ...multiSkillsInSameSet];
      
    } else {
      // 필터 없음 - 모든 스킬 표시
      console.log("필터 없음 - 모든 스킬 표시");
      filteredSkills = skills;
    }
    
    // 최종 필터링 결과 로그
    const filteredMainSkills = filteredSkills.filter(s => s.category === '주스킬');
    const filteredMultiSkills = filteredSkills.filter(s => s.category !== '주스킬');
    
    console.log(`최종 필터링 결과: 총 ${filteredSkills.length}개 (주스킬: ${filteredMainSkills.length}개, 멀티스킬: ${filteredMultiSkills.length}개)`);
    console.log("주스킬 목록:", filteredMainSkills.map(s => s.skill_name));
    console.log("멀티스킬 목록:", filteredMultiSkills.map(s => s.skill_name));

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
      
      // 선택된 주스킬인지 확인
      const isSelected = mainSkillFilter === skill.skill_name && skill.category === '주스킬';
      
      return {
        id: skill.id,
        name: skill.skill_name,
        category: skill.category || '미분류',
        team: skill.team,
        requiredLevel: skill.required_level,
        currentLevel: skill.current_level,
        frequency,
        color,
        radius: Math.sqrt(radius) * 4,  // Increased from *3 to *4 for even larger nodes
        isMainSkill: skill.category === '주스킬',
        skillSet: skill.skill_set || '',
        isSelected
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
      let rawSkillData: any[] = [];
      
      // Process integrated data if available
      if (integratedData && integratedData.length > 0) {
        console.log('Using integrated data from parent component');
        rawSkillData = integratedData;
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
        
        rawSkillData = data;
      }
      
      // 스킬과 카테고리 정보 추출
      const skillCategories = new Map<string, string>();
      const skillSets = new Map<string, string>();
      
      // 첫 번째 패스: 모든 스킬의 카테고리와 스킬셋 정보 수집
      rawSkillData.forEach(item => {
        const skillName = item.업무스킬 || '';
        if (!skillName || skillName.trim() === '') return;
        
        // 스킬셋 정보 저장
        const skillSet = item.스킬셋 || '';
        if (skillSet && (!skillSets.has(skillName) || item.구분 === '주스킬')) {
          skillSets.set(skillName, skillSet);
        }
        
        // 카테고리 정보 저장 (주스킬 우선)
        if (item.구분 === '주스킬') {
          skillCategories.set(skillName, '주스킬');
        } else if (!skillCategories.has(skillName)) {
          skillCategories.set(skillName, item.구분 || '멀티스킬');
        }
      });
      
      // 로그로 확인
      console.log('카테고리 정보:', Array.from(skillCategories.entries()).slice(0, 10));
      console.log('스킬셋 정보:', Array.from(skillSets.entries()).slice(0, 10));
      
      // 스킬 이름과 팀별로 그룹화
      // 스킬과 팀 조합으로 키를 생성 - 같은 스킬이 다른 팀에서 선택된 경우를 구분하기 위함
      const skillTeamMap = new Map<string, { 
        data: any,
        currentSum: number, 
        expectedSum: number, 
        count: number,
        skillSet: string,
        team: string,
        category: string
      }>();
      
      // 두 번째 패스: 팀별 스킬 데이터 처리
      rawSkillData.forEach((item) => {
        const skillName = item.업무스킬 || '';
        const teamName = item.팀 || item.팀명 || 'unknown';
        
        if (!skillName || skillName.trim() === '') return;
        
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
        } else {
          // For Supabase data format
          const current = Number(item.현재역량 || 0);
          const expected = Number(item.기대역량 || 0);
          if (!isNaN(current) && !isNaN(expected)) {
            totalCurrent = current;
            totalExpected = expected;
            validCount = 1;
          }
        }
        
        // 이전에 수집한 카테고리와 스킬셋 정보 적용
        const category = skillCategories.get(skillName) || '멀티스킬';
        const skillSet = skillSets.get(skillName) || '';
        
        // 주스킬은 'all'이라는 가상 팀으로 분류하여 모든 팀을 대표하게 함
        // 멀티스킬은 실제 팀별로 분류
        const effectiveTeam = category === '주스킬' ? 'all' : teamName;
        const key = `${skillName}|${effectiveTeam}`;
        
        if (skillTeamMap.has(key)) {
          const existing = skillTeamMap.get(key)!;
          existing.currentSum += totalCurrent;
          existing.expectedSum += totalExpected;
          existing.count += validCount;
        } else {
          skillTeamMap.set(key, {
            data: item,
            currentSum: totalCurrent,
            expectedSum: totalExpected,
            count: validCount,
            skillSet: skillSet,
            team: effectiveTeam,
            category: category
          });
        }
      });
      
      // 맵을 SkillRecord 배열로 변환
      const skillRecords: SkillRecord[] = Array.from(skillTeamMap.entries()).map(([key, info], index) => {
        const avgCurrent = info.count > 0 ? info.currentSum / info.count : 0;
        const avgExpected = info.count > 0 ? info.expectedSum / info.count : 0;
        const skillName = key.split('|')[0];
        
        return {
          id: index,
          skill_name: skillName,
          category: info.category,
          team: info.team,
          frequency: info.count, // 빈도 합산
          required_level: avgExpected,
          current_level: avgCurrent,
          skill_set: info.skillSet
        };
      });
      
      // Extract unique skill sets
      const uniqueSkillSets = Array.from(
        new Set(
          skillRecords
            .map(skill => skill.skill_set)
            .filter((skillSet): skillSet is string => typeof skillSet === 'string' && skillSet !== '')
        )
      );
      
      // 주스킬에 사용된 스킬셋만 필터링
      const mainSkillSets = Array.from(
        new Set(
          skillRecords
            .filter(skill => skill.category === '주스킬')
            .map(skill => skill.skill_set)
            .filter((skillSet): skillSet is string => typeof skillSet === 'string' && skillSet !== '')
        )
      );
      
      // Update state with new data
      setSkillData(skillRecords);
      setSkillSets(uniqueSkillSets);
      setMainSkillSets(mainSkillSets);
      if (mainSkillSets.length > 0) {
        setSelectedSkillSet('all'); // Changed to show all by default
      }
      
      // 디버그 정보 출력
      console.log('총 스킬 수:', skillRecords.length);
      console.log('주스킬 수:', skillRecords.filter(s => s.category === '주스킬').length);
      console.log('멀티스킬 수:', skillRecords.filter(s => s.category !== '주스킬').length);
      console.log('스킬셋 종류:', uniqueSkillSets);
      
      // 스킬셋별 스킬 수 확인
      uniqueSkillSets.forEach(set => {
        const skillsInSet = skillRecords.filter(s => s.skill_set === set);
        const mainSkillsInSet = skillsInSet.filter(s => s.category === '주스킬');
        const multiSkillsInSet = skillsInSet.filter(s => s.category !== '주스킬');
        console.log(`스킬셋 '${set}': 총 ${skillsInSet.length}개 (주스킬 ${mainSkillsInSet.length}개, 멀티스킬 ${multiSkillsInSet.length}개)`);
      });
      
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
      console.log('상태 변경: 스킬셋 =', selectedSkillSet, '선택된 주스킬 =', selectedMainSkill);
      
      const newBubbleData = processBubbleData(skillData, selectedSkillSet, viewMode, selectedMainSkill);
      setBubbleData(newBubbleData);
    }
  }, [skillData, selectedSkillSet, viewMode, loading, processBubbleData, selectedMainSkill]);

  // D3.js 차트 생성 및 업데이트
  useEffect(() => {
    if (!svgRef.current || !bubbleData.length || loading) return;

    console.log("차트 업데이트 시작 - 버블 데이터:", bubbleData.length, "개");
    
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

    // 배경 클릭 이벤트 (필터 해제)
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent") // 투명 배경
      .on("click", () => {
        if (selectedMainSkill) {
          console.log("배경 클릭 - 필터 해제");
          setSelectedMainSkill(null);
        }
      });

    // 줌 기능 추가
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        svg.attr("transform", event.transform);
      });
    
    // SVG에 줌 적용
    d3.select(svgRef.current).call(zoom);
    
    // 초기 위치로 리셋하는 버튼 추가
    d3.select(".reset-zoom-button")
      .on("click", () => {
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(zoom.transform as any, d3.zoomIdentity.translate(margin.left, margin.top));
      });

    // 그리드 기반 레이아웃 계산
    const calculateGridLayout = (nodes: BubbleDataPoint[], containerWidth: number, containerHeight: number) => {
      const nodesCopy = [...nodes];
      
      // 주스킬과 멀티스킬 구분
      const mainSkills = nodesCopy.filter(node => node.isMainSkill);
      const multiSkills = nodesCopy.filter(node => !node.isMainSkill);
      
      // 스킬셋별로 그룹화
      const skillSetGroups = new Map<string, BubbleDataPoint[]>();
      nodesCopy.forEach(node => {
        // 스킬셋 정보가 없으면 'unknown'으로 처리
        const skillSet = node.skillSet || 'unknown';
        if (!skillSetGroups.has(skillSet)) {
          skillSetGroups.set(skillSet, []);
        }
        skillSetGroups.get(skillSet)!.push(node);
      });
      
      // 중앙 위치 계산
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      
      // 주스킬 배치 - 중앙에 원형으로 배치하되 더 넓게 분포
      if (mainSkills.length > 0) {
        const radius = Math.min(containerWidth, containerHeight) * 0.3; // 더 큰 반지름으로 확장
        mainSkills.forEach((node, index) => {
          const angle = (index / mainSkills.length) * 2 * Math.PI;
          node.x = centerX + (mainSkills.length > 1 ? radius * Math.cos(angle) : 0);
          node.y = centerY + (mainSkills.length > 1 ? radius * Math.sin(angle) : 0);
        });
      }
      
      // 멀티스킬 배치 - 스킬셋별로 그룹화하여 바깥쪽에 넓게 배치
      const skillSetArray = Array.from(skillSetGroups.entries());
      skillSetArray.forEach(([skillSet, nodes], groupIndex) => {
        const groupMultiNodes = nodes.filter(node => !node.isMainSkill);
        if (groupMultiNodes.length === 0) return;
        
        // 스킬셋 그룹이 배치될 방향 계산
        const sectionAngle = (2 * Math.PI) / skillSetArray.length;
        const groupAngle = groupIndex * sectionAngle;
        
        // 외부 반지름 계산 (주스킬 원의 바깥)
        const outerRadius = Math.min(containerWidth, containerHeight) * 0.55;  // 더 넓게 분포하도록 증가
        
        // 그룹 중심점 계산
        const groupCenterX = centerX + outerRadius * Math.cos(groupAngle);
        const groupCenterY = centerY + outerRadius * Math.sin(groupAngle);
        
        // 팀별로 다시 그룹화
        const teamGroups = new Map<string | number, BubbleDataPoint[]>();
        groupMultiNodes.forEach(node => {
          const team = node.team || 'unknown';
          if (!teamGroups.has(team)) {
            teamGroups.set(team, []);
          }
          teamGroups.get(team)!.push(node);
        });
        
        // 팀별로 배치
        const teamArray = Array.from(teamGroups.entries());
        teamArray.forEach(([team, teamNodes], teamIndex) => {
          // 팀 중심점 주변에 부채꼴 형태로 배치
          const teamAngleOffset = (teamIndex - (teamArray.length - 1) / 2) * (Math.PI / 8);
          const teamAngle = groupAngle + teamAngleOffset;
          
          // 팀 중심점 계산
          const teamRadius = outerRadius * 0.5; // 팀 중심점과 그룹 중심점 사이 거리
          const teamCenterX = groupCenterX + teamRadius * Math.cos(teamAngle);
          const teamCenterY = groupCenterY + teamRadius * Math.sin(teamAngle);
          
          // 팀 내 노드 배치
          const nodeSpread = Math.min(containerWidth, containerHeight) * 0.15; // 팀 내 노드 간 간격 증가
          teamNodes.forEach((node, nodeIndex) => {
            // 원형으로 배치하되 간격을 넓게
            const nodeAngle = teamAngle + (nodeIndex - (teamNodes.length - 1) / 2) * (Math.PI / 6);
            node.x = teamCenterX + nodeSpread * Math.cos(nodeAngle);
            node.y = teamCenterY + nodeSpread * Math.sin(nodeAngle);
          });
        });
      });
      
      return nodesCopy;
    };
    
    // 그리드 레이아웃 적용
    const gridLayoutData = calculateGridLayout(bubbleData, width, height);

    // 툴팁 설정
    const tooltip = d3.select(tooltipRef.current);

    // 노드 그룹 생성
    const nodeGroup = svg.selectAll<SVGGElement, BubbleDataPoint>(".node")
      .data(gridLayoutData)
      .enter()
      .append("g")
      .attr("class", d => {
        let classes = `node ${d.isMainSkill ? "main-skill" : "multi-skill"}`;
        if (d.isSelected) classes += " selected";
        return classes;
      })
      .style("cursor", "pointer")
      .attr("transform", (d: BubbleDataPoint) => `translate(${d.x || 0}, ${d.y || 0})`)
      .on("click", function(event: MouseEvent, d: BubbleDataPoint) {
        event.stopPropagation(); // 이벤트 버블링 방지
        
        // 주스킬을 클릭한 경우에만 필터링 적용
        if (d.isMainSkill) {
          console.log("주스킬 클릭:", d.name, "스킬셋:", d.skillSet);
          
          // 이미 선택된 주스킬을 다시 클릭한 경우 해제
          if (selectedMainSkill === d.name) {
            console.log("이미 선택된 주스킬 - 선택 해제");
            setSelectedMainSkill(null);
          } else {
            console.log("새 주스킬 선택");
            setSelectedMainSkill(d.name);
          }
        }
      })
      .on("mouseover", function(event: MouseEvent, d: BubbleDataPoint) {
        // 노드 강조 효과
        d3.select(this).select("circle")
          .transition()
          .duration(300)
          .attr("stroke", d.isSelected ? "#FF4500" : d.isMainSkill ? "#FFA500" : "#FFD700") // 선택된 노드는 더 밝은 색상
          .attr("stroke-width", function() {
            // 선택된 노드 또는 스킬셋인 경우 테두리 더 두껍게
            const isSelected = selectedMainSkill === d.name || 
                              (selectedSkillSet !== 'all' && d.skillSet === selectedSkillSet);
            return isSelected ? 8 : 6;
          });
        
        tooltip.style("display", "block");
        
        // 레벨 값과 레이블 설정
        const levelValue = viewMode === 'expected' ? d.requiredLevel : d.currentLevel;
        const levelLabel = viewMode === 'expected' ? '기대역량' : '현재역량';
        const otherLevelValue = viewMode === 'expected' ? d.currentLevel : d.requiredLevel;
        const otherLevelLabel = viewMode === 'expected' ? '현재역량' : '기대역량';
        
        // Gap 계산
        const gap = d.requiredLevel - d.currentLevel;
        const gapClass = gap > 0 ? "positive-gap" : gap < 0 ? "negative-gap" : "neutral-gap";
        
        // 툴팁 내용 설정
        tooltip.html(`
          <div class="tooltip-title">${d.name}</div>
          <p><strong>카테고리:</strong> ${d.category}</p>
          <p style="margin-bottom: 8px;"><strong>팀:</strong> <span style="color: ${d.isMainSkill ? '#FFD700' : '#4682B4'}; font-weight: bold;">${d.isMainSkill ? '모든 팀' : d.team || '미지정'}</span></p>
          <p><strong>스킬셋:</strong> ${d.skillSet || '미지정'}</p>
          <p><strong>${levelLabel}:</strong> ${levelValue.toFixed(1)}</p>
          <p><strong>${otherLevelLabel}:</strong> ${otherLevelValue.toFixed(1)}</p>
          <p><strong>GAP:</strong> <span class="${gapClass}">${gap.toFixed(1)}</span></p>
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
        // 노드 강조 효과 제거
        d3.select(this).select("circle")
          .transition()
          .duration(300)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 3);
          
        tooltip.style("display", "none");
      });
      
    // 원 그리기
    nodeGroup.append("circle")
      .attr("r", 0) // Start with radius 0
      .attr("fill", (d: BubbleDataPoint) => d.color)
      .attr("stroke", (d: BubbleDataPoint) => {
        // 선택된 주스킬인 경우
        if (d.isSelected) {
          return "#FF4500"; // 밝은 오렌지색
        }
        
        // 선택된 주스킬과 같은 스킬셋인 경우
        if (selectedMainSkill) {
          const selectedMainSkillObj = gridLayoutData.find(
            item => item.name === selectedMainSkill && item.isMainSkill
          );
          
          if (selectedMainSkillObj && d.skillSet === selectedMainSkillObj.skillSet) {
            return "#FFA500"; // 주황색 테두리 (같은 스킬셋 강조)
          }
        }
        
        // 선택된 스킬셋인 경우
        const isSelectedSkillSet = selectedSkillSet !== 'all' && d.skillSet === selectedSkillSet;
        if (isSelectedSkillSet) {
          return "#FFA500"; // 주황색 테두리
        }
        
        // 주스킬인 경우
        if (d.isMainSkill) {
          return "#FFD700"; // 금색 테두리
        }
        
        // 기본 테두리 색상 (팀별 색상)
        const teamHash = String(d.team).split('').reduce((hash, char) => {
          return ((hash << 5) - hash) + char.charCodeAt(0);
        }, 0);
        
        const hue = Math.abs(teamHash % 360);
        return `hsl(${hue}, 70%, 70%)`;
      })
      .attr("stroke-width", (d: BubbleDataPoint) => {
        // 선택된 주스킬인 경우
        if (d.isSelected) {
          return 8;
        }
        
        // 선택된 주스킬과 같은 스킬셋인 경우
        if (selectedMainSkill) {
          const selectedMainSkillObj = gridLayoutData.find(
            item => item.name === selectedMainSkill && item.isMainSkill
          );
          
          if (selectedMainSkillObj && d.skillSet === selectedMainSkillObj.skillSet) {
            return 6; // 약간 두꺼운 테두리
          }
        }
        
        // 선택된 스킬셋인 경우
        const isSelectedSkillSet = selectedSkillSet !== 'all' && d.skillSet === selectedSkillSet;
        if (isSelectedSkillSet) {
          return d.isMainSkill ? 7 : 5;
        }
        
        return d.isMainSkill ? 5 : 3;
      })
      .attr("stroke-opacity", 0.8)
      .transition()
      .duration(800)
      .attr("r", (d: BubbleDataPoint) => d.radius); // Animate to final radius

    // 텍스트 그리기
    const nodeLabel = nodeGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#ffffff")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .style("text-shadow", "0 0 3px rgba(0,0,0,0.8)")
      .style("user-select", "none");

    // 노드 레이블 텍스트 추가
    nodeLabel.each(function(d: BubbleDataPoint) {
      // 원 크기에 따라 텍스트 크기 조정
      const fontSize = Math.max(10, Math.min(d.radius / 6, 16));
      d3.select(this).attr("font-size", `${fontSize}px`);
      
      // 이름 줄바꿈 처리
      let name = d.name;
      
      if (name.length > 10) {
        // 10자 이상이면 줄바꿈 처리
        const firstLine = name.substring(0, 10);
        let secondLine = name.substring(10);
        
        if (secondLine.length > 10) {
          secondLine = secondLine.substring(0, 7) + '...';
        }
        
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
      } else {
        // 한 줄로 표시할 텍스트
        d3.select(this)
          .append("tspan")
          .attr("x", 0)
          .attr("dy", 0)
          .text(name);
      }
      
      // 빈도 표시 추가
      d3.select(this)
        .append("tspan")
        .attr("x", 0)
        .attr("dy", fontSize * 1.5)
        .attr("font-size", `${fontSize * 0.8}px`)
        .attr("fill", "#ffffff")
        .attr("opacity", 0.9)
        .text(`빈도: ${d.frequency}`);
    });

    // 연결 선 추가 (같은 팀의 노드 간 연결)
    if (gridLayoutData.length > 1) {
      // 팀별로 노드 그룹화
      const teamGroups = new Map<string | number, BubbleDataPoint[]>();
      gridLayoutData.forEach(node => {
        const team = node.team || 'unknown';
        if (!teamGroups.has(team)) {
          teamGroups.set(team, []);
        }
        teamGroups.get(team)!.push(node);
      });
      
      // 주스킬 노드 가져오기 (all 팀으로 분류됨)
      const mainSkills = gridLayoutData.filter(node => node.isMainSkill);
      
      // 각 팀 내에서 노드 연결
      teamGroups.forEach((nodes, team) => {
        // 'all' 팀(주스킬)은 특별히 처리
        if (team === 'all') {
          // 주스킬 중앙에 모아서 배치하는 처리는 이미 되어 있음
          // 팀 영역 표시하지 않고 연결선만 처리
          return;
        }
        
        // 팀 내 주스킬과 멀티스킬 구분
        const teamMainSkills = nodes.filter(node => node.isMainSkill);
        const teamMultiSkills = nodes.filter(node => !node.isMainSkill);
        
        // 팀 이름 표시 (노드 그룹 근처에)
        if (nodes.length > 0) {
          // 팀 중심점 계산
          const avgX = nodes.reduce((sum, node) => sum + (node.x || 0), 0) / nodes.length;
          const avgY = nodes.reduce((sum, node) => sum + (node.y || 0), 0) / nodes.length;
          
          // 최대 반경 계산 (팀 라벨 위치 지정용)
          const maxRadius = Math.max(...nodes.map(node => node.radius));
          
          // 팀 이름이 'unknown'이 아닌 경우에만 표시
          if (team !== 'unknown') {
            svg.append("text")
              .attr("x", avgX)
              .attr("y", avgY - maxRadius - 15)
              .attr("text-anchor", "middle")
              .attr("font-size", "12px")
              .attr("fill", "#666")
              .attr("font-weight", "bold")
              .text(team);
          }
        }
        
        // 각 팀의 멀티스킬과 주스킬 연결
        if (teamMultiSkills.length > 0 && mainSkills.length > 0) {
          teamMultiSkills.forEach(multiSkill => {
            // 같은 스킬셋의 주스킬과 멀티스킬 연결
            const matchingMainSkills = mainSkills.filter(
              mainSkill => mainSkill.skillSet === multiSkill.skillSet
            );
            
            // 매칭되는 주스킬이 있는 경우에만 연결
            if (matchingMainSkills.length > 0) {
              matchingMainSkills.forEach(mainSkill => {
                // 선택된 스킬셋인 경우 연결선을 더 강조
                const isSelectedSkillSet = selectedSkillSet !== 'all' && multiSkill.skillSet === selectedSkillSet;
                
                console.log(`연결: ${mainSkill.name}(주스킬, ${mainSkill.skillSet}) <-> ${multiSkill.name}(멀티스킬, ${multiSkill.skillSet})`);
                
                svg.append("line")
                  .attr("class", "connection")
                  .attr("x1", mainSkill.x || 0)
                  .attr("y1", mainSkill.y || 0)
                  .attr("x2", multiSkill.x || 0)
                  .attr("y2", multiSkill.y || 0)
                  .attr("stroke", isSelectedSkillSet ? "#FFA500" : "#aaaaaa") // 선택된 스킬셋은 주황색으로 강조
                  .attr("stroke-width", isSelectedSkillSet ? 2 : 1) // 선택된 스킬셋은 더 두껍게
                  .attr("stroke-dasharray", isSelectedSkillSet ? "5,3" : "3,3")
                  .attr("opacity", isSelectedSkillSet ? 0.8 : 0.5); // 선택된 스킬셋은 더 진하게
              });
            }
          });
        }
        
        // 같은 팀 내의 모든 노드 연결 (스킬셋 관계없이)
        if (nodes.length > 1) {
          // 팀 내 노드들을 둘러싸는 영역 생성
          const padding = 20; // 패딩 값
          const teamNodesX = nodes.map(node => (node.x || 0));
          const teamNodesY = nodes.map(node => (node.y || 0));
          const teamNodesRadius = nodes.map(node => node.radius);
          
          const minX = Math.min(...teamNodesX.map((x, i) => x - teamNodesRadius[i])) - padding;
          const maxX = Math.max(...teamNodesX.map((x, i) => x + teamNodesRadius[i])) + padding;
          const minY = Math.min(...teamNodesY.map((y, i) => y - teamNodesRadius[i])) - padding;
          const maxY = Math.max(...teamNodesY.map((y, i) => y + teamNodesRadius[i])) + padding;
          
          // 팀 영역 그리기
          const teamHash = String(team).split('').reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0);
          }, 0);
          
          // HSL 색상으로 변환 (매우 연한 색상)
          const hue = Math.abs(teamHash % 360);
          const teamAreaColor = `hsla(${hue}, 70%, 85%, 0.2)`;
          
          // 팀 영역 배경 (둥근 사각형)
          svg.append("rect")
            .attr("x", minX)
            .attr("y", minY)
            .attr("width", maxX - minX)
            .attr("height", maxY - minY)
            .attr("rx", 20) // 모서리 둥글게
            .attr("ry", 20)
            .attr("fill", teamAreaColor)
            .attr("stroke", `hsla(${hue}, 70%, 60%, 0.3)`)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,3")
            .lower(); // 노드 뒤로 보내기
          
          // 팀 내 노드 사이 연결선
          for (let i = 0; i < nodes.length - 1; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              svg.append("line")
                .attr("class", "connection team-connection")
                .attr("x1", nodes[i].x || 0)
                .attr("y1", nodes[i].y || 0)
                .attr("x2", nodes[j].x || 0)
                .attr("y2", nodes[j].y || 0)
                .attr("stroke", "#dddddd")
                .attr("stroke-width", 0.5)
                .attr("stroke-dasharray", "1,2")
                .attr("opacity", 0.3);
            }
          }
        }
      });
      
      // 주스킬 간 연결 (같은 스킬셋인 경우)
      if (mainSkills.length > 1) {
        const skillSetMainGroups = new Map<string, BubbleDataPoint[]>();
        mainSkills.forEach(node => {
          const skillSet = node.skillSet || 'unknown';
          if (!skillSetMainGroups.has(skillSet)) {
            skillSetMainGroups.set(skillSet, []);
          }
          skillSetMainGroups.get(skillSet)!.push(node);
        });
        
        // 각 스킬셋 내의 주스킬끼리 연결
        skillSetMainGroups.forEach((skillSetMainNodes, skillSet) => {
          if (skillSetMainNodes.length > 1) {
            // 선택된 스킬셋인지 확인
            const isSelectedSkillSet = selectedSkillSet !== 'all' && skillSet === selectedSkillSet;
            
            for (let i = 0; i < skillSetMainNodes.length - 1; i++) {
              for (let j = i + 1; j < skillSetMainNodes.length; j++) {
                svg.append("line")
                  .attr("class", "connection main-connection")
                  .attr("x1", skillSetMainNodes[i].x || 0)
                  .attr("y1", skillSetMainNodes[i].y || 0)
                  .attr("x2", skillSetMainNodes[j].x || 0)
                  .attr("y2", skillSetMainNodes[j].y || 0)
                  .attr("stroke", isSelectedSkillSet ? "#FFA500" : "#666666") // 선택된 스킬셋은 주황색으로 강조
                  .attr("stroke-width", isSelectedSkillSet ? 2.5 : 1.5) // 선택된 스킬셋은 더 두껍게
                  .attr("stroke-dasharray", "5,3")
                  .attr("opacity", isSelectedSkillSet ? 0.9 : 0.6); // 선택된 스킬셋은 더 진하게
              }
            }
          }
        });
        
        // 주스킬 영역 표시
        const padding = 25; // 패딩 값
        const mainSkillsX = mainSkills.map(node => (node.x || 0));
        const mainSkillsY = mainSkills.map(node => (node.y || 0));
        const mainSkillsRadius = mainSkills.map(node => node.radius);
        
        const minX = Math.min(...mainSkillsX.map((x, i) => x - mainSkillsRadius[i])) - padding;
        const maxX = Math.max(...mainSkillsX.map((x, i) => x + mainSkillsRadius[i])) + padding;
        const minY = Math.min(...mainSkillsY.map((y, i) => y - mainSkillsRadius[i])) - padding;
        const maxY = Math.max(...mainSkillsY.map((y, i) => y + mainSkillsRadius[i])) + padding;
        
        // 주스킬 영역 배경 (둥근 사각형)
        svg.append("rect")
          .attr("x", minX)
          .attr("y", minY)
          .attr("width", maxX - minX)
          .attr("height", maxY - minY)
          .attr("rx", 30) // 모서리 둥글게
          .attr("ry", 30)
          .attr("fill", "rgba(255, 215, 0, 0.1)") // 금색 배경 (매우 연함)
          .attr("stroke", "rgba(255, 215, 0, 0.3)")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "10,5")
          .lower(); // 노드 뒤로 보내기
        
        // "주스킬" 레이블 추가
        svg.append("text")
          .attr("x", (minX + maxX) / 2)
          .attr("y", minY - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", "14px")
          .attr("font-weight", "bold")
          .attr("fill", "#666")
          .text("주스킬 영역");
      }
    }
    
    // 최적 화면 적용
    const zoomToFit = () => {
      if (gridLayoutData.length === 0) return;
      
      const bounds = {
        minX: d3.min(gridLayoutData, d => (d.x || 0) - d.radius) || 0,
        maxX: d3.max(gridLayoutData, d => (d.x || 0) + d.radius) || width,
        minY: d3.min(gridLayoutData, d => (d.y || 0) - d.radius) || 0,
        maxY: d3.max(gridLayoutData, d => (d.y || 0) + d.radius) || height
      };
      
      const dx = bounds.maxX - bounds.minX;
      const dy = bounds.maxY - bounds.minY;
      const x = (bounds.minX + bounds.maxX) / 2;
      const y = (bounds.minY + bounds.maxY) / 2;
      
      // 안전 마진
      const scale = 0.9 / Math.max(dx / width, dy / height);
      const translate = [width / 2 - scale * x, height / 2 - scale * y];
      
      // 필요한 경우에만 줌 적용
      if (scale < 0.9 || scale > 1.1) {
        // 새로운 줌 기능과 함께 사용
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(zoom.transform as any, d3.zoomIdentity
            .translate(translate[0] + margin.left, translate[1] + margin.top)
            .scale(scale));
      }
    };
    
    // 모든 노드가 화면에 맞게 보이도록 조정
    zoomToFit();
    
  }, [bubbleData, dimensions, loading, viewMode, getColorScale, selectedSkillSet, selectedMainSkill]);

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
    // 스킬셋을 변경하면 주스킬 선택도 해제
    setSelectedMainSkill(null);
  }, []);

  // Handle view mode change
  const handleColorModeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setViewMode(event.target.value as 'expected' | 'current');
  }, []);

  // 선택된 주스킬 해제 함수
  const clearSelectedMainSkill = useCallback(() => {
    setSelectedMainSkill(null);
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
          <label htmlFor="skill-set" title="선택한 스킬셋의 주스킬과 멀티스킬이 모두 표시됩니다">■ 스킬셋 선택</label>
          <select 
            id="skill-set" 
            value={selectedSkillSet}
            onChange={handleSkillSetChange}
            title="선택한 스킬셋의 주스킬과 멀티스킬이 모두 표시됩니다"
          >
            <option value="all">모든 스킬셋</option>
            {mainSkillSets.map(skillSet => (
              <option key={skillSet} value={skillSet}>{skillSet}</option>
            ))}
          </select>
          <small style={{ 
            display: 'block', 
            marginTop: '5px', 
            color: '#666', 
            fontSize: '12px' 
          }}>
          </small>
        </div>
        
        <div className="color-mode-selector">
          <label htmlFor="color-mode">■ 표시 모드:</label>
          <select 
            id="color-mode" 
            value={viewMode} 
            onChange={handleColorModeChange}
          >
            <option value="expected">기대역량</option>
            <option value="current">현재역량</option>
          </select>
        </div>
        
        {selectedMainSkill && (
          <div className="selected-skill-info" style={{
            marginLeft: '20px',
            padding: '5px 10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #e9ecef',
            fontSize: '14px'
          }}>
            <span>선택된 주스킬: <strong style={{ color: '#FF4500' }}>{selectedMainSkill}</strong></span>
            <button 
              onClick={clearSelectedMainSkill}
              style={{
                marginLeft: '10px',
                border: 'none',
                background: '#eee',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              해제
            </button>
          </div>
        )}
      </div>

      <div className="graph-container">
        <svg ref={svgRef} className="bubble-chart"></svg>
        <div ref={tooltipRef} className="custom-tooltip" style={{ display: 'none', position: 'absolute' }}></div>
        
        <button className="reset-zoom-button" style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '5px 10px',
          background: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 100
        }}>
          초기화
        </button>
        
        <div className="chart-help" style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(240, 240, 240, 0.8)',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 100
        }}>
        </div>
        
        {bubbleData.length === 0 && !loading && (
          <div className="no-data-message">
            <p>표시할 데이터가 없습니다.</p>
            <p>다른 스킬셋을 선택하거나 이전 단계에서 데이터를 확인해주세요.</p>
          </div>
        )}
        
        {selectedSkillSet !== 'all' && (
          <div className="skill-info" style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            border: '1px solid #ddd',
            zIndex: 100
          }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
              '{selectedSkillSet}' 스킬셋 정보:
            </p>
            <p style={{ margin: '0 0 3px 0' }}>
              총 {bubbleData.length}개 스킬 표시 중
            </p>
            <p style={{ margin: '0 0 3px 0' }}>
              주스킬: {bubbleData.filter(d => d.isMainSkill).length}개
            </p>
            <p style={{ margin: '0' }}>
              멀티스킬: {bubbleData.filter(d => !d.isMainSkill).length}개
            </p>
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