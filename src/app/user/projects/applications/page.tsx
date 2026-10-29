"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useUser } from "@/redux/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAssessments } from "@/hooks/useAssessments";
import { Assessment } from "@/redux/slice/assessment.slice";
import { PeerComparisonCard } from "@/components/user/PeerComparisonCard";
import { AssessmentResultCard } from "@/components/user/AssessmentResultCard";
import { useResultReleaseCycle } from "@/hooks/useResultReleaseCycle";
import { useMemo } from "react";
import { AssessmentsListSkeleton } from "@/components/ui/assessment-skeleton";

export default function ApplicationsPage() {

  const { user } = useUser();

  const {
    assessments,
    loading: assessmentLoading,
    error: assessmentError,
    actions: assessmentActions,
  } = useAssessments();

  const project_ids = useMemo(() => [...new Set(assessments.map((assessment) => assessment.project_id))], [assessments]);
  const { cycles: resultReleaseCycles } = useResultReleaseCycle(project_ids);

  useEffect(() => {
    async function fetchData() {
      if (!user?._id) return;

      try {
        await assessmentActions.fetchUserAssessments(user._id as unknown as string);
      } catch (error) {
        console.error("Error fetching assessments:", error);
      }
    }

    fetchData();
  }, [user, assessmentActions]);



  if (assessmentLoading.fetchAssessments) {
    return <AssessmentsListSkeleton />;
  }
  if (assessmentError.fetchAssessments) {
    return (
      <div className="text-center text-red-500 py-10">
        {assessmentError.fetchAssessments}
      </div>
    );
  }


  const shouldShowResults = (_assessment: Assessment): boolean => {
    // Ensure project_id comparison is always string
    const cycle = resultReleaseCycles[String(_assessment.project_id)];
    if (!cycle) return false;
    // Show results ONLY if status is completed
    return cycle.status === "completed";
  };

  const readyAssessments = assessments.filter(shouldShowResults);

  const pendingAssessments = assessments.filter(
    (assessment) => !shouldShowResults(assessment),
  );

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center text-xl mb-6">
        <h1 className="text-3xl font-bold">My Applications</h1>
        <div className="text-sm text-slate-600">
          Total: {readyAssessments.length} | Average Score:{" "}
          {readyAssessments.length > 0
            ? (
                readyAssessments.reduce(
                  (acc, assessment) => acc + assessment.score?.percentage,
                  0,
                ) / readyAssessments.length
              ).toFixed(2)
            : 0}
          %
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="text-slate-500">No applications found.</div>
      ) : (
        <div className="space-y-6">
          {/* Ready assessments - using view endpoint for detailed display */}
          {readyAssessments.map((assessment) => (
            <div key={assessment.submission_id} className="space-y-4">
              {/* Assessment Result Card - fetches from /results/{submission_id}/view */}
              <AssessmentResultCard 
                submissionId={assessment.submission_id}
                showQuestions={true}
              />
              
              {/* Peer Comparison - fetches from /results/{submission_id}/compare */}
              <PeerComparisonCard
                submissionId={assessment.submission_id}
                compact={false}
              />
            </div>
          ))}

          {/* Pending assessments */}
          {pendingAssessments.map((assessment) => {
            const cycle = resultReleaseCycles[String(assessment.project_id)];
            const availableDate = cycle ? new Date(cycle.processingDate) : null;
            // DEBUG: Show cycle data for diagnosis
            console.log('Assessment:', assessment);
            console.log('Cycle:', cycle);

            return (
              <Card
                key={assessment.submission_id}
                className="mb-6 border-orange-200 bg-orange-50"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl text-orange-800">
                      {assessment.assessment_title}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-orange-200 text-orange-800">
                      Results Pending
                    </span>
                  </CardTitle>
                  <div className="text-sm text-orange-600">
                    {cycle && cycle.status === "failed" ? (
                      <>Result release failed. Please contact support.</>
                    ) : cycle && cycle.processingDate ? (
                      <>Results will be released after review is completed.</>
                    ) : (
                      <>Release date not available</>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-6 text-center bg-orange-100 rounded-lg border border-orange-200">
                    <div className="text-lg font-semibold text-orange-800 mb-2">
                      📋 Results Under Review
                    </div>
                    <div className="text-sm text-orange-700 mb-4">
                      The results for &ldquo;{assessment.assessment_title}
                      &rdquo; will be available after the review period.
                    </div>
                    {availableDate && (
                      <div className="text-sm font-medium text-orange-800">
                        Expected availability: {availableDate.toLocaleString()}
                      </div>
                    )}
                    <div className="text-xs text-orange-600 mt-2">
                      Results are typically released 7 days after project
                      submission to ensure thorough evaluation.
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {readyAssessments.length === 0 && pendingAssessments.length === 0 && (
            <div className="text-slate-500">No applications found.</div>
          )}
        </div>
      )}
    </div>
  );
}
