import './App.css';
import { useState, useEffect } from 'react';

function App() {

  const [url, setUrl] = useState('');
  const [recommendations, setrecommendations] = useState([])

  const getRecommendations = () => {

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
        <button onClick={() => {getRecommendations}} className='action-btn'>Recommend</button>

        <div className='recommendations-div'>
          {recommendations.map((new_folder,text) => {
            return <div key={text}>
              {!new_folder && text}
            </div>
          })}
        </div>
        <h3>Create a new folder</h3>
        <div className='recommendations-div'>
          {recommendations.map((new_folder,text) => {
            return <div key={text}>
              {new_folder && text}
            </div>
          })}
        </div>
    </div>
  )
}

export default App
