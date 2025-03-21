import React, { useState } from 'react';
import { queryOpenAI, generateAssetPrompt } from '../utils/api';

const AssetsPhase = ({ villageInfo, onAssetsUpdate, assetsData, topics, completedTopics }) => {
  const [activeTopic, setActiveTopic] = useState(topics[0]?.id || '');
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  
  // Conduct assets research
  const conductAssetsResearch = async () => {
    if (isResearching || !activeTopic) return;
    
    setIsResearching(true);
    setResearchProgress(0);
    
    try {
      // Simulate progress update
      const progressInterval = setInterval(() => {
        setResearchProgress(prev => Math.min(prev + 5, 95));
      }, 300);
      
      // Generate prompt for assets
      const prompt = generateAssetPrompt(activeTopic, villageInfo.name);
      
      // Query the AI
      const response = await queryOpenAI(prompt, {
        max_new_tokens: 800,
        temperature: 0.3
      });
      
      clearInterval(progressInterval);
      setResearchProgress(100);
      
      // Process response
      let assetsResult = '';
      if (response && response[0] && response[0].generated_text) {
        assetsResult = response[0].generated_text;
      } else if (typeof response === 'string') {
        assetsResult = response;
      } else {
        assetsResult = "The AI research came back with incomplete results. Please try again.";
      }
      
      onAssetsUpdate(activeTopic, assetsResult);
      
      // Reset state after a delay
      setTimeout(() => {
        setIsResearching(false);
        setResearchProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error("Error conducting assets research:", error);
      setIsResearching(false);
      setResearchProgress(0);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Topic Navigation */}
      <div className="w-1/4">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Asset Categories</h2>
          <ul className="space-y-2">
            {topics.map((topic) => (
              <li key={topic.id}>
                <button
                  onClick={() => setActiveTopic(topic.id)}
                  className={`w-full text-left px-3 py-2 rounded-md ${
                    activeTopic === topic.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{topic.title}</span>
                    {completedTopics[topic.id + '_assets'] && (
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Asset Research Content */}
      <div className="w-3/4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Assets Research: {activeTopic}
            </h2>
            <button onClick={conductAssetsResearch} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              {isResearching ? 'Researching...' : 'Run Research'}
            </button>
          </div>
          <div className="text-gray-700 prose prose-sm max-w-none">
            {assetsData[activeTopic] ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: assetsData[activeTopic]
                    .replace(/\n## /g, '<h2>')
                    .replace(/\n### /g, '<h3>')
                    .replace(/\n/g, '<br />')
                }}
              />
            ) : (
              <p>No assets data available for {activeTopic}.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsPhase;