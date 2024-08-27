import React, { useState } from "react";
import axios from "axios";
import ReactJson from "react-json-view"; // Import react-json-view
import "./App.css";

const App = () => {
  const [results, setResults] = useState({});
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Loop Integration App</h1>
      </header>
      <main className="app-main">
        <div className="button-group">
          <button
            onClick={callLambda}
            className="app-button"
            disabled={loading}
          >
            {loading ? "Loading..." : "Get All Data"}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        <div className="results">
          {Object.entries(results).map(([key, value]) => (
            <div key={key}>
              <h3>{key}</h3>
              {/* Display the JSON response using ReactJson */}
              <ReactJson
                src={value}
                // theme="monokai"
                collapseStringsAfterLength={50}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
