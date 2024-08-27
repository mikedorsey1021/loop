const axios = require("axios");
const moment = require("moment");

const api = axios.create({
  baseURL: "https://api.loop.us/v1",
  headers: {
    Authorization: `Bearer ${process.env.API_KEY}`,
    "Content-Type": "application/json",
  },
});

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
