import React, { useState, useEffect } from 'react';
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
  const [colorMode, setColorMode] = useState<'type' | 'level' | 'gap'>('type');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  // Color scale function for the nodes based on their level
  const getColorScale = (value: number, min: number, max: number): string => {
    const colorScale = d3Scale.scaleSequential<string>()
      .domain([min, max])
      .interpolator(d3.interpolateYlOrRd);
    return colorScale(value);
  };

  // Colors for node types
  const nodeTypeColors: Record<string, string> = {
    team: '#4285F4',     // Blue
    category: '#34A853', // Green
    skill: '#FBBC05',    // Yellow
    requirement: '#EA4335' // Red
  };

  useEffect(() => {
    const fetchSkillData = async () => {
      try {
        const { data, error } = await supabase
          .from('frequency_data')
          .select('*');

        if (error) throw error;

        const skills = data as SkillRecord[];
        setSkillData(skills);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(skills.map(skill => skill.category)));
        setCategories(uniqueCategories);
        
        // Initial construction of graph data
        constructGraphData(skills, 'all');
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching skill data:', err);
        setError('Failed to load skill data. Please try again later.');
        setLoading(false);
      }
    };

    fetchSkillData();
  }, []);

  // Construct graph data from skill records
  const constructGraphData = (skills: SkillRecord[], categoryFilter: string) => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // Filter skills by category if needed
    const filteredSkills = categoryFilter === 'all' 
      ? skills 
      : skills.filter(skill => skill.category === categoryFilter);

    // Add team nodes
    const teams = Array.from(new Set(filteredSkills.map(skill => skill.team)));
    teams.forEach(team => {
      const teamId = `team-${team}`;
      if (!nodeIds.has(teamId)) {
        nodes.push({
          id: teamId,
          name: String(team),
          type: 'team',
          val: 20 // Larger node size for teams
        });
        nodeIds.add(teamId);
      }
    });

    // Add category nodes and link to teams
    filteredSkills.forEach(skill => {
      const teamId = `team-${skill.team}`;
      const categoryId = `category-${skill.category}`;
      
      if (!nodeIds.has(categoryId)) {
        nodes.push({
          id: categoryId,
          name: skill.category,
          type: 'category',
          team: String(skill.team),
          val: 15 // Medium node size for categories
        });
        nodeIds.add(categoryId);
      }
      
      // Link category to team
      links.push({
        source: categoryId,
        target: teamId,
        value: 1
      });
    });

    // Add skill nodes and link to categories
    filteredSkills.forEach(skill => {
      const categoryId = `category-${skill.category}`;
      const skillId = `skill-${skill.id}`;
      
      if (!nodeIds.has(skillId)) {
        nodes.push({
          id: skillId,
          name: skill.skill_name,
          type: 'skill',
          category: skill.category,
          team: String(skill.team),
          level: skill.current_level,
          requiredLevel: skill.required_level,
          val: 10 // Smaller node size for skills
        });
        nodeIds.add(skillId);
      }
      
      // Link skill to category
      links.push({
        source: skillId,
        target: categoryId,
        value: 1
      });
      
      // Add requirement node and link to skill
      const reqId = `req-${skill.id}`;
      if (!nodeIds.has(reqId)) {
        nodes.push({
          id: reqId,
          name: `Level ${skill.required_level}`,
          type: 'requirement',
          level: skill.current_level,
          requiredLevel: skill.required_level,
          val: 5 // Smallest node size for requirements
        });
        nodeIds.add(reqId);
      }
      
      // Link requirement to skill with value based on frequency
      links.push({
        source: reqId,
        target: skillId,
        value: skill.frequency || 1
      });
    });

    setGraphData({ nodes, links });
  };

  // Handle category filter change
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const category = event.target.value;
    setSelectedCategory(category);
    constructGraphData(skillData, category);
  };

  // Handle color mode change
  const handleColorModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setColorMode(event.target.value as 'type' | 'level' | 'gap');
  };

  // Node color based on selected mode
  const getNodeColor = (node: GraphNode): string => {
    if (colorMode === 'type') {
      return nodeTypeColors[node.type] || '#999';
    } else if (colorMode === 'level' && node.level !== undefined) {
      return getColorScale(node.level, 1, 5);
    } else if (colorMode === 'gap' && node.level !== undefined && node.requiredLevel !== undefined) {
      const gap = node.requiredLevel - node.level;
      return getColorScale(gap > 0 ? gap : 0, 0, 4);
    }
    return '#999';
  };

  if (loading) {
    return <div className="loading">Loading skill frequency data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="skill-frequency-container">
      <div className="controls">
        <div className="color-mode-selector">
          <label htmlFor="color-mode">Color Mode:</label>
          <select 
            id="color-mode" 
            value={colorMode} 
            onChange={handleColorModeChange}
          >
            <option value="type">Node Type</option>
            <option value="level">Current Level</option>
            <option value="gap">Level Gap</option>
          </select>
        </div>
        
        <div className="category-filter">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select 
            id="category-filter" 
            value={selectedCategory} 
            onChange={handleCategoryChange}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="graph-container">
        <ForceGraph2D
          graphData={graphData}
          nodeAutoColorBy="type"
          nodeColor={(node) => getNodeColor(node as GraphNode)}
          nodeLabel={(node: GraphNode) => {
            if (node.type === 'skill') {
              return `${node.name}\nCurrent Level: ${node.level}\nRequired Level: ${node.requiredLevel}`;
            }
            return node.name;
          }}
          linkWidth={(link: any) => Math.sqrt(link.value)}
          linkCurvature={0.25}
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
        <h4>Legend</h4>
        
        <h5>Node Types</h5>
        <div className="node-types">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: nodeTypeColors.team }}></span>
            <span>Team</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: nodeTypeColors.category }}></span>
            <span>Category</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: nodeTypeColors.skill }}></span>
            <span>Skill</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: nodeTypeColors.requirement }}></span>
            <span>Required Level</span>
          </div>
        </div>
        
        {colorMode === 'level' && (
          <div className="level-colors">
            <h5>Current Level Scale</h5>
            <div className="color-scale">
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className="color-item">
                  <span className="color-box" style={{ backgroundColor: getColorScale(level, 1, 5) }}></span>
                  <span>Level {level}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {colorMode === 'gap' && (
          <div className="level-colors">
            <h5>Level Gap Scale</h5>
            <div className="color-scale">
              {[0, 1, 2, 3, 4].map(gap => (
                <div key={gap} className="color-item">
                  <span className="color-box" style={{ backgroundColor: getColorScale(gap, 0, 4) }}></span>
                  <span>Gap {gap}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="step-navigation" style={{ marginTop: '20px' }}>
        <button 
          className="nav-button prev"
          onClick={onPrev}
        >
          이전 단계
        </button>
        
        <button 
          className="button primary"
          onClick={onComplete}
        >
          다음 단계
        </button>
      </div>
    </div>
  );
};

export default SkillFrequencyStep; 