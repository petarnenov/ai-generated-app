import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  GitBranchIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  PlayIcon,
} from "lucide-react";

interface MergeRequest {
  id: number;
  gitlab_mr_id: number;
  title: string;
  description: string;
  source_branch: string;
  target_branch: string;
  author_username: string;
  state: string;
  web_url: string;
  project_name: string;
  namespace: string;
  created_at: string;
  updated_at: string;
}

interface MergeRequestStats {
  total_mrs: number;
  open_mrs: number;
  merged_mrs: number;
  closed_mrs: number;
}

export const MergeRequests: React.FC = () => {
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("opened");
  const [stats, setStats] = useState<MergeRequestStats | null>(null);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/pr/stats/summary");
      if (response.ok) {
        const data = await response.json();
        setStats(data.merge_requests);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadMergeRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedState !== "all") {
        params.append("state", selectedState);
      }

      const response = await fetch(`/api/pr?${params}`);

      if (response.ok) {
        const data = await response.json();
        setMergeRequests(data.merge_requests || []);
      }
    } catch (error) {
      console.error("Failed to load merge requests:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedState]);

  useEffect(() => {
    loadMergeRequests();
    loadStats();
  }, [selectedState, loadMergeRequests]);

  const getStatusIcon = (state: string) => {
    switch (state) {
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

  const getStatusBadge = (state: string) => {
    switch (state) {
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

  const getCountForState = (state: string): number => {
    if (!stats) return 0;
    switch (state) {
      case "all":
        return stats.total_mrs;
      case "opened":
        return stats.open_mrs;
      case "merged":
        return stats.merged_mrs;
      case "closed":
        return stats.closed_mrs;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Merge Requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage AI reviews for merge requests
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="select max-w-xs"
        >
          <option value="all">All States</option>
          <option value="opened">Open</option>
          <option value="merged">Merged</option>
          <option value="closed">Closed</option>
        </select>

        {/* Counter Display */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-medium">Total:</span>
          <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-800 font-semibold">
            {getCountForState(selectedState)}
          </span>
          <span>
            {selectedState === "all" ? "requests" : `${selectedState} requests`}
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : mergeRequests.length === 0 ? (
        <div className="text-center py-8 card">
          <GitBranchIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No merge requests found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add some tracked projects to see merge requests here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mergeRequests.map((mr) => (
            <div key={mr.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(mr.state)}
                    <Link
                      to={`/merge-requests/${mr.id}`}
                      className="text-lg font-medium text-gray-900 hover:text-primary-600"
                    >
                      {mr.title}
                    </Link>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {mr.namespace}/{mr.project_name} • {mr.source_branch} →{" "}
                    {mr.target_branch}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    by {mr.author_username} •{" "}
                    {new Date(mr.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`badge ${getStatusBadge(mr.state)}`}>
                    {mr.state}
                  </span>
                  <Link
                    to={`/merge-requests/${mr.id}`}
                    className="btn-secondary inline-flex items-center"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Review
                  </Link>
                  <a
                    href={mr.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLinkIcon className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
