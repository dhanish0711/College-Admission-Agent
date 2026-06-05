# 📂 langflow/

This folder contains the exported LangFlow flow file for the College Admission RAG Agent.

## How to Import the Flow

1. Open LangFlow at `http://localhost:7860`
2. Click the **Import** button (folder icon)
3. Select `college_admission_flow.json`
4. The pipeline will load automatically

## Flow Components

| Component | Role |
|---|---|
| **Read File** | Loads `College Data.pdf` as the knowledge base |
| **Prompt Template** | Structures the system prompt + user question + context |
| **Language Model** | IBM Granite (`ibm/granite-4-h-small`) generates the answer |
| **Chat Input** | Receives the user's natural language question |
| **Chat Output** | Returns the final AI response |

## How to Export Your Flow

1. In LangFlow, open your flow
2. Click the **⋮ menu** → **Export**
3. Save the JSON file here as `college_admission_flow.json`
4. Commit it to the repo so others can import it

## Configuration Required After Import

- Upload your `College Data.pdf` to the **Read File** component
- Add your **IBM Granite API key** to the **Language Model** component
- Set the correct **WatsonX project ID** if using IBM Cloud
