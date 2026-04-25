import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Chatbot from "./pages/Chatbot";
import Homepage from "./pages/homePage";
import PDB from "./pages/PDB";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage/>} />
        <Route path="/login" element={<Login />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/pdb" element={<PDB />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;