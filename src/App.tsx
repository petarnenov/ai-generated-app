import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { MergeRequests } from "./pages/MergeRequests";
import { Settings } from "./pages/Settings";
import { MergeRequestDetail } from "./pages/MergeRequestDetail";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/merge-requests" element={<MergeRequests />} />
          <Route path="/merge-requests/:id" element={<MergeRequestDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
