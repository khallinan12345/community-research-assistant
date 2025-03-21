// utils/reportGenerator.js
import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const generateDynamicReport = (
  villageInfo = {},
  researchData = {},    // Raw outputs from the Research Phase
  conversations = {},   // Transcripts from the Conversation Phase
  analysisData = "",    // Comprehensive AI analysis from the Research Phase
  assetsData = {},      // Raw outputs from the Assets Phase
  aspirationsData = {}  // Raw outputs from the Aspirations Phase
) => {
  return {
    villageInfo,
    researchData,
    conversations,
    analysisData,
    assetsData,
    aspirationsData
  };
};

const polishReport = async (rawReport) => {
  const {
    villageInfo,
    researchData,
    conversations,
    analysisData,
    assetsData,
    aspirationsData
  } = rawReport;

  const villageName = villageInfo.name || "Unknown Village";
  const countryName = villageInfo.country || "Unknown Country";
  const roleInCommunity = villageInfo.role || "Community Expert";

  // Detailed prompt instructing the AI to produce a final report in plain text format.
  const prompt = `
You are a professional and scholarly report writer with expertise in assessing needs in rural African villages.

Attached is a JSON file containing raw data collected from various phases of community development research for ${villageName}, ${countryName}. The local expert is a ${roleInCommunity}.

Your task is to synthesize this information into a professional, highly detailed community development report using a fully developed narrative style, ensuring that all data is contextualized and integrated rather than merely listed. The report should be structured logically and formatted for easy copying into Microsoft Word.

The content for each section must be drawn from the appropriate parts of the JSON file as follows:

Report Sections & Data Sources
1. Introduction
Identify the village, country, and local expert’s role.
Provide context on why this assessment is essential, emphasizing how AI-driven education and instructional technology will play a transformative role in overcoming challenges and accelerating progress.
Introduce Nyumbani Village’s self-sustainability model and how AI-enhanced education will amplify its impact.
2. Current State Analysis
Present a fully integrated and analytical picture of Nyumbani Village’s current conditions across:

Demographics → (From researchData.demographics & conversations.demographics)
Agriculture & Food Security → (From researchData.agriculture & conversations.agriculture)
Power & Energy Access → (From researchData.power & conversations.power)
Employment & Livelihoods → (From researchData.livelihoods & conversations.livelihoods)
Education Access → (From researchData.education & conversations.education)
Healthcare Services → (From researchData.healthcare & conversations.healthcare)
Political Stability & Governance → (From researchData.political & conversations.political)
Food Security → (From researchData.food & conversations.food)
Leadership & Decision-Making → (From researchData.leadership & conversations.leadership)
For each area, explain how AI-driven education, training, and instructional technology can provide solutions and accelerate problem-solving.

3. Research Findings and Comprehensive Analysis
This section documents the comprehensive analysis from the research. It should include subsections for each of the categories which follow using the specific data noted for each asset in the json file. Please write in continuous sentences. Bullet as appropriate for emphasis.
* Cross-Cutting Themes → Identify patterns and dependencies across different development areas.
*Interaction of Community Aspects → Explain how challenges in one area affect others and how AI-powered education can offer solutions.
*Integrated Recommendations → Offer AI-enabled strategies for overcoming multiple challenges simultaneously.
*Knowledge Gaps and Suggested Approaches → Highlight what areas need further research or AI-enhanced solutions.


4. Assets and Available Resources
This section documents all current assets and infrastructure, evaluating how AI-enhanced instruction can maximize their use. It should include subsections for each of the categories which follow using the specific data noted for each asset in the json file. Please write in continuous sentences. Bullet as appropriate for emphasis. 

*Agricultural Assets → assetsData.agriculture
*Power & Energy Assets → assetsData.power
*Education & Training Facilities → assetsData.education
*Livelihood & Economic Resources → assetsData.livelihoods
*Healthcare Infrastructure → assetsData.healthcare
*For each, explain how AI education can:



5. Challenges and Community Aspirations
This section is very important. It should  be written in prose, with subsections for each category. 
Use aspirationsData to identify specific community goals in the following. Each of these categories should be written as a sub-section. For each section, explain  how AI-enhanced education can be a force multiplier in overcoming barriers and achieving community aspirations faster.

*Demographics & Population Growth
*Agricultural Production & Sustainability
*Energy Expansion & Reliability
*Job Creation & Livelihood Development
*Education & Workforce Training
*Healthcare & Well-Being
*Food Security & Nutrition
*Governance & Leadership Training

6. Education and Capacity Building Recommendations
⚡ This is the most important section ⚡
✅ Each recommendation must be deeply detailed, justified, and focused on rapid impact.
✅ AI-powered education must be at the core of these recommendations.
✅ Each recommendation must answer:

What exactly is being recommended?
Why is it essential based on research and aspirations?
How will it be implemented to achieve results rapidly?
Key AI-Driven Recommendations for Nyumbani Village
1. AI-Powered Agricultural Training & Climate-Smart Farming

What: AI-driven training modules teaching precision irrigation, permaculture, biochar soil enhancement, and intercropping techniques suited to local conditions.
Why: Agricultural challenges due to water scarcity and soil degradation.
How: Implement AI-powered remote sensing & IoT-based farming education using smartphone apps and local AI mentors.
2. AI-Enhanced Vocational Training for Livelihoods

What: AI-driven job readiness programs for careers in solar energy maintenance, IT coding, carpentry, and eco-tourism.
Why: Lack of formal job training is a barrier to economic self-sufficiency.
How: Provide AI-personalized learning using adaptive learning platforms and VR-based trade skill simulations.
3. AI-Facilitated Digital Literacy & Remote Work Training

What: Establish AI-powered digital literacy hubs teaching coding, AI development, and remote freelancing.
Why: Expands employment opportunities beyond local markets.
How: Use AI tutors, project-based learning, and job-matching AI tools to connect trainees to global freelance platforms.
4. AI-Powered Renewable Energy Workforce Development

What: AI-driven training for solar panel maintenance, energy analytics, and grid management.
Why: Expanding solar infrastructure needs skilled local technicians.
How: Offer AI-interactive training modules, hands-on apprenticeships, and predictive AI analytics to optimize solar efficiency.
5. AI-Based Healthcare Training & Local Medical Support

What: AI-powered telemedicine & healthcare workforce training.
Why: Shortage of skilled healthcare workers & reliance on external aid.
How: Develop AI-driven diagnostic training, integrate localized health AI chatbots, and implement mobile-based medical education programs.
7. Conclusion
Summarize:

How AI-powered education will transform each development sector.
The necessity of integrated AI-based vocational, agricultural, and medical training.
How the community can achieve self-sufficiency and economic independence faster.

Below is the full JSON data:
${JSON.stringify(rawReport, null, 2)}

Now, please generate the final report in plain text format.
  `;

  const payload = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a professional report writer." },
      { role: "user", content: prompt }
    ],
    max_tokens: 4500,
    temperature: 0.3,
    top_p: 1,
  };

  try {
    const response = await axios.post(OPENAI_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating final report:", error);
    return "Error generating report. Please try again later.";
  }
};

export const generateComprehensiveReport = async (
  villageInfo,
  researchData,
  conversations,
  analysisData,
  assetsData,
  aspirationsData
) => {
  try {
    const rawReport = generateDynamicReport(
      villageInfo,
      researchData,
      conversations,
      analysisData,
      assetsData,
      aspirationsData
    );
    const finalReport = await polishReport(rawReport);
    return finalReport;
  } catch (error) {
    console.error("Error generating comprehensive report:", error);
    return "Error generating report. Please try again later.";
  }
};

export { polishReport, generateDynamicReport };
