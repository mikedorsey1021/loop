# Loop Api Integration React Application

## Overview

This React application is designed to interact with various AWS Lambda functions via HTTP requests. It utilizes the `axios` package for making API calls and displays the responses using the `react-json-view` package. The application provides a user interface (UI) where users can click a button to trigger Lambda functions and view the results in a structured JSON format. The Lambda interacts with the various endpoints of the Loop Api.

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
