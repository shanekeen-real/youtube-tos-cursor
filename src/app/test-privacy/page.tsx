"use client";
import { useState } from "react";

export default function TestPrivacyPage() {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExportStatus(null);
    try {
      const res = await fetch("/api/export-user-data");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "yellow-dollar-user-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setExportStatus("Export successful. Check your downloads.");
    } catch (err: unknown) {
      setExportStatus("Export failed: " + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This will permanently delete your account and all data. This cannot be undone.")) return;
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setDeleteStatus("Account deleted successfully.");
    } catch (err: unknown) {
      setDeleteStatus("Delete failed: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #E0E0E0", borderRadius: 12, background: "#fff" }}>
      <h2 style={{ fontWeight: 600, fontSize: 24, marginBottom: 24 }}>Privacy Test Page</h2>
      <button onClick={handleExport} style={{ width: "100%", padding: 12, borderRadius: 8, background: "#F6C232", color: "#171717", fontWeight: 600, border: "none", marginBottom: 16, cursor: "pointer" }}>
        Export My Data
      </button>
      {exportStatus && <div style={{ marginBottom: 16, color: exportStatus.startsWith("Export successful") ? "#00C853" : "#FF3B30" }}>{exportStatus}</div>}
      <button onClick={handleDelete} disabled={deleting} style={{ width: "100%", padding: 12, borderRadius: 8, background: deleting ? "#E0E0E0" : "#FF3B30", color: "#fff", fontWeight: 600, border: "none", cursor: deleting ? "not-allowed" : "pointer" }}>
        {deleting ? "Deleting..." : "Delete My Account"}
      </button>
      {deleteStatus && <div style={{ marginTop: 16, color: deleteStatus.startsWith("Account deleted") ? "#00C853" : "#FF3B30" }}>{deleteStatus}</div>}
    </div>
  );
} 