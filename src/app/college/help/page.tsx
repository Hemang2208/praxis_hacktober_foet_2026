export default function CollegeHelpPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          College Help Center
        </h1>
        <div className="grid gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Welcome to Praxis! Here you&apos;ll find helpful resources and
              guides for managing your college dashboard.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
            <p className="text-slate-600 dark:text-slate-400">
              If you need assistance, please reach out to our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
