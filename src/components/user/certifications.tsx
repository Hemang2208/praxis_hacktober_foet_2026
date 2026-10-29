"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  Download,
  ExternalLink,
  Calendar,
  Star,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

const earnedCertificates = [
  {
    id: 1,
    title: "React Development Fundamentals",
    issuer: "Praxis Academy",
    dateEarned: "January 15, 2024",
    score: 94,
    credentialId: "SL-REACT-2024-001",
    skills: ["React", "JSX", "Components", "State Management"],
    verificationUrl: "https://verify.kiyoai.in/cert/001",
    downloadUrl: "/certificates/react-fundamentals.pdf",
  },
  {
    id: 2,
    title: "Git & Version Control Mastery",
    issuer: "Praxis Academy",
    dateEarned: "January 10, 2024",
    score: 89,
    credentialId: "SL-GIT-2024-002",
    skills: ["Git", "GitHub", "Branching", "Collaboration"],
    verificationUrl: "https://verify.kiyoai.in/cert/002",
    downloadUrl: "/certificates/git-mastery.pdf",
  },
  {
    id: 3,
    title: "JavaScript ES6+ Proficiency",
    issuer: "Praxis Academy",
    dateEarned: "January 5, 2024",
    score: 92,
    credentialId: "SL-JS-2024-003",
    skills: ["JavaScript", "ES6+", "Async/Await", "Modules"],
    verificationUrl: "https://verify.kiyoai.in/cert/003",
    downloadUrl: "/certificates/javascript-es6.pdf",
  },
  {
    id: 4,
    title: "Agile Development Practices",
    issuer: "Praxis Academy",
    dateEarned: "December 28, 2023",
    score: 87,
    credentialId: "SL-AGILE-2023-004",
    skills: ["Scrum", "Kanban", "Sprint Planning", "Retrospectives"],
    verificationUrl: "https://verify.kiyoai.in/cert/004",
    downloadUrl: "/certificates/agile-practices.pdf",
  },
  {
    id: 5,
    title: "Code Quality & Testing",
    issuer: "Praxis Academy",
    dateEarned: "December 20, 2023",
    score: 91,
    credentialId: "SL-TEST-2023-005",
    skills: ["Unit Testing", "Jest", "Code Review", "Quality Assurance"],
    verificationUrl: "https://verify.kiyoai.in/cert/005",
    downloadUrl: "/certificates/code-quality.pdf",
  },
];

const inProgressCertifications = [
  {
    title: "TypeScript Advanced Patterns",
    description: "Master advanced TypeScript concepts and design patterns",
    progress: 75,
    estimatedCompletion: "January 25, 2024",
    requirements: [
      { task: "Complete 8 TypeScript projects", completed: 6, total: 8 },
      { task: "Pass advanced concepts quiz", completed: 1, total: 1 },
      { task: "Code review assessment", completed: 0, total: 1 },
    ],
  },
  {
    title: "Full-Stack Development",
    description: "End-to-end web application development certification",
    progress: 45,
    estimatedCompletion: "February 15, 2024",
    requirements: [
      { task: "Frontend project completion", completed: 1, total: 2 },
      { task: "Backend API development", completed: 0, total: 2 },
      { task: "Database design project", completed: 1, total: 1 },
      { task: "Deployment & DevOps", completed: 0, total: 1 },
    ],
  },
];

const availableCertifications = [
  {
    title: "Node.js Backend Development",
    description: "Server-side JavaScript development with Node.js and Express",
    difficulty: "Intermediate",
    estimatedTime: "4-6 weeks",
    prerequisites: ["JavaScript ES6+", "Basic HTTP knowledge"],
    skills: ["Node.js", "Express", "REST APIs", "Database Integration"],
  },
  {
    title: "React Native Mobile Development",
    description: "Cross-platform mobile app development with React Native",
    difficulty: "Advanced",
    estimatedTime: "6-8 weeks",
    prerequisites: ["React Fundamentals", "JavaScript ES6+"],
    skills: ["React Native", "Mobile UI", "Navigation", "Native Modules"],
  },
  {
    title: "DevOps & Cloud Deployment",
    description: "Modern deployment practices and cloud infrastructure",
    difficulty: "Intermediate",
    estimatedTime: "5-7 weeks",
    prerequisites: ["Git & Version Control", "Basic Linux"],
    skills: ["Docker", "AWS", "CI/CD", "Infrastructure as Code"],
  },
];

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600 bg-green-100";
  if (score >= 80) return "text-blue-600 bg-blue-100";
  if (score >= 70) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner":
      return "bg-green-100 text-green-700 border-green-200";
    case "Intermediate":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "Advanced":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export function CertificationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Certifications</h1>
          <p className="text-slate-600 mt-1">
            Track your achievements and continue your learning journey
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-2 h-4 w-4" />
            Verify Credentials
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Award className="mr-2 h-4 w-4" />
            Browse All
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: "Certificates Earned",
            value: "5",
            icon: Award,
            color: "text-yellow-600",
            bgColor: "bg-yellow-100",
          },
          {
            title: "Average Score",
            value: "90.6",
            icon: Star,
            color: "text-green-600",
            bgColor: "bg-green-100",
          },
          {
            title: "In Progress",
            value: "2",
            icon: Clock,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
          },
          {
            title: "Skills Mastered",
            value: "18",
            icon: Target,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Earned Certificates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              Earned Certificates
            </CardTitle>
            <CardDescription>
              Your completed certifications and achievements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {earnedCertificates.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">
                        {cert.title}
                      </h4>
                      <p className="text-sm text-slate-600">{cert.issuer}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {cert.dateEarned}
                        </span>
                        <span>ID: {cert.credentialId}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={`${getScoreColor(cert.score)} border-0`}
                      >
                        {cert.score}%
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Download className="mr-2 h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cert.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Verify Online
                    </Button>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* In Progress Certifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
              In Progress
            </CardTitle>
            <CardDescription>
              Certifications you&apos;re currently working towards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {inProgressCertifications.map((cert, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {cert.title}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {cert.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-sm text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>Est. completion: {cert.estimatedCompletion}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">
                        {cert.progress}%
                      </div>
                      <div className="text-sm text-slate-500">Complete</div>
                    </div>
                  </div>
                  <Progress value={cert.progress} className="mb-4" />
                  <div className="space-y-2">
                    <h5 className="font-medium text-slate-900 text-sm">
                      Requirements:
                    </h5>
                    {cert.requirements.map((req, reqIndex) => (
                      <div
                        key={reqIndex}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-600">{req.task}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500">
                            {req.completed}/{req.total}
                          </span>
                          {req.completed === req.total ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Available Certifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-purple-600" />
              Available Certifications
            </CardTitle>
            <CardDescription>
              Discover new learning paths and expand your skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCertifications.map((cert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">
                      {cert.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={getDifficultyColor(cert.difficulty)}
                    >
                      {cert.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    {cert.description}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-slate-500">
                      <Clock className="inline mr-1 h-3 w-3" />
                      {cert.estimatedTime}
                    </div>
                    <div className="text-sm text-slate-500">
                      Prerequisites: {cert.prerequisites.join(", ")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {cert.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <Button className="w-full" size="sm">
                    Start Certification
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
