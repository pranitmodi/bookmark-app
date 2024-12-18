import './App.css';
import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

function App() {

  const [url, setUrl] = useState('');
  const [folderStructure, setFolderStructure] = useState('');
  const [recommendations, setrecommendations] = useState([])
  const [selectedOption, setselectedOption] = useState("")

  const apiKey = "AIzaSyAcMmN6GKoDR0TMkG9wdW-2MJyptgTC6kg";
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: "Your task is to reccomend in which folder should the book mark will be added. I will give you the folder structure and URL. The output should also include sub folders. Give only relevant reccomendations(maximum 5). Each reccomendation should be in this Format.\n\n- Folder 1 > Sub Folder > Sub Folder 2....",
  });
  
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        response: {
          type: "object",
          properties: {
            reccomendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: {
                    type: "string"
                  }
                }
              }
            }
          }
        }
      }
    },
  };

  function fetchBookmarks() {
    chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
      const markdown = generateMarkdown(bookmarkTreeNodes);
      setFolderStructure(markdown);
    });
  }

  function generateMarkdown(bookmarkNodes, depth = 1) {
    let markdown = '';
    bookmarkNodes.forEach(function(node) {
      if (node.children) {
        markdown += `${'#'.repeat(depth)} ${node.title || 'Folder'}\n`;
        markdown += generateMarkdown(node.children, depth + 1);
      } else {
        markdown += `${'#'.repeat(depth + 1)} [${node.title}](${node.url})\n`;
      }
    });
    return markdown;
  }

  const getRecommendations = async () => {
    fetchBookmarks();
    const chatSession = model.startChat({
      generationConfig,
      history: [
      ],
    });
  
    const result = await chatSession.sendMessage(folderStructure);
    console.log(result.response.text());
    setrecommendations(result.response.text());
  }

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let activeTab = tabs[0];
      setUrl(activeTab.url);
    });
  }, []);

  return (
    <div className='main-div'>
        <div className='current-url'>{url}</div>
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
          <button onClick={() => {getRecommendations()}} className='action-btn'>Recommend</button>
        </div>

        {recommendations.length ? <div className='recommendations'>

            {recommendations.map((new_folder,text) => {
              return <div className='recommendations-div' key={text}>
                {!new_folder && text}
              </div>
            })}

            <h2>Create a new folder</h2>
          
            {recommendations.map((new_folder,text) => {
              return <div className='recommendations-div' key={text}>
                {new_folder && text}
              </div>
            })}
            
        </div> : null}
    </div>
  )
}

export default App
