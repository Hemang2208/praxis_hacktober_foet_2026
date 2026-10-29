"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CollegeProfileSettings() {
  const [profile, setProfile] = useState({
    collegeName: "",
    collegeType: "",
    contactPersonName: "",
    designation: "",
    address: "",
    phoneNumber: "",
    email: "",
  });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };
  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    setChanging(true);
    setTimeout(() => {
      setPasswords({ current: "", new: "", confirm: "" });
      setChanging(false);
    }, 800);
  };

  return (
    <main className="max-w-3xl mx-auto p-6 min-h-screen bg-white dark:bg-black">
      <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">College Profile & Settings</h1>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your college profile details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleProfileSave}>
              <Input name="collegeName" placeholder="College Name" value={profile.collegeName} onChange={handleProfileChange} required />
              <Input name="collegeType" placeholder="College Type" value={profile.collegeType} onChange={handleProfileChange} required />
              <Input name="contactPersonName" placeholder="Contact Person Name" value={profile.contactPersonName} onChange={handleProfileChange} required />
              <Input name="designation" placeholder="Designation" value={profile.designation} onChange={handleProfileChange} required />
              <Input name="address" placeholder="Address" value={profile.address} onChange={handleProfileChange} />
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Manage your college contact details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleProfileSave}>
              <Input name="phoneNumber" placeholder="Phone Number" value={profile.phoneNumber} onChange={handleProfileChange} />
              <Input name="email" placeholder="Official Email" value={profile.email} onChange={handleProfileChange} required type="email" />
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Contact Info"}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password securely.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePasswordSave}>
              <Input name="current" type="password" placeholder="Current Password" value={passwords.current} onChange={handlePasswordChange} required />
              <Input name="new" type="password" placeholder="New Password" value={passwords.new} onChange={handlePasswordChange} required />
              <Input name="confirm" type="password" placeholder="Confirm New Password" value={passwords.confirm} onChange={handlePasswordChange} required />
              <Button type="submit" disabled={changing || passwords.new !== passwords.confirm}>{changing ? "Changing..." : "Change Password"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
