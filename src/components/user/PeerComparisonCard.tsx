"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { usePeerComparison } from "@/hooks/usePeerComparison";
import { TrendingUp, TrendingDown, Minus, Users, BarChart3, Award, Trophy } from "lucide-react";

interface PeerComparisonCardProps {
  submissionId: string;
  compact?: boolean;
}

export function PeerComparisonCard({ submissionId, compact = false }: PeerComparisonCardProps) {
  const { data, loading, error } = usePeerComparison(submissionId);

  if (loading) {
    return (
      <Card className={compact ? "border-slate-200" : ""}>
        <CardContent className="py-4">
          <div className="flex items-center justify-center text-sm text-slate-500">
            <div className="animate-pulse">Loading peer comparison...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show placeholder when insufficient data for comparison
  if (error || !data || data.total_participants < 2) {
    return (
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4" />
            <span>
              {data?.total_participants === 1
                ? "Be the first! Peer comparison will be available when more students complete this assessment."
                : "Peer comparison data not yet available."}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const differenceFromAverage = data.your_percentage - data.average_percentage;
  const comparison: "above" | "below" | "equal" = 
    differenceFromAverage > 0 ? "above" : differenceFromAverage < 0 ? "below" : "equal";

  const getComparisonIcon = () => {
    switch (comparison) {
      case "above":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "below":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-slate-500" />;
    }
  };

  const getComparisonColor = () => {
    switch (comparison) {
      case "above":
        return "text-green-600 bg-green-50";
      case "below":
        return "text-red-600 bg-red-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  const getPercentileLabel = () => {
    if (data.your_rank && data.your_rank <= 3) return "Selected";
    if (data.percentile >= 90) return "Top 10%";
    if (data.percentile >= 75) return "Top 25%";
    if (data.percentile >= 50) return "Top 50%";
    return "Below Average";
  };

  const getPercentileBadgeColor = () => {
    if (data.your_rank && data.your_rank <= 3) return "bg-purple-100 text-purple-800";
    if (data.percentile >= 90) return "bg-green-100 text-green-800";
    if (data.percentile >= 75) return "bg-blue-100 text-blue-800";
    if (data.percentile >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-600">vs {data.total_participants} peers</span>
        </div>
        <div className="flex items-center gap-1">
          {getComparisonIcon()}
          <span className={`text-xs font-medium ${comparison === "above" ? "text-green-600" : comparison === "below" ? "text-red-600" : "text-slate-600"}`}>
            {comparison === "equal"
              ? "At average"
              : `${Math.abs(Math.round(differenceFromAverage))}% ${comparison} avg`}
          </span>
        </div>
        <Badge className={`text-xs ${getPercentileBadgeColor()}`}>
          {getPercentileLabel()}
        </Badge>
      </div>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span>Anonymous Peer Comparison</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Performers */}
        {Array.isArray(data.top_performers) && data.top_performers.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
              <Trophy className="h-4 w-4" />
              Top Performers
            </div>
            <div className="flex flex-wrap gap-2">
              {data.top_performers.map((performer, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 rounded bg-purple-50 border border-purple-200 text-xs flex items-center gap-2"
                >
                  <span className="font-bold text-purple-800">#{performer.rank}</span>
                  <span className="text-purple-700">{performer.score} pts</span>
                  <span className="text-purple-500">({performer.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Your Rank */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Your Rank</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800">#{data.your_rank}</span>
            <span className="text-sm text-slate-500">of {data.total_participants}</span>
          </div>
        </div>

        {/* Your Position */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Your Position</span>
          </div>
          <Badge className={getPercentileBadgeColor()}>
            {getPercentileLabel()}
          </Badge>
        </div>

        {/* Percentile Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Your percentile ranking</span>
            <span className="font-medium">{data.percentile}th percentile</span>
          </div>
          <Progress value={data.percentile} className="h-2" />
        </div>

        {/* Comparison Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Your Score</div>
            <div className="text-lg font-semibold text-slate-800">
              {data.your_score}/{data.max_possible_score} ({data.your_percentage}%)
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Peer Average</div>
            <div className="text-lg font-semibold text-slate-600">
              {data.average_score}/{data.max_possible_score} ({data.average_percentage}%)
            </div>
          </div>
        </div>

        {/* Score Range */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-slate-100 rounded">
            <div className="text-slate-500">Lowest</div>
            <div className="font-medium">{data.lowest_score}</div>
          </div>
          <div className="p-2 bg-slate-100 rounded">
            <div className="text-slate-500">Median</div>
            <div className="font-medium">{data.median_score}</div>
          </div>
          <div className="p-2 bg-slate-100 rounded">
            <div className="text-slate-500">Highest</div>
            <div className="font-medium">{data.highest_score}</div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${getComparisonColor()}`}>
          {getComparisonIcon()}
          <span className="text-sm">{data.performance_summary}</span>
        </div>

        {/* Students Comparison */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <div className="text-green-600">Scored Lower</div>
            <div className="font-medium text-green-700">{data.students_scored_lower}</div>
          </div>
          <div className="p-2 bg-slate-50 rounded border border-slate-200">
            <div className="text-slate-500">Same Score</div>
            <div className="font-medium">{data.students_scored_same}</div>
          </div>
          <div className="p-2 bg-red-50 rounded border border-red-200">
            <div className="text-red-600">Scored Higher</div>
            <div className="font-medium text-red-700">{data.students_scored_higher}</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Based on {data.total_participants} anonymous submissions
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default PeerComparisonCard;
