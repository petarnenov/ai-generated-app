import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  XCircleIcon,
  ExternalLinkIcon,
  PlayIcon,
  FileTextIcon,
  AlertTriangleIcon,
  InfoIcon,
  TrashIcon,
  CopyIcon,
} from "lucide-react";

interface MergeRequestData {
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

interface ReviewComment {
  id: number;
  file_path: string;
  line_number: number;
  comment_type: string;
  severity: string;
  title: string;
  content: string;
  code_snippet: string;
  suggested_fix: string;
}

interface AIReview {
  id: number;
  review_type: string;
  ai_provider: string;
  ai_model: string;
  status: string;
  review_content: string;
  score: number;
  created_at: string;
  comments: ReviewComment[];
}

export const MergeRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mergeRequest, setMergeRequest] = useState<MergeRequestData | null>(
    null
  );
  const [reviews, setReviews] = useState<AIReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMergeRequestDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pr/${id}`);

      if (response.ok) {
        const data = await response.json();
        setMergeRequest(data.merge_request);
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Failed to load merge request details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadMergeRequestDetail();
    }
  }, [id, loadMergeRequestDetail]);

  const triggerAIReview = async (reviewType: string) => {
    try {
      setError(null);
      setReviewLoading(reviewType);

      const response = await fetch(`/api/pr/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          review_type: reviewType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Review triggered successfully:", result);
        loadMergeRequestDetail();
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || "Failed to trigger AI review");
      }
    } catch (error) {
      console.error("Failed to trigger AI review:", error);
      setError("Failed to trigger AI review. Please try again.");
    } finally {
      setReviewLoading(null);
    }
  };

  const deleteReview = async (reviewId: number) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const response = await fetch(`/api/pr/${id}/review/${reviewId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("Review deleted successfully");
        loadMergeRequestDetail(); // Refresh the page data
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete review");
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      setError("Failed to delete review. Please try again.");
    }
  };

  const copyReview = async (review: AIReview) => {
    try {
      // Format the review content for copying
      let copyText = `AI Code Review\n`;
      copyText += `================\n\n`;
      copyText += `Review Type: ${
        review.review_type.charAt(0).toUpperCase() + review.review_type.slice(1)
      }\n`;
      copyText += `AI Provider: ${review.ai_provider} (${review.ai_model})\n`;
      copyText += `Score: ${review.score}/10\n`;
      copyText += `Status: ${review.status}\n`;
      copyText += `Date: ${new Date(
        review.created_at
      ).toLocaleDateString()} at ${new Date(
        review.created_at
      ).toLocaleTimeString()}\n\n`;

      if (review.review_content) {
        copyText += `Summary:\n`;
        copyText += `--------\n`;
        copyText += `${review.review_content}\n\n`;
      }

      if (review.comments && review.comments.length > 0) {
        copyText += `Comments (${review.comments.length}):\n`;
        copyText += `===================\n\n`;

        review.comments.forEach((comment, index) => {
          copyText += `${index + 1}. ${comment.title}\n`;
          copyText += `   File: ${comment.file_path}`;
          if (comment.line_number) {
            copyText += ` (Line ${comment.line_number})`;
          }
          copyText += `\n`;
          copyText += `   Severity: ${comment.severity}\n`;
          copyText += `   Description: ${comment.content}\n`;

          if (comment.code_snippet) {
            copyText += `   \n   Problematic Code:\n`;
            copyText += `   -----------------\n`;
            copyText += `   ${comment.code_snippet.replace(/\n/g, "\n   ")}\n`;
          }

          if (comment.suggested_fix) {
            copyText += `   \n   Suggested Fix:\n`;
            copyText += `   --------------\n`;
            copyText += `   ${comment.suggested_fix.replace(/\n/g, "\n   ")}\n`;
          }

          copyText += `\n`;
        });
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(copyText);

      // Show success feedback (you could add a toast notification here)
      console.log("Review content copied to clipboard");

      // Optional: Show temporary visual feedback
      setError(null); // Clear any existing errors
      // You could add a success state here for visual feedback
    } catch (error) {
      console.error("Failed to copy review:", error);
      setError("Failed to copy review to clipboard");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "error":
        return <AlertTriangleIcon className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <InfoIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InfoIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return "badge-error";
      case "warning":
        return "badge-warning";
      case "info":
        return "badge-info";
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

  if (!mergeRequest) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Merge Request Not Found
        </h2>
      </div>
    );
  }

  return (
    <div className="gitlab-mr-layout">
      {/* Header */}
      <div className="gitlab-mr-header-section">
        <div className="gitlab-mr-breadcrumb">
          <span className="gitlab-breadcrumb-item">
            {mergeRequest.namespace} / {mergeRequest.project_name}
          </span>
          <span className="gitlab-breadcrumb-separator">→</span>
          <span className="gitlab-breadcrumb-item">Merge Requests</span>
        </div>

        <div className="gitlab-mr-header-content">
          <div className="gitlab-mr-header-main">
            <div className="gitlab-mr-title-section">
              <h1 className="gitlab-mr-main-title">{mergeRequest.title}</h1>
              <div className="gitlab-mr-subtitle">
                <span className="gitlab-mr-branch">
                  {mergeRequest.source_branch}
                </span>
                <span className="gitlab-mr-arrow">→</span>
                <span className="gitlab-mr-branch">
                  {mergeRequest.target_branch}
                </span>
              </div>
              <div className="gitlab-mr-metadata">
                <span className="gitlab-mr-author">
                  by <strong>{mergeRequest.author_username}</strong>
                </span>
                <span className="gitlab-mr-date">
                  {new Date(mergeRequest.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="gitlab-mr-header-actions">
              <span
                className={`gitlab-mr-status ${
                  mergeRequest.state === "merged"
                    ? "gitlab-status-merged"
                    : mergeRequest.state === "closed"
                    ? "gitlab-status-closed"
                    : "gitlab-status-open"
                }`}
              >
                {mergeRequest.state === "merged"
                  ? "Merged"
                  : mergeRequest.state === "closed"
                  ? "Closed"
                  : "Open"}
              </span>
              <a
                href={mergeRequest.web_url}
                target="_blank"
                rel="noopener noreferrer"
                className="gitlab-external-link"
              >
                <ExternalLinkIcon className="h-4 w-4" />
                View in GitLab
              </a>
            </div>
          </div>
        </div>

        {mergeRequest.description && (
          <div className="gitlab-mr-description">
            <pre className="gitlab-description-text">
              {mergeRequest.description}
            </pre>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="gitlab-alert gitlab-alert-danger">
          <div className="gitlab-alert-icon">
            <XCircleIcon className="h-5 w-5" />
          </div>
          <div className="gitlab-alert-content">
            <h3 className="gitlab-alert-title">Error</h3>
            <p className="gitlab-alert-message">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="gitlab-actions-bar">
        <div className="gitlab-actions-group">
          <button
            onClick={() => triggerAIReview("general")}
            className="gitlab-btn gitlab-btn-primary"
            disabled={mergeRequest.state !== "opened" || reviewLoading !== null}
          >
            {reviewLoading === "general" ? (
              <div className="gitlab-btn-spinner"></div>
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            {reviewLoading === "general" ? "Reviewing..." : "General Review"}
          </button>
          <button
            onClick={() => triggerAIReview("security")}
            className="gitlab-btn gitlab-btn-secondary"
            disabled={mergeRequest.state !== "opened" || reviewLoading !== null}
          >
            {reviewLoading === "security" ? (
              <div className="gitlab-btn-spinner"></div>
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            {reviewLoading === "security" ? "Reviewing..." : "Security Review"}
          </button>
          <button
            onClick={() => triggerAIReview("performance")}
            className="gitlab-btn gitlab-btn-secondary"
            disabled={mergeRequest.state !== "opened" || reviewLoading !== null}
          >
            {reviewLoading === "performance" ? (
              <div className="gitlab-btn-spinner"></div>
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            {reviewLoading === "performance"
              ? "Reviewing..."
              : "Performance Review"}
          </button>
        </div>
      </div>

      {/* Reviews */}
      <div className="gitlab-mr-container">
        <div className="gitlab-mr-header">
          <h2 className="gitlab-mr-title">AI Reviews</h2>
          <div className="gitlab-mr-tabs">
            <button className="gitlab-tab active">
              <span className="gitlab-tab-text">Reviews</span>
              <span className="gitlab-tab-count">{reviews.length}</span>
            </button>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="gitlab-empty-state">
            <FileTextIcon className="gitlab-empty-icon" />
            <h3 className="gitlab-empty-title">No reviews yet</h3>
            <p className="gitlab-empty-description">
              Trigger an AI review to see analysis and suggestions.
            </p>
          </div>
        ) : (
          <div className="gitlab-reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="gitlab-review-card">
                <div className="gitlab-review-header">
                  <div className="gitlab-review-avatar">
                    <div className="gitlab-ai-avatar">🤖</div>
                  </div>
                  <div className="gitlab-review-meta">
                    <div className="gitlab-review-author">
                      <strong>{review.ai_provider}</strong>
                      <span className="gitlab-review-model">
                        ({review.ai_model})
                      </span>
                    </div>
                    <div className="gitlab-review-time">
                      {new Date(review.created_at).toLocaleDateString()} at{" "}
                      {new Date(review.created_at).toLocaleTimeString()}
                    </div>
                    <div className="gitlab-review-type">
                      {review.review_type.charAt(0).toUpperCase() +
                        review.review_type.slice(1)}{" "}
                      Review
                    </div>
                  </div>
                  <div className="gitlab-review-badges">
                    {review.score && (
                      <span
                        className={`gitlab-badge ${
                          review.score >= 8
                            ? "gitlab-badge-success"
                            : review.score >= 6
                            ? "gitlab-badge-warning"
                            : "gitlab-badge-danger"
                        }`}
                      >
                        Score: {review.score}/10
                      </span>
                    )}
                    <span
                      className={`gitlab-badge ${
                        review.status === "completed"
                          ? "gitlab-badge-success"
                          : review.status === "failed"
                          ? "gitlab-badge-danger"
                          : "gitlab-badge-warning"
                      }`}
                    >
                      {review.status}
                    </span>
                    {review.status === "completed" && (
                      <button
                        onClick={() => deleteReview(review.id)}
                        className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete review"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {review.review_content && (
                  <div className="gitlab-review-content">
                    <div className="gitlab-review-body">
                      <pre className="gitlab-review-text">
                        {review.review_content}
                      </pre>
                    </div>
                  </div>
                )}

                {review.comments && review.comments.length > 0 && (
                  <div className="gitlab-review-comments">
                    <div className="gitlab-comments-header">
                      <h4 className="gitlab-comments-title">
                        💬 Comments ({review.comments.length})
                      </h4>
                    </div>
                    <div className="gitlab-comments-list">
                      {review.comments.map((comment) => (
                        <div key={comment.id} className="gitlab-comment-item">
                          <div className="gitlab-comment-sidebar">
                            <div
                              className={`gitlab-comment-severity ${comment.severity}`}
                            >
                              {getSeverityIcon(comment.severity)}
                            </div>
                          </div>
                          <div className="gitlab-comment-content">
                            <div className="gitlab-comment-header">
                              <span className="gitlab-comment-title">
                                {comment.title}
                              </span>
                              <span
                                className={`gitlab-severity-badge ${comment.severity}`}
                              >
                                {comment.severity}
                              </span>
                            </div>
                            <div className="gitlab-comment-body">
                              <p className="gitlab-comment-text">
                                {comment.content}
                              </p>
                              <div className="gitlab-comment-file">
                                📁{" "}
                                <span className="gitlab-file-path">
                                  {comment.file_path}
                                </span>
                                {comment.line_number && (
                                  <span className="gitlab-line-number">
                                    Line {comment.line_number}
                                  </span>
                                )}
                              </div>
                              {comment.code_snippet && (
                                <div className="gitlab-code-block">
                                  <div className="gitlab-code-header">
                                    <span className="gitlab-code-label">
                                      ⚠️ Problematic Code
                                    </span>
                                  </div>
                                  <pre className="gitlab-code-content">
                                    {comment.code_snippet}
                                  </pre>
                                </div>
                              )}
                              {comment.suggested_fix && (
                                <div className="gitlab-suggestion-block">
                                  <div className="gitlab-suggestion-header">
                                    <span className="gitlab-suggestion-label">
                                      ✅ Suggested Fix
                                    </span>
                                  </div>
                                  <pre className="gitlab-suggestion-content">
                                    {comment.suggested_fix}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="gitlab-review-actions">
                  <button
                    onClick={() => copyReview(review)}
                    className="gitlab-btn gitlab-btn-secondary mr-2"
                    title="Copy review content to clipboard"
                  >
                    <CopyIcon className="h-4 w-4" />
                    Copy Review
                  </button>
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="gitlab-btn gitlab-btn-danger"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
