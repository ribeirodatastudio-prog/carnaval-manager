import React from 'react';
import { StaffMember } from '../types/models';
import { getPotentialDescriptor } from '../services/staffService';
import { formatMoney, formatRole } from '../utils/textUtils';
import { getKeySkills } from '../utils/helpers';
import Badge from './Badge';

interface RosterListProps {
  staff: StaffMember[];
}

export default function RosterList({ staff }: RosterListProps) {
  if (staff.length === 0) {
    return <div className="text-[#8A9BB8] p-6 text-center italic">Nenhum profissional contratado ainda.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-sm text-[#F0E6D3]">
        <thead className="text-[10px] uppercase font-bold tracking-widest bg-[#080C18] text-[#4A5A7A] border-b border-[#1E2D50]">
          <tr>
            <th className="px-5 py-4">Função</th>
            <th className="px-5 py-4">Nome</th>
            <th className="px-5 py-4 text-center">Reputação</th>
            <th className="px-5 py-4">Atributos Principais</th>
            <th className="px-5 py-4">Histórico</th>
            <th className="px-5 py-4 text-right">Salário</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2D50]">
          {staff.map((member) => (
            <tr key={member.id} className="group hover:bg-[#161E35] transition-colors">
              <td className="px-5 py-4 font-bold text-[#F0E6D3]">
                <Badge variant="gray">{formatRole(member.role)}</Badge>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{member.name}</span>
                  {member.age && <span className="text-[10px] text-[#4A5A7A] font-mono bg-[#080C18] px-1.5 py-0.5 rounded border border-[#1E2D50]">{member.age}a</span>}
                  {member.archetype && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-800/50">
                        {member.archetype}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-5 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="px-2 py-0.5 rounded text-sm font-black font-mono leading-none"
                    style={{
                        background: member.reputation >= 180 ? '#7A5A10' : '#080C18',
                        color: member.reputation >= 180 ? '#E8C96A' : '#8A9BB8',
                        border: `1px solid ${member.reputation >= 180 ? '#C9A84C60' : '#1E2D50'}`,
                    }}
                  >
                      {member.reputation}
                  </span>
                  <span className="text-[9px] text-[#4A5A7A] uppercase tracking-widest font-bold">
                    {getPotentialDescriptor(member.reputation, member.potential)}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex gap-1.5 flex-wrap">
                  {getKeySkills(member.role, member.skills).map((skill) => (
                    <span key={skill.name} className="bg-[#080C18] px-2 py-1 rounded text-[10px] border border-[#1E2D50] uppercase tracking-wider text-[#8A9BB8]">
                      {skill.name}: <span className={`font-black font-mono ${skill.value >= 18 ? 'text-[#C9A84C]' : skill.value >= 15 ? 'text-[#2ECC71]' : 'text-[#F0E6D3]'}`}>{skill.value}</span>
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4 text-xs text-[#8A9BB8] italic max-w-[200px] truncate" title={member.historyText || "Recém-chegado"}>
                 {member.historyText || "-"}
              </td>
              <td className="px-5 py-4 text-right font-mono font-bold text-[#F0E6D3]">
                {formatMoney(member.salary)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
