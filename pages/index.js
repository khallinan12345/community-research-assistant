// index.js
import React, { useState, useEffect } from 'react';
import IntroductionScreen from '../components/IntroductionScreen';
import ConversationPhase from '../components/ConversationPhase';
import ResearchPhase from '../components/ResearchPhase';
import AssetsPhase from '../components/AssetsPhase';
import AspirationsPhase from '../components/AspirationsPhase';
import ReportPhase from '../components/ReportPhase';
import { researchTopics, assetTopics, aspirationTopics } from '../data/topics';

export default function Home() {
  // Village information
  const [villageInfo, setVillageInfo] = useState(null);
  const [introductionComplete, setIntroductionComplete] = useState(false);
  
  // Data from various phases
  const [researchData, setResearchData] = useState({});
  const [conversations, setConversations] = useState({});
  const [aspirationsData, setAspirationsData] = useState({});
  const [assetsData, setAssetsData] = useState({});
  const [analysisData, setAnalysisData] = useState("");
  
  // Track completed topics
  const [completedTopics, setCompletedTopics] = useState({});
  
  // Current view state
  const [activeView, setActiveView] = useState('introduction');
  
  // Complete introduction
  const handleIntroductionComplete = (info) => {
    setVillageInfo(info);
    setIntroductionComplete(true);
    setActiveView('conversation');
  };
  
  // Handle research updates
  const handleResearchUpdate = (topicId, webResearch) => {
    setResearchData(prevData => ({
      ...prevData,
      [topicId]: { webResearch }
    }));
    
    setCompletedTopics(prevCompleted => ({
      ...prevCompleted,
      [topicId]: true
    }));
  };
  
  // Handle conversation updates
  const handleConversationUpdate = (topicId, messages) => {
    setConversations(prevConversations => ({
      ...prevConversations,
      [topicId]: messages
    }));
    
    if (messages.filter(msg => msg.role === 'user').length >= 3) {
      setCompletedTopics(prevCompleted => ({
        ...prevCompleted,
        [topicId]: true
      }));
    }
  };
  
  // Handle assets updates (updates assetsData)
  const handleAssetsUpdate = (topicId, webResearch) => {
    setAssetsData(prevData => ({
      ...prevData,
      [topicId]: webResearch
    }));
    
    setCompletedTopics(prevCompleted => ({
      ...prevCompleted,
      [`${topicId}_assets`]: true
    }));
  };
  
  // Handle aspirations updates
  const handleAspirationsUpdate = (topicId, data) => {
    if (Array.isArray(data)) {
      setConversations(prevConversations => ({
        ...prevConversations,
        [topicId]: data
      }));
      
      const userResponses = data
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(" ");
      
      if (userResponses) {
        const baseTopicId = topicId.includes('_aspirations') 
          ? topicId.replace('_aspirations', '') 
          : topicId;
        setAspirationsData(prevData => ({
          ...prevData,
          [baseTopicId]: userResponses
        }));
      }
      
      if (data.filter(msg => msg.role === 'user').length >= 1) {
        setCompletedTopics(prevCompleted => ({
          ...prevCompleted,
          [topicId]: true
        }));
      }
    } else {
      setAspirationsData(prevData => ({
        ...prevData,
        [topicId]: data
      }));
      
      const aspirationTopicId = `${topicId}_aspirations`;
      setCompletedTopics(prevCompleted => ({
        ...prevCompleted,
        [aspirationTopicId]: true
      }));
    }
  };

  // Handle analysis updates from the Research Phase
  const handleAnalysisUpdate = (analysis) => {
    setAnalysisData(analysis);
  };

  // Navigation function
  const navigateTo = (view) => {
    setActiveView(view);
  };
  
  if (!introductionComplete) {
    return <IntroductionScreen onComplete={handleIntroductionComplete} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Community Researcher: {villageInfo?.name}, {villageInfo?.country}
            </h1>
            
            <div className="flex space-x-4">
              <button
                onClick={() => navigateTo('conversation')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'conversation'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Conversations
              </button>
              <button
                onClick={() => navigateTo('research')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'research'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Research
              </button>
              <button
                onClick={() => navigateTo('assets')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'assets'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Assets
              </button>
              <button
                onClick={() => navigateTo('aspirations')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'aspirations'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Aspirations
              </button>
              <button
                onClick={() => navigateTo('report')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === 'report'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Report
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {activeView === 'conversation' && (
          <ConversationPhase
            villageInfo={villageInfo}
            onConversationUpdate={handleConversationUpdate}
            conversations={conversations}
            topics={researchTopics}
            completedTopics={completedTopics}
          />
        )}
        
        {activeView === 'research' && (
          <ResearchPhase
            villageInfo={villageInfo}
            onResearchUpdate={handleResearchUpdate}
            onAnalysisUpdate={handleAnalysisUpdate}
            researchData={researchData}
            topics={researchTopics}
            completedTopics={completedTopics}
          />
        )}
        
        {activeView === 'assets' && (
          <AssetsPhase
            villageInfo={villageInfo}
            onAssetsUpdate={handleAssetsUpdate}
            assetsData={assetsData}  // Pass assetsData here
            topics={assetTopics}
            completedTopics={completedTopics}
          />
        )}
        
        {activeView === 'aspirations' && (
          <AspirationsPhase
            villageInfo={villageInfo}
            onAspirationsUpdate={handleAspirationsUpdate}
            conversations={conversations}
            topics={aspirationTopics}
            completedTopics={completedTopics}
            aspirationsData={aspirationsData}
          />
        )}
        
        {activeView === 'report' && (
          <ReportPhase
            villageInfo={villageInfo}
            researchData={researchData}
            conversations={conversations}
            analysisData={analysisData}
            assetsData={assetsData}
            aspirationsData={aspirationsData}
          />
        )}
      </main>
    </div>
  );
}
