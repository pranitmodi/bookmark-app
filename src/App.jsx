import './App.css';
import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

function App() {

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [folderStructure, setFolderStructure] = useState('');
  const [folderStructureArray, setfolderStructureArray] = useState([])
  const [apiKey, setapiKey] = useState();
  const [apiInput, setapiInput] = useState()
  const [openProfile, setopenProfile] = useState(true);
  const [recommendations, setrecommendations] = useState([]);
  const [hover, sethover] = useState(null);
  const [copy, setcopy] = useState();
  const [done, setdone] = useState(false);

  // const apiKey = import.meta.env.VITE_REACT_APP_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  useEffect(async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let activeTab = tabs[0];
      setUrl(activeTab.url);
      setcopy(false);
      fetchBookmarks();
    });
  }, []);

  useEffect(() => {
    chrome.storage.sync.get(["geminiKey"]).then((result) => {
      console.log("ApiKey is " + result.geminiKey);
      if(result.geminiKey) {
        setapiKey(result.geminiKey);
        setopenProfile(false);
      }
    });
  },[]);

  useEffect(() => {
    if(apiKey) {
      chrome.storage.sync.set({ geminiKey: apiKey }).then(() => {
        console.log("Api Key is set");
      });
    }
  },[apiKey])
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: "Your task is to recommend the folder in which bookmark for the provided URL must be added. You will be given the existing bookmark folder structure in the form of a markdown. The output should include sub folders if needed. First decide what topics the particular url is associated to and now try and find them in existing bookmark folder structure. Give maximum 5 folder recommendation for existing folders and give maximum two recommendations for creating a new folder along with the new folder/subfolder name. But give proper path to the subfolder if any in this format. \n\n- Folder 1 > Sub Folder > Sub Folder 2.... . Also generate a new title for the current URL provided and do not use the folder structure or the past titles to generate the new title. Give different titles options for all the recommendations.",
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
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              add_folder: {
                type: "boolean"
              },
              text: {
                type: "string"
              },
              title: {
                type: "string"
              }
            },
            required: [
              "add_folder",
              "text",
              "title"
            ]
          }
        }
      }
    },
  };

  const createBookmark = (text,title,flag) => {
    const folders = text.split(' > ');
    console.log(folders);

    let allFolders = folderStructureArray;
    let parentId = '1';

    for(let i=0; i<folders.length; i++) {
      const folder = folders[i];
      const result = allFolders.find(obj => obj.title === folder);
      if(result) {
        parentId = result.id;
        allFolders = result.children ? result.children : allFolders;
      }
      else {
        break;
      }
    }
    
    if(flag) {
      const newFolder = folders[folders.length - 1];
      chrome.bookmarks.create({ parentId: parentId, title: newFolder }, function (newFolderNode) {
        chrome.bookmarks.create({ parentId: newFolderNode.id, title: title, url: url }, function (newBookmark) {
          console.log('Bookmark created in new folder: ' + newBookmark.title);
        });
      });
    }
    else {
      chrome.bookmarks.create({parentId: parentId, title: title, url: url}, function(newBookmark) {
        console.log('Bookmark created: ' + newBookmark.title);
      });
    }

    setdone(true);
  }

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setcopy(true);
  }

  async function fetchBookmarks() {
    await chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
      console.log(bookmarkTreeNodes);
      console.log(bookmarkTreeNodes[0].children[0].children);
      setfolderStructureArray(bookmarkTreeNodes[0].children[0].children);
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
    const chatSession = model.startChat({
      generationConfig,
      history: [
      ],
    });
    setIsLoading(true);
    try {
      const result = await chatSession.sendMessage(folderStructure);
      const responseText = await result.response.text();
      const responseJson = JSON.parse(responseText);
      const recommendationsArray = responseJson.recommendations;
      setrecommendations(recommendationsArray);
    }
    catch (error) {
      console.error("Error fetching data: ",error);
    }
    finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='main-div'>

        <div className="profile-div" onClick={() => setopenProfile(!openProfile)}>
          <div className="user-btn">
          <i className={openProfile ? "ri-arrow-left-s-line" : "ri-user-3-fill"}></i>
          </div>
        </div>

        {openProfile ? <div className="gemini-form">
          <input className='api-key-input nunito-sans-400' onChange={e => setapiInput(e.target.value)} value={apiInput} type="password" name="gemini-api-key" placeholder='Enter Your Gemini Api Key' id="" />
          <div className="action-btn" onClick={() => {
            setapiKey(apiInput);
            setapiInput();
            setopenProfile(false);
          }}>{apiKey ? "Reset" : "Submit"}</div>
          <div className="instructions nunito-sans-400">
            <h2>Instructions: </h2>
            <li>Go to <a href="https://console.cloud.google.com/products">Google Cloud</a></li>
            <li>Sign Up</li>
            <li>Click Select a Project</li>
            <li>Create a new Project</li>
            <li>Head over to <a href="https://aistudio.google.com/">Google AI Studio</a></li>
            <li>Click Get Api Key</li>
            <li>Click Create Api Key</li>
            <li>Select the Google project created earlier</li>
            <li>Copy the Api Key and remember to store it somewhere safe.</li>
          </div>
        </div> : null}

        {apiKey && !openProfile ? <div className="url-display nunito-sans-500">
          <i className="ri-links-line"></i>
          <div className='current-url nunito-sans-500'>{url}</div>
          <i style={{cursor: "pointer"}} className={copy ? "ri-check-double-line" : "ri-clipboard-line"} onClick={() => copyLink()}></i>
        </div> : null}

        {apiKey && !openProfile ? <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
          <button onClick={() => {getRecommendations()}} style={done ? {backgroundColor: "green", pointerEvents: "none"} : null} className='action-btn nunito-sans-500'>{done ? "Bookmark Added" : "Recommend"}</button>
        </div> : null}

        {isLoading && apiKey && !openProfile ? <h2 className='loading nunito-sans-500'>Loading...</h2> : null}

        {recommendations.length && apiKey && !openProfile ? <div className='recommendations nunito-sans-400'>
            <h2>Reccomendations</h2>
            <div className="folder-recomm">
              {recommendations.map(({add_folder,text,title}) => {
                return !add_folder && <div className='recommendations-div' onMouseEnter={() => sethover(text)} onMouseLeave={() => sethover(null)} onClick={() => createBookmark(text,title,false)} key={text}>
                  {hover === text ? title : text}
                </div>
              })}
            </div>
            <h2>Create a new folder?</h2>
            <div className="new-folder-recomm">
              {recommendations.map(({add_folder,text,title}) => {
                return add_folder && <div className='recommendations-div' onMouseEnter={() => sethover(text)} onMouseLeave={() => sethover(null)} onClick={() => createBookmark(text,title,true)} key={text}>
                  {hover === text ? title : text}
                </div>
              })}
            </div>
        </div> : null}
    </div>
  )
}

export default App
