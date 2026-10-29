// Chart components for cohort dashboard
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend } from "recharts";

export function CohortBarChart({ data }: { data: { name: string; avgScore: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="avgScore" fill="#6366f1" name="Avg Score" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CohortRadarChart({ data }: { data: { skill: string; strength: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="skill" />
        <PolarRadiusAxis />
        <Radar dataKey="strength" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function CohortLineChart({ data }: { data: { date: string; progression: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="progression" stroke="#6366f1" name="Progression" />
      </LineChart>
    </ResponsiveContainer>
  );
}
