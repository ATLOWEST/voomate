import { createDatabase, approvalRequests } from '@voomate/db';
import { eq, desc } from 'drizzle-orm';
import { CheckCircle2, XCircle, Clock, ShieldAlert, ArrowRight, User } from 'lucide-react';

export default async function ApprovalsPage() {
  const db = createDatabase({ connectionString: process.env.DATABASE_URL || '' });

  let org = null;
  let pendingApprovals: (typeof approvalRequests.$inferSelect)[] = [];

  try {
    org = await db.query.organizations.findFirst();

    if (org) {
      pendingApprovals = await db
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.organizationId, org.id))
        .orderBy(desc(approvalRequests.createdAt));
    }
  } catch (error) {
    // Gracefully handle db errors (like when env isn't loaded correctly)
    console.error('Database fetch failed on approvals page:', error);
  }

  return (
    <div className="flex-1 space-y-6 p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-indigo-500" />
            Action Approvals
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Review and approve sensitive actions requested by the AI Agent.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full border border-indigo-100 dark:border-indigo-800/30">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">{pendingApprovals.length} Pending Requests</span>
        </div>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center p-16 text-center border border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">All caught up!</h3>
          <p className="text-slate-500 mt-2 max-w-md">
            There are no pending actions requiring your approval at this time.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 mt-8">
          {pendingApprovals.map((req) => (
            <div
              key={req.id}
              className="group relative overflow-hidden p-6 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-2xl"></div>

              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                        Requires Review
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(req.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-xl text-slate-900 dark:text-white">
                      {req.actionName}
                    </h3>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800/50">
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> AI Justification:
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    "{req.reason}"
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Payload Details
                  </p>
                  <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded-xl overflow-x-auto border border-slate-800 font-mono shadow-inner">
                    {JSON.stringify(req.payload, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-3 md:min-w-[140px] pt-2 md:pt-0">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm hover:shadow">
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800/30 font-medium rounded-xl transition-colors">
                  <XCircle className="w-4 h-4" />
                  Deny
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-xl transition-colors mt-auto">
                  Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
