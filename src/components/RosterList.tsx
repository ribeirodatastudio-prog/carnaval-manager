
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
    return <div className="text-gray-400 p-4">No staff hired yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-300">
        <thead className="text-xs uppercase bg-gray-700 text-gray-400">
          <tr>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3 text-center">Rep</th>
            <th className="px-4 py-3">Key Skills</th>
            <th className="px-4 py-3">History</th>
            <th className="px-4 py-3 text-right">Salary</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {staff.map((member) => (
            <tr key={member.id} className="bg-gray-800 hover:bg-gray-750">
              <td className="px-4 py-3 font-medium text-white">{formatRole(member.role)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center">
                  {member.name}
                  {member.age && <span className="ml-2 text-xs text-gray-500">({member.age}y)</span>}
                  {member.archetype && <span className="ml-2 text-xs bg-purple-900 text-purple-200 px-1 rounded">{member.archetype}</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${member.reputation >= 180 ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' : 'bg-gray-700 text-gray-300'}`}>
                      {member.reputation}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-tight">{getPotentialDescriptor(member.reputation, member.potential)}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 flex-wrap">
                  {getKeySkills(member.role, member.skills).map((skill) => (
                    <span key={skill.name} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-600 whitespace-nowrap">
                      {skill.name}: <span className="text-yellow-400 font-bold">{skill.value}</span>
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate" title={member.historyText || "Newcomer"}>
                 {member.historyText || "-"}
              </td>
              <td className="px-4 py-3 text-right font-mono">{formatMoney(member.salary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
