import React, { useState, useEffect } from 'react';
import { searchWeb, getRecommendedSources, generateComprehensiveAnalysis } from '../utils/api';

const ResearchPhase = ({ villageInfo, onResearchUpdate, researchData, topics, completedTopics }) => {
  const [activeTopic, setActiveTopic] = useState(topics[0]?.id || '');
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchSources, setResearchSources] = useState({});
  const [searchError, setSearchError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [comprehensiveReport, setComprehensiveReport] = useState('');
  
  // Check if all topics have been researched
  const allTopicsResearched = topics.length > 0 && 
    topics.every(topic => completedTopics[topic.id]);
  
  // Effect to trigger comprehensive analysis when all topics are researched
  useEffect(() => {
    const generateOverallAnalysis = async () => {
      if (allTopicsResearched && !analysisComplete && !comprehensiveReport) {
        setIsAnalyzing(true);
        
        try {
          const report = await generateComprehensiveAnalysis(villageInfo, researchData);
          setComprehensiveReport(report);
          setAnalysisComplete(true);
        } catch (error) {
          console.error("Error generating comprehensive analysis:", error);
          setSearchError({
            title: "Unable to generate comprehensive analysis",
            message: error.message || "An error occurred while analyzing the research data."
          });
        } finally {
          setIsAnalyzing(false);
        }
      }
    };
    
    generateOverallAnalysis();
  }, [allTopicsResearched, analysisComplete, comprehensiveReport, villageInfo, researchData]);
  
  // Conduct research for the selected topic using web search
  const conductResearch = async () => {
    if (isResearching || !activeTopic) return;
    
    setIsResearching(true);
    setResearchProgress(0);
    setSearchError(null);
    
    try {
      // Set up progress simulation
      const progressInterval = setInterval(() => {
        setResearchProgress(prev => {
          const newProgress = prev + 3;
          return newProgress < 95 ? newProgress : prev;
        });
      }, 300);
      
      // Get recommended sources for this topic and country
      const recommendedSources = getRecommendedSources(activeTopic, villageInfo.country);
      
      // Use the enhanced searchWeb function that includes web search capability
      const researchResult = await searchWeb(
        activeTopic, 
        villageInfo.name,
        villageInfo.country
      );
      
      // Clear progress interval
      clearInterval(progressInterval);
      setResearchProgress(100);
      
      // Update research data
      onResearchUpdate(activeTopic, researchResult);
      
      // Update sources
      setResearchSources(prev => ({
        ...prev,
        [activeTopic]: recommendedSources
      }));
      
      // Reset state after a delay
      setTimeout(() => {
        setIsResearching(false);
        setResearchProgress(0);
      }, 1000);
      
      // Reset comprehensive analysis flag when new research is conducted
      setAnalysisComplete(false);
      setComprehensiveReport('');
      
    } catch (error) {
      console.error("Error conducting research:", error);
      
      // Clear progress
      setResearchProgress(0);
      setIsResearching(false);
      
      // Set error message
      setSearchError({
        title: `Unable to research ${activeTopic}`,
        message: error.message || "Unable to complete the research. Please check your internet connection and try again."
      });
    }
  };
  
  // Function to render research content with markdown formatting
  const renderMarkdownContent = (content) => {
    if (!content) return <p>No research data available.</p>;
    
    // Basic markdown parsing for headers, lists, and sections
    const formattedContent = content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-4 mb-2">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mt-4 mb-2 text-gray-800">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-medium mt-3 mb-1 text-gray-700">{line.replace('### ', '')}</h3>;
        }
        
        // List items
        if (line.startsWith('* ')) {
          return <li key={index} className="ml-4 mb-1">{line.replace('* ', '')}</li>;
        }
        if (line.startsWith('  * ')) {
          return <li key={index} className="ml-8 mb-1">{line.replace('  * ', '')}</li>;
        }
        
        // Bold text - handle confidence levels specially
        if (line.includes('**')) {
          if (line.includes('HIGH CONFIDENCE')) {
            return <p key={index} className="mb-1 bg-green-50 p-1 border-l-4 border-green-500 pl-2">{line.replace(/\*\*HIGH CONFIDENCE\*\*/, '')}</p>;
          } else if (line.includes('MEDIUM CONFIDENCE')) {
            return <p key={index} className="mb-1 bg-yellow-50 p-1 border-l-4 border-yellow-500 pl-2">{line.replace(/\*\*MEDIUM CONFIDENCE\*\*/, '')}</p>;
          } else if (line.includes('LOWER CONFIDENCE')) {
            return <p key={index} className="mb-1 bg-orange-50 p-1 border-l-4 border-orange-500 pl-2">{line.replace(/\*\*LOWER CONFIDENCE\*\*/, '')}</p>;
          } else {
            const parts = line.split('**');
            return (
              <p key={index} className="mb-1">
                {parts.map((part, i) => i % 2 === 0 ? part : <strong key={i}>{part}</strong>)}
              </p>
            );
          }
        }
        
        // Regular paragraph
        if (line.trim() === '') {
          return <div key={index} className="h-2"></div>;
        }
        
        return <p key={index} className="mb-1">{line}</p>;
      });
    
    return <div className="markdown-content">{formattedContent}</div>;
  };
  
  // Function to extract and display sources
  const renderSources = (content) => {
    if (!content) return null;
    
    // Check if there's a Sources section in the content
    const sourcesIndex = content.indexOf('## Sources');
    if (sourcesIndex === -1) return null;
    
    // Extract the sources section
    const sourcesSection = content.substring(sourcesIndex);
    const sources = sourcesSection
      .replace('## Sources', '')
      .split('\n')
      .filter(line => line.trim().length > 0 && (
        /^\d+\./.test(line.trim()) || 
        line.includes('http') || 
        line.includes('www.')
      ))
      .map(line => line.trim());
    
    if (sources.length === 0) return null;
    
    return (
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-md font-semibold text-gray-800 mb-2">Sources and References</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          {sources.map((source, index) => {
            const urlMatch = source.match(/(https?:\/\/[^\s]+)/g);
            if (urlMatch) {
              return (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-5 flex-shrink-0">{index + 1}.</span>
                  <span>
                    {source.substring(0, source.indexOf(urlMatch[0]))}
                    <a 
                      href={urlMatch[0]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {urlMatch[0]}
                    </a>
                    {source.substring(source.indexOf(urlMatch[0]) + urlMatch[0].length)}
                  </span>
                </li>
              );
            }
            return (
              <li key={index} className="flex items-start">
                <span className="inline-block w-5 flex-shrink-0">{index + 1}.</span>
                <span>{source.replace(/^\d+\.\s/, '')}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };
  
  // Function to render confidence level legend
  const renderConfidenceLegend = () => {
    return (
      <div className="text-xs border border-gray-200 rounded-md p-2 mt-4">
        <h4 className="font-medium mb-1">Confidence Level Guide:</h4>
        <div className="flex flex-col space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 mr-2"></div>
            <span>High Confidence - Data specific to {villageInfo.name}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 mr-2"></div>
            <span>Medium Confidence - Data from the district/region</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 mr-2"></div>
            <span>Lower Confidence - Country-level data</span>
          </div>
        </div>
      </div>
    );
  };

  // Render the comprehensive analysis section if all topics have been researched
  const renderComprehensiveAnalysis = () => {
    if (!allTopicsResearched) return null;
    
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Comprehensive Research Analysis</h2>
          <div className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">AI Generated</div>
        </div>
        
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Analyzing all research data...</p>
            <p className="text-sm text-gray-500 mt-2">Generating comprehensive insights across all research topics</p>
          </div>
        ) : comprehensiveReport ? (
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="research-content prose max-w-none">
              {renderMarkdownContent(comprehensiveReport)}
            </div>
            {renderSources(comprehensiveReport)}
          </div>
        ) : (
          <div className="bg-gray-100 p-4 rounded-md text-gray-700">
            <p>Comprehensive analysis will be generated after all topics have been researched.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Comprehensive Analysis Section (if all topics researched) */}
      {renderComprehensiveAnalysis()}
      
      {/* Main Research Interface */}
      <div className="flex gap-6">
        {/* Topic Navigation */}
        <div className="w-1/4">
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Research Topics</h2>
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
                      {completedTopics[topic.id] && (
                        <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Research Progress Overview */}
          <div className="bg-white shadow rounded-lg p-4 mt-4">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Research Progress</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ 
                  width: `${topics.length > 0 
                    ? (Object.keys(completedTopics).length / topics.length) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{Object.keys(completedTopics).length} of {topics.length} topics researched</p>
            
            {allTopicsResearched && (
              <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">All topics have been researched. Comprehensive analysis is available.</p>
              </div>
            )}
          </div>
          
          {/* Recommended Sources Panel */}
          {researchSources[activeTopic] && researchSources[activeTopic].length > 0 && (
            <div className="bg-white shadow rounded-lg p-4 mt-4">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Recommended Data Sources</h2>
              <ul className="space-y-2 text-sm">
                {researchSources[activeTopic].map((source, index) => (
                  <li key={index} className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {source.name}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-3">
                These sources may have additional information for {villageInfo.name} or {villageInfo.country}.
              </p>
            </div>
          )}
          
          {/* Confidence legend */}
          {completedTopics[activeTopic] && renderConfidenceLegend()}
        </div>
        
        {/* Research Content Area */}
        <div className="w-3/4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Research: {topics.find(t => t.id === activeTopic)?.title || 'Select a topic'}
              </h2>
              <div className="flex gap-2">
                {completedTopics[activeTopic] && (
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={conductResearch}
                  disabled={isResearching || !activeTopic}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isResearching ? 'Researching...' : completedTopics[activeTopic] ? 'Refresh Research' : 'Conduct Research'}
                </button>
              </div>
            </div>
            
            {/* Context banner */}
            <div className="mb-6 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Research context:</span> Using AI-powered web search to gather and analyze information about {topics.find(t => t.id === activeTopic)?.title || 'the selected topic'} in {villageInfo.name}, {villageInfo.country}.
              </p>
            </div>
            
            {/* Search Error */}
            {searchError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="font-medium text-red-800 mb-1">{searchError.title}</h3>
                <p className="text-sm text-red-700">{searchError.message}</p>
                <div className="mt-3 flex justify-end">
                  <button 
                    onClick={() => setSearchError(null)}
                    className="text-xs text-red-700 hover:text-red-900"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            
            {/* Research in progress */}
            {isResearching && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-700">Researching {topics.find(t => t.id === activeTopic)?.title || 'the selected topic'}...</p>
                  <p className="text-sm text-gray-700">{researchProgress}%</p>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-blue-600 rounded-full" 
                    style={{ width: `${researchProgress}%` }}
                  ></div>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">Searching for village-specific information...</p>
                  {researchProgress > 30 && <p className="text-xs text-gray-500">Searching for district/regional data...</p>}
                  {researchProgress > 50 && <p className="text-xs text-gray-500">Gathering country-level statistics...</p>}
                  {researchProgress > 70 && <p className="text-xs text-gray-500">Searching official international sources...</p>}
                  {researchProgress > 85 && <p className="text-xs text-gray-500">Analyzing findings with AI model...</p>}
                </div>
              </div>
            )}
            
            {/* Research Results */}
            {completedTopics[activeTopic] ? (
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-600">AI-analyzed research for {villageInfo.name}, {villageInfo.country}</p>
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Research Report</div>
                </div>
                
                {/* Render formatted markdown content */}
                <div className="research-content prose max-w-none">
                  {renderMarkdownContent(researchData[activeTopic]?.webResearch)}
                </div>
                
                {/* Render sources */}
                {renderSources(researchData[activeTopic]?.webResearch)}
                
                {/* Citation note */}
                <div className="mt-6 pt-3 border-t border-gray-200 text-sm text-gray-500">
                  <p>Research data last updated: {new Date().toLocaleDateString()}</p>
                  <p className="mt-1">This report was generated using AI analysis of web search results. Data should be verified with local sources and experts for development planning.</p>
                </div>
              </div>
            ) : !isResearching && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No research conducted for {topics.find(t => t.id === activeTopic)?.title || 'this topic'} in {villageInfo.name} yet.</p>
                <p className="text-gray-400 text-sm max-w-md">Click the "Conduct Research" button to search the web for information about this topic in your village and country, and generate an AI-analyzed report.</p>
              </div>
            )}
            
            {/* Research Guidance */}
            <div className="mt-6 p-3 bg-yellow-50 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">AI-Powered Research Methodology</h3>
              <p className="text-xs text-yellow-700">
                This tool uses the openAI gpt-4o AI model to analyze web search results about {villageInfo.name} in {villageInfo.country}. If village-specific data isn't found, it will look for information at the district or country level. All information is analyzed, synthesized, and presented with clearly labeled confidence levels and linked citations where available.
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                <strong>Note:</strong> After researching all topics, a comprehensive cross-topic analysis will be generated to identify patterns, connections, and strategic insights.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchPhase;