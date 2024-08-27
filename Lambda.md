# AWS Lambda Function Documentation

## Overview

This Lambda function is designed to interact with the Loop open API to fetch, process, and return shipment data. The function is built using Node.js, with dependencies on `axios` for HTTP requests and `moment` for date manipulation.

## Dependencies

- **axios**: A promise-based HTTP client used to make requests to the external API.
- **moment**: A library for parsing, validating, manipulating, and formatting dates.

## Environment Variables

- **API_KEY**: The API key used to authenticate requests to the external API.

## Axios Instance Configuration

```javascript
const api = axios.create({
  baseURL: "https://api.loop.us/v1",
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
    "Content-Type": "application/json",
  },
});
```

> **Note:** The API key is stored in AWS and is pulled from an environment variable.

- **baseURL**: The base URL for the external API.
- **headers**: Default headers are set for authorization and content type.

## Function Definitions

### 1. `testConnection`

```javascript
async function testConnection() {
  try {
    const response = await api.get("/ping");
    console.log("Auth test response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in testConnection:", error);
    throw error;
  }
}
```

- **Purpose**: Tests the connection and authorization with the Loop API.
- **Returns**: The response data from the `/ping` endpoint.
- **Error Handling**: Logs errors and rethrows them.

### 2. `getShipmentData`

```javascript
async function getShipmentData(startDate, endDate, limit = 50, cursor = null) {
  try {
    const params = {
      revisedAfter: startDate,
      revisedBefore: endDate,
      first: limit,
    };
    if (cursor) params.after = cursor;
    const response = await api.get("/shipment-jobs", { params });
    return response.data;
  } catch (error) {
    console.error("Error in getShipmentData:", error);
    throw error;
  }
}
```

- **Purpose**: Fetches shipment data for a specified date range.
- **Parameters**:
  - `startDate`: The start date for the shipment data.
  - `endDate`: The end date for the shipment data.
  - `limit`: The number of records to fetch (default is 50).
  - `cursor`: A pagination cursor for fetching subsequent pages.
- **Returns**: The shipment data.
- **Error Handling**: Logs errors and rethrows them.

### 3. `getAllShipmentData`

```javascript
async function getAllShipmentData(startDate, endDate, limit = 50) {
  let allShipments = [];
  let cursor = null;
  let hasNextPage = true;

  try {
    while (hasNextPage && allShipments.length < limit) {
      const response = await getShipmentData(
        startDate,
        endDate,
        limit - allShipments.length,
        cursor
      );
      allShipments = allShipments.concat(response.data);
      console.log(
        `Fetched ${response.data.length} shipments. Total: ${allShipments.length}`
      );

      hasNextPage = response.pageInfo.hasNextPage;
      cursor = response.pageInfo.endCursor;
    }
    return allShipments;
  } catch (error) {
    console.error("Error in getAllShipmentData:", error);
    throw error;
  }
}
```

- **Purpose**: Retrieves all shipment data within a specified date range and up to a specified limit.
- **Parameters**:
  - `startDate`: The start date for the shipment data.
  - `endDate`: The end date for the shipment data.
  - `limit`: The maximum number of records to fetch (default is 50).
- **Returns**: An array of all retrieved shipments.
- **Error Handling**: Logs errors and rethrows them.

### 4. `getCarrierInfo`

```javascript
async function getCarrierInfo(carrierOrganizationQid, special = false) {
  if (!carrierOrganizationQid) {
    console.warn("Missing carrierOrganizationQid, skipping carrier info fetch");
    if (special) {
      return {
        legalName: "Unknown",
        usDotNumber: "Unknown",
        scac: "Unknown",
        mcNumber: "Unknown",
      };
    } else {
      return {
        usDotNumber: "Unknown",
        scac: "Unknown",
        mcNumber: "Unknown",
      };
    }
  }
  try {
    const response = await api.get(`/organizations/${carrierOrganizationQid}`);
    if (special) {
      return {
        legalName: response.data.legalName || "Unknown",
        usDotNumber: response.data.truckingCarrierInfo.usDotNumber || "Unknown",
        scac: response.data.truckingCarrierInfo.scac || "Unknown",
        mcNumber: response.data.truckingCarrierInfo.mcNumber || "Unknown",
      };
    } else {
      return {
        usDotNumber: response.data.truckingCarrierInfo.usDotNumber || "Unknown",
        scac: response.data.truckingCarrierInfo.scac || "Unknown",
        mcNumber: response.data.truckingCarrierInfo.mcNumber || "Unknown",
      };
    }
  } catch (error) {
    console.error(
      `Error fetching carrier info for ${carrierOrganizationQid}:`,
      error.message
    );
    return {
      legalName: "Error",
      usDotNumber: "Error",
      scac: "Error",
      mcNumber: "Error",
    };
  }
}
```

- **Purpose**: Fetches carrier information for a given carrier organization QID.
- **Parameters**:
  - `carrierOrganizationQid`: The QID of the carrier organization.
  - `special`: Marker to pinpoint the correct shipment instance that has `bolNumber` as BOL123.
- **Returns**: An object containing the carrier's legal name(only if bolNumber matches), USDOT number, SCAC, and MC number.
- **Error Handling**: Logs errors and returns default values if an error occurs.

### 5. `generateAllocationCodes`

```javascript
function generateAllocationCodes(shipmentData) {
  const freightTermsCodes = {
    "3rd Party": "123.445",
    Collect: "987.434",
    Unknown: "756.434",
  };
  const jobTypeCodes = { FTL: "999.123", LTL: "001.456", Unknown: "000.000" };
  const freightTerms =
    shipmentData.jobTypeInfo?.freightChargeTerms.charAt(0).toUpperCase() +
      shipmentData.jobTypeInfo?.freightChargeTerms.slice(1).toLowerCase() ||
    "Unknown";
  const jobType = shipmentData.jobType || "Unknown";
  return {
    shipmentQid: shipmentData.qid,
    freightChargeTerms: freightTermsCodes[freightTerms],
    jobType: jobTypeCodes[jobType],
  };
}
```

- **Purpose**: Generates allocation codes based on shipment data.
- **Parameters**:
  - `shipmentData`: The shipment data object.
- **Returns**: An object containing allocation codes for `freightChargeTerms` and `jobType`.

### 6. `processShipments`

```javascript
async function processShipments(startDate, endDate) {
  await testConnection();
  console.log("Auth validated...");

  const shipments = await getAllShipmentData(startDate, endDate);
  console.log(`Total shipments fetched: ${shipments.length}`);

  const processedShipments = await Promise.all(
    shipments.map(async (shipment) => {
      if (shipment.referenceNumbers.bolNumber === "BOL123") {
        const carrierInfo = await getCarrierInfo(
          shipment.jobTypeInfo?.carrierOrganizationQid,
          true
        );
        return { ...shipment, carrierData: carrierInfo };
      } else {
        const carrierInfo = await getCarrierInfo(
          shipment.jobTypeInfo?.carrierOrganizationQid
        );
        return { ...shipment, carrierData: carrierInfo };
      }
    })
  );

  return processedShipments.map((combinedData) => ({
    ...combinedData,
    allocationCodes: generateAllocationCodes(combinedData),
  }));
}
```

- **Purpose**: Processes shipments by fetching data, retrieving carrier information, and generating allocation codes.
- **Parameters**:
  - `startDate`: The start date for processing shipments.
  - `endDate`: The end date for processing shipments.
- **Returns**: An array of processed shipments, each populated with carrier information and allocation codes.

## Lambda Handler

```javascript
exports.handler = async (event) => {
  console.log("Lambda function started");
  try {
    const startDate = moment("2024-02-01").format("YYYY-MM-DD");
    const endDate = moment("2024-04-30").format("YYYY-MM-DD");

    console.log("Processing shipments...");
    const tmsData = await processShipments(startDate, endDate);
    console.log("Shipment processing completed");
    console.log("Tms Data:", JSON.stringify(tmsData, null, 2));

    const response = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(tmsData),
    };

    console.log("Lambda function completed successfully");
    return response;
  } catch (error) {
    console.error("An error occurred:", error);
    const errorResponse = {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        details: error.message,
      }),
    };

    console.log("Lambda function completed with error");
    return errorResponse;
  }
};
```

- **Purpose**: The main entry point for the Lambda function.
- **Logic**:
  - The function initializes date variables and processes shipment data.
  - It returns a JSON response with the processed shipment data.
  - In case of an error, it returns a 500 status code with an error message.
- **Response**:
  - **Success**: Returns the processed shipment data with a 200 status code.
  - **Error**: Returns an error message with a 500 status code.
