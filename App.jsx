// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import DemoSearch from "./pages/DemoSearch";
import WAFDashboard from "./pages/WAFDashboard";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#fdf2f8]">
      <Navbar />
      <main className="max-w-7xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<DemoSearch />} />
          <Route path="/dashboard" element={<WAFDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
