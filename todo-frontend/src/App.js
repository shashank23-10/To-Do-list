import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Tasks from "./pages/Tasks";
import Conversations from "./pages/Conversations";
import DocChat from "./pages/DocChat";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/signup" />} />  
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/users" element={<Users />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/docchat" element={<DocChat />} />
      </Routes>
    </Router>
  );
}

export default App;
