"use client";

import React, { useState } from "react";
import AlertsPanel from "../../../college/alerts-panel";
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
  members: string[]; // array of company user emails or IDs
}

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [newCohortName, setNewCohortName] = useState("");
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);

  // Mock performance data for demonstration
  const getPerformance = (cohort: Cohort) => {
    // Replace with real data aggregation
    return {
      avgScore: cohort.members.length ? (70 + cohort.members.length * 2) : 0,
      completionRate: cohort.members.length ? (60 + cohort.members.length * 3) : 0,
      selectedPct: cohort.members.length ? Math.min(100, cohort.members.length * 10) : 0,
      topMember: cohort.members[0] || "-",
      skills: [
        { skill: "Project Management", strength: Math.random() * 100 },
        { skill: "Frontend", strength: Math.random() * 100 },
        { skill: "Backend", strength: Math.random() * 100 },
        { skill: "DevOps", strength: Math.random() * 100 },
        { skill: "QA", strength: Math.random() * 100 },
      ],
      progression: Array.from({ length: 6 }, (_, i) => ({ date: `2025-0${i+1}`, progression: 60 + Math.random() * 40 })),
    };
  };

  // Add new cohort
  const handleAddCohort = () => {
    if (!newCohortName.trim()) return;
    setCohorts([...cohorts, { name: newCohortName.trim(), members: [] }]);
    setNewCohortName("");
  };

  // Select cohort
  const handleSelectCohort = (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setMemberEmail("");
  };

  // Add student to cohort
  const handleAddMember = () => {
    if (!memberEmail.trim() || !selectedCohort) return;
    setCohorts((prev) =>
      prev.map((c) =>
        c.name === selectedCohort.name
          ? { ...c, members: [...c.members, memberEmail.trim()] }
          : c
      )
    );
    setMemberEmail("");
  };

  // Aggregated performance view
  const overallStats = {
    totalCohorts: cohorts.length,
    totalMembers: cohorts.reduce((acc, c) => acc + c.members.length, 0),
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
            await fetch("/api/dashboard/profile/college", {
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
          <CardTitle>Overall Company Cohort Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <div className="text-lg font-semibold">Total Cohorts</div>
              <div className="text-2xl text-primary font-bold">{overallStats.totalCohorts}</div>
            </div>
            <div>
              <div className="text-lg font-semibold">Total Members</div>
              <div className="text-2xl text-primary font-bold">{overallStats.totalMembers}</div>
            </div>
            <div>
              <div className="text-lg font-semibold">Avg Team Score</div>
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
            totalStudents: overallStats.totalMembers,
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
          <CardTitle>Company Cohorts (Teams/Groups)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New Cohort Name (e.g., Project Alpha Team)"
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
                      <TableHead>Members</TableHead>
                      <TableHead>Avg Team Score</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Selected %</TableHead>
                      <TableHead>Top Member</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.map((cohort) => {
                      const perf = getPerformance(cohort);
                      return (
                        <TableRow key={cohort.name}>
                          <TableCell>{cohort.name}</TableCell>
                          <TableCell>{cohort.members.length}</TableCell>
                          <TableCell>{perf.avgScore}</TableCell>
                          <TableCell>{perf.completionRate}%</TableCell>
                          <TableCell>{perf.selectedPct}%</TableCell>
                          <TableCell>{perf.topMember}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Cohort Member Details */}
            {selectedCohort && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">{selectedCohort.name} Members</h4>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Member Email or ID"
                    value={memberEmail}
                    onChange={e => setMemberEmail(e.target.value)}
                  />
                  <Button onClick={handleAddMember}>Add Member</Button>
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
                    {selectedCohort.members.map((email, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{email}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMember(email);
                              setShowMemberDialog(true);
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
                                { skill: "Project Management", strength: Math.random() * 100 },
                                { skill: "Frontend", strength: Math.random() * 100 },
                                { skill: "Backend", strength: Math.random() * 100 },
                                { skill: "DevOps", strength: Math.random() * 100 },
                                { skill: "QA", strength: Math.random() * 100 },
                              ],
                            }}
                            label="Download Member PDF"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Member Analytics Dialog */}
                <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Member Performance Analytics</DialogTitle>
                    </DialogHeader>
                    {selectedMember && (
                      <div className="space-y-4">
                        <div className="text-lg font-semibold">Member: {selectedMember}</div>
                        {/* Mock stats, replace with real data */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm">Avg Team Score</div>
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
                            <div className="text-xl text-primary font-bold">{["Project Management", "Frontend", "Backend", "DevOps", "QA"][Math.floor(Math.random()*5)]}</div>
                          </div>
                        </div>
                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <div className="font-medium mb-2">Team Scores Over Time</div>
                            <CohortLineChart data={Array.from({length: 6}, (_,i)=>({date:`2025-0${i+1}`, progression: 60+Math.random()*40}))} />
                          </div>
                          <div>
                            <div className="font-medium mb-2">Skill Strengths</div>
                            <CohortRadarChart data={[
                              { skill: "Project Management", strength: Math.random()*100 },
                              { skill: "Frontend", strength: Math.random()*100 },
                              { skill: "Backend", strength: Math.random()*100 },
                              { skill: "DevOps", strength: Math.random()*100 },
                              { skill: "QA", strength: Math.random()*100 },
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
