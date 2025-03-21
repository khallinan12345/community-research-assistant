// ReportPhase.jsx
import React, { useState, useEffect } from 'react';
import { generateComprehensiveReport } from '../utils/reportGenerator';

const ReportPhase = ({
  villageInfo,
  researchData,
  conversations,
  analysisData,
  assetsData,
  aspirationsData
}) => {
  const [finalReport, setFinalReport] = useState("");

  useEffect(() => {
    const generateReport = async () => {
      try {
        const report = await generateComprehensiveReport(
          villageInfo,
          researchData,
          conversations,
          analysisData,
          assetsData,
          aspirationsData
        );
        setFinalReport(report);
      } catch (error) {
        console.error("Error generating report:", error);
        setFinalReport("Error generating report. Please try again later.");
      }
    };

    generateReport();
  }, [
    villageInfo,
    researchData,
    conversations,
    analysisData,
    assetsData,
    aspirationsData
  ]);

  // Function to download the final report as a Word-compatible document.
  const downloadFullReport = () => {
    if (!finalReport) return;
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Final Report - ${villageInfo.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1, h2, h3 { margin-top: 20px; }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap;">${finalReport}</pre>
      </body>
      </html>
    `;
    const blob = new Blob([reportContent], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${villageInfo.name}_Final_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  // Function to download the raw JSON data.
  const downloadRawData = () => {
    const rawData = {
      villageInfo,
      researchData,
      conversations,
      analysisData,
      assetsData,
      aspirationsData
    };
    const jsonString = JSON.stringify(rawData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${villageInfo.name}_raw_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Final Community Development Report for {villageInfo.name}
      </h2>
      {finalReport ? (
        <div dangerouslySetInnerHTML={{ __html: finalReport }} />
      ) : (
        <p>Generating final report...</p>
      )}
      <div className="mt-6 flex justify-end space-x-4">
        <button
          onClick={downloadFullReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Download Final Report
        </button>
        <button
          onClick={downloadRawData}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Download Raw Data
        </button>
      </div>
    </div>
  );
};

export default ReportPhase;
