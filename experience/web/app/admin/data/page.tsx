"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { EmotionsTab } from "@/components/admin/data/EmotionsTab";
import { StrategiesTab } from "@/components/admin/data/StrategiesTab";
import AiModelsTab from "@/components/admin/data/AiModelsTab";
import ClinicalAlertsTab from "@/components/admin/data/ClinicalAlertsTab";
import BootstrapTab from "@/components/admin/data/BootstrapTab";
import { PromptTemplatesTab } from "@/components/admin/data/PromptTemplatesTab";
import { Brain, FileText, Activity, Cpu, Database, MessageSquare } from "lucide-react";

export default function AdminDataPage() {
  const [activeTab, setActiveTab] = useState<
    "emotions" | "strategies" | "ai" | "alerts" | "bootstrap" | "prompts"
  >("emotions");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Data Management</h1>
          <p className="text-gray-400 text-sm">
            Manage core system data including emotional definitions, strategies, AI configuration,
            clinical alerts, and bootstrap data.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("emotions")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "emotions"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Brain className="w-4 h-4" />
            Atlas Emotions
          </button>
          <button
            onClick={() => setActiveTab("strategies")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "strategies"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            Strategies
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "ai"
                ? "border-green-500 text-green-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Cpu className="w-4 h-4" />
            AI Models
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "alerts"
                ? "border-red-500 text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Activity className="w-4 h-4" />
            Clinical Alerts
          </button>
          <button
            onClick={() => setActiveTab("bootstrap")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "bootstrap"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Database className="w-4 h-4" />
            Bootstrap Data
          </button>
          <button
            onClick={() => setActiveTab("prompts")}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "prompts"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Prompt Templates
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[600px]">
          {activeTab === "emotions" && <EmotionsTab />}
          {activeTab === "strategies" && <StrategiesTab />}
          {activeTab === "ai" && <AiModelsTab />}
          {activeTab === "alerts" && <ClinicalAlertsTab />}
          {activeTab === "bootstrap" && <BootstrapTab />}
          {activeTab === "prompts" && <PromptTemplatesTab />}
        </div>
      </div>
    </AdminLayout>
  );
}
