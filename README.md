# Loop Api Integration React Application

## Overview

This React application is designed to interact with various AWS Lambda functions via HTTP requests. It utilizes the `axios` package for making API calls and displays the responses using the `react-json-view` package. The application provides a user interface (UI) where users can click a button to trigger Lambda functions and view the results in a structured JSON format. The Lambda interacts with the various endpoints of the Loop Api.

## Loop API Code

To view the API code follow this [Link](Lambda.md)

## Dependencies

- **React**: The core JavaScript library used for building the user interface.
- **Axios**: A promise-based HTTP client used for making requests to the Lambda functions.
- **React-JSON-View**: A React component that displays JSON objects in a collapsible tree structure, making it easy to view and navigate through the JSON data.
- **CSS**: Basic CSS is used for styling the UI.
- **Amplify**: Handles the creation and deploy of the underlined infrastructure.

### 1. Imports

```javascript
import React, { useState } from "react";
import axios from "axios"; // Import axios for making HTTP requests
import ReactJson from "react-json-view"; // Import react-json-view for displaying JSON data
import "./App.css"; // Import custom CSS for styling the application
```

### 2. State Management

```javascript
const [results, setResults] = useState({});
const [inputText, setInputText] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

- **results**: Stores the responses from the Lambda function.
- **loading**: A boolean that tracks whether a request is currently in progress. It is used to disable buttons and show loading indicators.
- **error**: Stores any error messages that occur during the API requests.

### 3. Calling the Lambda Function

```javascript
const callLambda = async () => {
  setLoading(true);
  setError(null);

  const url =
    "https://g4ox880hoc.execute-api.us-east-2.amazonaws.com/dev/shipments";

  try {
    const response = await axios.get(url);
    console.log("API response:", response.data);

    setResults((prevResults) => ({
      ...prevResults,
      shipments: response.data,
    }));
  } catch (error) {
    console.error("Error calling shipments:", error);
    setError(`Error calling shipments: ${error.message}`);
    setResults((prevResults) => ({
      ...prevResults,
      shipments: "Error occurred",
    }));
  } finally {
    setLoading(false);
  }
};
```

- **`setLoading(true)`**: Sets the `loading` state to `true` to indicate that a request is in progress.
- **`axios.get(url)`**: Makes a GET request to the specified URL, which triggers the Lambda function and returns its response.
- **`setResults`**: Updates the `results` state with the response data.
- **`catch(error)`**: Catches any errors that occur during the API request and stores the error message in the `error` state.
- **`finally`**: Ensures that the `loading` state is reset to `false` after the request is completed, regardless of whether it succeeded or failed.
