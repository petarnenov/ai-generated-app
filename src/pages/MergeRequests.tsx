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

interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export const MergeRequests: React.FC = () => {
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("opened");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [authors, setAuthors] = useState<string[]>([]);
  const [stats, setStats] = useState<MergeRequestStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [showRestoreIndicator, setShowRestoreIndicator] = useState(false);

  // Load persisted filters on component mount
  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem("mergeRequestFilters");
      if (savedState) {
        const { state, author } = JSON.parse(savedState);
        let hasRestoredFilters = false;

        if (state && state !== "all") {
          setSelectedState(state);
          hasRestoredFilters = true;
        }
        if (author && author !== "all") {
          setSelectedAuthor(author);
          hasRestoredFilters = true;
        }

        if (hasRestoredFilters) {
          setShowRestoreIndicator(true);
          // Hide the indicator after 3 seconds
          setTimeout(() => setShowRestoreIndicator(false), 3000);
        }
      }
    } catch (error) {
      console.error("Failed to load saved filters:", error);
    } finally {
      setFiltersLoaded(true);
    }
  }, []);

  // Save filters to localStorage whenever they change
  React.useEffect(() => {
    if (!filtersLoaded) return; // Don't save initial state

    try {
      const filtersToSave = {
        state: selectedState,
        author: selectedAuthor,
      };
      localStorage.setItem(
        "mergeRequestFilters",
        JSON.stringify(filtersToSave)
      );
    } catch (error) {
      console.error("Failed to save filters:", error);
    }
  }, [selectedState, selectedAuthor, filtersLoaded]);

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

  const loadAuthors = async () => {
    try {
      const response = await fetch("/api/pr/authors");
      if (response.ok) {
        const data = await response.json();
        setAuthors(data.authors || []);
      }
    } catch (error) {
      console.error("Failed to load authors:", error);
    }
  };

  const loadMergeRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedState !== "all") {
        params.append("state", selectedState);
      }
      if (selectedAuthor !== "all") {
        params.append("author", selectedAuthor);
      }

      const response = await fetch(`/api/pr?${params}`);

      if (response.ok) {
        const data = await response.json();
        setMergeRequests(data.merge_requests || []);
        setPagination(data.pagination || null);
      }
    } catch (error) {
      console.error("Failed to load merge requests:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedAuthor]);

  useEffect(() => {
    if (!filtersLoaded) return; // Wait for filters to be loaded first

    loadMergeRequests();
    loadStats();
    loadAuthors();
  }, [selectedState, selectedAuthor, loadMergeRequests, filtersLoaded]);

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
      <div className="flex items-center space-x-4 flex-wrap">
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

        <select
          value={selectedAuthor}
          onChange={(e) => setSelectedAuthor(e.target.value)}
          className="select max-w-xs"
        >
          <option value="all">All Authors</option>
          {authors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>

        {/* Clear filters button */}
        {(selectedState !== "all" || selectedAuthor !== "all") && (
          <button
            onClick={() => {
              setSelectedState("all");
              setSelectedAuthor("all");
              // Clear saved filters from localStorage
              try {
                localStorage.removeItem("mergeRequestFilters");
              } catch (error) {
                console.error("Failed to clear saved filters:", error);
              }
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        )}

        {/* Restore confirmation - shows briefly when filters are restored */}
        {showRestoreIndicator && (
          <div className="text-xs text-green-600 opacity-70 animate-pulse">
            📁 Filters restored
          </div>
        )}

        {/* Counter Display */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="font-medium">Total:</span>
          <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-800 font-semibold">
            {pagination?.total || getCountForState(selectedState)}
          </span>
          <span>
            {selectedState === "all" ? "requests" : `${selectedState} requests`}
          </span>
          {pagination && pagination.total > pagination.per_page && (
            <span className="text-xs text-gray-500">
              (showing {mergeRequests.length} of {pagination.total})
            </span>
          )}
        </div>

        {/* Filter indicators */}
        <div className="flex items-center space-x-2">
          {selectedState !== "all" && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              State: {selectedState}
            </span>
          )}
          {selectedAuthor !== "all" && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Author: {selectedAuthor}
            </span>
          )}
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
