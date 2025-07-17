import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  SearchIcon,
  FolderIcon,
  ExternalLinkIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
} from "lucide-react";

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  default_branch: string;
  description: string;
  last_activity_at: string;
}

interface TrackedProject {
  id: number;
  gitlab_project_id: number;
  name: string;
  namespace: string;
  web_url: string;
  default_branch: string;
  webhook_token: string;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const Projects: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"tracked" | "browse">("tracked");
  const [trackedProjects, setTrackedProjects] = useState<TrackedProject[]>([]);
  const [gitlabProjects, setGitlabProjects] = useState<GitLabProject[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrackedProjects();
  }, []);

  const loadTrackedProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gitlab/tracked-projects");

      if (response.ok) {
        const data = await response.json();
        setTrackedProjects(data.projects || []);
      } else {
        setError("Failed to load tracked projects");
      }
    } catch (err) {
      setError("Failed to load tracked projects");
    } finally {
      setLoading(false);
    }
  };

  const loadGitLabProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/gitlab/projects?${params}`);

      if (response.ok) {
        const data = await response.json();
        setGitlabProjects(data.projects || []);
      } else {
        setError("Failed to load GitLab projects");
      }
    } catch (err) {
      setError("Failed to load GitLab projects");
    } finally {
      setLoading(false);
    }
  };

  const addProjectToTrack = async (project: GitLabProject) => {
    try {
      const response = await fetch(`/api/gitlab/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_token: generateWebhookToken(),
        }),
      });

      if (response.ok) {
        await loadTrackedProjects();
        setActiveTab("tracked");
      } else {
        setError("Failed to add project");
      }
    } catch (err) {
      setError("Failed to add project");
    }
  };

  const removeTrackedProject = async (projectId: number) => {
    try {
      const response = await fetch(`/api/gitlab/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadTrackedProjects();
      } else {
        setError("Failed to remove project");
      }
    } catch (err) {
      setError("Failed to remove project");
    }
  };

  const syncAllProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/gitlab/sync-all", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Sync result:", result);
        // Show success message or handle result
      } else {
        setError("Failed to sync projects");
      }
    } catch (err) {
      setError("Failed to sync projects");
    } finally {
      setLoading(false);
    }
  };

  const syncProject = async (projectId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/gitlab/projects/${projectId}/sync`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Sync result:", result);
        // Show success message or handle result
      } else {
        setError("Failed to sync project");
      }
    } catch (err) {
      setError("Failed to sync project");
    } finally {
      setLoading(false);
    }
  };

  const generateWebhookToken = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  const isProjectTracked = (projectId: number) => {
    return trackedProjects.some((p) => p.gitlab_project_id === projectId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "browse") {
      loadGitLabProjects();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage GitLab projects for AI code reviews
          </p>
        </div>
        {activeTab === "tracked" && trackedProjects.length > 0 && (
          <button
            onClick={syncAllProjects}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Sync All
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("tracked")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "tracked"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Tracked Projects ({trackedProjects.length})
          </button>
          <button
            onClick={() => setActiveTab("browse")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "browse"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Browse GitLab Projects
          </button>
        </nav>
      </div>

      {/* Search Form (for browse tab) */}
      {activeTab === "browse" && (
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search GitLab projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "tracked" ? (
            // Tracked Projects
            trackedProjects.length === 0 ? (
              <div className="text-center py-8 card">
                <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No tracked projects
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by adding a GitLab project to track.
                </p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="mt-4 btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Browse Projects
                </button>
              </div>
            ) : (
              trackedProjects.map((project) => (
                <div key={project.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {project.namespace}/{project.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Default branch: {project.default_branch}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Added:{" "}
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`badge ${
                          project.ai_enabled ? "badge-success" : "badge-warning"
                        }`}
                      >
                        {project.ai_enabled ? "AI Enabled" : "AI Disabled"}
                      </span>
                      <button
                        onClick={() => syncProject(project.id)}
                        className="text-blue-400 hover:text-blue-600"
                        title="Sync merge requests"
                      >
                        <RefreshCwIcon className="h-5 w-5" />
                      </button>
                      <a
                        href={project.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLinkIcon className="h-5 w-5" />
                      </a>
                      <button
                        onClick={() => removeTrackedProject(project.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">
                      Webhook Token:
                    </p>
                    <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                      {project.webhook_token}
                    </code>
                  </div>
                </div>
              ))
            )
          ) : // Browse GitLab Projects
          gitlabProjects.length === 0 ? (
            <div className="text-center py-8 card">
              <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No projects found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try searching for a project or check your GitLab connection.
              </p>
            </div>
          ) : (
            gitlabProjects.map((project) => (
              <div key={project.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {project.path_with_namespace}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {project.description}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Default branch: {project.default_branch}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Last activity:{" "}
                      {new Date(project.last_activity_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isProjectTracked(project.id) ? (
                      <span className="badge badge-success">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Tracked
                      </span>
                    ) : (
                      <button
                        onClick={() => addProjectToTrack(project)}
                        className="btn-primary"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add to Track
                      </button>
                    )}
                    <a
                      href={project.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLinkIcon className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
