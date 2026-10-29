"use client";

import React, { useState } from "react";
import AlertsPanel from "../../alerts-panel";
import { LogoUpload } from "@/components/LogoUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CohortBarChart, CohortRadarChart, CohortLineChart } from "@/components/CohortCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PDFReportButton } from "@/components/PDFReportButton";

interface Cohort {
  name: string;
  students: string[]; // array of student emails or IDs
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [newCohortName, setNewCohortName] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showStudentDialog, setShowStudentDialog] = useState(false);

  // Mock performance data for demonstration
  const getPerformance = (cohort: Cohort) => {
    // Replace with real data aggregation
    return {
      avgScore: cohort.students.length ? (70 + cohort.students.length * 2) : 0,
      completionRate: cohort.students.length ? (60 + cohort.students.length * 3) : 0,
      selectedPct: cohort.students.length ? Math.min(100, cohort.students.length * 10) : 0,
      topStudent: cohort.students[0] || "-",
      skills: [
        { skill: "Python", strength: Math.random() * 100 },
        { skill: "React", strength: Math.random() * 100 },
        { skill: "SQL", strength: Math.random() * 100 },
        { skill: "ML", strength: Math.random() * 100 },
        { skill: "DevOps", strength: Math.random() * 100 },
      ],
      progression: Array.from({ length: 6 }, (_, i) => ({ date: `2025-0${i+1}`, progression: 60 + Math.random() * 40 })),
    };
  };

  // Add new cohort
  const handleAddCohort = () => {
    if (!newCohortName.trim()) return;
    setCohorts([...cohorts, { name: newCohortName.trim(), students: [] }]);
    setNewCohortName("");
  };

  // Select cohort
  const handleSelectCohort = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setStudentEmail("");
  };

  // Add student to cohort
  const handleAddStudent = () => {
    if (!studentEmail.trim() || !selectedCohort) return;
    setCohorts((prev) =>
      prev.map((c) =>
        c.name === selectedCohort.name
          ? { ...c, students: [...c.students, studentEmail.trim()] }
          : c
      )
    );
    setStudentEmail("");
  };

  // Aggregated performance view
  const overallStats = {
    totalCohorts: cohorts.length,
    totalStudents: cohorts.reduce((acc, c) => acc + c.students.length, 0),
    avgScore:
      cohorts.length > 0
        ? Math.round(
            cohorts.reduce((acc, c) => acc + getPerformance(c).avgScore, 0) / cohorts.length
          )
        : 0,
    avgCompletion:
      cohorts.length > 0
        ? Math.round(
            cohorts.reduce((acc, c) => acc + getPerformance(c).completionRate, 0) / cohorts.length
          )
        : 0,
    avgSelected:
      cohorts.length > 0
        ? Math.round(
            cohorts.reduce((acc, c) => acc + getPerformance(c).selectedPct, 0) / cohorts.length
          )
        : 0,
  };

  // Chart data
  const barData = cohorts.map((c) => ({ name: c.name, avgScore: getPerformance(c).avgScore }));
  const radarData = selectedCohort ? getPerformance(selectedCohort).skills : [];
  const lineData = selectedCohort ? getPerformance(selectedCohort).progression : [];


  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Alerts Panel for flagged students */}
      <AlertsPanel />
      {/* Institution Logo Upload for Certificate */}
      <div className="my-6">
        <h3 className="font-semibold mb-2">Upload Institution Logo for Certificate</h3>
        <LogoUpload onLogoChange={async (file, url) => {
          // Save logo URL to college profile after upload
          if (url) {
            // Wait for Cloudinary upload to complete
            // Find the cloudUrl from LogoUpload state
            // For simplicity, fetch the logo URL from LogoUpload's cloudUrl state
            // (You may want to lift state up for production)
            // Here, we assume url is the cloudUrl
            await fetch("/api/college/profile/college", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ institutionLogoUrl: url }),
            });
          }
        }} />
      </div>
      {/* Aggregated Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Cohort Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <div className="text-lg font-semibold">Total Cohorts</div>
              <div className="text-2xl text-primary font-bold">{overallStats.totalCohorts}</div>
            </div>
            <div>
              <div className="text-lg font-semibold">Total Students</div>
              <div className="text-2xl text-primary font-bold">{overallStats.totalStudents}</div>
            </div>
            <div>
              <div className="text-lg font-semibold">Avg Score</div>
              <div className="text-2xl text-primary font-bold">{overallStats.avgScore}</div>
            </div>
            <div>
              <div className="text-lg font-semibold">Avg Completion Rate</div>
              <div className="text-2xl text-primary font-bold">{overallStats.avgCompletion}%</div>
            </div>
            <div>
              <div className="text-lg font-semibold">Avg Selected in Projects</div>
              <div className="text-2xl text-primary font-bold">{overallStats.avgSelected}%</div>
            </div>
          </div>
          <PDFReportButton type="cohort" data={{
            name: "All Cohorts",
            totalStudents: overallStats.totalStudents,
            avgScore: overallStats.avgScore,
            completionRate: overallStats.avgCompletion,
            selectedPct: overallStats.avgSelected
          }} label="Download Cohort PDF" />
        </CardContent>
      </Card>
      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Average Scores per Cohort</CardTitle>
          </CardHeader>
          <CardContent>
            <CohortBarChart data={barData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Skill Strengths by Cohort</CardTitle>
          </CardHeader>
          <CardContent>
            <CohortRadarChart data={radarData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Progression Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <CohortLineChart data={lineData} />
          </CardContent>
        </Card>
      </div>
      {/* Cohort Management & Details */}
      <Card>
        <CardHeader>
          <CardTitle>Student Cohorts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New Cohort Name (e.g., Fall 2025 CS Batch)"
                value={newCohortName}
                onChange={e => setNewCohortName(e.target.value)}
              />
              <Button onClick={handleAddCohort}>Add Cohort</Button>
            </div>
            <div className="flex gap-4 mt-4">
              {cohorts.map((cohort) => (
                <Button
                  key={cohort.name}
                  variant={selectedCohort?.name === cohort.name ? "default" : "outline"}
                  onClick={() => handleSelectCohort(cohort)}
                >
                  {cohort.name}
                </Button>
              ))}
            </div>
            {/* Cohort Performance Table */}
            {cohorts.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Cohort Performance</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cohort</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Selected %</TableHead>
                      <TableHead>Top Student</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.map((cohort) => {
                      const perf = getPerformance(cohort);
                      return (
                        <TableRow key={cohort.name}>
                          <TableCell>{cohort.name}</TableCell>
                          <TableCell>{cohort.students.length}</TableCell>
                          <TableCell>{perf.avgScore}</TableCell>
                          <TableCell>{perf.completionRate}%</TableCell>
                          <TableCell>{perf.selectedPct}%</TableCell>
                          <TableCell>{perf.topStudent}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Cohort Student Details */}
            {selectedCohort && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">{selectedCohort.name} Students</h4>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Student Email or ID"
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
                  />
                  <Button onClick={handleAddStudent}>Add Student</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email/ID</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Download PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCohort.students.map((email, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{email}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStudent(email);
                              setShowStudentDialog(true);
                            }}
                          >
                            View Analytics
                          </Button>
                        </TableCell>
                        <TableCell>
                          <PDFReportButton
                            type="student"
                            data={{
                              email,
                              avgScore: Math.round(70 + Math.random() * 30),
                              completionRate: Math.round(60 + Math.random() * 40),
                              selectedPct: Math.round(Math.random() * 100),
                              skills: [
                                { skill: "Python", strength: Math.random() * 100 },
                                { skill: "React", strength: Math.random() * 100 },
                                { skill: "SQL", strength: Math.random() * 100 },
                                { skill: "ML", strength: Math.random() * 100 },
                                { skill: "DevOps", strength: Math.random() * 100 },
                              ],
                            }}
                            label="Download Student PDF"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Student Analytics Dialog */}
                <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Student Performance Analytics</DialogTitle>
                    </DialogHeader>
                    {selectedStudent && (
                      <div className="space-y-4">
                        <div className="text-lg font-semibold">Student: {selectedStudent}</div>
                        {/* Mock stats, replace with real data */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm">Avg Assessment Score</div>
                            <div className="text-xl text-primary font-bold">{Math.round(70 + Math.random() * 30)}</div>
                          </div>
                          <div>
                            <div className="text-sm">Task Completion Rate</div>
                            <div className="text-xl text-primary font-bold">{Math.round(60 + Math.random() * 40)}%</div>
                          </div>
                          <div>
                            <div className="text-sm">Selected in Projects</div>
                            <div className="text-xl text-primary font-bold">{Math.round(Math.random() * 100)}%</div>
                          </div>
                          <div>
                            <div className="text-sm">Skill Strength</div>
                            <div className="text-xl text-primary font-bold">{["Python", "React", "SQL", "ML"][Math.floor(Math.random()*4)]}</div>
                          </div>
                        </div>
                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="font-medium mb-2">Assessment Scores Over Time</div>
                            <CohortLineChart data={Array.from({length: 6}, (_,i)=>({date:`2025-0${i+1}`, progression: 60+Math.random()*40}))} />
                          </div>
                          <div>
                            <div className="font-medium mb-2">Skill Strengths</div>
                            <CohortRadarChart data={[
                              { skill: "Python", strength: Math.random()*100 },
                              { skill: "React", strength: Math.random()*100 },
                              { skill: "SQL", strength: Math.random()*100 },
                              { skill: "ML", strength: Math.random()*100 },
                              { skill: "DevOps", strength: Math.random()*100 },
                            ]} />
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
