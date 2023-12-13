const express = require('express');
const {generateUploadURL} = require('./s3'); // Import the function from s3.js
//const getFolders=require("./s3")
const {getFolders}=require("./s3")
const cors=require("cors")

const app = express();
app.use(cors())

app.use(express.static('front'));

app.use(express.json()); // Middleware to parse JSON request bodies

app.put('/s3Url', async (req, res) => {
  try {
    console.log("Request Body:", req);
    const { path } = req.body;
    const file = req.files
    console.log("Request files=================================:", req.files);
    const url = await generateUploadURL(file, path); // Call the function to generate the upload URL
    console.log("Generated URL:", url);
    
    res.json({ url }); // Send the generated URL as JSON response
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.get('/getFolderLocations', async (req, res) => {
  try {
    console.log(req.query)
    const {filePath}=req.query
  const folderLocations=await getFolders(filePath)

    res.json({ folderLocations }); // Send folder locations as JSON response
  } catch (error) {
    console.error('Error fetching folder locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.listen(8080, () => {
  console.log("Server listening on port 8080");
});