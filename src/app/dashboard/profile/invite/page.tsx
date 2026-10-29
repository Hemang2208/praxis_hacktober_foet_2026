"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  COMPANY_INVITE_PERMISSIONS,
  COMPANY_ROLE_CHANGE_PERMISSIONS,
  COMPANY_ROLE_REMOVE_PERMISSIONS,
  CompanySubrole,
  formatCompanySubroleLabel,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";
import { useAppDispatch } from "@/redux/hooks";
import {
  inviteCompanyMember,
  updateCompanyMemberRole,
  removeCompanyMember,
} from "@/redux/slice/company.slice";

interface TeamInvite {
  email: string;
  subrole: CompanySubrole;
}

interface UserProfile {
  _id: string;
  email: string;
  role: string;
  members?: InviteStatus[];
  [key: string]: unknown;
}

interface InviteStatus {
  email: string;
  subrole: CompanySubrole;
  status: "invited" | "active";
  invitedAt: string;
  joinedAt?: string;
}

function InvitePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    fetch("/api/auth/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data.user));
  }, []);

  const companyId = profile?._id || "";

  // Determine logged-in user's subrole
  const mySubrole: CompanySubrole = React.useMemo(() => {
    if (!profile || !profile.members) return "trainee";
    const me = profile.members.find((m) => m.email === profile.email);
    return normalizeCompanySubrole(me?.subrole) || "trainee";
  }, [profile]);

  const allowedInviteRoles = useMemo(
    () => COMPANY_INVITE_PERMISSIONS[mySubrole] || [],
    [mySubrole],
  );
  const canChangeRoles =
    normalizeCompanySubrole(mySubrole) === "owner" ||
    normalizeCompanySubrole(mySubrole) === "admin";
  const canInvite = allowedInviteRoles.length > 0;

  const defaultInviteRole =
    allowedInviteRoles.length > 0
      ? allowedInviteRoles[allowedInviteRoles.length - 1]
      : "trainee";

  const dispatch = useAppDispatch();

  const [invite, setInvite] = useState<TeamInvite>({
    email: "",
    subrole: defaultInviteRole,
  });
  const [loading, setLoading] = useState(false);
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [showAlert, setShowAlert] = useState<string | null>(null);

  // Reset invite subrole when allowedInviteRoles changes
  useEffect(() => {
    if (allowedInviteRoles.length > 0) {
      setInvite((prev) => ({
        ...prev,
        subrole: allowedInviteRoles[allowedInviteRoles.length - 1],
      }));
    }
  }, [allowedInviteRoles]);

  // Fetch company invite statuses
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

  // Handle team invite
  const handleTeamInvite = async () => {
    setLoading(true);
    try {
      await dispatch(inviteCompanyMember({
        companyId,
        email: invite.email,
        subrole: invite.subrole,
      })).unwrap();
      setShowAlert(`Invite sent to ${invite.email}`);
      setInvite({ email: "", subrole: defaultInviteRole });
      setRefresh((r) => r + 1);
      setTimeout(() => setShowAlert(null), 3000);
    } catch (err) {
      setShowAlert(err instanceof Error ? err.message : String(err));
      setTimeout(() => setShowAlert(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full sm:container sm:mx-auto space-y-8 px-4 sm:px-0">
      {showAlert && (
        <Alert variant="default" className="mb-4">
          <AlertTitle>Email Invite</AlertTitle>
          <AlertDescription>{showAlert}</AlertDescription>
        </Alert>
      )}

      {/* Only show invite form if user can invite */}
      {canInvite && (
        <Card className="w-full">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">
              Invite Team Member
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTeamInvite();
              }}
              className="space-y-4 max-w-md"
            >
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invite.email}
                  onChange={(e) =>
                    setInvite({ ...invite, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="subrole">Role</Label>
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
                  <SelectTrigger className="w-40">
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

      {/* Team Invitation Status Table */}
      <Card className="w-full">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">
            Team Members & Invites
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white dark:bg-gray-900 mx-4 sm:mx-0">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50 dark:bg-gray-800">
                <TableRow>
                  <TableHead className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm">
                    Email
                  </TableHead>
                  <TableHead className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm">
                    Role
                  </TableHead>
                  <TableHead className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm">
                    Status
                  </TableHead>
                  <TableHead className="hidden sm:table-cell px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    Invited
                  </TableHead>
                  <TableHead className="hidden md:table-cell px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 text-sm">
                    Joined
                  </TableHead>
                  <TableHead className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 text-xs sm:text-sm">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {inviteStatuses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground py-6 text-sm md:col-span-6"
                    >
                      No team members or invites found.
                    </TableCell>
                  </TableRow>
                )}
                {inviteStatuses.map((member, idx) => {
                  const normalizedMemberRole = normalizeCompanySubrole(
                    member.subrole,
                  );
                  const changeTargets =
                    COMPANY_ROLE_CHANGE_PERMISSIONS[mySubrole] || [];
                  const canChangeThisMember =
                    canChangeRoles &&
                    normalizedMemberRole !== "owner" &&
                    member.email !== profile?.email &&
                    changeTargets.includes(normalizedMemberRole);
                  // Can remove if: not owner row, not self, and have permission
                  const removeTargets =
                    COMPANY_ROLE_REMOVE_PERMISSIONS[mySubrole] || [];
                  const canRemoveThisMember =
                    normalizedMemberRole !== "owner" &&
                    member.email !== profile?.email &&
                    removeTargets.includes(normalizedMemberRole);

                  return (
                    <TableRow
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <TableCell className="px-2 sm:px-4 py-3 font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm break-all">
                        {member.email}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-3">
                        {canChangeThisMember ? (
                          <Select
                            value={member.subrole}
                            onValueChange={async (value) => {
                              setLoading(true);
                              try {
                                await dispatch(updateCompanyMemberRole({
                                  companyId,
                                  email: member.email,
                                  subrole: normalizeCompanySubrole(value),
                                })).unwrap();
                                setRefresh((r) => r + 1);
                              } catch (err) {
                                setShowAlert(err instanceof Error ? err.message : String(err));
                                setTimeout(() => setShowAlert(null), 3000);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                          >
                            <SelectTrigger className="w-24 sm:w-36 h-8">
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
                      <TableCell className="px-2 sm:px-4 py-3">
                        {member.status === "active" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            <span className="hidden sm:inline">Accepted</span>
                            <span className="sm:hidden">✓</span>
                          </span>
                        )}
                        {member.status === "invited" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                            <span className="hidden sm:inline">Waiting</span>
                            <span className="sm:hidden">⏳</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                        {member.invitedAt
                          ? new Date(member.invitedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-3">
                        {canRemoveThisMember ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 text-xs h-8 px-2"
                            disabled={loading}
                            onClick={async () => {
                              setLoading(true);
                              try {
                                await dispatch(removeCompanyMember({
                                  companyId,
                                  email: member.email,
                                })).unwrap();
                                setRefresh((r) => r + 1);
                              } catch (err) {
                                // ignore removal errors
                              } finally {
                                setLoading(false);
                              }
                            }}
                          >
                            <span className="hidden sm:inline">Remove</span>
                            <span className="sm:hidden">×</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
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
export default InvitePage;
