const {
    GoogleGenerativeAI
  } = require("@google/generative-ai");
  
  const apiKey = process.env.GEMINI_API_KEY;
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
  
  async function run() {
    const chatSession = model.startChat({
      generationConfig,
      history: [
      ],
    });
  
    const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
    console.log(result.response.text());
  }
  
  run();