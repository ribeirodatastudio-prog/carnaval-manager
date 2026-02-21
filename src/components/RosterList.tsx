
import React from 'react';
import { StaffMember } from '../types/models';
import { getPotentialDescriptor } from '../services/staffService';
import { formatMoney, formatRole } from '../utils/textUtils';
import { getKeySkills } from '../utils/helpers';

interface RosterListProps {
  staff: StaffMember[];
}

export default function RosterList({ staff }: RosterListProps) {
  if (staff.length === 0) {
    return <div className="text-[#4A5A7A] p-4 text-center italic">Nenhum profissional contratado.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1E2D50]">
      <table className="w-full text-left text-sm text-[#F0E6D3]">
        <thead className="text-[10px] uppercase tracking-widest bg-[#0F1629] text-[#8A9BB8]">
          <tr>
            <th className="px-4 py-3 font-bold border-b border-[#1E2D50]">Função</th>
            <th className="px-4 py-3 font-bold border-b border-[#1E2D50]">Nome</th>
            <th className="px-4 py-3 font-bold border-b border-[#1E2D50] text-center">Reputação</th>
            <th className="px-4 py-3 font-bold border-b border-[#1E2D50]">Atributos</th>
            <th className="px-4 py-3 font-bold border-b border-[#1E2D50]">Histórico</th>
            <th className="px-4 py-3 font-bold border-b border-[#1E2D50] text-right">Salário</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2D50] bg-[#161E35]">
          {staff.map((member) => (
            <tr key={member.id} className="hover:bg-[#1E2D50] transition-colors">
              <td className="px-4 py-3 font-black text-[#F0E6D3] uppercase tracking-wider text-xs">{formatRole(member.role)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <span className="font-bold text-[#F0E6D3]">{member.name}</span>
                  {member.age && <span className="ml-2 text-[10px] text-[#4A5A7A] font-mono">({member.age}a)</span>}
                  {member.archetype && (
                      <span className="ml-2 text-[10px] bg-[#3D1F7A] text-[#D8B4FE] px-1.5 py-0.5 rounded border border-[#7B4FD4]">
                          {member.archetype}
                      </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-black font-mono"
                    style={{
                        background: member.reputation >= 180 ? '#7A5A10' : '#0F1629',
                        color: member.reputation >= 180 ? '#E8C96A' : '#8A9BB8',
                        border: `1px solid ${member.reputation >= 180 ? '#C9A84C60' : '#2A3F6B'}`
                    }}
                  >
                      {member.reputation}
                  </span>
                  <span className="text-[9px] text-[#4A5A7A] uppercase tracking-widest">{getPotentialDescriptor(member.reputation, member.potential)}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5 flex-wrap">
                  {getKeySkills(member.role, member.skills).map((skill) => (
                    <span key={skill.name} className="bg-[#080C18] px-2 py-1 rounded text-[10px] border border-[#1E2D50] whitespace-nowrap flex items-center gap-1">
                      <span className="text-[#8A9BB8] uppercase tracking-wider">{skill.name}</span>
                      <span className="text-[#C9A84C] font-mono font-bold">{skill.value}</span>
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-[#8A9BB8] max-w-[200px] truncate" title={member.historyText || "Novato"}>
                 {member.historyText || "-"}
              </td>
              <td className="px-4 py-3 text-right font-mono text-[#F0E6D3] font-bold">{formatMoney(member.salary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
