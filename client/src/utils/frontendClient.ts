import axios from "axios";

// Create Axios instance
const frontendClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api", // You can change this if your API prefix is different
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json"
  },
});


export default frontendClient;
