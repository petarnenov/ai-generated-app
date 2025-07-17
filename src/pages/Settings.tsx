import React, { useState, useEffect } from "react";
import {
  SettingsIcon,
  CheckCircleIcon,
  XCircleIcon,
  DatabaseIcon,
  BrainCircuitIcon,
  TestTubeIcon,
} from "lucide-react";

interface GitLabConfig {
  gitlab_url: string;
  has_token: boolean;
}

interface AIConfig {
  openai_api_key: string;
  anthropic_api_key: string;
  review_auto_post: string;
  review_min_score: string;
  review_max_files: string;
  review_max_lines: string;
}

interface AIModel {
  id: string;
  name: string;
  description: string;
}

interface TrackedProject {
  id: number;
  name: string;
  namespace: string;
  ai_provider: string;
  ai_model: string;
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "gitlab" | "ai" | "review" | "models"
  >("gitlab");
  const [gitlabConfig, setGitlabConfig] = useState<GitLabConfig>({
    gitlab_url: "",
    has_token: false,
  });
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    openai_api_key: "",
    anthropic_api_key: "",
    review_auto_post: "false",
    review_min_score: "7",
    review_max_files: "20",
    review_max_lines: "1000",
  });
  const [availableModels, setAvailableModels] = useState<{
    openai: AIModel[];
    anthropic: AIModel[];
  }>({
    openai: [],
    anthropic: [],
  });
  const [trackedProjects, setTrackedProjects] = useState<TrackedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const [gitlabResponse, aiResponse, modelsResponse, projectsResponse] =
        await Promise.all([
          fetch("/api/gitlab/config"),
          fetch("/api/ai/config"),
          fetch("/api/ai/models"),
          fetch("/api/gitlab/tracked-projects"),
        ]);

      if (gitlabResponse.ok) {
        const gitlabData = await gitlabResponse.json();
        setGitlabConfig(gitlabData);
      }

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        setAiConfig(aiData);
      }

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        setAvailableModels(modelsData);
      }

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setTrackedProjects(projectsData.projects);
      }
    } catch (error) {
      console.error("Failed to load configurations:", error);
    }
  };

  const saveGitLabConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const config = {
      gitlab_url: formData.get("gitlab_url") as string,
      gitlab_token: formData.get("gitlab_token") as string,
    };

    try {
      const response = await fetch("/api/gitlab/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "GitLab configuration saved successfully",
        });
        loadConfigurations();
      } else {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.message || "Failed to save configuration",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save configuration" });
    } finally {
      setLoading(false);
    }
  };

  const saveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const config = {
      openai_api_key: formData.get("openai_api_key") as string,
      anthropic_api_key: formData.get("anthropic_api_key") as string,
      review_auto_post: formData.get("review_auto_post") as string,
      review_min_score: formData.get("review_min_score") as string,
      review_max_files: formData.get("review_max_files") as string,
      review_max_lines: formData.get("review_max_lines") as string,
    };

    try {
      const response = await fetch("/api/ai/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "AI configuration saved successfully",
        });
        loadConfigurations();
      } else {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.message || "Failed to save configuration",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save configuration" });
    } finally {
      setLoading(false);
    }
  };

  const testAIConnection = async (provider: "openai" | "anthropic") => {
    setLoading(true);
    setMessage(null);

    const apiKey =
      provider === "openai"
        ? (document.getElementById("openai_api_key") as HTMLInputElement)?.value
        : (document.getElementById("anthropic_api_key") as HTMLInputElement)
            ?.value;

    if (!apiKey) {
      setMessage({
        type: "error",
        text: `Please enter ${provider} API key first`,
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/ai/test/${provider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `${provider} connection successful`,
        });
      } else {
        setMessage({
          type: "error",
          text: result.message || `${provider} connection failed`,
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: `Failed to test ${provider} connection`,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProjectAIConfig = async (
    projectId: number,
    provider: string,
    model: string
  ) => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch(
        `/api/gitlab/projects/${projectId}/ai-config`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ai_provider: provider,
            ai_model: model,
          }),
        }
      );

      if (response.ok) {
        setMessage({
          type: "success",
          text: "AI configuration updated successfully",
        });
        loadConfigurations();
      } else {
        const error = await response.json();
        setMessage({
          type: "error",
          text: error.message || "Failed to update AI configuration",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Failed to update AI configuration",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure GitLab integration and AI providers
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex">
            {message.type === "success" ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-400" />
            )}
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  message.type === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("gitlab")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "gitlab"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <DatabaseIcon className="h-4 w-4 mr-2 inline" />
            GitLab
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "ai"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <BrainCircuitIcon className="h-4 w-4 mr-2 inline" />
            AI Providers
          </button>
          <button
            onClick={() => setActiveTab("models")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "models"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <TestTubeIcon className="h-4 w-4 mr-2 inline" />
            AI Models
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "review"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <SettingsIcon className="h-4 w-4 mr-2 inline" />
            Review Settings
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === "gitlab" && (
          <form onSubmit={saveGitLabConfig} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                GitLab Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="gitlab_url"
                    className="block text-sm font-medium text-gray-700"
                  >
                    GitLab URL
                  </label>
                  <input
                    type="url"
                    id="gitlab_url"
                    name="gitlab_url"
                    defaultValue={gitlabConfig.gitlab_url}
                    placeholder="https://gitlab.example.com"
                    className="mt-1 input"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Your GitLab instance URL (e.g., https://gitlab.com)
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="gitlab_token"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    id="gitlab_token"
                    name="gitlab_token"
                    placeholder={
                      gitlabConfig.has_token ? "***" : "Enter your GitLab token"
                    }
                    className="mt-1 input"
                    required={!gitlabConfig.has_token}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Create a token with <code>api</code> scope in GitLab →
                    Settings → Access Tokens
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "ai" && (
          <form onSubmit={saveAIConfig} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                AI Provider Configuration
              </h3>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="openai_api_key"
                    className="block text-sm font-medium text-gray-700"
                  >
                    OpenAI API Key
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="password"
                      id="openai_api_key"
                      name="openai_api_key"
                      placeholder={aiConfig.openai_api_key ? "***" : "sk-..."}
                      className="flex-1 input rounded-r-none"
                    />
                    <button
                      type="button"
                      onClick={() => testAIConnection("openai")}
                      className="btn-secondary rounded-l-none"
                    >
                      <TestTubeIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Get your API key from OpenAI Platform
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="anthropic_api_key"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Anthropic API Key
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="password"
                      id="anthropic_api_key"
                      name="anthropic_api_key"
                      placeholder={
                        aiConfig.anthropic_api_key ? "***" : "sk-ant-..."
                      }
                      className="flex-1 input rounded-r-none"
                    />
                    <button
                      type="button"
                      onClick={() => testAIConnection("anthropic")}
                      className="btn-secondary rounded-l-none"
                    >
                      <TestTubeIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Get your API key from Anthropic Console
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "review" && (
          <form onSubmit={saveAIConfig} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Review Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="review_auto_post"
                      value="true"
                      defaultChecked={aiConfig.review_auto_post === "true"}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Automatically post reviews to GitLab
                    </span>
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="review_min_score"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Minimum score for auto-approval
                  </label>
                  <input
                    type="number"
                    id="review_min_score"
                    name="review_min_score"
                    min="1"
                    max="10"
                    defaultValue={aiConfig.review_min_score}
                    className="mt-1 input max-w-xs"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Reviews with this score or higher will be auto-approved
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="review_max_files"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Maximum files per review
                  </label>
                  <input
                    type="number"
                    id="review_max_files"
                    name="review_max_files"
                    min="1"
                    max="100"
                    defaultValue={aiConfig.review_max_files}
                    className="mt-1 input max-w-xs"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Limit the number of files reviewed per merge request
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="review_max_lines"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Maximum lines per file
                  </label>
                  <input
                    type="number"
                    id="review_max_lines"
                    name="review_max_lines"
                    min="100"
                    max="10000"
                    defaultValue={aiConfig.review_max_lines}
                    className="mt-1 input max-w-xs"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Limit the number of lines reviewed per file
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "models" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                AI Model Configuration
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure AI providers and models for each tracked project
              </p>
            </div>

            {trackedProjects.length === 0 ? (
              <div className="text-center py-8">
                <TestTubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No tracked projects
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add projects in the Projects page to configure AI models.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {trackedProjects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-md font-medium text-gray-900">
                          {project.namespace}/{project.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Current: {project.ai_provider} - {project.ai_model}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          AI Provider
                        </label>
                        <select
                          value={project.ai_provider}
                          onChange={(e) => {
                            const newProvider = e.target.value;
                            const defaultModel =
                              newProvider === "openai"
                                ? "gpt-4"
                                : "claude-3-sonnet-20240229";
                            updateProjectAIConfig(
                              project.id,
                              newProvider,
                              defaultModel
                            );
                          }}
                          className="mt-1 input"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          AI Model
                        </label>
                        <select
                          value={project.ai_model}
                          onChange={(e) => {
                            updateProjectAIConfig(
                              project.id,
                              project.ai_provider,
                              e.target.value
                            );
                          }}
                          className="mt-1 input"
                        >
                          {project.ai_provider === "openai"
                            ? availableModels.openai.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.name} - {model.description}
                                </option>
                              ))
                            : availableModels.anthropic.map((model) => (
                                <option key={model.id} value={model.id}>
                                  {model.name} - {model.description}
                                </option>
                              ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
