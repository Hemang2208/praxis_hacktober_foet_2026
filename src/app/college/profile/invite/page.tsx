"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Papa from "papaparse";

interface StudentInvite {
  name: string;
  email: string;
  rollNo?: string;
}

// Type for CSV row data (Papa Parse results)
interface CsvRowData {
  [key: string]: string | undefined;
}

interface InviteStatus {
  _id: string;
  student_email: string;
  name?: string;
  rollNo?: string;
  status: "pending" | "accepted" | "expired";
  created_at: string;
  expires_at: string;
}

export default function CollegeInviteStudentsPage() {
  const [mode, setMode] = useState<"individual" | "bulk">("individual");
  const [student, setStudent] = useState<StudentInvite>({
    name: "",
    email: "",
    rollNo: "",
  });
  const [csvStudents, setCsvStudents] = useState<StudentInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus[]>([]);
  const [refresh, setRefresh] = useState(0);

  // Fetch invite statuses
  useEffect(() => {
    fetch("/api/students/invite/status")
      .then((res) => res.json())
      .then((data) => setInviteStatuses(data.invites || []));
  }, [refresh]);

  // Handle individual invite
  const handleIndividualInvite = async () => {
    setLoading(true);
    try {
      await fetch("/api/students/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(student),
      });
      setStudent({ name: "", email: "", rollNo: "" });
      setRefresh((r) => r + 1);
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: StudentInvite[] = results.data.map((row: CsvRowData) => ({
          name: row.name || row.Name || "",
          email: row.email || row.Email || "",
          rollNo: row.rollNo || row["Roll No"] || row["ID"] || "",
        }));
        setCsvStudents(parsed);
      },
    });
  };

  // Handle bulk invite
  const handleBulkInvite = async () => {
    setLoading(true);
    try {
      await fetch("/api/students/invite/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: csvStudents }),
      });
      setCsvStudents([]);
      setRefresh((r) => r + 1);
    } finally {
      setLoading(false);
    }
  };

  // Resend invite
  const handleResend = async (invite: InviteStatus) => {
    setLoading(true);
    try {
      await fetch(`/api/students/invite/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: invite._id }),
      });
      setRefresh((r) => r + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Invite Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <Button
              variant={mode === "individual" ? "default" : "outline"}
              onClick={() => setMode("individual")}
            >
              Individual Invite
            </Button>
            <Button
              variant={mode === "bulk" ? "default" : "outline"}
              onClick={() => setMode("bulk")}
            >
              Bulk Invite (CSV)
            </Button>
          </div>

          {mode === "individual" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleIndividualInvite();
              }}
              className="space-y-4 max-w-md"
            >
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={student.name}
                  onChange={(e) =>
                    setStudent({ ...student, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={student.email}
                  onChange={(e) =>
                    setStudent({ ...student, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="rollNo">Roll No / ID (optional)</Label>
                <Input
                  id="rollNo"
                  value={student.rollNo}
                  onChange={(e) =>
                    setStudent({ ...student, rollNo: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={loading}>
                Send Invite
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv">Upload CSV</Label>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                />
              </div>
              {csvStudents.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Preview</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roll No / ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvStudents.map((s, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>{s.rollNo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button
                    className="mt-4"
                    onClick={handleBulkInvite}
                    disabled={loading}
                  >
                    Send Bulk Invites
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitation Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roll No / ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inviteStatuses.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    No invites found.
                  </TableCell>
                </TableRow>
              )}
              {inviteStatuses.map((invite) => (
                <TableRow key={invite._id}>
                  <TableCell>{invite.name || "-"}</TableCell>
                  <TableCell>{invite.student_email}</TableCell>
                  <TableCell>{invite.rollNo || "-"}</TableCell>
                  <TableCell>
                    {invite.status === "pending" && (
                      <span className="text-yellow-600">Pending</span>
                    )}
                    {invite.status === "accepted" && (
                      <span className="text-green-600">Accepted</span>
                    )}
                    {invite.status === "expired" && (
                      <span className="text-red-600">Expired</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.expires_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {invite.status !== "accepted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResend(invite)}
                        disabled={loading}
                      >
                        Resend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
