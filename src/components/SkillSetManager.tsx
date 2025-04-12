import { useState } from 'react'
import { DataTable } from './DataTable'

interface SkillItem {
  스킬셋: string
  요구역량: string
  L1: string
  L2: string
  L3: string
  L4: string
  L5: string
}

export function SkillSetManager() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [skillList, setSkillList] = useState<SkillItem[]>([])

  const handleAddSkill = (skill: SkillItem) => {
    // 이미 추가된 스킬인지 확인
    const isDuplicate = skillList.some(item => item.스킬셋 === skill.스킬셋)
    if (!isDuplicate) {
      setSkillList(prev => [...prev, skill])
    }
    setIsModalOpen(false)
  }

  const handleRemoveSkill = (skillName: string) => {
    setSkillList(prev => prev.filter(skill => skill.스킬셋 !== skillName))
  }

  return (
    <div>
      <div>
        <h1>스킬셋 리스트</h1>
        <button onClick={() => setIsModalOpen(true)}>
          스킬셋 추가하기
        </button>
      </div>

      <div>
        {skillList.length > 0 ? (
          <ul>
            {skillList.map((skill, index) => (
              <li key={index}>
                <div>
                  <h3>{skill.스킬셋}</h3>
                  <p>{skill.요구역량}</p>
                  <div>
                    <p>L1: {skill.L1}</p>
                    <p>L2: {skill.L2}</p>
                    <p>L3: {skill.L3}</p>
                    <p>L4: {skill.L4}</p>
                    <p>L5: {skill.L5}</p>
                  </div>
                  <button onClick={() => handleRemoveSkill(skill.스킬셋)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>추가된 스킬셋이 없습니다.</p>
        )}
      </div>

      <DataTable 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddSkill={handleAddSkill}
      />
    </div>
  )
} 