"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPANY_INVITE_PERMISSIONS,
  COMPANY_ROLE_CHANGE_PERMISSIONS,
  COMPANY_ROLE_REMOVE_PERMISSIONS,
  CompanySubrole,
  formatCompanySubroleLabel,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";

interface InviteStatus {
  email: string;
  subrole: CompanySubrole;
  status: "invited" | "active";
  invitedAt: string;
  joinedAt?: string;
}

interface TeamInvite {
  email: string;
  subrole: CompanySubrole;
}

export default function TeamManagementPanel({
  companyId,
  myEmail,
  mySubrole,
}: {
  companyId: string;
  myEmail: string;
  mySubrole: CompanySubrole;
}) {
  const [invite, setInvite] = useState<TeamInvite>({
    email: "",
    subrole: "trainee",
  });
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showAlert, setShowAlert] = useState<string | null>(null);
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus[]>([]);

  const allowedInviteRoles = useMemo(
    () => COMPANY_INVITE_PERMISSIONS[normalizeCompanySubrole(mySubrole)] || [],
    [mySubrole],
  );
  const canInvite = allowedInviteRoles.length > 0;
  const canChangeRoles =
    normalizeCompanySubrole(mySubrole) === "owner" ||
    normalizeCompanySubrole(mySubrole) === "admin";
  const defaultInviteRole: CompanySubrole =
    allowedInviteRoles.length > 0
      ? allowedInviteRoles[allowedInviteRoles.length - 1]
      : "trainee";

  useEffect(() => {
    if (allowedInviteRoles.length > 0) {
      setInvite((prev) => ({
        ...prev,
        subrole: allowedInviteRoles[allowedInviteRoles.length - 1],
      }));
    }
  }, [allowedInviteRoles]);

  useEffect(() => {
    if (!companyId) return;
    fetch(`/api/company/${companyId}`)
      .then((res) => res.json())
      .then((data) =>
        setInviteStatuses(
          (data.company?.members || []).map((member: InviteStatus) => ({
            ...member,
            subrole: normalizeCompanySubrole(member.subrole),
          })),
        ),
      );
  }, [companyId, refresh]);

  const handleTeamInvite = async () => {
    setLoading(true);
    try {
      const userRes = await fetch("/api/user/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invite.email }),
      });
      const userData = await userRes.json();
      if (!userData.exists) {
        setShowAlert(`User with email ${invite.email} does not exist.`);
        setTimeout(() => setShowAlert(null), 3000);
        return;
      }

      const res = await fetch("/api/company/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...invite }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAlert(`Invite sent to ${invite.email}`);
      } else {
        setShowAlert(data.error || `Failed to send invite to ${invite.email}`);
      }

      setInvite({ email: "", subrole: defaultInviteRole });
      setRefresh((r) => r + 1);
      setTimeout(() => setShowAlert(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showAlert && (
        <Alert>
          <AlertTitle>Team Management</AlertTitle>
          <AlertDescription>{showAlert}</AlertDescription>
        </Alert>
      )}

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTeamInvite();
              }}
              className="space-y-4 max-w-md"
            >
              <div>
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={invite.email}
                  onChange={(e) =>
                    setInvite({ ...invite, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={invite.subrole}
                  onValueChange={(value) =>
                    setInvite({
                      ...invite,
                      subrole: normalizeCompanySubrole(value),
                    })
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="invite-role" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedInviteRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatCompanySubroleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading}>
                Send Invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members & Invites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white dark:bg-gray-900">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {inviteStatuses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-6"
                    >
                      No team members or invites found.
                    </TableCell>
                  </TableRow>
                )}
                {inviteStatuses.map((member, idx) => {
                  const normalizedMemberRole = normalizeCompanySubrole(
                    member.subrole,
                  );
                  const normalizedMyRole = normalizeCompanySubrole(mySubrole);
                  const isOwnerRow = normalizedMemberRole === "owner";
                  const changeTargets =
                    COMPANY_ROLE_CHANGE_PERMISSIONS[normalizedMyRole] || [];
                  const canChangeThisMember =
                    canChangeRoles &&
                    !isOwnerRow &&
                    member.email !== myEmail &&
                    changeTargets.includes(normalizedMemberRole);
                  const removeTargets =
                    COMPANY_ROLE_REMOVE_PERMISSIONS[normalizedMyRole] || [];
                  const canRemoveThisMember =
                    !isOwnerRow &&
                    member.email !== myEmail &&
                    removeTargets.includes(normalizedMemberRole);

                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        {canChangeThisMember ? (
                          <Select
                            value={member.subrole}
                            onValueChange={async (value) => {
                              setLoading(true);
                              const normalizedValue =
                                normalizeCompanySubrole(value);
                              const res = await fetch("/api/company/member", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  companyId,
                                  email: member.email,
                                  action: "changeRole",
                                  subrole: normalizedValue,
                                }),
                              });
                              const data = await res.json();
                              if (res.ok) {
                                // Update local state immediately
                                setInviteStatuses((prev) =>
                                  prev.map((m) =>
                                    m.email === member.email
                                      ? { ...m, subrole: normalizedValue }
                                      : m,
                                  ),
                                );
                                setShowAlert(
                                  `Role changed to ${normalizedValue}`,
                                );
                              } else {
                                setShowAlert(
                                  data.error || "Failed to change role",
                                );
                              }
                              setTimeout(() => setShowAlert(null), 3000);
                              setLoading(false);
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {changeTargets.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {formatCompanySubroleLabel(role)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold capitalize">
                            {formatCompanySubroleLabel(normalizedMemberRole)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.status === "active" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            Accepted
                          </span>
                        )}
                        {member.status === "invited" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                            Waiting
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.invitedAt
                          ? new Date(member.invitedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {canRemoveThisMember ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                            disabled={loading}
                            onClick={async () => {
                              setLoading(true);
                              await fetch("/api/company/member", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  companyId,
                                  email: member.email,
                                  action: "remove",
                                }),
                              });
                              setRefresh((r) => r + 1);
                              setLoading(false);
                            }}
                          >
                            Remove
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
