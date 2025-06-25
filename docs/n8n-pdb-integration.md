# N8N PDB Integration Feature

## Overview

This feature automatically detects PDB IDs in N8N webhook responses and renders them in the 3D molecular viewer. The system is designed to work with structured JSON responses from different N8N agents, with special handling for PDB Agent responses.

## Response Format

### General JSON Response

The N8N workflow should return responses in the following format:

```json
{
  "response": "The response message to display in chat or an array of messages",
  "agentName": "agentType",
  "cmd": "update canvas" // optional, can be null
}
```

- `response` can be a string, number, or an array (for some agents)
- `agentName` is the type of agent (e.g., `searchAgent`, `calculatorAgent`, `PDBAgent`)
- `cmd` is an optional command for the frontend (e.g., `update canvas`)

### PDB Agent Response

For PDB Agent responses, the `response` field is an array of stringified JSON objects containing PDB-specific data:

```json
{
  "response": [
    "{\"responseText\":\"Found caffeine molecule structure!\",\"proteinName\":\"caffeine\",\"proteinDataPDB\":\"\",\"pdbUrl\":\"https://www.rcsb.org/structure/8FTG\",\"pdbId\":\"8FTG\"}"
  ],
  "agentName": "PDBAgent",
  "cmd": "update canvas"
}
```

## How It Works

### Agent-Specific Processing

The system processes responses differently based on the `agentName`:

1. **PDBAgent**: Parses the first element of the `response` array as JSON and renders 3D structures when `pdbId` is provided
2. **Other Agents**: Displays the `response` (string, number, or array) in chat

### PDB Structure Rendering

When a PDB Agent response is received:

1. **Validation**: Checks if `pdbId` is valid and not "N/A"
2. **Layer Creation**: Creates a visualization layer for the PDB structure
3. **Data Fetching**: Fetches PDB structure data from RCSB PDB
4. **3D Rendering**: Loads the structure in the molecular viewer
5. **User Feedback**: Updates chat with loading status and results

## Usage Examples

### Example 1: PDB Agent Response
**N8N Response**:
```json
{
  "response": [
    "{\"responseText\":\"Found caffeine molecule structure!\",\"proteinName\":\"caffeine\",\"proteinDataPDB\":\"\",\"pdbUrl\":\"https://www.rcsb.org/structure/8FTG\",\"pdbId\":\"8FTG\"}"
  ],
  "agentName": "PDBAgent",
  "cmd": "update canvas"
}
```
**Result**: Automatically loads 8FTG in the 3D viewer

### Example 2: Search Agent Response
**N8N Response**:
```json
{
  "response": "Caffeine is a central nervous system (CNS) stimulant of the methylxanthine class.",
  "agentName": "searchAgent",
  "cmd": null
}
```
**Result**: Only displays the text in chat, no 3D rendering

### Example 3: Calculator Agent Response
**N8N Response**:
```json
{
  "response": [3],
  "agentName": "calculatorAgent",
  "cmd": null
}
```
**Result**: Only displays the calculation result in chat

## Configuration

### Environment Variables

Make sure your `.env.local` file contains:
```
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### N8N Workflow Setup

Your N8N workflow should:
1. Process the user's query with appropriate agents
2. Return structured JSON responses with `response` and `agentName`
3. For PDB Agent, include a stringified JSON object in the `response` array
4. Use the "Respond to Webhook" node to send the response

## Error Handling

The system handles various error scenarios:
- **Invalid PDB ID**: Shows error message if PDB ID doesn't exist
- **Network Errors**: Handles connection issues gracefully
- **Missing Data**: Gracefully handles responses without PDB data
- **Agent Recognition**: Properly identifies and processes different agent types

## Technical Details

### Files Modified
- `src/components/chat/ChatInput.tsx`: Main integration logic
- `src/services/n8n-webhook.ts`: Enhanced response parsing for new format
- `src/services/pdb.ts`: PDB data fetching (existing)

### Key Interfaces
```typescript
interface N8nResponse {
  response: string | number | Array<string | number>;
  agentName: string;
  cmd?: string | null;
}

// For PDBAgent, the first element of response array is a stringified object:
interface PDBAgentResponse {
  responseText: string;
  proteinName?: string;
  proteinDataPDB?: string;
  pdbUrl?: string;
  pdbId?: string;
  query_id?: string;
  result_set?: any[];
}
```

### Response Processing Flow
1. Parse JSON response
2. Extract `response` and `agentName`
3. If `agentName === 'PDBAgent'` and `response` is an array, parse the first element as JSON
4. If PDB Agent and `pdbId` exists, create visualization layer
5. Fetch PDB data and render in 3D viewer
6. Display appropriate user feedback

## Troubleshooting

### Common Issues

1. **3D structures not loading**
   - Check that `agentName` is exactly "PDBAgent"
   - Verify `pdbId` is not "N/A" or empty
   - Check network connectivity to RCSB PDB
   - Verify PDB ID exists in database

2. **Response not displaying**
   - Ensure response is valid JSON
   - Check that `response` field is present
   - Verify webhook URL is correct

3. **Agent not recognized**
   - Check that `agentName` field is present
   - Ensure agent name matches expected values
   - Check for typos in agent names

### Debug Information

Enable console logging to see:
- Parsed response data
- Agent type detection
- PDB data processing
- Loading status and errors

## Supported Agent Types

Currently supported agent types:
- `PDBAgent`: Renders 3D structures
- `searchAgent`: Text-only responses
- `emailAgent`: Text-only responses
- `calculatorAgent`: Text-only responses
- Any other agent: Text-only responses

## Future Enhancements

Potential improvements:
- Support for multiple PDB structures in single response
- Integration with other molecular databases
- Enhanced error handling for different agent types
- Support for additional molecular formats 