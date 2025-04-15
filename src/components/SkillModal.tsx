import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/SkillModal.css'
import { SkillItem } from '../types/skill'

interface DataItem {
  스킬셋: string,
  요구역량: string,
  L1: string,
  L2: string,
  L3: string,
  L4: string,
  L5: string
}

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSkill: (skills: SkillItem[]) => void;
  onShowDetail: (showDetail: boolean) => void;
  isShowDetail: boolean;
  team?: string;
  teamWork?: string;
  coreSkill?: string;
}

export function SkillModal({ 
  isOpen, 
  onClose, 
  onAddSkill, 
  onShowDetail, 
  isShowDetail,
  team = '', 
  teamWork = '', 
  coreSkill = '' 
}: SkillModalProps) {
  const [data, setSkillList] = useState<DataItem[]>([])
  const [skillNameList, setSkillNameList] = useState<DataItem[]>([])
  const [selectedSkill, setSelectedSkill] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      try {
        const { data: fetchedData, error } = await supabase
          .from('skill_list')
          .select('*')

        if (error) {
          console.error('Supabase error:', error)
          throw error
        }

        // 중복 제거
        const uniqueSkills = new Set()
        const uniqueData = fetchedData.filter(item => {
          if (uniqueSkills.has(item.스킬셋)) {
            return false
          }
          uniqueSkills.add(item.스킬셋)
          return true
        })

        setSkillList(fetchedData)
        setSkillNameList(uniqueData)
      } catch (err) {
        console.error('Error details:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen])

  if (!isOpen) return null;

  if (loading) return (
    <div className="data-table-modal">
      <div className="data-table-modal-overlay" onClick={onClose} />
      <div className="data-table-modal-content">
        <div className="data-table-loading" />
      </div>
    </div>
  )

  if (error) return (
    <div className="data-table-modal">
      <div className="data-table-modal-overlay" onClick={onClose} />
      <div className="data-table-modal-content">
        <div className="data-table-error">
          <p>Error: {error}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="data-table-modal">
      <div className="data-table-modal-overlay" onClick={onClose} />
      <div className="data-table-modal-content">
        <button className="data-table-close-button" onClick={onClose}>×</button>
        
        <div className="data-table-container">
          <div className="data-table-wrapper">
            <div className="data-table-header">
              <h2 className="data-table-title">스킬 리스트</h2>
            </div>

            <div className="data-table-grid">
              <div className="data-table-content">
                <select 
                  className="data-table-select"
                  onChange={(e) => {
                    setSelectedSkill([]);
                    const selectedValue = e.target.value;
                    const foundSkill = data.filter(item => item.스킬셋 === selectedValue);
                    console.log(foundSkill);
                    setSelectedSkill(foundSkill);
                  }}
                >
                  <option value="">스킬을 선택하세요</option>
                  {skillNameList.map((item) => (
                    <option key={item.스킬셋} value={item.스킬셋}>
                      {item.스킬셋}
                    </option>
                  ))}
                </select>

                {selectedSkill.length > 0 && (
                  <div className="data-table-detail">
                    <h3 className="data-table-detail-title">{selectedSkill[0].스킬셋}
                      <button className="data-table-add-button2" onClick={() => onShowDetail(!isShowDetail)}>
                        {isShowDetail ? '레벨상세숨기기' : '레벨상세보기'}
                      </button>
                    </h3>
                    <div className="data-table-detail-content">
                      {selectedSkill.map((skill) => (
                        <div>
                          <h4> ■ {skill.요구역량}
                            
                          </h4>
                          {isShowDetail && (
                            <>
                              <p>- L1: {skill.L1}</p>
                              <p>- L2: {skill.L2}</p>
                              <p>- L3: {skill.L3}</p>
                              <p>- L4: {skill.L4}</p>
                              <p>- L5: {skill.L5}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      className="data-table-add-button"
                      onClick={() => {
                        const skillItems: SkillItem[] = selectedSkill.map(item => ({
                          ...item,
                          팀: team,
                          팀업무: teamWork,
                          핵심기술: coreSkill
                        }));
                        onAddSkill(skillItems);
                      }}
                    >
                      스킬 추가하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}