import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Chatbot from "./pages/Chatbot";
import Homepage from "./pages/homePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage/>} />
        <Route path="/login" element={<Login />} />
        <Route path="/chatbot" element={<Chatbot />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;