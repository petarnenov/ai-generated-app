import React, { useState, useEffect } from "react";
import {
  GitBranchIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  UsersIcon,
  AlertTriangleIcon,
} from "lucide-react";

interface DashboardStats {
  merge_requests: {
    total_mrs: number;
    open_mrs: number;
    merged_mrs: number;
    closed_mrs: number;
  };
  reviews: {
    total_reviews: number;
    completed_reviews: number;
    pending_reviews: number;
    failed_reviews: number;
    avg_score: number;
  };
}

interface RecentActivity {
  id: number;
  type: string;
  title: string;
  project: string;
  status: string;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log("Loading dashboard data...");
      const [statsResponse, activityResponse] = await Promise.all([
        fetch("/api/pr/stats/summary").catch((err) => {
          console.error("Stats API error:", err);
          return { ok: false, json: () => Promise.resolve(null) };
        }),
        fetch("/api/pr?per_page=10").catch((err) => {
          console.error("Activity API error:", err);
          return {
            ok: false,
            json: () => Promise.resolve({ merge_requests: [] }),
          };
        }),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        // Fallback stats data when API is not available
        setStats({
          merge_requests: {
            total_mrs: 0,
            open_mrs: 0,
            merged_mrs: 0,
            closed_mrs: 0,
          },
          reviews: {
            total_reviews: 0,
            completed_reviews: 0,
            pending_reviews: 0,
            failed_reviews: 0,
            avg_score: 0,
          },
        });
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData.merge_requests || []);
      } else {
        // Fallback activity data
        setRecentActivity([]);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Set fallback data
      setStats({
        merge_requests: {
          total_mrs: 0,
          open_mrs: 0,
          merged_mrs: 0,
          closed_mrs: 0,
        },
        reviews: {
          total_reviews: 0,
          completed_reviews: 0,
          pending_reviews: 0,
          failed_reviews: 0,
          avg_score: 0,
        },
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "merged":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "closed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "opened":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <GitBranchIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "merged":
        return "badge-success";
      case "closed":
        return "badge-error";
      case "opened":
        return "badge-warning";
      default:
        return "badge-info";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your GitLab AI code reviews
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GitBranchIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total MRs
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats?.merge_requests.total_mrs || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Open MRs
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats?.merge_requests.open_mrs || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Completed Reviews
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats?.reviews.completed_reviews || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUpIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Avg Score
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats?.reviews.avg_score
                    ? stats.reviews.avg_score.toFixed(1)
                    : "N/A"}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Recent Activity
        </h2>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No recent activity
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by configuring your GitLab connection in Settings.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {activity.project}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <span className={`badge ${getStatusBadge(activity.status)}`}>
                    {activity.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a
            href="/projects"
            className="flex items-center justify-center px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <GitBranchIcon className="h-5 w-5 mr-2" />
            Manage Projects
          </a>
          <a
            href="/merge-requests"
            className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            View Reviews
          </a>
          <a
            href="/settings"
            className="flex items-center justify-center px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <AlertTriangleIcon className="h-5 w-5 mr-2" />
            Settings
          </a>
        </div>
      </div>
    </div>
  );
};
