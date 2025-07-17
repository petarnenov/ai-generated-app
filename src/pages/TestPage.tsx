import React from "react";

export const TestPage: React.FC = () => {
  const [apiStatus, setApiStatus] = React.useState<string>("Testing...");
  const [envCheck, setEnvCheck] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    // Test basic React functionality
    console.log("TestPage mounted successfully");

    // Test API connectivity
    testAPI();

    // Check environment
    checkEnvironment();
  }, []);

  const testAPI = async () => {
    try {
      console.log("Testing API...");
      const response = await fetch("/api/pr/stats/summary");
      console.log("API Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("API Data:", data);
        setApiStatus("API is working!");
      } else {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        setApiStatus(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("API Test failed:", error);
      setApiStatus(`API Test failed: ${error}`);
    }
  };

  const checkEnvironment = () => {
    setEnvCheck({
      userAgent: navigator.userAgent,
      url: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Deployment Test Page
      </h1>

      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            ✅ React App Status
          </h2>
          <p className="text-green-700">
            React app is loading and rendering successfully!
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            🔗 API Status
          </h2>
          <p className="text-blue-700">{apiStatus}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            🌍 Environment Info
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            {Object.entries(envCheck).map(([key, value]) => (
              <div key={key}>
                <strong>{key}:</strong> {value}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            🔧 Debug Actions
          </h2>
          <div className="space-y-2">
            <button
              onClick={testAPI}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mr-2"
            >
              Retest API
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded mr-2"
            >
              Reload Page
            </button>
            <button
              onClick={() =>
                console.log("Console test - check browser dev tools")
              }
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Test Console
            </button>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-indigo-800 mb-2">
            📝 Instructions
          </h2>
          <div className="text-indigo-700 space-y-2">
            <p>1. If you see this page, React is working correctly</p>
            <p>2. Check the API Status section above</p>
            <p>3. Open browser dev tools (F12) to see console logs</p>
            <p>4. If API is failing, check Vercel function logs</p>
            <p>5. Verify environment variables are set in Vercel dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};
