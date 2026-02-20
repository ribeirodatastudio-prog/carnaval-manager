
import React from 'react';
import { StaffMember } from '../types/models';
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
            <th className="px-4 py-3">Key Skills</th>
            <th className="px-4 py-3 text-right">Salary</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {staff.map((member) => (
            <tr key={member.id} className="bg-gray-800 hover:bg-gray-750">
              <td className="px-4 py-3 font-medium text-white">{formatRole(member.role)}</td>
              <td className="px-4 py-3">
                {member.name}
                {member.archetype && <span className="ml-2 text-xs bg-purple-900 text-purple-200 px-1 rounded">{member.archetype}</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {getKeySkills(member.role, member.skills).map((skill) => (
                    <span key={skill.name} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-600">
                      {skill.name}: <span className="text-yellow-400 font-bold">{skill.value}</span>
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">{formatMoney(member.salary)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
